import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNavigation from '../components/AdminNavigation';
import { db } from '../config/supabase';
import { formatCurrency } from '../utils/formatters';
import '../styles/Dashboard.css';

const DashboardAdmin = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [guindastes, setGuindastes] = useState([]);
  const [periodo, setPeriodo] = useState('30'); // 7, 30, 90, all

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/');
      return;
    }
  }, [navigate]);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [usersResp, pedidosResp, guindastesResp] = await Promise.all([
          db.getUsers(),
          db.getPedidos(),
          db.getGuindastes()
        ]);
        setUsers(usersResp);
        setPedidos(pedidosResp);
        setGuindastes(guindastesResp);
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (user) load();
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
    const totalGuindastes = guindastes.length;
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
  }, [users, guindastes, pedidos, pedidosFiltrados, periodo]);

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

  // Top capacidades
  const topCapacidades = useMemo(() => {
    const map = new Map();
    guindastes.forEach(g => {
      const sub = g.subgrupo || '';
      const modeloBase = sub.replace(/^(Guindaste\s+)+/, '').split(' ').slice(0, 2).join(' ');
      const match = modeloBase.match(/(\d+\.?\d*)/);
      const cap = match ? match[1] : 'N/A';
      map.set(cap, (map.get(cap) || 0) + 1);
    });
    const arr = Array.from(map.entries()).map(([cap, q]) => ({ cap, q }));
    arr.sort((a, b) => b.q - a.q);
    return arr.slice(0, 5);
  }, [guindastes]);

  // Alertas de dados
  const alertas = useMemo(() => {
    const semImagem = guindastes.filter(g => !g.imagem_url).length;
    return [
      { id: 'img', label: 'Guindastes sem imagem', value: semImagem },
    ];
  }, [guindastes]);

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
    <div className="admin-layout">
      <AdminNavigation user={user} />
      <div className="admin-content">
        <div className="dashboard-container">
          <div className="dashboard-content">
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
                <div className="stat-info">
                  <div className="stat-value">{kpis.totalGuindastes}</div>
                  <div className="stat-label">Guindastes</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-info">
                  <div className="stat-value">{kpis.totalVendedores}</div>
                  <div className="stat-label">Vendedores</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-info">
                  <div className="stat-value">{kpis.totalPedidos}</div>
                  <div className="stat-label">Pedidos</div>
                </div>
              <div className={`stat-trend ${kpis.varPedidos >= 0 ? 'up' : 'down'}`}>
                {kpis.varPedidos >= 0 ? '↑' : '↓'} {Math.abs(kpis.varPedidos)}%
              </div>
              </div>
              <div className="stat-card">
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
                <h3>Alertas de Dados</h3>
              </div>
              <ul className="alerts-list">
                {alertas.map(a => (
                  <li key={a.id} className="alert-item">
                    <span>{a.label}</span>
                    <strong className={a.value > 0 ? 'text-warning' : 'text-success'}>{a.value}</strong>
                  </li>
                ))}
              </ul>
            </div>

            <div className="section-card">
              <div className="section-header">
                <h3>Ranking de Vendedores</h3>
              </div>
              <div className="tops">
                {rankingVendedores.map(v => (
                  <div key={v.nome} className="top-row">
                    <span className="top-label">{v.nome}</span>
                    <div className="top-bar">
                      <div className="top-fill" style={{ width: `${(v.valor / (rankingVendedores[0]?.valor || 1)) * 100}%` }} />
                    </div>
                    <span className="top-value">{formatCurrency(v.valor)}</span>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardAdmin; 