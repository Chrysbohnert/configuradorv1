import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import { db } from '../config/supabase';
import { formatCurrency } from '../utils/formatters';
import '../styles/Dashboard.css';

const DashboardAdmin = () => {
  const navigate = useNavigate();
  const { user } = useOutletContext(); // Pega o usuário do AdminLayout
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [guindastes, setGuindastes] = useState([]);
  const [guindastesCount, setGuindastesCount] = useState(0);
  const [periodo, setPeriodo] = useState('30'); // 7, 30, 90, all
  const [visaoConversao, setVisaoConversao] = useState('criadas'); // criadas | efetivadas

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        setIsLoading(true);
        console.log('🔄 Carregando dados reais do dashboard...');

        const isAdminConcessionaria = user?.tipo === 'admin_concessionaria';
        const concessionariaId = user?.concessionaria_id;

        // Carrega dados reais do banco em paralelo (versões otimizadas)
        const usersPromise = isAdminConcessionaria
          ? db.getUsers({ concessionaria_id: concessionariaId })
          : db.getUsers();

        const [usersResp, guindastesCountResp] = await Promise.all([
          usersPromise.catch(err => {
            console.error('❌ Erro ao carregar usuários:', err);
            return [];
          }),
          db.getGuindastesCountForDashboard().catch(err => {
            console.error('❌ Erro ao carregar contagem de guindastes:', err);
            return 0;
          })
        ]);

        const idsVendedores = (usersResp || [])
          .filter(u => u?.tipo === 'vendedor' || u?.tipo === 'vendedor_concessionaria')
          .map(u => u.id);

        const pedidosResp = await (isAdminConcessionaria
          ? db.getPropostas({ vendedor_id: idsVendedores }).catch(err => {
            console.error('❌ Erro ao carregar propostas:', err);
            return [];
          })
          : db.getPropostas().catch(err => {
            console.error('❌ Erro ao carregar propostas:', err);
            return [];
          }));
        
        console.log('📊 Dados carregados:', {
          usuarios: usersResp.length,
          propostas: pedidosResp.length,
          guindastes: guindastesCountResp
        });
        
        setUsers(usersResp || []);
        setPedidos(pedidosResp || []);
        setGuindastesCount(guindastesCountResp || 0);
        
        console.log('✅ Dashboard carregado com dados reais!');
      } catch (error) {
        console.error('❌ Erro geral ao carregar dashboard:', error);
        setUsers([]);
        setPedidos([]);
        setGuindastes([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user]);

  const propostasFiltradas = useMemo(() => {
    const fonte = (pedidos || []);
    if (periodo === 'all') {
      if (visaoConversao === 'efetivadas') {
        return fonte.filter(p => !!p.data_resultado_venda && (p.resultado_venda === 'efetivada' || p.resultado_venda === 'perdida'));
      }
      return fonte;
    }

    const dias = parseInt(periodo, 10);
    const limite = new Date();
    limite.setDate(limite.getDate() - dias);

    if (visaoConversao === 'efetivadas') {
      return fonte.filter(p => {
        if (!p.data_resultado_venda) return false;
        if (!(p.resultado_venda === 'efetivada' || p.resultado_venda === 'perdida')) return false;
        const d = new Date(p.data_resultado_venda);
        return d >= limite;
      });
    }

    return fonte.filter(p => {
      const d = p.created_at ? new Date(p.created_at) : null;
      return d ? d >= limite : true;
    });
  }, [pedidos, periodo, visaoConversao]);

  const kpis = useMemo(() => {
    const totalVendedores = users.filter(u => u.tipo === 'vendedor').length;
    const totalGuindastes = guindastesCount; // Usa a contagem direta
    const totalPropostas = propostasFiltradas.length;
    const resultado = propostasFiltradas.reduce((s, p) => s + (p.valor_total || 0), 0);

    const efetivadas = propostasFiltradas.filter(p => p.resultado_venda === 'efetivada');
    const perdidas = propostasFiltradas.filter(p => p.resultado_venda === 'perdida');
    const semResultado = propostasFiltradas.filter(p => !p.resultado_venda);
    const efetivadasValor = efetivadas.reduce((s, p) => s + (p.valor_total || 0), 0);
    const perdidasValor = perdidas.reduce((s, p) => s + (p.valor_total || 0), 0);

    const baseTaxa = visaoConversao === 'efetivadas'
      ? (efetivadas.length + perdidas.length)
      : (totalPropostas - semResultado.length);
    const taxaConversao = baseTaxa > 0 ? Math.round((efetivadas.length / baseTaxa) * 100) : 0;

    const dias = periodo === 'all' ? 30 : parseInt(periodo, 10);
    const inicioAtual = new Date();
    inicioAtual.setDate(inicioAtual.getDate() - dias);
    const inicioAnterior = new Date(inicioAtual);
    inicioAnterior.setDate(inicioAnterior.getDate() - dias);

    const propostasAnterior = pedidos.filter(p => {
      const d = visaoConversao === 'efetivadas'
        ? (p.data_resultado_venda ? new Date(p.data_resultado_venda) : null)
        : (p.created_at ? new Date(p.created_at) : null);

      if (!d) return false;
      if (visaoConversao === 'efetivadas' && !(p.resultado_venda === 'efetivada' || p.resultado_venda === 'perdida')) return false;
      return d >= inicioAnterior && d < inicioAtual;
    });
    const totalPropostasAnt = propostasAnterior.length;
    const resultadoAnt = propostasAnterior.reduce((s, p) => s + (p.valor_total || 0), 0);

    const variacao = (atual, ant) => {
      if (!ant) return 100;
      return Math.round(((atual - ant) / ant) * 100);
    };

    return {
      totalVendedores,
      totalGuindastes,
      totalPropostas,
      resultado,
      efetivadas: efetivadas.length,
      perdidas: perdidas.length,
      semResultado: semResultado.length,
      taxaConversao,
      efetivadasValor,
      perdidasValor,
      varPropostas: variacao(totalPropostas, totalPropostasAnt),
      varResultado: variacao(resultado, resultadoAnt)
    };
  }, [users, guindastesCount, pedidos, propostasFiltradas, periodo, visaoConversao]);

  const pipeline = useMemo(() => {
    const counts = { sem_resultado: 0, efetivada: 0, perdida: 0 };
    propostasFiltradas.forEach(p => {
      const r = (p.resultado_venda || '').toLowerCase();
      if (r === 'efetivada') counts.efetivada += 1;
      else if (r === 'perdida') counts.perdida += 1;
      else counts.sem_resultado += 1;
    });
    return counts;
  }, [propostasFiltradas]);


  const seriePropostas = useMemo(() => {
    const map = new Map();
    const today = new Date();
    const start = new Date(today);
    if (periodo !== 'all') {
      start.setDate(start.getDate() - parseInt(periodo, 10) + 1);
    } else {
      // usa 30 dias retroativos por padrão visual
      start.setDate(start.getDate() - 29);
    }
    // Inicializa todos os dias com 0
    const cursor = new Date(start);
    while (cursor <= today) {
      const key = cursor.toISOString().slice(0, 10);
      map.set(key, 0);
      cursor.setDate(cursor.getDate() - 0 + 1);
    }
    propostasFiltradas.forEach(p => {
      const d = visaoConversao === 'efetivadas'
        ? (p.data_resultado_venda ? new Date(p.data_resultado_venda) : null)
        : (p.created_at ? new Date(p.created_at) : null);
      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
    });
    const points = Array.from(map.entries()).map(([date, value]) => ({ date, value }));
    return points;
  }, [propostasFiltradas, periodo, visaoConversao]);

  // Ranking de vendedores (por valor total / valor efetivado na visão de efetivação)
  const rankingVendedores = useMemo(() => {
    const totals = new Map();
    propostasFiltradas.forEach(p => {
      if (visaoConversao === 'efetivadas' && p.resultado_venda !== 'efetivada') return;
      const nome = p.vendedor_nome || p.vendedor?.nome || p.vendedor || 'Desconhecido';
      totals.set(nome, (totals.get(nome) || 0) + (p.valor_total || 0));
    });
    const arr = Array.from(totals.entries()).map(([nome, valor]) => ({ nome, valor }));
    arr.sort((a, b) => b.valor - a.valor);
    return arr.slice(0, 5);
  }, [propostasFiltradas, visaoConversao]);

  const conversionRing = useMemo(() => {
    const pct = Math.max(0, Math.min(100, kpis.taxaConversao || 0));
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const dash = (pct / 100) * circumference;
    return {
      pct,
      radius,
      circumference,
      dash,
    };
  }, [kpis.taxaConversao]);

  if (!user) return null;

  return (
    <>
      <UnifiedHeader 
        showBackButton={false}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title="Dashboard Admin"
        subtitle="Resumo geral do sistema"
      />
        <div className="dashboard-container">
          <div className="dashboard-content">
            {isLoading ? (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '60vh',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  border: '4px solid #e0e0e0', 
                  borderTop: '4px solid #000', 
                  borderRadius: '50%', 
                  animation: 'spin 1s linear infinite' 
                }} />
                <p style={{ color: '#666', fontSize: '14px' }}>Carregando dashboard...</p>
              </div>
            ) : (
              <>
                <div className="dashboard-header">
                  <div className="welcome-section">
                    <h1>Dashboard</h1>
                    <p>Resumo geral do sistema</p>
                  </div>

                  <div className="filters-inline">
                    <label>Período</label>
                    <select value={periodo} onChange={e => setPeriodo(e.target.value)} className="filter-select">
                      <option value="7">7 dias</option>
                      <option value="30">30 dias</option>
                      <option value="90">90 dias</option>
                      <option value="all">Todos</option>
                    </select>
                  </div>

                  <div className="filters-inline">
                    <label>Visão</label>
                    <select value={visaoConversao} onChange={e => setVisaoConversao(e.target.value)} className="filter-select">
                      <option value="criadas">Propostas criadas no período</option>
                      <option value="efetivadas">Resultados (efetivadas/perdidas) no período</option>
                    </select>
                  </div>
                </div>

                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                      </svg>
                    </div>
                    <div className="stat-info">
                      <div className="stat-value">{kpis.totalGuindastes}</div>
                      <div className="stat-label">Guindastes</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                      </svg>
                    </div>
                    <div className="stat-info">
                      <div className="stat-value">{kpis.totalVendedores}</div>
                      <div className="stat-label">Vendedores</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14H7v-5h3v5zm4 0h-3V8h3v9zm4 0h-3v-7h3v7z"/>
                      </svg>
                    </div>
                    <div className="stat-info">
                      <div className="stat-value">{kpis.totalPropostas}</div>
                      <div className="stat-label">Propostas</div>
                    </div>
                    <div className={`stat-trend ${kpis.varPropostas >= 0 ? 'up' : 'down'}`}>
                      {kpis.varPropostas >= 0 ? '↑' : '↓'} {Math.abs(kpis.varPropostas)}%
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.2l-3.5-3.5L4 14.2l5 5 12-12-1.5-1.5L9 16.2z"/>
                      </svg>
                    </div>
                    <div className="stat-info">
                      <div className="stat-value">{kpis.efetivadas}</div>
                      <div className="stat-label">Efetivadas</div>
                    </div>
                    <div className="stat-trend up">
                      {kpis.taxaConversao}%
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </div>
                    <div className="stat-info">
                      <div className="stat-value">{kpis.perdidas}</div>
                      <div className="stat-label">Perdidas</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                      </svg>
                    </div>
                    <div className="stat-info">
                      <div className="stat-value">{formatCurrency(kpis.resultado)}</div>
                      <div className="stat-label">Valor Total (R$)</div>
                    </div>
                    <div className={`stat-trend ${kpis.varResultado >= 0 ? 'up' : 'down'}`}>
                      {kpis.varResultado >= 0 ? '↑' : '↓'} {Math.abs(kpis.varResultado)}%
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-2.83.48-5.48-.3-7.53-2.05l1.41-1.41A7.96 7.96 0 0013 19.93V19h0zM6.88 7.05 5.47 5.64A9.95 9.95 0 0113 4.07V5c-2.01.2-3.84 1.03-5.12 2.05zM13 17v-2h-2v-2h2V7h2v6h2v2h-2v2h-2z"/>
                      </svg>
                    </div>
                    <div className="stat-info">
                      <div className="stat-value">{formatCurrency(kpis.efetivadasValor)}</div>
                      <div className="stat-label">Valor Efetivado</div>
                    </div>
                  </div>
                </div>

                <div className="dashboard-sections">
                  {/* Gráfico de linha de propostas */}
                  <div className="section-card wide">
                    <div className="section-header">
                      <h3>{visaoConversao === 'efetivadas' ? 'Resultados por dia' : 'Propostas por dia'}</h3>
                    </div>
                    <div className="line-chart">
                      {(() => {
                        const width = 600;
                        const height = 180;
                        const padding = 24;
                        const data = seriePropostas;
                        const max = Math.max(1, ...data.map(p => p.value));
                        const stepX = (width - padding * 2) / Math.max(1, data.length - 1);
                        const pointsArr = data.map((p, i) => {
                          const x = padding + i * stepX;
                          const y = height - padding - (p.value / max) * (height - padding * 2);
                          return { x, y, p };
                        });
                        const points = pointsArr.map(pt => `${pt.x},${pt.y}`).join(' ');
                        return (
                          <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
                            <polyline fill="none" stroke="#111827" strokeWidth="2" points={points} />
                            <polyline fill="rgba(17,24,39,0.08)" stroke="none" points={`${points} ${width - padding},${height - padding} ${padding},${height - padding}`} />
                            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" />
                            <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e5e7eb" />
                            {pointsArr.map((pt, idx) => (
                              <g key={idx}>
                                <circle cx={pt.x} cy={pt.y} r={3} fill="#111827" />
                                <rect
                                  x={pt.x - 8}
                                  y={padding}
                                  width={16}
                                  height={height - padding * 2}
                                  fill="transparent"
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => alert(`${visaoConversao === 'efetivadas' ? 'Resultados' : 'Propostas'} em ${pt.p.date}: ${pt.p.value}`)}
                                />
                              </g>
                            ))}
                          </svg>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="section-card conversion-card">
                    <div className="section-header">
                      <h3>Conversão</h3>
                    </div>

                    <div className="conversion-hero">
                      <div className="conversion-ring">
                        <svg width="96" height="96" viewBox="0 0 96 96" aria-label="Taxa de conversão">
                          <circle cx="48" cy="48" r={conversionRing.radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
                          <circle
                            cx="48"
                            cy="48"
                            r={conversionRing.radius}
                            fill="none"
                            stroke="#111827"
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray={`${conversionRing.dash} ${conversionRing.circumference}`}
                            transform="rotate(-90 48 48)"
                          />
                        </svg>
                        <div className="conversion-ring-text">
                          <div className="conversion-ring-pct">{conversionRing.pct}%</div>
                          <div className="conversion-ring-sub">taxa</div>
                        </div>
                      </div>

                      <div className="conversion-summary">
                        <div className="conversion-summary-title">
                          {visaoConversao === 'efetivadas' ? 'Resultados no período' : 'Propostas no período'}
                        </div>
                        <div className="conversion-summary-kpis">
                          <div className="conversion-mini">
                            <div className="conversion-mini-label">Efetivadas</div>
                            <div className="conversion-mini-value">{kpis.efetivadas}</div>
                          </div>
                          <div className="conversion-mini">
                            <div className="conversion-mini-label">Perdidas</div>
                            <div className="conversion-mini-value">{kpis.perdidas}</div>
                          </div>
                          <div className="conversion-mini">
                            <div className="conversion-mini-label">Sem resultado</div>
                            <div className="conversion-mini-value">{kpis.semResultado}</div>
                          </div>
                        </div>

                        <div className="conversion-bar" role="img" aria-label="Distribuição de conversão">
                          {(() => {
                            const total = Math.max(1, kpis.totalPropostas || 0);
                            const wEf = Math.round((pipeline.efetivada / total) * 100);
                            const wPe = Math.round((pipeline.perdida / total) * 100);
                            const wSe = Math.max(0, 100 - wEf - wPe);
                            return (
                              <>
                                <div className="conversion-seg seg-efetivada" style={{ width: `${wEf}%` }} />
                                <div className="conversion-seg seg-perdida" style={{ width: `${wPe}%` }} />
                                <div className="conversion-seg seg-sem" style={{ width: `${wSe}%` }} />
                              </>
                            );
                          })()}
                        </div>

                        <div className="conversion-values">
                          <div className="conversion-value">
                            <span className="dot dot-efetivada" />
                            <span className="label">Valor efetivado</span>
                            <span className="value">{formatCurrency(kpis.efetivadasValor)}</span>
                          </div>
                          <div className="conversion-value">
                            <span className="dot dot-perdida" />
                            <span className="label">Valor perdido</span>
                            <span className="value">{formatCurrency(kpis.perdidasValor)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

            <div className="section-card">
              <div className="section-header">
                <h3>Ranking de Vendedores</h3>
              </div>
              <div className="ranking-vendedores">
                {rankingVendedores.map((v, index) => (
                  <div key={v.nome} className="ranking-row">
                    <div className="ranking-info">
                      <span className="ranking-position">{index + 1}</span>
                      <div className="ranking-name-container">
                        <span className="ranking-name">{v.nome}</span>
                      </div>
                    </div>
                    <div className="ranking-bar-container">
                      <div className="ranking-bar">
                        <div 
                          className="ranking-fill" 
                          style={{ 
                            width: `${(v.valor / (rankingVendedores[0]?.valor || 1)) * 100}%`,
                            background: index === 0 ? 'linear-gradient(90deg, #5e5e60ff, #6366f1)' : 
                                      index === 1 ? 'linear-gradient(90deg, #4b5563, #6b7280)' :
                                      'linear-gradient(90deg, #9ca3af, #d1d5db)'
                          }} 
                        />
                      </div>
                      <span className="ranking-value">{formatCurrency(v.valor)}</span>
                    </div>
                  </div>
                ))}
                {rankingVendedores.length === 0 && (<div className="empty">Sem dados</div>)}
              </div>
            </div>

                </div>
              </>
            )}
        </div>
      </div>
    </>
  );
};

export default DashboardAdmin; 