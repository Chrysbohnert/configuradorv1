import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../config/supabase';
import { formatCurrency } from '../utils/formatters';

/**
 * Página de Histórico de Propostas e Orçamentos
 */
const HistoricoPropostas = () => {
  const navigate = useNavigate();
  const [propostas, setPropostas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroResultado, setFiltroResultado] = useState('todos');
  const [busca, setBusca] = useState('');
  const [resultadoModalOpen, setResultadoModalOpen] = useState(false);
  const [propostaSelecionada, setPropostaSelecionada] = useState(null);
  const [resultadoSelecionado, setResultadoSelecionado] = useState('');
  const [motivoPerda, setMotivoPerda] = useState('');
  const [salvandoResultado, setSalvandoResultado] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    carregarPropostas();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return;
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatNumeroProposta = (numero) => {
    const raw = String(numero || '').trim();
    if (!raw) return '';

    // Padronizar números gerados como PEDxxxxxxx para um formato curto e legível
    // Ex: PED9654089 -> 9654089
    if (/^PED\d+$/i.test(raw)) {
      return raw.replace(/^PED/i, '');
    }

    return raw;
  };

  const openResultadoModal = (proposta) => {
    setPropostaSelecionada(proposta);
    setResultadoSelecionado(proposta?.resultado_venda || '');
    setMotivoPerda(proposta?.motivo_perda || '');
    setResultadoModalOpen(true);
  };

  const closeResultadoModal = () => {
    if (salvandoResultado) return;
    setResultadoModalOpen(false);
    setPropostaSelecionada(null);
    setResultadoSelecionado('');
    setMotivoPerda('');
  };

  const salvarResultado = async () => {
    if (!propostaSelecionada?.id) return;

    if (resultadoSelecionado === 'perdida' && !motivoPerda.trim()) {
      alert('Informe um motivo (curto) para a perda.');
      return;
    }

    setSalvandoResultado(true);
    try {
      await db.updateResultadoVendaProposta(propostaSelecionada.id, {
        resultado_venda: resultadoSelecionado || null,
        motivo_perda: motivoPerda || null,
      });

      await carregarPropostas();
      closeResultadoModal();
    } catch (error) {
      console.error('Erro ao salvar resultado da proposta:', error);
      alert('Erro ao salvar resultado da proposta.');
    } finally {
      setSalvandoResultado(false);
    }
  };

  const carregarPropostas = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      const filters = {};
      if (user.id) {
        filters.vendedor_id = user.id;
      }

      const data = await db.getPropostas(filters);
      setPropostas(data);
    } catch (error) {
      console.error('Erro ao carregar propostas:', error);
      alert('Erro ao carregar histórico de propostas');
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = async (id, numeroProposta) => {
    if (!window.confirm(`Tem certeza que deseja excluir a proposta ${numeroProposta}?`)) {
      return;
    }

    try {
      await db.deleteProposta(id);
      alert('Proposta excluída com sucesso!');
      carregarPropostas();
    } catch (error) {
      console.error('Erro ao excluir proposta:', error);
      alert('Erro ao excluir proposta');
    }
  };

  const handleReabrir = (proposta) => {
    // Navegar para modo edição passando o ID da proposta na URL
    navigate(`/novo-pedido/${proposta.id}`);
  };

  // Filtrar propostas
  const propostasFiltradas = propostas.filter(p => {
    // Filtro de resultado
    if (filtroResultado !== 'todos') {
      const r = p.resultado_venda || '';
      if (filtroResultado === 'sem_resultado' && r) return false;
      if (filtroResultado === 'efetivada' && r !== 'efetivada') return false;
      if (filtroResultado === 'perdida' && r !== 'perdida') return false;
    }
    
    // Busca por texto
    if (busca) {
      const termo = busca.toLowerCase();
      return (
        p.numero_proposta.toLowerCase().includes(termo) ||
        p.cliente_nome.toLowerCase().includes(termo) ||
        p.vendedor_nome.toLowerCase().includes(termo)
      );
    }
    
    return true;
  });

  const getResultadoBadge = (resultado, motivo) => {
    const r = (resultado || '').toLowerCase();

    if (!r) {
      return (
        <span style={{
          padding: '4px 10px',
          borderRadius: '999px',
          fontSize: '12px',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
          color: '#374151',
          border: '1px solid #e5e7eb'
        }}>
          ⏳ Sem resultado
        </span>
      );
    }

    if (r === 'efetivada') {
      return (
        <span style={{
          padding: '4px 10px',
          borderRadius: '999px',
          fontSize: '12px',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.25)'
        }}>
          ✅ Efetivada
        </span>
      );
    }

    return (
      <span title={motivo ? `Motivo: ${motivo}` : ''} style={{
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: '700',
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.25)'
      }}>
        ❌ Perdida
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const styles = {
      pendente: { bg: '#fff3cd', color: '#856404', label: 'Pendente' },
      finalizado: { bg: '#d4edda', color: '#155724', label: 'Finalizado' },
      excluido: { bg: '#f8d7da', color: '#721c24', label: 'Excluído' }
    };
    
    const style = styles[status] || styles.pendente;
    
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        background: style.bg,
        color: style.color
      }}>
        {style.label}
      </span>
    );
  };

  const getTipoBadge = (tipo) => {
    const styles = {
      orcamento: { bg: '#e3f2fd', color: '#0d47a1', label: '📋 Orçamento', icon: '📋' },
      proposta: { bg: '#f3e5f5', color: '#4a148c', label: '✅ Proposta', icon: '✅' }
    };
    
    const style = styles[tipo] || styles.orcamento;
    
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        background: style.bg,
        color: style.color
      }}>
        {style.icon} {style.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <p style={{ color: '#666' }}>Carregando histórico...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', color: '#111' }}>
          Propostas
        </h1>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Gerencie seus orçamentos e propostas comerciais. Edite orçamentos pendentes ou consulte propostas finalizadas.
        </p>
      </div>

      {/* Filtros */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#555' }}>
            Buscar
          </label>
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nº, cliente ou vendedor..."
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e5e5',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#555' }}>
            Resultado
          </label>
          <select
            value={filtroResultado}
            onChange={(e) => setFiltroResultado(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e5e5',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value="todos">Todos</option>
            <option value="sem_resultado">Sem resultado</option>
            <option value="efetivada">Efetivada</option>
            <option value="perdida">Perdida</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            onClick={carregarPropostas}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: '#111',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🔄 Atualizar
          </button>
        </div>
      </div>

      {/* Tabela */}
      {propostasFiltradas.length === 0 ? (
        <div style={{
          background: 'white',
          padding: '60px 20px',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.3 }}>📋</div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>
            Nenhuma proposta encontrada
          </h3>
          <p style={{ color: '#666', fontSize: '14px' }}>
            {busca || filtroResultado !== 'todos'
              ? 'Tente ajustar os filtros de busca'
              : 'Comece gerando sua primeira proposta'}
          </p>
        </div>
      ) : (
        isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {propostasFiltradas.map((proposta) => (
              <div
                key={proposta.id}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#111' }}>
                    #{formatNumeroProposta(proposta.numero_proposta)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>
                    {new Date(proposta.data).toLocaleDateString('pt-BR')}
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: '#333' }}>
                  <div style={{ fontWeight: '500' }}>{proposta.cliente_nome}</div>
                  {proposta.cliente_documento && (
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                      {proposta.cliente_documento}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#111' }}>
                    {formatCurrency(proposta.valor_total)}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {getTipoBadge(proposta.tipo)}
                    {getStatusBadge(proposta.status)}
                  </div>
                </div>

                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <div>
                    {getResultadoBadge(proposta.resultado_venda, proposta.motivo_perda)}
                  </div>
                  <button
                    onClick={() => openResultadoModal(proposta)}
                    style={{
                      padding: '8px 12px',
                      background: 'linear-gradient(135deg, #111827 0%, #0b1220 100%)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                    title="Marcar resultado da proposta"
                  >
                    📈 Resultado
                  </button>
                </div>

                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(proposta.status === 'pendente' || proposta.status === 'finalizado') && (
                    <>
                      <button
                        onClick={() => handleReabrir(proposta)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: proposta.status === 'finalizado' ? '#28a745' : '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                        title={proposta.status === 'finalizado' ? 'Editar proposta finalizada' : 'Reabrir e continuar edição'}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => openResultadoModal(proposta)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: 'linear-gradient(135deg, #111827 0%, #0b1220 100%)',
                          color: 'white',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                        title="Marcar resultado da proposta"
                      >
                        📈 Resultado
                      </button>
                    </>
                  )}

                  {proposta.status === 'pendente' && (
                    <button
                      onClick={() => handleExcluir(proposta.id, proposta.numero_proposta)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                      title="Excluir proposta"
                    >
                      🗑️ Excluir
                    </button>
                  )}

                  {proposta.status === 'excluido' && (
                    <span style={{ fontSize: '12px', color: '#999' }}>
                      Excluída
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch'
          }}>
            <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e5e5' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#555' }}>
                    Nº Proposta
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#555' }}>
                    Cliente
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#555' }}>
                    Tipo
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#555' }}>
                    Valor Total
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#555' }}>
                    Data
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#555' }}>
                    Status
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#555' }}>
                    Resultado
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#555' }}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {propostasFiltradas.map((proposta) => (
                  <tr key={proposta.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: '#111' }}>
                      #{formatNumeroProposta(proposta.numero_proposta)}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#333' }}>
                      <div>{proposta.cliente_nome}</div>
                      {proposta.cliente_documento && (
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                          {proposta.cliente_documento}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {getTipoBadge(proposta.tipo)}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: '#111' }}>
                      {formatCurrency(proposta.valor_total)}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#666' }}>
                      {new Date(proposta.data).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {getStatusBadge(proposta.status)}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {getResultadoBadge(proposta.resultado_venda, proposta.motivo_perda)}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {/* Permitir edição de propostas pendentes E finalizadas */}
                        {(proposta.status === 'pendente' || proposta.status === 'finalizado') && (
                          <>
                            <button
                              onClick={() => handleReabrir(proposta)}
                              style={{
                                padding: '6px 12px',
                                background: proposta.status === 'finalizado' ? '#28a745' : '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                              title={proposta.status === 'finalizado' ? 'Editar proposta finalizada' : 'Reabrir e continuar edição'}
                            >
                              ✏️ Editar
                            </button>
                            <button
                              onClick={() => openResultadoModal(proposta)}
                              style={{
                                padding: '6px 12px',
                                background: 'linear-gradient(135deg, #111827 0%, #0b1220 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                              title="Marcar resultado da proposta"
                            >
                              📈 Resultado
                            </button>
                            {proposta.status === 'pendente' && (
                              <button
                                onClick={() => handleExcluir(proposta.id, proposta.numero_proposta)}
                                style={{
                                  padding: '6px 12px',
                                  background: '#dc3545',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                                title="Excluir proposta"
                              >
                                🗑️
                              </button>
                            )}
                          </>
                        )}
                        {proposta.status === 'excluido' && (
                          <span style={{ fontSize: '12px', color: '#999' }}>
                            Excluída
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Resumo */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: '#f9fafb',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: '14px', color: '#666' }}>
          Total: <strong>{propostasFiltradas.length}</strong> {propostasFiltradas.length === 1 ? 'proposta' : 'propostas'}
        </span>
        <button
          onClick={() => navigate('/novo-pedido')}
          style={{
            padding: '10px 20px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          ➕ Nova Proposta
        </button>
      </div>

      {resultadoModalOpen && (
        <div
          onClick={closeResultadoModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '18px',
            zIndex: 9999
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(560px, 100%)',
              borderRadius: '16px',
              background: 'linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
              border: '1px solid rgba(17,24,39,0.10)',
              overflow: 'hidden'
            }}
          >
            <div style={{
              padding: '16px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #111827 0%, #0b1220 100%)',
              color: 'white'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '800', letterSpacing: '0.3px' }}>
                  Resultado da Proposta
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>
                  #{formatNumeroProposta(propostaSelecionada?.numero_proposta)} • {propostaSelecionada?.cliente_nome}
                </div>
              </div>
              <button
                onClick={closeResultadoModal}
                disabled={salvandoResultado}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: 'rgba(255,255,255,0.10)',
                  color: 'white',
                  cursor: salvandoResultado ? 'not-allowed' : 'pointer',
                  fontWeight: '900'
                }}
                title="Fechar"
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '18px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '10px',
                marginBottom: '14px'
              }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#111827' }}>
                  Selecione o resultado
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                  <button
                    onClick={() => setResultadoSelecionado('')}
                    disabled={salvandoResultado}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: resultadoSelecionado === '' ? '2px solid #111827' : '1px solid #e5e7eb',
                      background: resultadoSelecionado === '' ? 'rgba(17,24,39,0.06)' : 'white',
                      cursor: salvandoResultado ? 'not-allowed' : 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontWeight: '800', fontSize: '13px', color: '#111827' }}>⏳ Sem resultado</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Ainda em negociação / sem definição.</div>
                  </button>

                  <button
                    onClick={() => setResultadoSelecionado('efetivada')}
                    disabled={salvandoResultado}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: resultadoSelecionado === 'efetivada' ? '2px solid #16a34a' : '1px solid #e5e7eb',
                      background: resultadoSelecionado === 'efetivada' ? 'rgba(22,163,74,0.08)' : 'white',
                      cursor: salvandoResultado ? 'not-allowed' : 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a' }}>✅ Efetivada</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Virou venda. Entra no cálculo de conversão do admin.</div>
                  </button>

                  <button
                    onClick={() => setResultadoSelecionado('perdida')}
                    disabled={salvandoResultado}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: resultadoSelecionado === 'perdida' ? '2px solid #dc2626' : '1px solid #e5e7eb',
                      background: resultadoSelecionado === 'perdida' ? 'rgba(220,38,38,0.08)' : 'white',
                      cursor: salvandoResultado ? 'not-allowed' : 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a' }}>❌ Perdida</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Não virou venda. Informe o motivo (curto) abaixo.</div>
                  </button>
                </div>
              </div>

              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#111827', marginBottom: '6px' }}>
                  Motivo (apenas se perdida)
                </label>
                <input
                  value={motivoPerda}
                  onChange={(e) => setMotivoPerda(e.target.value)}
                  disabled={salvandoResultado || resultadoSelecionado !== 'perdida'}
                  maxLength={140}
                  placeholder={resultadoSelecionado === 'perdida' ? 'Ex: preço alto, prazo, concorrência, desistiu...' : '—'}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: resultadoSelecionado === 'perdida' ? '1px solid #e5e7eb' : '1px dashed #e5e7eb',
                    background: resultadoSelecionado === 'perdida' ? 'white' : '#f9fafb',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px', color: '#6b7280' }}>
                  <span>
                    {resultadoSelecionado === 'perdida' ? 'Obrigatório' : 'Desabilitado'}
                  </span>
                  <span>
                    {(motivoPerda || '').length}/140
                  </span>
                </div>
              </div>
            </div>

            <div style={{
              padding: '14px 18px',
              background: '#fff',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '10px'
            }}>
              <button
                onClick={closeResultadoModal}
                disabled={salvandoResultado}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb',
                  background: 'white',
                  fontWeight: '800',
                  cursor: salvandoResultado ? 'not-allowed' : 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={salvarResultado}
                disabled={salvandoResultado}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: salvandoResultado
                    ? 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
                    : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: 'white',
                  fontWeight: '900',
                  cursor: salvandoResultado ? 'not-allowed' : 'pointer'
                }}
              >
                {salvandoResultado ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoricoPropostas;
