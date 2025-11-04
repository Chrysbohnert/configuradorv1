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

  // Carregar solicitações pendentes
  useEffect(() => {
    carregarSolicitacoes();
  }, []);

  // Listener Realtime para novas solicitações
  useEffect(() => {
    console.log('🔔 [AprovacoesDescontos] Iniciando listener realtime...');

    const channel = supabase
      .channel('solicitacoes-pendentes')
      .on('postgres_changes', {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'solicitacoes_desconto',
        filter: 'status=eq.pendente'
      }, (payload) => {
        console.log('🔔 [AprovacoesDescontos] Mudança detectada:', payload);
        carregarSolicitacoes();
      })
      .subscribe();

    return () => {
      console.log('🔕 [AprovacoesDescontos] Removendo listener');
      supabase.removeChannel(channel);
    };
  }, []);

  const carregarSolicitacoes = async () => {
    try {
      console.log('🔄 [AprovacoesDescontos] Carregando solicitações...');
      const data = await db.getSolicitacoesPendentes();
      console.log(`✅ [AprovacoesDescontos] ${data.length} solicitações carregadas`);
      setSolicitacoes(data);
    } catch (error) {
      console.error('❌ [AprovacoesDescontos] Erro ao carregar:', error);
      alert('Erro ao carregar solicitações. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleAprovar = async (solicitacao) => {
    const desconto = descontoSelecionado[solicitacao.id];
    
    if (!desconto) {
      alert('⚠️ Selecione o percentual de desconto antes de aprovar!');
      return;
    }

    if (desconto < 8 || desconto > 12) {
      alert('⚠️ O desconto deve estar entre 8% e 12%!');
      return;
    }

    const confirmar = window.confirm(
      `Aprovar desconto de ${desconto}% para ${solicitacao.vendedor_nome}?\n\n` +
      `Equipamento: ${solicitacao.equipamento_descricao}\n` +
      `Valor: ${formatCurrency(solicitacao.valor_base)}`
    );

    if (!confirmar) return;

    try {
      setProcessando(solicitacao.id);
      console.log('✅ [AprovacoesDescontos] Aprovando:', solicitacao.id, desconto);

      await db.aprovarSolicitacaoDesconto(
        solicitacao.id,
        desconto,
        user.id,
        user.nome,
        observacoes[solicitacao.id] || null
      );

      alert(`✅ Desconto de ${desconto}% aprovado com sucesso!\n\nO vendedor ${solicitacao.vendedor_nome} foi notificado.`);
      
      // Recarregar lista
      await carregarSolicitacoes();
      
      // Limpar estados
      setDescontoSelecionado(prev => {
        const novo = { ...prev };
        delete novo[solicitacao.id];
        return novo;
      });
      setObservacoes(prev => {
        const novo = { ...prev };
        delete novo[solicitacao.id];
        return novo;
      });

    } catch (error) {
      console.error('❌ [AprovacoesDescontos] Erro ao aprovar:', error);
      alert('❌ Erro ao aprovar desconto. Tente novamente.');
    } finally {
      setProcessando(null);
    }
  };

  const handleNegar = async (solicitacao) => {
    const motivo = observacoes[solicitacao.id];
    
    const confirmar = window.confirm(
      `Negar solicitação de ${solicitacao.vendedor_nome}?\n\n` +
      `Equipamento: ${solicitacao.equipamento_descricao}\n` +
      (motivo ? `Motivo: ${motivo}` : 'Sem motivo especificado')
    );

    if (!confirmar) return;

    try {
      setProcessando(solicitacao.id);
      console.log('❌ [AprovacoesDescontos] Negando:', solicitacao.id);

      await db.negarSolicitacaoDesconto(
        solicitacao.id,
        user.id,
        user.nome,
        motivo || 'Sem justificativa'
      );

      alert(`❌ Solicitação negada.\n\nO vendedor ${solicitacao.vendedor_nome} foi notificado.`);
      
      // Recarregar lista
      await carregarSolicitacoes();
      
      // Limpar estados
      setDescontoSelecionado(prev => {
        const novo = { ...prev };
        delete novo[solicitacao.id];
        return novo;
      });
      setObservacoes(prev => {
        const novo = { ...prev };
        delete novo[solicitacao.id];
        return novo;
      });

    } catch (error) {
      console.error('❌ [AprovacoesDescontos] Erro ao negar:', error);
      alert('❌ Erro ao negar solicitação. Tente novamente.');
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
                  {/* Seletor de Desconto */}
                  <div className="form-group">
                    <label>Desconto a conceder:</label>
                    <select
                      className="form-control"
                      value={descontoSelecionado[solicitacao.id] || ''}
                      onChange={(e) => setDescontoSelecionado(prev => ({
                        ...prev,
                        [solicitacao.id]: parseInt(e.target.value)
                      }))}
                      disabled={processando === solicitacao.id}
                    >
                      <option value="">Selecione...</option>
                      <option value="8">8%</option>
                      <option value="9">9%</option>
                      <option value="10">10%</option>
                      <option value="11">11%</option>
                      <option value="12">12%</option>
                    </select>
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
