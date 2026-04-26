import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import { db } from '../config/supabase';
import { formatCurrency } from '../utils/formatters';
import jsPDF from 'jspdf';
import '../styles/Dashboard.css';

const RelatorioCompleto = () => {
  const navigate = useNavigate();
  const { user } = useOutletContext(); // Pega o usuário do AdminLayout
  const [isLoading, setIsLoading] = useState(false);
  const [vendedores, setVendedores] = useState([]);
  const [pedidosFiltrados, setPedidosFiltrados] = useState([]);
  const [todosPedidos, setTodosPedidos] = useState([]);
  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [busca, setBusca] = useState('');
  const [excluindo, setExcluindo] = useState(null);

  const csvEscape = (value) => {
    const str = String(value ?? '');
    const escaped = str.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim().replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const downloadFile = (content, filename, mime) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const extractEquipamentos = (proposta) => {
    const dados = proposta?.dados_serializados || {};
    const carrinho = Array.isArray(dados?.carrinho) ? dados.carrinho : [];
    if (carrinho.length === 0) return '';

    const nomes = carrinho
      .map((it) => {
        if (!it) return '';
        return String(it.nome || it.modelo || it.subgrupo || it.codigo_produto || '').trim();
      })
      .filter(Boolean);

    return nomes.join(' + ');
  };

  const handleGerarPDF = (id) => {
    window.open(`/proposta/${id}`, '_blank');
  };

  const handleExcluir = async (id, numeroProposta) => {
    if (!window.confirm(`Tem certeza que deseja excluir PERMANENTEMENTE a proposta ${numeroProposta}?\n\nEsta ação não pode ser desfeita e os dados serão removidos do banco.`)) {
      return;
    }
    setExcluindo(id);
    try {
      await db.deletePropostaPermanente(id);
      setTodosPedidos(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Erro ao excluir proposta:', error);
      alert('Erro ao excluir proposta');
    } finally {
      setExcluindo(null);
    }
  };

  const loadRelatorio = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const isAdminConcessionaria = user?.tipo === 'admin_concessionaria';
      const concessionariaId = user?.concessionaria_id;

      const usersPromise = isAdminConcessionaria
        ? db.getUsers({ concessionaria_id: concessionariaId })
        : db.getUsers();

      const users = await usersPromise;

      const idsVendedores = (users || [])
        .filter(u => u?.tipo === 'vendedor' || u?.tipo === 'vendedor_concessionaria')
        .map(u => u.id);

      const propostas = await (isAdminConcessionaria
        ? db.getPropostas({ vendedor_id: idsVendedores })
        : db.getPropostas());

      const vendedoresData = (users || []).filter(u => u.tipo === 'vendedor' || u.tipo === 'vendedor_concessionaria');
      setVendedores(vendedoresData);
      setTodosPedidos(propostas || []);
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
      alert('Erro ao carregar dados. Verifique a conexão com o banco.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRelatorio();
  }, [user]);

  useEffect(() => {
    // Aplicar filtros a partir de todosPedidos
    let lista = [...todosPedidos];
    if (filtroVendedor) {
      lista = lista.filter(p => String(p.vendedor_id) === String(filtroVendedor));
    }
    if (filtroMes) {
      const [ano, mes] = filtroMes.split('-').map(Number);
      lista = lista.filter(p => {
        const d = new Date(p.created_at);
        return d.getFullYear() === ano && d.getMonth() + 1 === mes;
      });
    }

    if (busca) {
      const termo = busca.toLowerCase().trim();
      lista = lista.filter(p => {
        const numero = String(p.numero_proposta || '').toLowerCase();
        const cliente = String(p.cliente_nome || p.cliente?.nome || '').toLowerCase();
        const vendedor = String(p.vendedor_nome || p.vendedor?.nome || '').toLowerCase();
        return numero.includes(termo) || cliente.includes(termo) || vendedor.includes(termo);
      });
    }
    setPedidosFiltrados(lista);
  }, [todosPedidos, filtroVendedor, filtroMes, busca]);

  const vendedoresMap = useMemo(() => {
    const map = new Map();
    (vendedores || []).forEach(v => {
      if (v?.id) map.set(String(v.id), v.nome);
    });
    return map;
  }, [vendedores]);

  const resumo = useMemo(() => {
    // Considerar todos os pedidos como finalizados para métricas simples
    const finalizados = pedidosFiltrados;
    const valorTotal = finalizados.reduce((t, p) => t + (p.valor_total || 0), 0);
    const ticketMedio = finalizados.length > 0 ? valorTotal / finalizados.length : 0;
    return {
      totalPedidos: pedidosFiltrados.length,
      pedidosFinalizados: finalizados.length,
      valorTotal,
      ticketMedio
    };
  }, [pedidosFiltrados]);

  const handleExportarCSV = () => {
    const rows = (pedidosFiltrados || []).map((p) => {
      const vendedorNome = p.vendedor_nome || vendedoresMap.get(String(p.vendedor_id)) || p.vendedor?.nome || '';
      const clienteNome = p.cliente_nome || p.cliente?.nome || '';
      const clienteDoc = p.cliente_documento || '';
      const numero = p.numero_proposta || '';
      const data = p.created_at || p.data || '';
      const status = p.status || '';
      const valor = p.valor_total ?? '';
      const equipamentos = extractEquipamentos(p);

      return {
        numero_proposta: numero,
        data,
        vendedor: vendedorNome,
        cliente: clienteNome,
        cliente_documento: clienteDoc,
        status,
        valor_total: valor,
        equipamentos,
      };
    });

    const header = [
      'numero_proposta',
      'data',
      'vendedor',
      'cliente',
      'cliente_documento',
      'status',
      'valor_total',
      'equipamentos',
    ];

    const lines = [header.map(csvEscape).join(';')];
    rows.forEach((r) => {
      lines.push(header.map((k) => csvEscape(r[k])).join(';'));
    });

    const csv = `\ufeff${lines.join('\n')}`;
    const hoje = new Date();
    const yyyy = hoje.getFullYear();
    const mm = String(hoje.getMonth() + 1).padStart(2, '0');
    const dd = String(hoje.getDate()).padStart(2, '0');
    const filename = `relatorio_propostas_${yyyy}-${mm}-${dd}.csv`;
    downloadFile(csv, filename, 'text/csv;charset=utf-8');
  };

  const handleExportarPDF = () => {
    const fonte = (pedidosFiltrados || []).map((p) => {
      const vendedorNome = p.vendedor_nome || vendedoresMap.get(String(p.vendedor_id)) || p.vendedor?.nome || '';
      const clienteNome = p.cliente_nome || p.cliente?.nome || '';
      const clienteDoc = p.cliente_documento || '';
      const numero = p.numero_proposta || '';
      const data = p.created_at || p.data || '';
      const status = p.status || '';
      const valor = Number(p.valor_total || 0);
      const equipamentos = extractEquipamentos(p);

      return {
        numero,
        data,
        vendedorNome,
        clienteNome,
        clienteDoc,
        status,
        valor,
        equipamentos,
      };
    });

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 36;
    const marginTop = 36;
    const marginBottom = 36;
    const usableW = pageW - marginX * 2;

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');

    const filtersLabel = [
      filtroVendedor ? `Vendedor: ${vendedoresMap.get(String(filtroVendedor)) || filtroVendedor}` : 'Vendedor: Todos',
      filtroMes ? `Mês: ${filtroMes}` : 'Mês: Todos',
      busca ? `Busca: ${busca}` : 'Busca: -',
    ].join('   |   ');

    const totalValor = fonte.reduce((s, r) => s + (r.valor || 0), 0);
    const ticket = fonte.length ? totalValor / fonte.length : 0;

    const drawHeader = (pageNum, totalPages) => {
      doc.setTextColor(30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('RELATÓRIO DE PROPOSTAS', marginX, marginTop);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(`Gerado em: ${dd}/${mm}/${yyyy} ${hh}:${mi}`, pageW - marginX, marginTop, { align: 'right' });

      const yFilters = marginTop + 18;
      doc.setTextColor(60);
      doc.text(filtersLabel, marginX, yFilters);

      const yResumo = yFilters + 16;
      doc.setTextColor(30);
      doc.text(`Qtd: ${fonte.length}   |   Total: ${formatCurrency(totalValor)}   |   Ticket médio: ${formatCurrency(ticket)}`, marginX, yResumo);

      doc.setDrawColor(220);
      doc.line(marginX, yResumo + 10, pageW - marginX, yResumo + 10);

      doc.setTextColor(120);
      doc.text(`Página ${pageNum}/${totalPages}`, pageW - marginX, pageH - 16, { align: 'right' });
    };

    const colW = {
      numero: 70,
      data: 60,
      vendedor: 120,
      cliente: 130,
      doc: 90,
      status: 70,
      valor: 70,
    };
    colW.equip = Math.max(140, usableW - (colW.numero + colW.data + colW.vendedor + colW.cliente + colW.doc + colW.status + colW.valor));

    const colX = {
      numero: marginX,
      data: marginX + colW.numero,
      vendedor: marginX + colW.numero + colW.data,
      cliente: marginX + colW.numero + colW.data + colW.vendedor,
      doc: marginX + colW.numero + colW.data + colW.vendedor + colW.cliente,
      status: marginX + colW.numero + colW.data + colW.vendedor + colW.cliente + colW.doc,
      valor: marginX + colW.numero + colW.data + colW.vendedor + colW.cliente + colW.doc + colW.status,
      equip: marginX + colW.numero + colW.data + colW.vendedor + colW.cliente + colW.doc + colW.status + colW.valor,
    };

    const headerHeight = 86;
    const tableTopY = marginTop + headerHeight;
    const rowPadY = 6;
    const lineH = 12;

    const drawTableHeader = (y) => {
      doc.setFillColor(245);
      doc.rect(marginX, y, usableW, 18, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(40);

      doc.text('Nº', colX.numero + 2, y + 12);
      doc.text('Data', colX.data + 2, y + 12);
      doc.text('Vendedor', colX.vendedor + 2, y + 12);
      doc.text('Cliente', colX.cliente + 2, y + 12);
      doc.text('Doc', colX.doc + 2, y + 12);
      doc.text('Status', colX.status + 2, y + 12);
      doc.text('Valor', colX.valor + colW.valor - 2, y + 12, { align: 'right' });
      doc.text('Equipamentos', colX.equip + 2, y + 12);

      doc.setDrawColor(220);
      doc.line(marginX, y + 18, pageW - marginX, y + 18);
    };

    const computeRowLines = (r) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const equipamentosLines = doc.splitTextToSize(String(r.equipamentos || ''), colW.equip - 4);
      return {
        equipamentosLines,
        maxLines: Math.max(1, equipamentosLines.length),
      };
    };

    const rowsWithMeasure = fonte.map(r => ({ r, m: computeRowLines(r) }));

    const estimatePages = () => {
      const availableH = pageH - marginBottom - (tableTopY + 18);
      let pages = 1;
      let used = 0;
      rowsWithMeasure.forEach(({ m }) => {
        const rowH = rowPadY * 2 + (m.maxLines * lineH);
        if (used + rowH > availableH) {
          pages += 1;
          used = 0;
        }
        used += rowH;
      });
      return pages;
    };

    const totalPages = estimatePages();

    let pageNum = 1;
    drawHeader(pageNum, totalPages);
    drawTableHeader(tableTopY);
    let y = tableTopY + 18;

    const availableH = pageH - marginBottom;

    rowsWithMeasure.forEach(({ r, m }, idx) => {
      const rowH = rowPadY * 2 + (m.maxLines * lineH);
      if (y + rowH > availableH) {
        doc.addPage();
        pageNum += 1;
        drawHeader(pageNum, totalPages);
        drawTableHeader(tableTopY);
        y = tableTopY + 18;
      }

      if (idx % 2 === 0) {
        doc.setFillColor(252);
        doc.rect(marginX, y, usableW, rowH, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30);

      const d = r.data ? new Date(r.data) : null;
      const dataLabel = d && !isNaN(d.getTime())
        ? d.toLocaleDateString('pt-BR')
        : String(r.data || '');

      const valorLabel = formatCurrency(r.valor || 0);

      doc.text(String(r.numero || ''), colX.numero + 2, y + rowPadY + 9);
      doc.text(String(dataLabel || ''), colX.data + 2, y + rowPadY + 9);
      doc.text(String(r.vendedorNome || ''), colX.vendedor + 2, y + rowPadY + 9);
      doc.text(String(r.clienteNome || ''), colX.cliente + 2, y + rowPadY + 9);
      doc.text(String(r.clienteDoc || ''), colX.doc + 2, y + rowPadY + 9);
      doc.text(String(r.status || ''), colX.status + 2, y + rowPadY + 9);
      doc.text(valorLabel, colX.valor + colW.valor - 2, y + rowPadY + 9, { align: 'right' });

      if (m.equipamentosLines.length > 0) {
        doc.text(m.equipamentosLines, colX.equip + 2, y + rowPadY + 9);
      }

      doc.setDrawColor(235);
      doc.line(marginX, y + rowH, pageW - marginX, y + rowH);
      y += rowH;
    });

    const filename = `relatorio_propostas_${yyyy}-${mm}-${dd}.pdf`;
    doc.save(filename);
  };

  const corStatus = (s) => (s === 'finalizado' ? '#27b207' : s === 'em_andamento' ? '#fd7e14' : s === 'cancelado' ? '#dc3545' : '#6c757d');
  const textoStatus = (s) => (s === 'finalizado' ? 'Finalizado' : s === 'em_andamento' ? 'Em Andamento' : s === 'cancelado' ? 'Cancelado' : s);

  if (!user) return null;

  return (
    <>
      <UnifiedHeader 
        showBackButton={false}
        showSupportButton={true}
          showUserInfo={true}
          user={user}
          title="Relatório"
          subtitle="Resumo simples por período e vendedor"
        />
        <div className="dashboard-container">
          <div className="dashboard-content">
            <div className="dashboard-header">
              <div className="welcome-section">
                <h1>Relatório</h1>
                <p>Resumo simples por período e vendedor</p>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280' }}>Vendedor</label>
                  <select value={filtroVendedor} onChange={(e)=>setFiltroVendedor(e.target.value)} className="filter-select" style={{ minWidth: 220 }}>
                    <option value="">Todos</option>
                    {vendedores.map(v => (
                      <option key={v.id} value={v.id}>{v.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280' }}>Mês</label>
                  <input type="month" value={filtroMes} onChange={(e)=>setFiltroMes(e.target.value)} className="filter-select" />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280' }}>Buscar</label>
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="filter-select"
                    placeholder="Cliente, vendedor ou nº"
                    style={{ minWidth: 220 }}
                  />
                </div>
                <button className="add-btn" onClick={handleExportarPDF} disabled={pedidosFiltrados.length === 0}>Exportar PDF</button>
                <button className="add-btn" onClick={handleExportarCSV} disabled={pedidosFiltrados.length === 0}>Exportar CSV</button>
              </div>
            </div>

            {/* Cards de Resumo */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-info">
                  <div className="stat-value">{resumo.totalPedidos}</div>
                  <div className="stat-label">Propostas (todas)</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-info">
                  <div className="stat-value">{resumo.pedidosFinalizados}</div>
                  <div className="stat-label">Finalizados</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-info">
                  <div className="stat-value">{formatCurrency(resumo.valorTotal)}</div>
                  <div className="stat-label">Valor Finalizados</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-info">
                  <div className="stat-value">{formatCurrency(resumo.ticketMedio)}</div>
                  <div className="stat-label">Ticket Médio</div>
                </div>
              </div>
            </div>

            {/* Tabela simples de pedidos */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Propostas ({pedidosFiltrados.length})</h3>
                    </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', color: '#374151' }}>
                      {/* Número do pedido ocultado por solicitação */}
                      <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #eee' }}></th>
                      <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #eee' }}>Data</th>
                      <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #eee' }}>Vendedor</th>
                      <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #eee' }}>Cliente</th>
                      <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #eee' }}>Status</th>
                      <th style={{ textAlign: 'right', padding: '10px 8px', borderBottom: '1px solid #eee' }}>Valor</th>
                      <th style={{ textAlign: 'center', padding: '10px 8px', borderBottom: '1px solid #eee' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidosFiltrados.map((p) => (
                      <tr key={p.id}>
                        <td style={{ padding: '8px 8px', borderBottom: '1px solid #f3f4f6' }}></td>
                        <td style={{ padding: '8px 8px', borderBottom: '1px solid #f3f4f6' }}>{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                        <td style={{ padding: '8px 8px', borderBottom: '1px solid #f3f4f6' }}>
                          {p.vendedor_nome || vendedoresMap.get(String(p.vendedor_id)) || p.vendedor?.nome || '-'}
                        </td>
                        <td style={{ padding: '8px 8px', borderBottom: '1px solid #f3f4f6' }}>{p.cliente_nome || p.cliente?.nome || '-'}</td>
                        <td style={{ padding: '8px 8px', borderBottom: '1px solid #f3f4f6', color: corStatus('finalizado') }}>{textoStatus('finalizado')}</td>
                        <td style={{ padding: '8px 8px', borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>{formatCurrency(p.valor_total || 0)}</td>
                        <td style={{ padding: '8px 8px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleGerarPDF(p.id)}
                              style={{
                                padding: '4px 10px',
                                background: '#1a7a4a',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                              title="Visualizar e gerar proposta comercial em PDF"
                            >
                              📄 PDF
                            </button>
                            <button
                              onClick={() => handleExcluir(p.id, p.numero_proposta)}
                              disabled={excluindo === p.id}
                              style={{
                                padding: '4px 10px',
                                background: excluindo === p.id ? '#6c757d' : '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: excluindo === p.id ? 'not-allowed' : 'pointer'
                              }}
                              title="Excluir proposta permanentemente"
                            >
                              {excluindo === p.id ? '...' : '🗑️'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pedidosFiltrados.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ padding: 16, textAlign: 'center', color: '#6b7280' }}>Sem dados para os filtros selecionados</td>
                      </tr>
                    )}
                  </tbody>
                  {pedidosFiltrados.length > 0 && (
                    <tfoot>
                      <tr>
                        <td colSpan="5" style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>Total (finalizados):</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(resumo.valorTotal)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
                </div>
            </div>

          </div>
        </div>
    </>
  );
};

export default RelatorioCompleto; 