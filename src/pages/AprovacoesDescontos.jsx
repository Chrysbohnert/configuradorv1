import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { db, supabase } from '../config/supabase';
import { formatCurrency } from '../utils/formatters';
import UnifiedHeader from '../components/UnifiedHeader';
import '../styles/AprovacoesDescontos.css';

/**
 * Painel do Gestor para Aprovar/Negar Solicitações de Desconto
 * Atualiza em tempo real via Supabase Realtime
 */
export default function AprovacoesDescontos() {
  const navigate = useNavigate();
  const { user } = useOutletContext();
  
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(null); // ID da solicitação sendo processada
  
  // Estados para aprovação
  const [descontoSelecionado, setDescontoSelecionado] = useState({});
  const [observacoes, setObservacoes] = useState({});

  // Configurar listener para atualizações em tempo real
  useEffect(() => {
    console.log('🔔 [AprovacoesDescontos] Iniciando listener realtime...');

    const channel = supabase
      .channel('solicitacoes-admin')
      .on('postgres_changes', {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'solicitacoes_desconto'
      }, (payload) => {
        console.log('🔔 [AprovacoesDescontos] Mudança detectada:', payload);
        // Atualiza a lista de forma otimizada
        setSolicitacoes(current => {
          const index = current.findIndex(s => s.id === payload.new?.id || payload.old?.id);
          
          // Se for uma atualização ou deleção
          if (index !== -1) {
            // Se foi aprovado/negado, remove da lista
            if (payload.eventType === 'UPDATE' && 
                ['aprovado', 'negado'].includes(payload.new.status)) {
              const novasSolicitacoes = [...current];
              novasSolicitacoes.splice(index, 1);
              return novasSolicitacoes;
            }
            // Se foi atualizado, substitui o item
            return current.map(s => 
              s.id === payload.new.id ? payload.new : s
            );
          }
          
          // Se for uma nova inserção e estiver pendente, adiciona
          if (payload.eventType === 'INSERT' && payload.new.status === 'pendente') {
            return [payload.new, ...current];
          }
          
          return current;
        });
      })
      .subscribe();

    // Carregar dados iniciais
    carregarSolicitacoes();

    return () => {
      console.log('🔕 [AprovacoesDescontos] Removendo listener');
      supabase.removeChannel(channel);
    };
  }, []);

  const carregarSolicitacoes = async () => {
    try {
      setLoading(true);
      console.log('🔄 [AprovacoesDescontos] Carregando solicitações...');
      
      // Busca apenas solicitações pendentes
      const { data, error } = await supabase
        .from('solicitacoes_desconto')
        .select('*')
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      console.log(`✅ [AprovacoesDescontos] ${data?.length || 0} solicitações pendentes carregadas`);
      setSolicitacoes(data || []);
    } catch (error) {
      console.error('❌ [AprovacoesDescontos] Erro ao carregar:', error);
      alert('Erro ao carregar solicitações. Tente atualizar a página.');
    } finally {
      setLoading(false);
    }
  };

  const handleAprovar = async (solicitacao) => {
    try {
      const desconto = descontoSelecionado[solicitacao.id];
      
      if (!desconto) {
        alert('⚠️ Selecione o percentual de desconto antes de aprovar!');
        return;
      }

      // Converter para número para garantir o tipo correto
      const descontoNumerico = parseFloat(desconto);
      
      if (isNaN(descontoNumerico) || descontoNumerico < 8 || descontoNumerico > 12) {
        alert('⚠️ O desconto deve ser um número entre 8% e 12%!');
        return;
      }

      // Arredondar para 2 casas decimais
      const descontoFinal = Math.round(descontoNumerico * 100) / 100;

      const confirmar = window.confirm(
        `Aprovar desconto de ${descontoFinal}% para ${solicitacao.vendedor_nome}?\n\n` +
        `Equipamento: ${solicitacao.equipamento_descricao || 'Não informado'}\n` +
        `Valor: ${formatCurrency(solicitacao.valor_base) || 'Não informado'}`
      );

      if (!confirmar) return;

      setProcessando(solicitacao.id);
      console.log('✅ [AprovacoesDescontos] Iniciando aprovação:', {
        solicitacaoId: solicitacao.id,
        desconto: descontoNumerico,
        aprovadorId: user?.id,
        aprovadorNome: user?.nome
      });

      // Verificar se o usuário tem permissão de administrador
      if (user?.tipo !== 'admin') {
        console.error('❌ [AprovacoesDescontos] Usuário não é administrador:', user);
        throw new Error('Acesso negado. Apenas administradores podem aprovar descontos.');
      }

      // Chamar a função de aprovação
      await db.aprovarSolicitacaoDesconto(
        solicitacao.id,
        descontoFinal, // Arredondado para 2 casas decimais
        user.id,
        user.nome,
        observacoes[solicitacao.id] || null
      );

      // Feedback ao usuário
      const mensagemSucesso = `✅ Desconto de ${descontoFinal}% aprovado com sucesso!\n\n` +
        `O vendedor ${solicitacao.vendedor_nome} será notificado automaticamente.`;
      
      alert(mensagemSucesso);
      
      // Recarregar lista
      await carregarSolicitacoes();
      
      // Limpar estados
      setDescontoSelecionado(prev => ({
        ...prev,
        [solicitacao.id]: undefined
      }));
      
      setObservacoes(prev => ({
        ...prev,
        [solicitacao.id]: undefined
      }));

    } catch (error) {
      console.error('❌ [AprovacoesDescontos] Erro ao aprovar:', error);
      
      // Mensagem de erro mais amigável
      let mensagemErro = 'Erro ao aprovar desconto. Tente novamente.';
      
      if (error.message.includes('permission denied') || 
          error.message.includes('Acesso negado')) {
        mensagemErro = 'Você não tem permissão para executar esta ação.';
      } else if (error.message.includes('network error')) {
        mensagemErro = 'Erro de conexão. Verifique sua internet e tente novamente.';
      } else if (error.message) {
        mensagemErro = error.message;
      }
      
      alert(`❌ ${mensagemErro}`);
    } finally {
      setProcessando(null);
    }
  };

  const handleNegar = async (solicitacao) => {
    try {
      const motivo = observacoes[solicitacao.id] || 'Nenhum motivo informado';
      
      const confirmar = window.confirm(
        `Negar solicitação de ${solicitacao.vendedor_nome}?\n\n` +
        `Equipamento: ${solicitacao.equipamento_descricao || 'Não informado'}\n` +
        `Motivo: ${motivo}`
      );

      if (!confirmar) return;

      setProcessando(solicitacao.id);
      console.log('❌ [AprovacoesDescontos] Negando solicitação:', {
        solicitacaoId: solicitacao.id,
        aprovadorId: user?.id,
        aprovadorNome: user?.nome,
        motivo
      });

      // Verificar se o usuário tem permissão de administrador
      if (user?.tipo !== 'admin') {
        console.error('❌ [AprovacoesDescontos] Usuário não é administrador:', user);
        throw new Error('Acesso negado. Apenas administradores podem negar descontos.');
      }

      await db.negarSolicitacaoDesconto(
        solicitacao.id,
        user.id,
        user.nome,
        motivo
      );

      const mensagemSucesso = `❌ Solicitação de ${solicitacao.vendedor_nome} negada com sucesso.\n\n` +
        `Motivo: ${motivo}`;
      
      alert(mensagemSucesso);
      
      // Recarregar lista
      await carregarSolicitacoes();
      
      // Limpar estados
      setDescontoSelecionado(prev => ({
        ...prev,
        [solicitacao.id]: undefined
      }));
      
      setObservacoes(prev => ({
        ...prev,
        [solicitacao.id]: undefined
      }));

    } catch (error) {
      console.error('❌ [AprovacoesDescontos] Erro ao negar:', error);
      
      // Mensagem de erro mais amigável
      let mensagemErro = 'Erro ao negar solicitação. Tente novamente.';
      
      if (error.message.includes('permission denied') || 
          error.message.includes('Acesso negado')) {
        mensagemErro = 'Você não tem permissão para executar esta ação.';
      } else if (error.message.includes('network error')) {
        mensagemErro = 'Erro de conexão. Verifique sua internet e tente novamente.';
      } else if (error.message) {
        mensagemErro = error.message;
      }
      
      alert(`❌ ${mensagemErro}`);
    } finally {
      setProcessando(null);
    }
  };

  const formatarData = (dataISO) => {
    if (!dataISO) return '-';
    const data = new Date(dataISO);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="aprovacoes-container">
        <UnifiedHeader title="Aprovações de Desconto" showBackButton onBack={() => navigate('/admin')} />
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Carregando solicitações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="aprovacoes-container">
      <UnifiedHeader 
        title="Aprovações de Desconto" 
        showBackButton 
        onBack={() => navigate('/admin')} 
      />

      <div className="aprovacoes-content">
        {/* Header com contador */}
        <div className="aprovacoes-header">
          <h2>Solicitações Pendentes</h2>
          <div className="contador-badge">
            {solicitacoes.length} {solicitacoes.length === 1 ? 'solicitação' : 'solicitações'}
          </div>
        </div>

        {/* Lista de solicitações */}
        {solicitacoes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <h3>Nenhuma solicitação pendente</h3>
            <p>Todas as solicitações foram processadas!</p>
          </div>
        ) : (
          <div className="solicitacoes-grid">
            {solicitacoes.map((solicitacao) => (
              <div key={solicitacao.id} className="solicitacao-card">
                {/* Header do Card */}
                <div className="card-header">
                  <div className="vendedor-info">
                    <span className="vendedor-icon">👤</span>
                    <div>
                      <h3>{solicitacao.vendedor_nome}</h3>
                      <small>{solicitacao.vendedor_email}</small>
                    </div>
                  </div>
                  <div className="data-solicitacao">
                    <small>{formatarData(solicitacao.created_at)}</small>
                  </div>
                </div>

                {/* Dados da Proposta */}
                <div className="card-body">
                  <div className="info-row">
                    <span className="label">Equipamento:</span>
                    <span className="value">{solicitacao.equipamento_descricao}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Valor Base:</span>
                    <span className="value">{formatCurrency(solicitacao.valor_base)}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Desconto Atual:</span>
                    <span className="value highlight">{solicitacao.desconto_atual}%</span>
                  </div>
                  
                  {solicitacao.justificativa && (
                    <div className="justificativa-box">
                      <strong>Justificativa:</strong>
                      <p>{solicitacao.justificativa}</p>
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="card-actions">
                  {/* Input de Desconto Livre */}
                  <div className="form-group">
                    <label>Desconto a conceder (8% a 12%):</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Ex: 10.5"
                      min="8"
                      max="12"
                      step="0.1"
                      value={descontoSelecionado[solicitacao.id] || ''}
                      onChange={(e) => setDescontoSelecionado(prev => ({
                        ...prev,
                        [solicitacao.id]: e.target.value
                      }))}
                      disabled={processando === solicitacao.id}
                    />
                    <small style={{ color: '#6c757d', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      💡 Digite o percentual desejado (aceita decimais: 8.5, 10.8, etc.)
                    </small>
                  </div>

                  {/* Observação */}
                  <div className="form-group">
                    <label>Observação (opcional):</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Ex: Aprovado por ser cliente recorrente"
                      value={observacoes[solicitacao.id] || ''}
                      onChange={(e) => setObservacoes(prev => ({
                        ...prev,
                        [solicitacao.id]: e.target.value
                      }))}
                      disabled={processando === solicitacao.id}
                      maxLength={200}
                    />
                  </div>

                  {/* Botões */}
                  <div className="button-group">
                    <button
                      className="btn btn-danger"
                      onClick={() => handleNegar(solicitacao)}
                      disabled={processando === solicitacao.id}
                    >
                      {processando === solicitacao.id ? '⏳' : '❌'} Negar
                    </button>
                    <button
                      className="btn btn-success"
                      onClick={() => handleAprovar(solicitacao)}
                      disabled={processando === solicitacao.id || !descontoSelecionado[solicitacao.id]}
                    >
                      {processando === solicitacao.id ? '⏳ Processando...' : '✅ Aprovar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
