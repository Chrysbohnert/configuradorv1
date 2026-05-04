import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import { db } from '../config/supabase';
import { formatCurrency } from '../utils/formatters';
import '../styles/DashboardAdmin.css';
import '../styles/Dashboard.css';

const DashboardAdmin = () => {
  const { user } = useOutletContext();
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [guindastesCount, setGuindastesCount] = useState(0);
  const [periodo, setPeriodo] = useState('30');
  const [visaoConversao, setVisaoConversao] = useState('criadas');
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [slideDir, setSlideDir] = useState('right');

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      try {
        setIsLoading(true);

        const isAdminConcessionaria = user?.tipo === 'admin_concessionaria';
        const concessionariaId = user?.concessionaria_id;

        const usersPromise = isAdminConcessionaria
          ? db.getUsers({ concessionaria_id: concessionariaId })
          : db.getUsers();

        const [usersResp, guindastesCountResp] = await Promise.all([
          usersPromise.catch((err) => {
            console.error('❌ Erro ao carregar usuários:', err);
            return [];
          }),
          db.getGuindastesCountForDashboard().catch((err) => {
            console.error('❌ Erro ao carregar contagem de guindastes:', err);
            return 0;
          }),
        ]);

        const idsVendedores = (usersResp || [])
          .filter((u) => u?.tipo === 'vendedor' || u?.tipo === 'vendedor_concessionaria')
          .map((u) => u.id);

        const pedidosResp = await (isAdminConcessionaria
          ? db.getPropostas({ vendedor_id: idsVendedores }).catch((err) => {
              console.error('❌ Erro ao carregar propostas:', err);
              return [];
            })
          : db.getPropostas().catch((err) => {
              console.error('❌ Erro ao carregar propostas:', err);
              return [];
            }));

        setUsers(usersResp || []);
        setPedidos(pedidosResp || []);
        setGuindastesCount(guindastesCountResp || 0);
      } catch (error) {
        console.error('❌ Erro geral ao carregar dashboard:', error);
        setUsers([]);
        setPedidos([]);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [user]);

  const propostasFiltradas = useMemo(() => {
    const fonte = pedidos || [];

    if (periodo === 'all') {
      if (visaoConversao === 'efetivadas') {
        return fonte.filter(
          (p) =>
            !!p.data_resultado_venda &&
            (p.resultado_venda === 'efetivada' || p.resultado_venda === 'perdida')
        );
      }
      return fonte;
    }

    const dias = parseInt(periodo, 10);
    const limite = new Date();
    limite.setDate(limite.getDate() - dias);

    if (visaoConversao === 'efetivadas') {
      return fonte.filter((p) => {
        if (!p.data_resultado_venda) return false;
        if (!(p.resultado_venda === 'efetivada' || p.resultado_venda === 'perdida')) return false;
        const d = new Date(p.data_resultado_venda);
        return d >= limite;
      });
    }

    return fonte.filter((p) => {
      const d = p.created_at ? new Date(p.created_at) : null;
      return d ? d >= limite : true;
    });
  }, [pedidos, periodo, visaoConversao]);

  const kpis = useMemo(() => {
    const totalVendedores = users.filter(
      (u) => u.tipo === 'vendedor' || u.tipo === 'vendedor_concessionaria'
    ).length;

    const totalGuindastes = guindastesCount;
    const totalPropostas = propostasFiltradas.length;
    const resultado = propostasFiltradas.reduce((s, p) => s + (p.valor_total || 0), 0);

    const efetivadas = propostasFiltradas.filter((p) => p.resultado_venda === 'efetivada');
    const perdidas = propostasFiltradas.filter((p) => p.resultado_venda === 'perdida');
    const semResultado = propostasFiltradas.filter((p) => !p.resultado_venda);
    const efetivadasValor = efetivadas.reduce((s, p) => s + (p.valor_total || 0), 0);
    const perdidasValor = perdidas.reduce((s, p) => s + (p.valor_total || 0), 0);

    const baseTaxa =
      visaoConversao === 'efetivadas'
        ? efetivadas.length + perdidas.length
        : totalPropostas - semResultado.length;

    const taxaConversao = baseTaxa > 0 ? Math.round((efetivadas.length / baseTaxa) * 100) : 0;

    const dias = periodo === 'all' ? 30 : parseInt(periodo, 10);
    const inicioAtual = new Date();
    inicioAtual.setDate(inicioAtual.getDate() - dias);

    const inicioAnterior = new Date(inicioAtual);
    inicioAnterior.setDate(inicioAnterior.getDate() - dias);

    const propostasAnterior = pedidos.filter((p) => {
      const d =
        visaoConversao === 'efetivadas'
          ? p.data_resultado_venda
            ? new Date(p.data_resultado_venda)
            : null
          : p.created_at
          ? new Date(p.created_at)
          : null;

      if (!d) return false;
      if (
        visaoConversao === 'efetivadas' &&
        !(p.resultado_venda === 'efetivada' || p.resultado_venda === 'perdida')
      ) {
        return false;
      }
      return d >= inicioAnterior && d < inicioAtual;
    });

    const totalPropostasAnt = propostasAnterior.length;
    const resultadoAnt = propostasAnterior.reduce((s, p) => s + (p.valor_total || 0), 0);

    const variacao = (atual, ant) => {
      if (!ant && !atual) return 0;
      if (!ant) return 100;
      return Math.round(((atual - ant) / ant) * 100);
    };

    const ticketMedio = totalPropostas > 0 ? resultado / totalPropostas : 0;

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
      ticketMedio,
      varPropostas: variacao(totalPropostas, totalPropostasAnt),
      varResultado: variacao(resultado, resultadoAnt),
    };
  }, [users, guindastesCount, pedidos, propostasFiltradas, periodo, visaoConversao]);

  const pipeline = useMemo(() => {
    const counts = {
      sem_resultado: 0,
      efetivada: 0,
      perdida: 0,
    };

    propostasFiltradas.forEach((p) => {
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
      start.setDate(start.getDate() - 29);
    }

    const cursor = new Date(start);
    while (cursor <= today) {
      const key = cursor.toISOString().slice(0, 10);
      map.set(key, 0);
      cursor.setDate(cursor.getDate() + 1);
    }

    propostasFiltradas.forEach((p) => {
      const d =
        visaoConversao === 'efetivadas'
          ? p.data_resultado_venda
            ? new Date(p.data_resultado_venda)
            : null
          : p.created_at
          ? new Date(p.created_at)
          : null;

      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
    });

    return Array.from(map.entries()).map(([date, value]) => ({ date, value }));
  }, [propostasFiltradas, periodo, visaoConversao]);

  const serieReceita = useMemo(() => {
    const map = new Map();
    const today = new Date();
    const start = new Date(today);

    if (periodo !== 'all') {
      start.setDate(start.getDate() - parseInt(periodo, 10) + 1);
    } else {
      start.setDate(start.getDate() - 29);
    }

    const cursor = new Date(start);
    while (cursor <= today) {
      const key = cursor.toISOString().slice(0, 10);
      map.set(key, 0);
      cursor.setDate(cursor.getDate() + 1);
    }

    propostasFiltradas.forEach((p) => {
      const d =
        visaoConversao === 'efetivadas'
          ? p.data_resultado_venda
            ? new Date(p.data_resultado_venda)
            : null
          : p.created_at
          ? new Date(p.created_at)
          : null;

      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      if (map.has(key)) map.set(key, (map.get(key) || 0) + (p.valor_total || 0));
    });

    return Array.from(map.entries()).map(([date, value]) => ({ date, value }));
  }, [propostasFiltradas, periodo, visaoConversao]);

  const statsBySubgroup = useMemo(() => {
    const totals = {
      GSI: { count: 0, value: 0 },
      GSE: { count: 0, value: 0 },
      Outros: { count: 0, value: 0 },
    };

    propostasFiltradas.forEach((p) => {
      const items = p.dados_serializados?.carrinho || [];
      const valorTotal = p.valor_total || 0;
      let hasGSI = false;
      let hasGSE = false;

      if (items && items.length > 0) {
        hasGSI = items.some((item) => item.nome?.includes('GSI') || item.subgrupo?.includes('GSI'));
        hasGSE = items.some((item) => item.nome?.includes('GSE') || item.subgrupo?.includes('GSE'));
      }

      if (hasGSI) {
        totals.GSI.count += 1;
        totals.GSI.value += valorTotal;
      } else if (hasGSE) {
        totals.GSE.count += 1;
        totals.GSE.value += valorTotal;
      } else {
        totals.Outros.count += 1;
        totals.Outros.value += valorTotal;
      }
    });

    return totals;
  }, [propostasFiltradas]);

  const statsByRegion = useMemo(() => {
    const totals = new Map();

    propostasFiltradas.forEach((p) => {
      const vendedor = users.find((u) => u.id === p.vendedor_id);
      const region =
        p.regiao_venda ||
        p.dados_serializados?.regiaoCompraSelecionada ||
        vendedor?.regiao ||
        'Não definida';
      const current = totals.get(region) || { count: 0, value: 0, gsiValue: 0, gseValue: 0 };
      const valorTotal = p.valor_total || 0;
      const items = p.dados_serializados?.carrinho || [];
      const hasGSI = items.some((item) => item.nome?.includes('GSI') || item.subgrupo?.includes('GSI'));
      const hasGSE = items.some((item) => item.nome?.includes('GSE') || item.subgrupo?.includes('GSE'));

      totals.set(region, {
        count: current.count + 1,
        value: current.value + valorTotal,
        gsiValue: current.gsiValue + (hasGSI ? valorTotal : 0),
        gseValue: current.gseValue + (hasGSE ? valorTotal : 0),
      });
    });

    return Array.from(totals.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value);
  }, [propostasFiltradas, users]);

  const rankingVendedores = useMemo(() => {
    const totals = new Map();

    propostasFiltradas.forEach((p) => {
      if (visaoConversao === 'efetivadas' && p.resultado_venda !== 'efetivada') return;
      const nome = p.vendedor_nome || p.vendedor?.nome || p.vendedor || 'Desconhecido';
      totals.set(nome, (totals.get(nome) || 0) + (p.valor_total || 0));
    });

    return Array.from(totals.entries())
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [propostasFiltradas, visaoConversao]);

  const topProdutos = useMemo(() => {
    const map = new Map();
    propostasFiltradas.forEach((p) => {
      const items = p.dados_serializados?.carrinho || [];
      items.forEach((item) => {
        const nome = item.nome || item.produto || 'Sem nome';
        const preco = (parseFloat(item.preco) || 0) * (parseInt(item.quantidade, 10) || 1);
        const c = map.get(nome) || { count: 0, value: 0 };
        map.set(nome, { count: c.count + 1, value: c.value + preco });
      });
    });
    return Array.from(map.entries())
      .map(([nome, d]) => ({ nome, ...d }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [propostasFiltradas]);

  const porEstado = useMemo(() => {
    const map = new Map();
    propostasFiltradas.forEach((p) => {
      const raw = p.cliente_uf || p.dados_serializados?.clienteData?.uf || '';
      const uf = raw.toUpperCase().slice(0, 2) || 'N/D';
      const c = map.get(uf) || { count: 0, value: 0 };
      map.set(uf, { count: c.count + 1, value: c.value + (p.valor_total || 0) });
    });
    return Array.from(map.entries())
      .map(([uf, d]) => ({ uf, ...d }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [propostasFiltradas]);

  const exportCSV = useCallback(() => {
    const header = 'Número;Data;Vendedor;Cliente;Valor (R$);Resultado\n';
    const rows = propostasFiltradas.map((p) => [
      p.numero_proposta || p.id || '',
      (p.created_at || p.data || '').slice(0, 10),
      p.vendedor_nome || '',
      p.cliente_nome || '',
      String(p.valor_total ?? 0).replace('.', ','),
      p.resultado_venda || 'em aberto',
    ].join(';'));
    const csv = '\uFEFF' + header + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `propostas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [propostasFiltradas]);

  const spotlightVendedores = useMemo(() => {
    return rankingVendedores.slice(0, 3).map((item, index) => ({
      ...item,
      posicao: index + 1,
      badge:
        index === 0
          ? 'Líder do período'
          : index === 1
          ? 'Destaque comercial'
          : 'Top performance',
      percent:
        rankingVendedores[0]?.valor > 0
          ? Math.round((item.valor / rankingVendedores[0].valor) * 100)
          : 0,
    }));
  }, [rankingVendedores]);

  useEffect(() => {
    if (spotlightVendedores.length <= 1) return undefined;

    const interval = setInterval(() => {
      setSlideDir('right');
      setSpotlightIndex((prev) => (prev + 1) % spotlightVendedores.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [spotlightVendedores.length]);

  const statusData = useMemo(() => {
    const total = pipeline.sem_resultado + pipeline.efetivada + pipeline.perdida;

    const list = [
      { label: 'Efetivadas', value: pipeline.efetivada, color: '#22c55e' },
      { label: 'Em aberto', value: pipeline.sem_resultado, color: '#f59e0b' },
      { label: 'Perdidas', value: pipeline.perdida, color: '#ef4444' },
    ];

    return {
      total,
      list: list.map((item) => ({
        ...item,
        percent: total > 0 ? Math.round((item.value / total) * 100) : 0,
      })),
    };
  }, [pipeline]);

  const canaisData = useMemo(() => {
    const totals = new Map();

    propostasFiltradas.forEach((p) => {
      const canal = p.canal_origem || p.origem || p.origem_lead || p.canal || 'Outros';
      totals.set(canal, (totals.get(canal) || 0) + 1);
    });

    const palette = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#94a3b8', '#06b6d4'];

    const arr = Array.from(totals.entries())
      .map(([label, value], index) => ({
        label,
        value,
        color: palette[index % palette.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const total = arr.reduce((acc, item) => acc + item.value, 0);

    return {
      total,
      list: arr.map((item) => ({
        ...item,
        percent: total > 0 ? Math.round((item.value / total) * 100) : 0,
      })),
    };
  }, [propostasFiltradas]);

  const latestProposals = useMemo(() => {
    const clone = [...propostasFiltradas];

    return clone
      .sort((a, b) => {
        const da = new Date(b.created_at || b.data_resultado_venda || 0).getTime();
        const dbb = new Date(a.created_at || a.data_resultado_venda || 0).getTime();
        return da - dbb;
      })
      .slice(0, 6);
  }, [propostasFiltradas]);

  const alerts = useMemo(() => {
    const items = [];

    if (pipeline.sem_resultado > 0) {
      items.push({
        tone: 'warning',
        title: 'Pipeline em aberto',
        description: `${pipeline.sem_resultado} proposta(s) ainda sem resultado final.`,
      });
    }

    if (pipeline.perdida > 0) {
      items.push({
        tone: 'danger',
        title: 'Propostas perdidas',
        description: `${pipeline.perdida} proposta(s) perdidas no período.`,
      });
    }

    if (kpis.taxaConversao >= 30) {
      items.push({
        tone: 'success',
        title: 'Conversão saudável',
        description: `Taxa de conversão atual em ${kpis.taxaConversao}%.`,
      });
    }

    if (rankingVendedores[0]) {
      items.push({
        tone: 'info',
        title: 'Maior destaque',
        description: `${rankingVendedores[0].nome} lidera com ${formatCurrency(
          rankingVendedores[0].valor
        )}.`,
      });
    }

    return items.slice(0, 4);
  }, [pipeline, kpis.taxaConversao, rankingVendedores]);

  const periodLabel = useMemo(() => {
    if (periodo === '7') return 'Últimos 7 dias';
    if (periodo === '30') return 'Últimos 30 dias';
    if (periodo === '90') return 'Últimos 90 dias';
    return 'Todo o período';
  }, [periodo]);

  const visaoLabel = useMemo(() => {
    return visaoConversao === 'efetivadas' ? 'Visão por resultado' : 'Visão por criação';
  }, [visaoConversao]);

  if (!user) return null;

  const maxRankingValue = rankingVendedores[0]?.valor || 1;
  const totalSubgroup =
    statsBySubgroup.GSI.value + statsBySubgroup.GSE.value + statsBySubgroup.Outros.value || 1;
  const topRegionValue = statsByRegion[0]?.value || 1;

  const currentSpotlight = spotlightVendedores[spotlightIndex] || null;

  const kpiCards = [
    {
      label: 'Propostas Criadas',
      value: kpis.totalPropostas,
      trend: kpis.varPropostas,
      icon: '📄',
      tone: 'blue',
      helper: 'comparado ao período anterior',
      sparkData: seriePropostas.map((item) => item.value),
    },
    {
      label: 'Propostas Efetivadas',
      value: kpis.efetivadas,
      trend: kpis.totalPropostas > 0 ? Math.round((kpis.efetivadas / kpis.totalPropostas) * 100) : 0,
      icon: '✅',
      tone: 'green',
      helper: 'ganhos confirmados',
      sparkData: serieReceita.map((item) => item.value),
      trendLabel: 'participação',
    },
    {
      label: 'Taxa de Conversão',
      value: `${kpis.taxaConversao}%`,
      trend: kpis.taxaConversao,
      icon: '📈',
      tone: 'purple',
      helper: 'sobre propostas com resultado',
      sparkData: seriePropostas.map((item) => item.value),
      trendLabel: 'índice',
    },
    {
      label: 'Vendedores Ativos',
      value: kpis.totalVendedores,
      trend: rankingVendedores.length,
      icon: '👥',
      tone: 'orange',
      helper: 'usuários de vendas no sistema',
      sparkData: seriePropostas.map((item) => item.value),
      trendLabel: 'no ranking',
    },
    {
      label: 'Ticket Médio',
      value: formatCurrency(kpis.ticketMedio),
      trend: kpis.varResultado,
      icon: '',
      tone: 'cyan',
      helper: 'valor médio por proposta',
      sparkData: serieReceita.map((item) => item.value),
    },
    {
      label: 'Valor Total (R$)',
      value: formatCurrency(kpis.resultado),
      trend: kpis.varResultado,
      icon: '',
      tone: 'emerald',
      helper: 'volume do período',
      sparkData: serieReceita.map((item) => item.value),
    },
    {
      label: 'Propostas Perdidas',
      value: kpis.perdidas,
      trend: kpis.totalPropostas > 0 ? Math.round((kpis.perdidas / kpis.totalPropostas) * 100) : 0,
      icon: '',
      tone: 'red',
      helper: 'perdas comerciais',
      sparkData: seriePropostas.map((item) => item.value),
      trendLabel: 'participação',
    },
    {
      label: 'Receita Efetivada',
      value: formatCurrency(kpis.efetivadasValor),
      trend: kpis.resultado > 0 ? Math.round((kpis.efetivadasValor / kpis.resultado) * 100) : 0,
      icon: '',
      tone: 'violet',
      helper: 'somente vendas ganhas',
      sparkData: serieReceita.map((item) => item.value),
      trendLabel: 'do total',
    },
  ];

  return (
    <>
      <UnifiedHeader
        user={user}
        title="Dashboard Admin"
        subtitle="Resumo geral da performance comercial e operacional."
      />

      <div className="dashboard-container-redesigned">
        <section className="admin-hero admin-hero-showcase">
          <div className="admin-floating-orb orb-1" />
          <div className="admin-floating-orb orb-2" />
          <div className="admin-floating-orb orb-3" />

          <div className="admin-hero-top-grid">
            <div className="admin-hero-left">
              <div className="admin-hero-content">
                <div>
                  <div className="eyebrow-label">Painel executivo</div>
                  <h1 className="admin-hero-title">Dashboard Admin</h1>
                  <p className="admin-hero-subtitle">
                    Acompanhe propostas, conversão, receita, pipeline e desempenho da equipe em um só lugar.
                  </p>
                </div>

                <div className="hero-badges">
                  <span className="hero-badge">{periodLabel}</span>
                  <span className="hero-badge hero-badge--dark">{visaoLabel}</span>
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
                      <option value="7">Últimos 7 dias</option>
                      <option value="30">Últimos 30 dias</option>
                      <option value="90">Últimos 90 dias</option>
                      <option value="all">Todo o período</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label className="filter-label">Visão</label>
                    <select
                      className="filter-select"
                      value={visaoConversao}
                      onChange={(e) => setVisaoConversao(e.target.value)}
                    >
                      <option value="criadas">Visão por Criação</option>
                      <option value="efetivadas">Visão por Resultado</option>
                    </select>
                  </div>
                </div>

                <button type="button" className="filter-export-btn" onClick={exportCSV} title={`Exportar ${propostasFiltradas.length} propostas como CSV`}>
                  ↓ Exportar CSV
                </button>

                <div className="quick-summary">
                  <div className="quick-summary-item">
                    <span className="quick-summary-label">Guindastes</span>
                    <strong>{guindastesCount}</strong>
                  </div>
                  <div className="quick-summary-item">
                    <span className="quick-summary-label">Em aberto</span>
                    <strong>{pipeline.sem_resultado}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-hero-right">
              <div className="spotlight-card">
                <div className="spotlight-card-header">
                  <div>
                    <span className="spotlight-eyebrow">Top Sellers Spotlight</span>
                    <h3>Melhores vendedores</h3>
                  </div>

                  <div className="spotlight-dots">
                    {spotlightVendedores.map((item, idx) => (
                      <button
                        key={item.nome}
                        type="button"
                        className={`spotlight-dot ${idx === spotlightIndex ? 'active' : ''}`}
                        onClick={() => {
                          setSlideDir(idx > spotlightIndex ? 'right' : 'left');
                          setSpotlightIndex(idx);
                        }}
                        aria-label={`Mostrar vendedor ${item.nome}`}
                      />
                    ))}
                  </div>
                </div>

                {currentSpotlight ? (
                  <div className={`spotlight-body slide-${slideDir}`} key={spotlightIndex}>
                    <div className="spotlight-rank-badge">
                      #{currentSpotlight.posicao}
                    </div>

                    <div className="spotlight-main">
                      <div className="spotlight-avatar">
                        {String(currentSpotlight.nome).trim().charAt(0).toUpperCase()}
                      </div>

                      <div className="spotlight-info">
                        <span className="spotlight-badge">{currentSpotlight.badge}</span>
                        <h4>{currentSpotlight.nome}</h4>
                        <strong>{formatCurrency(currentSpotlight.valor)}</strong>
                      </div>
                    </div>

                    <div className="spotlight-progress-block">
                      <div className="spotlight-progress-top">
                        <span>Desempenho relativo</span>
                        <span>{currentSpotlight.percent}%</span>
                      </div>
                      <div className="spotlight-progress-track">
                        <div
                          className="spotlight-progress-fill"
                          style={{ width: `${currentSpotlight.percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="spotlight-mini-metrics">
                      <div className="spotlight-mini-card">
                        <span>Ticket médio</span>
                        <strong>{formatCurrency(kpis.ticketMedio)}</strong>
                      </div>
                      <div className="spotlight-mini-card">
                        <span>Conversão geral</span>
                        <strong>{kpis.taxaConversao}%</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="spotlight-empty">Sem ranking disponível no período.</div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="kpi-grid-admin">
          {kpiCards.map((card, index) => (
            <div key={card.label} className={`card kpi-card tone-${card.tone} delay-${index + 1}`}>
              <div className="kpi-top-row">
                <div className={`kpi-icon kpi-icon-{card.tone}`}>{card.icon}</div>
                <div className="kpi-meta">
                  <span className="kpi-label">{card.label}</span>
                  <span className="kpi-value">{card.value}</span>
                </div>
              </div>

              <div className="kpi-bottom-row">
                <span
                  className={`kpi-trend ${
                    typeof card.trend === 'number' && card.trend < 0 ? 'down' : 'up'
                  }`}
                >
                  {typeof card.trend === 'number' && card.trend < 0 ? '▼' : '▲'}{' '}
                  {Math.abs(card.trend || 0)}%
                  <small>{card.trendLabel || 'vs. período anterior'}</small>
                </span>
                <span className="kpi-helper">{card.helper}</span>
              </div>

              <Sparkline data={card.sparkData} />
            </div>
          ))}
        </section>

        <section className="admin-breakdown-grid">
          <div className="card">
            <div className="card-header-inline">
              <div>
                <h3 className="section-title">Performance por linha de produto</h3>
                <p className="section-subtitle">Participação financeira por subgrupo</p>
              </div>
            </div>

            <div className="breakdown-list">
              <div className="breakdown-item">
                <div className="breakdown-label">GSI</div>
                <div className="breakdown-bar-container">
                  <div
                    className="breakdown-bar gsi"
                    style={{
                      width: `${(statsBySubgroup.GSI.value / totalSubgroup) * 100}%`,
                    }}
                  />
                </div>
                <div className="breakdown-value">{formatCurrency(statsBySubgroup.GSI.value)}</div>
              </div>

              <div className="breakdown-item">
                <div className="breakdown-label">GSE</div>
                <div className="breakdown-bar-container">
                  <div
                    className="breakdown-bar gse"
                    style={{
                      width: `${(statsBySubgroup.GSE.value / totalSubgroup) * 100}%`,
                    }}
                  />
                </div>
                <div className="breakdown-value">{formatCurrency(statsBySubgroup.GSE.value)}</div>
              </div>

              <div className="breakdown-item">
                <div className="breakdown-label">Outros</div>
                <div className="breakdown-bar-container">
                  <div
                    className="breakdown-bar region"
                    style={{
                      width: `${(statsBySubgroup.Outros.value / totalSubgroup) * 100}%`,
                    }}
                  />
                </div>
                <div className="breakdown-value">{formatCurrency(statsBySubgroup.Outros.value)}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header-inline">
              <div>
                <h3 className="section-title">Performance por região</h3>
                <p className="section-subtitle">Valor movimentado por região de venda</p>
              </div>
            </div>

            <div className="breakdown-list">
              {statsByRegion.length > 0 ? (
                statsByRegion.slice(0, 6).map((region) => (
                  <div className="breakdown-item" key={region.name}>
                    <div className="breakdown-label">{region.name}</div>
                    <div className="breakdown-bar-container">
                      <div
                        className="breakdown-bar region"
                        style={{ width: `${(region.value / topRegionValue) * 100}%` }}
                      />
                    </div>
                    <div className="breakdown-value">{formatCurrency(region.value)}</div>
                  </div>
                ))
              ) : (
                <div className="empty-ranking">Sem dados de região.</div>
              )}
            </div>
          </div>
        </section>

        <section className="admin-charts-duo">
          <div className="card chart-card">
            <div className="card-header-inline">
              <div>
                <h3 className="section-title">Propostas criadas por dia</h3>
                <p className="section-subtitle">Evolução diária do volume comercial no período selecionado</p>
              </div>
              {kpis.varPropostas !== 0 && (
                <span className={`chip ${kpis.varPropostas >= 0 ? 'chip-positive' : 'chip-negative'}`}>
                  {kpis.varPropostas > 0 ? '+' : ''}{kpis.varPropostas}%
                </span>
              )}
            </div>
            <LineAreaChart data={seriePropostas} color="var(--chart-blue)" />
          </div>

          <div className="card chart-card">
            <div className="card-header-inline">
              <div>
                <h3 className="section-title">Valor movimentado por dia</h3>
                <p className="section-subtitle">Volume financeiro das propostas no período</p>
              </div>
              {kpis.varResultado !== 0 && (
                <span className={`chip ${kpis.varResultado >= 0 ? 'chip-positive' : 'chip-negative'}`}>
                  {kpis.varResultado > 0 ? '+' : ''}{kpis.varResultado}%
                </span>
              )}
            </div>
            <SimpleBarChart data={serieReceita} color="var(--chart-purple)" />
          </div>
        </section>

        <section className="admin-breakdown-grid">
          <div className="card">
            <div className="card-header-inline">
              <div>
                <h3 className="section-title">Top Produtos</h3>
                <p className="section-subtitle">Itens mais cotados no período — por valor</p>
              </div>
            </div>
            <div className="breakdown-list">
              {topProdutos.length > 0 ? (
                topProdutos.map((p, i) => (
                  <div className="breakdown-item breakdown-item--wide" key={p.nome}>
                    <div className="breakdown-label" title={p.nome}>
                      <span style={{ color: '#94a3b8', marginRight: 6, fontSize: 11 }}>#{i + 1}</span>{p.nome}
                    </div>
                    <div className="breakdown-bar-container">
                      <div className="breakdown-bar gse" style={{ width: `${(p.value / (topProdutos[0]?.value || 1)) * 100}%` }} />
                    </div>
                    <div className="breakdown-value">{formatCurrency(p.value)}</div>
                  </div>
                ))
              ) : (
                <div className="empty-ranking">Sem dados de produto no período.</div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header-inline">
              <div>
                <h3 className="section-title">Propostas por Estado (UF)</h3>
                <p className="section-subtitle">Concentração geográfica do volume do período</p>
              </div>
            </div>
            <div className="breakdown-list">
              {porEstado.length > 0 ? (
                porEstado.map((e) => (
                  <div className="breakdown-item" key={e.uf}>
                    <div className="breakdown-label">
                      <strong>{e.uf}</strong>
                      <span style={{ color: '#94a3b8', fontSize: 11, marginLeft: 4 }}>({e.count})</span>
                    </div>
                    <div className="breakdown-bar-container">
                      <div className="breakdown-bar region" style={{ width: `${(e.value / (porEstado[0]?.value || 1)) * 100}%` }} />
                    </div>
                    <div className="breakdown-value">{formatCurrency(e.value)}</div>
                  </div>
                ))
              ) : (
                <div className="empty-ranking">Preencha UF nos dados do cliente para ver esta análise.</div>
              )}
            </div>
          </div>
        </section>

        <section className="admin-content-grid-lower">
          <div className="card proposals-card">
            <div className="card-header-inline">
              <div>
                <h3 className="section-title">Últimas propostas</h3>
                <p className="section-subtitle">Movimentações mais recentes do período</p>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Vendedor</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {latestProposals.length > 0 ? (
                    latestProposals.map((p, index) => {
                      const status = (p.resultado_venda || 'em andamento').toLowerCase();
                      const statusLabel =
                        status === 'efetivada'
                          ? 'Efetivada'
                          : status === 'perdida'
                          ? 'Perdida'
                          : 'Em andamento';

                      const vendedorNome =
                        p.vendedor_nome || p.vendedor?.nome || p.vendedor || 'Desconhecido';

                      return (
                        <tr key={`${p.id || index}-${index}`}>
                          <td>#{p.id || index + 1}</td>
                          <td>{p.cliente_nome || p.nome_cliente || 'Cliente não informado'}</td>
                          <td>{vendedorNome}</td>
                          <td>{formatCurrency(p.valor_total || 0)}</td>
                          <td>
                            <span className={`status-badge status-${status.replace(/\s+/g, '-')}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td>
                            {new Date(
                              p.created_at || p.data_resultado_venda || Date.now()
                            ).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="table-empty">
                        Nenhuma proposta encontrada para o período selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="side-stack">
            <div className="card ranking-card">
              <div className="card-header-inline">
                <div>
                  <h3 className="section-title">Ranking de vendedores</h3>
                  <p className="section-subtitle">Top 5 por valor total</p>
                </div>
              </div>

              <div className="ranking-stack">
                {rankingVendedores.length > 0 ? (
                  rankingVendedores.map((vendedor, index) => (
                    <div className="ranking-row" key={vendedor.nome}>
                      <div className="ranking-header-line">
                        <div className="ranking-left">
                          <span className="ranking-position">{index + 1}</span>
                          <div className="ranking-avatar">
                            {String(vendedor.nome).trim().charAt(0).toUpperCase()}
                          </div>
                          <div className="ranking-name">{vendedor.nome}</div>
                        </div>
                        <div className="ranking-value">{formatCurrency(vendedor.valor)}</div>
                      </div>
                      <div className="ranking-bar-track">
                        <div
                          className="ranking-bar-fill"
                          style={{
                            width: `${(vendedor.valor / maxRankingValue) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-ranking">Sem vendas registradas no período.</div>
                )}
              </div>
            </div>

          </div>
        </section>

        <section className="admin-secondary-content-grid">
          <div className="card">
            <div className="card-header-inline">
              <div>
                <h3 className="section-title">Saúde do funil</h3>
                <p className="section-subtitle">Situação atual da carteira comercial</p>
              </div>
            </div>

            <div className="pipeline-summary pipeline-summary-rich">
              <div className="pipeline-stage-card pipeline-stage-open">
                <span className="pipeline-stage-label">Em negociação</span>
                <span className="pipeline-value">{pipeline.sem_resultado}</span>
                <small>oportunidades em aberto</small>
              </div>

              <div className="pipeline-stage-card pipeline-stage-win">
                <span className="pipeline-stage-label">Ganhos</span>
                <span className="pipeline-value">{pipeline.efetivada}</span>
                <small>propostas efetivadas</small>
              </div>

              <div className="pipeline-stage-card pipeline-stage-loss">
                <span className="pipeline-stage-label">Perdidos</span>
                <span className="pipeline-value">{pipeline.perdida}</span>
                <small>propostas encerradas sem venda</small>
              </div>
            </div>
            <DonutChart data={statusData.list} centerLabel="Total" centerValue={statusData.total} />
          </div>

          <div className="card">
            <div className="card-header-inline">
              <div>
                <h3 className="section-title">Alertas e oportunidades</h3>
                <p className="section-subtitle">Indicadores rápidos para tomada de decisão</p>
              </div>
            </div>

            <div className="alerts-stack">
              {alerts.length > 0 ? (
                alerts.map((alert, index) => (
                  <div key={`${alert.title}-${index}`} className={`alert-card tone-${alert.tone}`}>
                    <div className="alert-title-row">
                      <span className={`alert-dot alert-dot-${alert.tone}`} />
                      <strong>{alert.title}</strong>
                    </div>
                    <p>{alert.description}</p>
                  </div>
                ))
              ) : (
                <div className="empty-ranking">Nenhum alerta importante no momento.</div>
              )}
            </div>
          </div>
        </section>

        {isLoading && (
          <div className="dashboard-admin-loading-overlay">
            <div className="dashboard-admin-loading-card">
              <div className="loading-spinner" />
              <span>Atualizando indicadores do dashboard...</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

function Sparkline({ data = [] }) {
  const width = 180;
  const height = 42;

  if (!data.length) {
    return <div className="sparkline-empty" />;
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
    <svg className="sparkline-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline fill="none" stroke="currentColor" strokeWidth="2.5" points={points} />
    </svg>
  );
}

function LineAreaChart({ data = [], color = '#3b82f6' }) {
  const width = 860;
  const height = 280;
  const padding = 18;

  if (!data.length) {
    return <div className="chart-placeholder">Sem dados para exibir neste período.</div>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const points = data.map((item, index) => {
    const x = padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - (item.value / max) * (height - padding * 2);
    return { x, y, label: item.date, value: item.value };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath = `
    M ${points[0].x} ${height - padding}
    L ${points[0].x} ${points[0].y}
    ${points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ')}
    L ${points[points.length - 1].x} ${height - padding}
    Z
  `;

  const tickIndexes = [
    0,
    Math.floor(data.length * 0.25),
    Math.floor(data.length * 0.5),
    Math.floor(data.length * 0.75),
    data.length - 1,
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  return (
    <div className="chart-box">
      <svg className="main-chart-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineAreaFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.24" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((fraction) => {
          const y = padding + fraction * (height - padding * 2);
          return (
            <line
              key={fraction}
              x1={padding}
              x2={width - padding}
              y1={y}
              y2={y}
              stroke="rgba(148, 163, 184, 0.15)"
              strokeWidth="1"
            />
          );
        })}

        <path d={areaPath} fill="url(#lineAreaFill)" />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polyline}
        />

        {points.map((p, index) => (
          <circle key={index} cx={p.x} cy={p.y} r="4.5" fill={color} />
        ))}
      </svg>

      <div className="chart-x-labels">
        {tickIndexes.map((index) => (
          <span key={index}>{formatDateShort(data[index]?.date)}</span>
        ))}
      </div>
    </div>
  );
}

function SimpleBarChart({ data = [], color = '#8b5cf6' }) {
  if (!data.length) {
    return <div className="chart-placeholder">Sem dados para exibir neste período.</div>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const visible = data.slice(-18);

  return (
    <div className="bar-chart-wrap">
      <div className="bar-chart">
        {visible.map((item, index) => (
          <div key={`${item.date}-${index}`} className="bar-column">
            <div
              className="bar-fill"
              style={{
                height: `${Math.max((item.value / max) * 100, item.value > 0 ? 8 : 2)}%`,
                background: color,
              }}
              title={`${formatDateShort(item.date)} - ${formatCurrency(item.value || 0)}`}
            />
          </div>
        ))}
      </div>

      <div className="chart-x-labels">
        <span>{formatDateShort(visible[0]?.date)}</span>
        <span>{formatDateShort(visible[Math.floor(visible.length / 2)]?.date)}</span>
        <span>{formatDateShort(visible[visible.length - 1]?.date)}</span>
      </div>
    </div>
  );
}

function DonutChart({ data = [], centerLabel = 'Total', centerValue = 0 }) {
  const conic = buildConicGradient(data);

  return (
    <div className="donut-card-visual">
      <div className="donut-chart" style={{ background: conic }}>
        <div className="donut-center">
          <span>{centerLabel}</span>
          <strong>{centerValue}</strong>
        </div>
      </div>
    </div>
  );
}

function buildConicGradient(data) {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  if (!total) {
    return 'conic-gradient(#e5e7eb 0deg 360deg)';
  }

  let current = 0;
  const slices = data.map((item) => {
    const start = current;
    const angle = (item.value / total) * 360;
    current += angle;
    return `${item.color} ${start}deg ${current}deg`;
  });

  return `conic-gradient(${slices.join(', ')})`;
}

function formatDateShort(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

export default DashboardAdmin;