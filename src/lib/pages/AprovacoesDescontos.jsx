import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { db, supabase } from '../../config/supabase';
import { formatCurrency } from '../../utils/formatters';
import UnifiedHeader from '../../components/UnifiedHeader';
import '../../styles/AprovacoesDescontos.css';

/**
 * Painel do Gestor para Aprovar/Negar SolicitaÃ§Ãµes de Desconto
 * Atualiza em tempo real via Supabase Realtime
 */
export default function AprovacoesDescontos() {
  const navigate = useNavigate();
  const { user } = useOutletContext();
  
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(null); // ID da solicitaÃ§Ã£o sendo processada
  
  // Estados para aprovaÃ§Ã£o
  const [descontoSelecionado, setDescontoSelecionado] = useState({});
  const [observacoes, setObservacoes] = useState({});

  // Configurar listener para atualizaÃ§Ãµes em tempo real
  useEffect(() => {
    if (user?.tipo === 'admin_concessionaria') {
      navigate('/dashboard-admin');
      return;
    }

    const channel = supabase
      .channel('solicitacoes-admin')
      .on('postgres_changes', {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'solicitacoes_desconto'
      }, (payload) => {
        // Atualiza a lista de forma otimizada
        setSolicitacoes(current => {
          const index = current.findIndex(s => s.id === payload.new?.id || payload.old?.id);
          
          // Se for uma atualizaÃ§Ã£o ou deleÃ§Ã£o
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
          
          // Se for uma nova inserÃ§Ã£o e estiver pendente, adiciona
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
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  const carregarSolicitacoes = async () => {
    try {
      setLoading(true);
      
      // Busca apenas solicitaÃ§Ãµes pendentes
      const { data, error } = await supabase
        .from('solicitacoes_desconto')
        .select('id, vendedor_nome, vendedor_id, equipamento, valor_base, desconto_atual, justificativa, status, created_at')
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setSolicitacoes(data || []);
    } catch (error) {
      console.error('âŒ [AprovacoesDescontos] Erro ao carregar:', error);
      alert('Erro ao carregar solicitaÃ§Ãµes. Tente atualizar a pÃ¡gina.');
    } finally {
      setLoading(false);
    }
  };

  const handleAprovar = async (solicitacao) => {
    try {
      const desconto = descontoSelecionado[solicitacao.id];
      
      if (!desconto) {
        alert('âš ï¸ Selecione o percentual de desconto antes de aprovar!');
        return;
      }

      // Converter para nÃºmero para garantir o tipo correto
      const descontoNumerico = parseFloat(desconto);
      
      if (isNaN(descontoNumerico) || descontoNumerico < 0) {
        alert('âš ï¸ O desconto deve ser um nÃºmero maior ou igual a 0%!');
        return;
      }

      // Arredondar para 2 casas decimais
      const descontoFinal = Math.round(descontoNumerico * 100) / 100;

      const confirmar = window.confirm(
        `Aprovar desconto de ${descontoFinal}% para ${solicitacao.vendedor_nome}?\n\n` +
        `Equipamento: ${solicitacao.equipamento_descricao || 'NÃ£o informado'}\n` +
        `Valor: ${formatCurrency(solicitacao.valor_base) || 'NÃ£o informado'}`
      );

      if (!confirmar) return;

      setProcessando(solicitacao.id);
      // Verificar se o usuÃ¡rio tem permissÃ£o de administrador
      if (user?.tipo !== 'admin') {
        console.error('âŒ [AprovacoesDescontos] UsuÃ¡rio nÃ£o Ã© administrador:', user);
        throw new Error('Acesso negado. Apenas administradores podem aprovar descontos.');
      }

      // Chamar a funÃ§Ã£o de aprovaÃ§Ã£o
      await db.aprovarSolicitacaoDesconto(
        solicitacao.id,
        descontoFinal, // Arredondado para 2 casas decimais
        user.id,
        user.nome,
        observacoes[solicitacao.id] || null
      );

      // Feedback ao usuÃ¡rio
      const mensagemSucesso = `âœ… Desconto de ${descontoFinal}% aprovado com sucesso!\n\n` +
        `O vendedor ${solicitacao.vendedor_nome} serÃ¡ notificado automaticamente.`;
      
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
      console.error('âŒ [AprovacoesDescontos] Erro ao aprovar:', error);
      
      // Mensagem de erro mais amigÃ¡vel
      let mensagemErro = 'Erro ao aprovar desconto. Tente novamente.';
      
      if (error.message.includes('permission denied') || 
          error.message.includes('Acesso negado')) {
        mensagemErro = 'VocÃª nÃ£o tem permissÃ£o para executar esta aÃ§Ã£o.';
      } else if (error.message.includes('network error')) {
        mensagemErro = 'Erro de conexÃ£o. Verifique sua internet e tente novamente.';
      } else if (error.message) {
        mensagemErro = error.message;
      }
      
      alert(`âŒ ${mensagemErro}`);
    } finally {
      setProcessando(null);
    }
  };

  const handleNegar = async (solicitacao) => {
    try {
      const motivo = observacoes[solicitacao.id] || 'Nenhum motivo informado';
      
      const confirmar = window.confirm(
        `Negar solicitaÃ§Ã£o de ${solicitacao.vendedor_nome}?\n\n` +
        `Equipamento: ${solicitacao.equipamento_descricao || 'NÃ£o informado'}\n` +
        `Motivo: ${motivo}`
      );

      if (!confirmar) return;

      setProcessando(solicitacao.id);
      // Verificar se o usuÃ¡rio tem permissÃ£o de administrador
      if (user?.tipo !== 'admin') {
        console.error('âŒ [AprovacoesDescontos] UsuÃ¡rio nÃ£o Ã© administrador:', user);
        throw new Error('Acesso negado. Apenas administradores podem negar descontos.');
      }

      await db.negarSolicitacaoDesconto(
        solicitacao.id,
        user.id,
        user.nome,
        motivo
      );

      const mensagemSucesso = `âŒ SolicitaÃ§Ã£o de ${solicitacao.vendedor_nome} negada com sucesso.\n\n` +
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
      console.error('âŒ [AprovacoesDescontos] Erro ao negar:', error);
      
      // Mensagem de erro mais amigÃ¡vel
      let mensagemErro = 'Erro ao negar solicitaÃ§Ã£o. Tente novamente.';
      
      if (error.message.includes('permission denied') || 
          error.message.includes('Acesso negado')) {
        mensagemErro = 'VocÃª nÃ£o tem permissÃ£o para executar esta aÃ§Ã£o.';
      } else if (error.message.includes('network error')) {
        mensagemErro = 'Erro de conexÃ£o. Verifique sua internet e tente novamente.';
      } else if (error.message) {
        mensagemErro = error.message;
      }
      
      alert(`âŒ ${mensagemErro}`);
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
        <UnifiedHeader title="AprovaÃ§Ãµes de Desconto" showBackButton onBack={() => navigate('/admin')} />
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Carregando solicitaÃ§Ãµes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="aprovacoes-container">
      <UnifiedHeader 
        title="AprovaÃ§Ãµes de Desconto" 
        showBackButton 
        onBack={() => navigate('/admin')} 
      />

      <div className="aprovacoes-content">
        {/* Header com contador */}
        <div className="aprovacoes-header">
          <h2>SolicitaÃ§Ãµes Pendentes</h2>
          <div className="contador-badge">
            {solicitacoes.length} {solicitacoes.length === 1 ? 'solicitaÃ§Ã£o' : 'solicitaÃ§Ãµes'}
          </div>
        </div>

        {/* Lista de solicitaÃ§Ãµes */}
        {solicitacoes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"></div>
            <h3>Nenhuma solicitaÃ§Ã£o pendente</h3>
            <p>Todas as solicitaÃ§Ãµes foram processadas!</p>
          </div>
        ) : (
          <div className="solicitacoes-grid">
            {solicitacoes.map((solicitacao) => (
              <div key={solicitacao.id} className="solicitacao-card">
                {/* Header do Card */}
                <div className="card-header">
                  <div className="vendedor-info">
                    <span className="vendedor-icon"> </span>
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

                  {/* Desconto solicitado pelo vendedor */}
                  {solicitacao.desconto_desejado && (
                    <div style={{
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      marginTop: '10px'
                    }}>
                      <p style={{ fontWeight: 600, color: '#92400e', marginBottom: '6px', fontSize: '13px' }}>
                        ðŸŽ¯ Vendedor solicita: {solicitacao.desconto_desejado}%
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', gap: '8px' }}>
                        <div>
                          <span style={{ color: '#6b7280' }}>Valor com {solicitacao.desconto_atual}%:</span>
                          <br />
                          <strong>{formatCurrency(solicitacao.valor_base - (solicitacao.valor_base * solicitacao.desconto_atual / 100))}</strong>
                        </div>
                        <div style={{ textAlign: 'center', color: '#6b7280', alignSelf: 'center' }}>â†’</div>
                        <div>
                          <span style={{ color: '#16a34a' }}>Valor com {solicitacao.desconto_desejado}%:</span>
                          <br />
                          <strong style={{ color: '#16a34a' }}>{formatCurrency(solicitacao.valor_base - (solicitacao.valor_base * solicitacao.desconto_desejado / 100))}</strong>
                        </div>
                      </div>
                      <p style={{ fontSize: '11px', color: '#92400e', marginTop: '6px' }}>
                        DiferenÃ§a: -{formatCurrency((solicitacao.valor_base * solicitacao.desconto_desejado / 100) - (solicitacao.valor_base * solicitacao.desconto_atual / 100))}
                      </p>
                    </div>
                  )}
                  
                  {solicitacao.justificativa && (
                    <div className="justificativa-box">
                      <strong>Justificativa:</strong>
                      <p>{solicitacao.justificativa}</p>
                    </div>
                  )}
                </div>

                {/* AÃ§Ãµes */}
                <div className="card-actions">
                  {/* Input de Desconto Livre */}
                  <div className="form-group">
                    <label>Desconto a conceder (%):</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder={solicitacao.desconto_desejado ? `Solicitado: ${solicitacao.desconto_desejado}%` : 'Ex: 10.5'}
                      min="0"
                      step="0.1"
                      value={descontoSelecionado[solicitacao.id] || ''}
                      onChange={(e) => setDescontoSelecionado(prev => ({
                        ...prev,
                        [solicitacao.id]: e.target.value
                      }))}
                      disabled={processando === solicitacao.id}
                    />
                    {/* BotÃ£o rÃ¡pido para aplicar o % solicitado */}
                    {solicitacao.desconto_desejado && !descontoSelecionado[solicitacao.id] && (
                      <button
                        type="button"
                        onClick={() => setDescontoSelecionado(prev => ({
                          ...prev,
                          [solicitacao.id]: String(solicitacao.desconto_desejado)
                        }))}
                        style={{
                          marginTop: '6px',
                          padding: '5px 12px',
                          fontSize: '12px',
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '6px',
                          color: '#166534',
                          cursor: 'pointer',
                          fontWeight: 500
                        }}
                      >
                        Aplicar {solicitacao.desconto_desejado}% (solicitado)
                      </button>
                    )}

                    {/* Simulador em tempo real */}
                    {descontoSelecionado[solicitacao.id] && parseFloat(descontoSelecionado[solicitacao.id]) > 0 && (
                      <div style={{
                        background: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: '6px',
                        padding: '10px 12px',
                        marginTop: '8px',
                        fontSize: '13px'
                      }}>
                        <p style={{ fontWeight: 600, color: '#0c4a6e', marginBottom: '4px' }}>
                          ðŸ’° Com {parseFloat(descontoSelecionado[solicitacao.id])}%:
                        </p>
                        <p>
                          Valor final: <strong style={{ color: '#0369a1' }}>
                            {formatCurrency(solicitacao.valor_base - (solicitacao.valor_base * parseFloat(descontoSelecionado[solicitacao.id]) / 100))}
                          </strong>
                        </p>
                        <p style={{ fontSize: '11px', color: '#6b7280' }}>
                          Desconto de {formatCurrency(solicitacao.valor_base * parseFloat(descontoSelecionado[solicitacao.id]) / 100)} sobre o valor base
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ObservaÃ§Ã£o */}
                  <div className="form-group">
                    <label>ObservaÃ§Ã£o (opcional):</label>
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

                  {/* BotÃµes */}
                  <div className="button-group">
                    <button
                      className="btn btn-danger"
                      onClick={() => handleNegar(solicitacao)}
                      disabled={processando === solicitacao.id}
                    >
                      {processando === solicitacao.id ? 'â³' : 'âŒ'} Negar
                    </button>
                    <button
                      className="btn btn-success"
                      onClick={() => handleAprovar(solicitacao)}
                      disabled={processando === solicitacao.id || !descontoSelecionado[solicitacao.id]}
                    >
                      {processando === solicitacao.id ? 'â³ Processando...' : 'âœ… Aprovar'}
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




