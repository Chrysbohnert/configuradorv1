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

  // Pedidos por período
  const pedidosFiltrados = useMemo(() => {
    if (periodo === 'all') return pedidos;
    const dias = parseInt(periodo, 10);
    const limite = new Date();
    limite.setDate(limite.getDate() - dias);
    return pedidos.filter(p => {
      const data = p.created_at ? new Date(p.created_at) : null;
      return data ? data >= limite : true;
    });
  }, [pedidos, periodo]);

  const kpis = useMemo(() => {
    const totalVendedores = users.filter(u => u.tipo === 'vendedor').length;
    const totalGuindastes = guindastesCount; // Usa a contagem direta
    const totalPedidos = pedidosFiltrados.length;
    const resultado = pedidosFiltrados.reduce((s, p) => s + (p.valor_total || 0), 0);

    const dias = periodo === 'all' ? 30 : parseInt(periodo, 10);
    const inicioAtual = new Date();
    inicioAtual.setDate(inicioAtual.getDate() - dias);
    const inicioAnterior = new Date(inicioAtual);
    inicioAnterior.setDate(inicioAnterior.getDate() - dias);

    const pedidosAnterior = pedidos.filter(p => {
      const d = p.created_at ? new Date(p.created_at) : null;
      return d && d >= inicioAnterior && d < inicioAtual;
    });
    const totalPedidosAnt = pedidosAnterior.length;
    const resultadoAnt = pedidosAnterior.reduce((s, p) => s + (p.valor_total || 0), 0);

    const variacao = (atual, ant) => {
      if (!ant) return 100;
      return Math.round(((atual - ant) / ant) * 100);
    };

    return {
      totalVendedores,
      totalGuindastes,
      totalPedidos,
      resultado,
      varPedidos: variacao(totalPedidos, totalPedidosAnt),
      varResultado: variacao(resultado, resultadoAnt)
    };
  }, [users, guindastesCount, pedidos, pedidosFiltrados, periodo]);

  // Pipeline simples por status
  const pipeline = useMemo(() => {
    const counts = { novo: 0, analise: 0, fechado: 0 };
    pedidosFiltrados.forEach(p => {
      const s = (p.status || 'novo').toLowerCase();
      if (s.includes('fech')) counts.fechado += 1;
      else if (s.includes('anal')) counts.analise += 1;
      else counts.novo += 1;
    });
    return counts;
  }, [pedidosFiltrados]);

  // Top capacidades - desabilitado temporariamente (requer carregar lista completa)
  const topCapacidades = useMemo(() => {
    // TODO: Implementar query otimizada no backend para obter top capacidades
    return [];
  }, []);


  // Série temporal de pedidos (por dia)
  const seriePedidos = useMemo(() => {
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
    pedidosFiltrados.forEach(p => {
      const d = p.created_at ? new Date(p.created_at) : null;
      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
    });
    const points = Array.from(map.entries()).map(([date, value]) => ({ date, value }));
    return points;
  }, [pedidosFiltrados, periodo]);

  // Ranking de vendedores (por valor total)
  const rankingVendedores = useMemo(() => {
    const totals = new Map();
    pedidosFiltrados.forEach(p => {
      const nome = p.vendedor_nome || p.vendedor?.nome || p.vendedor || 'Desconhecido';
      totals.set(nome, (totals.get(nome) || 0) + (p.valor_total || 0));
    });
    const arr = Array.from(totals.entries()).map(([nome, valor]) => ({ nome, valor }));
    arr.sort((a, b) => b.valor - a.valor);
    return arr.slice(0, 5);
  }, [pedidosFiltrados]);

  const recentes = useMemo(() => {
    return [...pedidos]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 8);
  }, [pedidos]);

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
                  <div className="stat-value">{kpis.totalPedidos}</div>
                  <div className="stat-label">Pedidos</div>
                </div>
                <div className={`stat-trend ${kpis.varPedidos >= 0 ? 'up' : 'down'}`}>
                  {kpis.varPedidos >= 0 ? '↑' : '↓'} {Math.abs(kpis.varPedidos)}%
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
                  <div className="stat-label">Resultado</div>
                </div>
                <div className={`stat-trend ${kpis.varResultado >= 0 ? 'up' : 'down'}`}>
                  {kpis.varResultado >= 0 ? '↑' : '↓'} {Math.abs(kpis.varResultado)}%
                </div>
              </div>
            </div>
          
          <div className="dashboard-sections">
            {/* Gráfico de linha de pedidos */}
            <div className="section-card wide">
              <div className="section-header">
                <h3>Pedidos por dia</h3>
              </div>
              <div className="line-chart">
                {(() => {
                  const width = 600;
                  const height = 180;
                  const padding = 24;
                  const data = seriePedidos;
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
                          <rect x={pt.x - 8} y={padding} width={16} height={height - padding * 2} fill="transparent" style={{ cursor: 'pointer' }}
                            onClick={() => alert(`Pedidos em ${pt.p.date}: ${pt.p.value}`)} />
                        </g>
                      ))}
                    </svg>
                  );
                })()}
              </div>
            </div>

            <div className="section-card">
              <div className="section-header">
                <h3>Pipeline de Pedidos</h3>
              </div>
              <div className="pipeline">
                {['novo','analise','fechado'].map(key => {
                  const labels = { novo: 'Novos', analise: 'Em análise', fechado: 'Fechados' };
                  const total = pedidosFiltrados.length || 1;
                  const pct = Math.round((pipeline[key] / total) * 100);
                  return (
                    <div key={key} className="pipe-row">
                      <span className="pipe-label">{labels[key]}</span>
                      <div className="pipe-bar">
                        <div className={`pipe-fill ${key}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="pipe-value">{pipeline[key]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="section-card">
              <div className="section-header">
                <h3>Top Capacidades (Qtd de modelos)</h3>
              </div>
              <div className="tops">
                {topCapacidades.map(item => (
                  <div key={item.cap} className="top-row">
                    <span className="top-label">{item.cap} t</span>
                    <div className="top-bar">
                      <div className="top-fill" style={{ width: `${(item.q / (topCapacidades[0]?.q || 1)) * 100}%` }} />
                    </div>
                    <span className="top-value">{item.q}</span>
                  </div>
                ))}
                {topCapacidades.length === 0 && (
                  <div className="empty">Sem dados</div>
                )}
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

            <div className="section-card">
              <div className="section-header">
                <h3>Atividades Recentes</h3>
              </div>
              <ul className="recent-list">
                {recentes.map(p => (
                  <li key={p.id || p.numero} className="recent-item">
                    <div className="recent-info">
                      <strong>Pedido {p.numero || p.id}</strong>
                      <span className="muted">{new Date(p.created_at || Date.now()).toLocaleDateString()}</span>
                    </div>
                    <span className={`badge ${
                      (p.status || 'novo').toLowerCase().includes('fech') ? 'success' :
                      (p.status || 'novo').toLowerCase().includes('anal') ? 'warning' : 'info'
                    }`}>
                      {(p.status || 'novo').toUpperCase()}
                    </span>
                  </li>
                ))}
                {recentes.length === 0 && (<div className="empty">Sem atividades</div>)}
              </ul>
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