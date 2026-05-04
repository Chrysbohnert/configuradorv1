import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import { db } from '../config/supabase';
import { formatCurrency } from '../utils/formatters';
import '../styles/DashboardVendedor.css';
import '../styles/Dashboard.css';

const DashboardVendedor = () => {
  const navigate = useNavigate();
  const { user } = useOutletContext();

  const [periodo, setPeriodo] = useState('30');
  const [propostas, setPropostas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [metaMes, setMetaMes] = useState({ meta_propostas: 0, meta_valor: 0 });

  useEffect(() => {
    if (!user) return;
    const hoje = new Date();
    db.getMetaVendedor(user.id, hoje.getFullYear(), hoje.getMonth() + 1)
      .then((m) => { if (m) setMetaMes({ meta_propostas: m.meta_propostas || 0, meta_valor: m.meta_valor || 0 }); })
      .catch(() => {});
  }, [user]);

  // Fetch apenas quando user muda — não refaz requisição ao banco por mudança de período
  useEffect(() => {
    if (!user) return;

    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        const propostasResp = await db.getPropostas({ vendedor_id: user?.id });
        setPropostas(Array.isArray(propostasResp) ? propostasResp : []);
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        setPropostas([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  const propostasFiltradas = useMemo(() => {
    return propostas.filter((p) => {
      if (periodo === 'all') return true;
      const dias = parseInt(periodo, 10);
      const dataProposta = p?.created_at ? new Date(p.created_at) : null;
      if (!dataProposta) return false;
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - dias);
      return dataProposta >= dataLimite;
    });
  }, [propostas, periodo]);

  // Recalcula stats client-side quando período ou propostas mudam
  const stats = useMemo(() => {
    const vendasEfetivadas = propostasFiltradas.filter(
      (p) => p.resultado_venda === 'efetivada' || p.status === 'finalizado'
    );
    const valorVendas = vendasEfetivadas.reduce((acc, p) => acc + (p.valor_total || 0), 0);
    const propostasGanhas = propostasFiltradas.filter((p) => p.resultado_venda === 'efetivada').length;
    const propostasComResultado = propostasFiltradas.filter(
      (p) => p.resultado_venda === 'efetivada' || p.resultado_venda === 'perdida'
    ).length;
    const atividadesRecentes = [...propostas]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 6)
      .map((p) => {
        const cliente = p.cliente_nome || p.nome_cliente || 'Cliente';
        const valor = formatCurrency(p.valor_total || 0);
        const status = p.resultado_venda ? p.resultado_venda : p.status || 'em andamento';
        return {
          texto: `Proposta para ${cliente} (${valor}) está ${status}.`,
          tipo: p.resultado_venda === 'efetivada' ? 'success' : p.resultado_venda === 'perdida' ? 'danger' : 'info',
        };
      });
    return {
      vendasMes: valorVendas,
      propostasEnviadas: propostasFiltradas.length,
      taxaConversao: propostasComResultado > 0 ? Math.round((propostasGanhas / propostasComResultado) * 100) : 0,
      atividadesRecentes,
    };
  }, [propostasFiltradas, propostas]);

  const progressoValor = metaMes.meta_valor > 0 ? Math.min((stats.vendasMes / metaMes.meta_valor) * 100, 100) : 0;
  const progressoPropostas = metaMes.meta_propostas > 0 ? Math.min((stats.propostasEnviadas / metaMes.meta_propostas) * 100, 100) : 0;

  const ticketMedio = useMemo(() => {
    return stats.propostasEnviadas > 0 ? stats.vendasMes / stats.propostasEnviadas : 0;
  }, [stats.propostasEnviadas, stats.vendasMes]);

  const emNegociacao = useMemo(() => {
    return propostasFiltradas.filter((p) => !p.resultado_venda && p.status !== 'finalizado');
  }, [propostasFiltradas]);

  const ganhosRecentes = useMemo(() => {
    return propostasFiltradas.filter((p) => p.resultado_venda === 'efetivada');
  }, [propostasFiltradas]);

  const perdidas = useMemo(() => {
    return propostasFiltradas.filter((p) => p.resultado_venda === 'perdida');
  }, [propostasFiltradas]);

  const aguardandoDecisao = useMemo(() => {
    return propostasFiltradas.filter((p) => {
      const status = (p.status || '').toLowerCase();
      return !p.resultado_venda && (status.includes('aguard') || status.includes('analise'));
    });
  }, [propostasFiltradas]);

  const oportunidadesQuentes = useMemo(() => {
    return [...emNegociacao]
      .sort((a, b) => (b.valor_total || 0) - (a.valor_total || 0))
      .slice(0, 3);
  }, [emNegociacao]);

  const propostasRecentes = useMemo(() => {
    return [...propostasFiltradas]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 5);
  }, [propostasFiltradas]);

  const periodLabel = useMemo(() => {
    if (periodo === '30') return 'Últimos 30 dias';
    if (periodo === '90') return 'Últimos 90 dias';
    return 'Todo o período';
  }, [periodo]);

  const seriePropostas = useMemo(() => {
    const dias = periodo === 'all' ? 12 : periodo === '90' ? 12 : 10;
    const hoje = new Date();
    const pontos = [];

    for (let i = dias - 1; i >= 0; i -= 1) {
      const d = new Date(hoje);
      d.setDate(d.getDate() - i);

      const valor = propostasFiltradas.filter((p) => {
        if (!p.created_at) return false;
        const data = new Date(p.created_at);
        return (
          data.getDate() === d.getDate() &&
          data.getMonth() === d.getMonth() &&
          data.getFullYear() === d.getFullYear()
        );
      }).length;

      pontos.push({
        label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        value: valor,
      });
    }

    return pontos;
  }, [propostasFiltradas, periodo]);

  const pipelineData = useMemo(() => [
    {
      label: 'Em Negociação',
      count: emNegociacao.length,
      value: emNegociacao.reduce((acc, p) => acc + (p.valor_total || 0), 0),
      tone: 'warning',
    },
    {
      label: 'Aguardando Decisão',
      count: aguardandoDecisao.length,
      value: aguardandoDecisao.reduce((acc, p) => acc + (p.valor_total || 0), 0),
      tone: 'info',
    },
    {
      label: 'Ganhos Recentes',
      count: ganhosRecentes.length,
      value: ganhosRecentes.reduce((acc, p) => acc + (p.valor_total || 0), 0),
      tone: 'success',
    },
    {
      label: 'Perdidas',
      count: perdidas.length,
      value: perdidas.reduce((acc, p) => acc + (p.valor_total || 0), 0),
      tone: 'danger',
    },
  ], [emNegociacao, aguardandoDecisao, ganhosRecentes, perdidas]);

  if (!user) return null;

  return (
    <>
      <UnifiedHeader
        user={user}
        title="Meu Dashboard"
        subtitle={`Olá, ${user.nome}! Aqui está o resumo do seu desempenho.`}
      />

      <div className="dashboard-container-redesigned vendedor-dashboard-premium">
        <section className="seller-hero">
          <div className="seller-hero-glow seller-hero-glow-1" />
          <div className="seller-hero-glow seller-hero-glow-2" />

          <div className="seller-hero-top">
            <div>
              <span className="seller-eyebrow">Painel Comercial</span>
              <h1 className="seller-hero-title">Desempenho do Vendedor</h1>
              <p className="seller-hero-subtitle">
                Acompanhe sua evolução, pipeline, atividades e oportunidades com uma visão mais estratégica.
              </p>
            </div>

            <div className="seller-hero-pill-group">
              <span className="seller-hero-pill">{periodLabel}</span>
              <span className="seller-hero-pill seller-hero-pill-dark">
                {formatCurrency(stats.vendasMes)} em vendas
              </span>
            </div>
          </div>

          <div className="dashboard-header-redesigned">
            <div className="filters-container">
              <div className="filter-group">
                <label className="filter-label">Período</label>
                <select
                  className="filter-select"
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                >
                  <option value="30">Últimos 30 dias</option>
                  <option value="90">Últimos 90 dias</option>
                  <option value="all">Todo o período</option>
                </select>
              </div>
            </div>

            <div className="actions-container">
              <button className="btn btn-secondary seller-action-btn" onClick={() => navigate('/propostas')}>
                Ver Propostas
              </button>
              <button className="btn btn-primary seller-action-btn" onClick={() => navigate('/novo-pedido')}>
                + Nova Proposta
              </button>
            </div>
          </div>
        </section>

        <section className="kpi-grid">
          <div className="card kpi-card seller-kpi-card seller-kpi-sales">
            <div className="seller-kpi-icon">💰</div>
            <span className="kpi-label">Vendas no Período</span>
            <span className="kpi-value">{formatCurrency(stats.vendasMes)}</span>
            <small className="kpi-helper-text">Valor total efetivado no período selecionado</small>
          </div>

          <div className="card kpi-card seller-kpi-card seller-kpi-proposals">
            <div className="seller-kpi-icon">📄</div>
            <span className="kpi-label">Propostas Enviadas</span>
            <span className="kpi-value">{stats.propostasEnviadas}</span>
            <small className="kpi-helper-text">Total de propostas registradas no período</small>
          </div>

          <div className="card kpi-card seller-kpi-card seller-kpi-conversion">
            <div className="seller-kpi-icon">📈</div>
            <span className="kpi-label">Taxa de Conversão</span>
            <span className="kpi-value">{stats.taxaConversao}%</span>
            <small className="kpi-helper-text">Conversão sobre propostas com resultado</small>
          </div>

          <div className="card kpi-card seller-kpi-card meta-card seller-kpi-meta">
            <div className="seller-kpi-icon">🎯</div>
            <span className="kpi-label">Meta Mensal</span>

            {metaMes.meta_valor > 0 || metaMes.meta_propostas > 0 ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                      <span>Valor vendido</span>
                      <span>{Math.round(progressoValor)}%</span>
                    </div>
                    <div className="meta-progress-container">
                      <div className="meta-progress-bar" style={{ width: `${progressoValor}%` }} />
                    </div>
                    <span className="meta-value" style={{ fontSize: 13 }}>
                      {formatCurrency(stats.vendasMes)} / {formatCurrency(metaMes.meta_valor)}
                    </span>
                  </div>

                  {metaMes.meta_propostas > 0 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                        <span>Propostas geradas</span>
                        <span>{Math.round(progressoPropostas)}%</span>
                      </div>
                      <div className="meta-progress-container">
                        <div className="meta-progress-bar" style={{ width: `${progressoPropostas}%`, background: 'linear-gradient(90deg,#8b5cf6,#6d28d9)' }} />
                      </div>
                      <span className="meta-value" style={{ fontSize: 13 }}>
                        {stats.propostasEnviadas} / {metaMes.meta_propostas} propostas
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="meta-progress-container">
                  <div className="meta-progress-bar" style={{ width: '0%' }} />
                </div>
                <small className="kpi-helper-text" style={{ marginTop: 8, display: 'block' }}>Sem meta definida para este mês.<br/>O admin pode configurar em Gerenciar Vendedores.</small>
              </>
            )}
          </div>
        </section>

        <section className="seller-middle-grid">
         <div className="card seller-chart-card seller-period-table-card">
  <div className="card-top-row">
    <div>
      <h3 className="section-title">Movimentação do Período</h3>
      <p className="section-subtitle">
        Últimas propostas registradas dentro do período selecionado.
      </p>
    </div>
    <span className="seller-chip seller-chip-primary">{periodLabel}</span>
  </div>

      <div className="seller-period-table-wrap">
        <table className="seller-period-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Data</th>
            </tr>
          </thead>

          <tbody>
            {propostasRecentes.length > 0 ? (
              propostasRecentes.map((item, index) => (
                <tr key={index}>
                  <td>
                    <strong>{item.cliente_nome || item.nome_cliente || 'Cliente'}</strong>
                    <span>Proposta #{item.id || index + 1}</span>
                  </td>

                  <td>{formatCurrency(item.valor_total || 0)}</td>

                  <td>
                    <span
                      className={`seller-status-badge ${
                        item.resultado_venda === 'efetivada'
                          ? 'status-success'
                          : item.resultado_venda === 'perdida'
                          ? 'status-danger'
                          : 'status-neutral'
                      }`}
                    >
                      {item.resultado_venda || item.status || 'Em andamento'}
                    </span>
                  </td>

                  <td>
                    {new Date(item.created_at || Date.now()).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="seller-table-empty">
                  Nenhuma proposta encontrada neste período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

          <div className="card seller-summary-card">
            <div className="card-top-row">
              <div>
                <h3 className="section-title">Resumo Comercial</h3>
                <p className="section-subtitle">Indicadores rápidos do teu momento atual.</p>
              </div>
            </div>

            <div className="seller-summary-grid">
              <div className="seller-summary-item">
                <span className="seller-summary-label">Ticket Médio</span>
                <strong>{formatCurrency(ticketMedio)}</strong>
              </div>
              <div className="seller-summary-item">
                <span className="seller-summary-label">Em Negociação</span>
                <strong>{emNegociacao.length}</strong>
              </div>
              <div className="seller-summary-item">
                <span className="seller-summary-label">Ganhos</span>
                <strong>{ganhosRecentes.length}</strong>
              </div>
              <div className="seller-summary-item">
                <span className="seller-summary-label">Perdidas</span>
                <strong>{perdidas.length}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="card seller-funnel-card">
          <div className="card-top-row">
            <div>
              <h3 className="section-title">Meu Funil de Vendas</h3>
              <p className="section-subtitle">
                Acompanhe o volume e o valor das oportunidades em cada etapa.
              </p>
            </div>
          </div>

          <div className="seller-funnel-grid">
            {pipelineData.map((item) => (
              <div key={item.label} className={`seller-funnel-column tone-${item.tone}`}>
                <div className="seller-funnel-column-header">
                  <h4>{item.label}</h4>
                  <span className="seller-funnel-count">{item.count}</span>
                </div>

                <div className="seller-funnel-value">{formatCurrency(item.value)}</div>

                <div className="seller-funnel-cards">
                  {item.count > 0 ? (
                    [...propostasFiltradas]
                      .filter((p) => {
                        if (item.label === 'Em Negociação') {
                          return !p.resultado_venda && p.status !== 'finalizado';
                        }
                        if (item.label === 'Aguardando Decisão') {
                          const status = (p.status || '').toLowerCase();
                          return !p.resultado_venda && (status.includes('aguard') || status.includes('analise'));
                        }
                        if (item.label === 'Ganhos Recentes') {
                          return p.resultado_venda === 'efetivada';
                        }
                        return p.resultado_venda === 'perdida';
                      })
                      .slice(0, 3)
                      .map((p, idx) => (
                        <div key={`${item.label}-${idx}`} className="seller-funnel-mini-card">
                          <strong>{p.cliente_nome || p.nome_cliente || 'Cliente'}</strong>
                          <span>{formatCurrency(p.valor_total || 0)}</span>
                        </div>
                      ))
                  ) : (
                    <div className="seller-funnel-empty">Sem registros nesta etapa.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="seller-bottom-grid">
          <div className="card seller-activities-card">
            <div className="card-top-row">
              <div>
                <h3 className="section-title">Atividades Recentes</h3>
                <p className="section-subtitle">Últimas movimentações relacionadas às tuas propostas.</p>
              </div>
            </div>

            <ul className="activity-feed seller-activity-feed">
              {stats.atividadesRecentes.map((activity, index) => (
                <li key={index} className={`activity-item tone-${activity.tipo || 'info'}`}>
                  <span className="activity-dot" />
                  <span>{activity.texto || activity}</span>
                </li>
              ))}
              {stats.atividadesRecentes.length === 0 && (
                <li className="activity-item empty">Nenhuma atividade recente.</li>
              )}
            </ul>
          </div>

          <div className="seller-side-stack">
            <div className="card seller-opportunities-card">
              <div className="card-top-row">
                <div>
                  <h3 className="section-title">Oportunidades Quentes</h3>
                  <p className="section-subtitle">Maiores negociações abertas no período.</p>
                </div>
              </div>

              <div className="opportunity-list">
                {oportunidadesQuentes.length > 0 ? (
                  oportunidadesQuentes.map((item, index) => (
                    <div className="opportunity-item" key={index}>
                      <div>
                        <strong>{item.cliente_nome || item.nome_cliente || 'Cliente'}</strong>
                        <small>{item.status || 'Em andamento'}</small>
                      </div>
                      <span>{formatCurrency(item.valor_total || 0)}</span>
                    </div>
                  ))
                ) : (
                  <div className="empty-state-inline">Nenhuma oportunidade quente no período.</div>
                )}
              </div>
            </div>

            <div className="card seller-recent-proposals-card">
              <div className="card-top-row">
                <div>
                  <h3 className="section-title">Propostas Recentes</h3>
                  <p className="section-subtitle">Últimas propostas registradas por ti.</p>
                </div>
              </div>

              <div className="recent-proposals-list">
                {propostasRecentes.length > 0 ? (
                  propostasRecentes.map((item, index) => (
                    <div className="recent-proposal-row" key={index}>
                      <div className="recent-proposal-main">
                        <strong>{item.cliente_nome || item.nome_cliente || 'Cliente'}</strong>
                        <small>
                          {new Date(item.created_at || Date.now()).toLocaleDateString('pt-BR')}
                        </small>
                      </div>
                      <div className="recent-proposal-side">
                        <span>{formatCurrency(item.valor_total || 0)}</span>
                        <small>{item.resultado_venda || item.status || 'Em andamento'}</small>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state-inline">Nenhuma proposta recente encontrada.</div>
                )}
              </div>
            </div>
          </div>
        </section>

        {isLoading && (
          <div className="dashboard-loading-overlay">
            <div className="dashboard-loading-card">
              <div className="loading-spinner" />
              <span>Carregando seu dashboard...</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

function MiniSparkline({ data = [] }) {
  const width = 160;
  const height = 42;

  if (!data.length) {
    return <div className="sparkline-fallback" />;
  }

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg className="mini-sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline fill="none" stroke="currentColor" strokeWidth="2.5" points={points} />
    </svg>
  );
}

export default DashboardVendedor;