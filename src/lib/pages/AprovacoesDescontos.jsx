import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { listarPendentes, aprovarSolicitacao, negarSolicitacao } from '../../api/solicitacoesDesconto';
import { formatCurrency } from '../../utils/formatters';
import UnifiedHeader from '../../components/UnifiedHeader';
import '../../styles/AprovacoesDescontos.css';

/**
 * Painel do Gestor para Aprovar/Negar Solicitações de Desconto
 * Usa API REST com polling a cada 30s
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
  const [valorFinalAprovado, setValorFinalAprovado] = useState({});

  // Carregar solicitações ao montar + polling a cada 30s
  useEffect(() => {
    if (user?.tipo === 'admin_concessionaria') {
      navigate('/dashboard-admin');
      return;
    }

    carregarSolicitacoes();

    const interval = setInterval(() => {
      carregarSolicitacoes();
    }, 30000);

    return () => clearInterval(interval);
  }, [user, navigate]);

  const carregarSolicitacoes = async () => {
    try {
      setLoading(true);
      const data = await listarPendentes();
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
      
      if (isNaN(descontoNumerico) || descontoNumerico < 0) {
        alert('⚠️ O desconto deve ser um número maior ou igual a 0%!');
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
      // Verificar se o usuário tem permissão de administrador
      if (user?.tipo !== 'admin') {
        console.error('❌ [AprovacoesDescontos] Usuário não é administrador:', user);
        throw new Error('Acesso negado. Apenas administradores podem aprovar descontos.');
      }

      // Chamar API REST de aprovação
      await aprovarSolicitacao(
        solicitacao.id,
        descontoFinal,
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
      // Verificar se o usuário tem permissão de administrador
      if (user?.tipo !== 'admin') {
        console.error('❌ [AprovacoesDescontos] Usuário não é administrador:', user);
        throw new Error('Acesso negado. Apenas administradores podem negar descontos.');
      }

      await negarSolicitacao(solicitacao.id, motivo);

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
        {/* Header com contador e botão atualizar */}
        <div className="aprovacoes-header">
          <h2>Solicitações Pendentes</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="btn btn-secondary"
              onClick={carregarSolicitacoes}
              disabled={loading}
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                color: '#475569'
              }}
            >
              {loading ? '⏳ Atualizando...' : '🔄 Atualizar'}
            </button>
            <div className="contador-badge">
              {solicitacoes.length} {solicitacoes.length === 1 ? 'solicitação' : 'solicitações'}
            </div>
          </div>
        </div>

        {/* Lista de solicitações */}
        {solicitacoes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"></div>
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
                    <span className="vendedor-icon"> </span>
                    <div>
                      <h3>{solicitacao.vendedor_nome}</h3>
                      <small>{solicitacao.vendedor_email}</small>
                      {(solicitacao.justificativa?.includes('[CONCESSIONÁRIA]') || solicitacao.justificativa?.includes('[admin_concessionaria]')) && (
                        <span style={{
                          display: 'inline-block',
                          marginTop: '4px',
                          padding: '2px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: '#fef3c7',
                          color: '#92400e',
                          borderRadius: '4px',
                          border: '1px solid #fde68a'
                        }}>
                          🏪 CONCESSIONÁRIA
                        </span>
                      )}
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

                  {/* Valor final desejado (extraído da justificativa quando informado) */}
                  {(() => {
                    const vfMatch = solicitacao.justificativa?.match(/\[VF:([\d.]+)\]/);
                    if (!vfMatch) return null;
                    return (
                      <div className="info-row">
                        <span className="label">Valor Final Desejado:</span>
                        <span className="value" style={{ color: '#0369a1', fontWeight: 600 }}>{formatCurrency(parseFloat(vfMatch[1]))}</span>
                      </div>
                    );
                  })()}

                  {/* Desconto solicitado extraído da justificativa */}
                  {(() => {
                    const pctMatch = solicitacao.justificativa?.match(/Percentual:\s*([\d.,]+)%/);
                    if (!pctMatch) return null;
                    const pctSolicitado = parseFloat(pctMatch[1].replace(',', '.'));
                    const isConcessionaria = solicitacao.justificativa?.includes('[admin_concessionaria]') || solicitacao.justificativa?.includes('[CONCESSIONÁRIA]');
                    return (
                      <div style={{
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        marginTop: '10px'
                      }}>
                        <p style={{ fontWeight: 600, color: '#92400e', marginBottom: '6px', fontSize: '13px' }}>
                          🎯 {isConcessionaria ? 'Admin Concessionária' : 'Vendedor'} solicita: {pctSolicitado}%
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', gap: '8px' }}>
                          <div>
                            <span style={{ color: '#6b7280' }}>Valor com {solicitacao.desconto_atual}%:</span>
                            <br />
                            <strong>{formatCurrency(solicitacao.valor_base - (solicitacao.valor_base * solicitacao.desconto_atual / 100))}</strong>
                          </div>
                          <div style={{ textAlign: 'center', color: '#6b7280', alignSelf: 'center' }}>→</div>
                          <div>
                            <span style={{ color: '#16a34a' }}>Valor com {pctSolicitado}%:</span>
                            <br />
                            <strong style={{ color: '#16a34a' }}>{formatCurrency(solicitacao.valor_base - (solicitacao.valor_base * pctSolicitado / 100))}</strong>
                          </div>
                        </div>
                        <p style={{ fontSize: '11px', color: '#92400e', marginTop: '6px' }}>
                          Diferença: -{formatCurrency((solicitacao.valor_base * pctSolicitado / 100) - (solicitacao.valor_base * solicitacao.desconto_atual / 100))}
                        </p>
                      </div>
                    );
                  })()}
                  
                  {solicitacao.justificativa && (() => {
                    const textoLimpo = solicitacao.justificativa
                      .replace(/\[CONCESSIONÁRIA\]/g, '')
                      .replace(/\[VF:[\d.]+\]/g, '')
                      .trim();
                    if (!textoLimpo) return null;
                    return (
                      <div className="justificativa-box">
                        <strong>Justificativa:</strong>
                        <p>{textoLimpo}</p>
                      </div>
                    );
                  })()}
                </div>

                {/* Ações */}
                <div className="card-actions">
                  {/* Input de Desconto / Valor Final */}
                  <div className="form-group">
                    <label>Desconto a conceder (%):</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Ex: 10.5"
                      min="0"
                      step="0.01"
                      value={descontoSelecionado[solicitacao.id] || ''}
                      onChange={(e) => setDescontoSelecionado(prev => ({
                        ...prev,
                        [solicitacao.id]: e.target.value
                      }))}
                      disabled={processando === solicitacao.id}
                    />

                    {/* Botão rápido: aprovar percentual solicitado */}
                    {(() => {
                      const pctMatch = solicitacao.justificativa?.match(/Percentual:\s*([\d.,]+)%/);
                      if (!pctMatch) return null;
                      const pctSolicitado = parseFloat(pctMatch[1].replace(',', '.'));
                      if (descontoSelecionado[solicitacao.id]) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => setDescontoSelecionado(prev => ({
                            ...prev,
                            [solicitacao.id]: String(pctSolicitado)
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
                          Aprovar {pctSolicitado}% (solicitado)
                        </button>
                      );
                    })()}

                    {/* Valor final aprovado */}
                    <label style={{ marginTop: '10px', display: 'block' }}>Ou informe valor final aprovado (R$):</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Ex: 48000"
                      min="0"
                      step="0.01"
                      value={valorFinalAprovado[solicitacao.id] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setValorFinalAprovado(prev => ({
                          ...prev,
                          [solicitacao.id]: val
                        }));
                        const valorFinal = parseFloat(val);
                        const base = Number(solicitacao.valor_base) || 0;
                        if (!isNaN(valorFinal) && base > 0 && valorFinal >= 0) {
                          const pct = ((base - valorFinal) / base) * 100;
                          setDescontoSelecionado(prev => ({
                            ...prev,
                            [solicitacao.id]: String(Math.round(pct * 100) / 100)
                          }));
                        }
                      }}
                      disabled={processando === solicitacao.id}
                    />

                    {/* Simulador */}
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
                          💰 Com {parseFloat(descontoSelecionado[solicitacao.id])}%:
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




