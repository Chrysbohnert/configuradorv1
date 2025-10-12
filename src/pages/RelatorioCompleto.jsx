import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import { db } from '../config/supabase';
import { formatCurrency } from '../utils/formatters';
import { generateReportPDF } from '../utils/pdfGenerator';
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

  const loadRelatorio = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const [users, pedidos] = await Promise.all([db.getUsers(), db.getPedidos()]);
      const vendedoresData = users.filter(u => u.tipo === 'vendedor');
      setVendedores(vendedoresData);
      setTodosPedidos(pedidos);
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
    setPedidosFiltrados(lista);
  }, [todosPedidos, filtroVendedor, filtroMes]);

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

  const handleExportarPDF = async () => {
    try {
      const vendedorNome = filtroVendedor
        ? vendedores.find(v => String(v.id) === String(filtroVendedor))?.nome || 'Vendedor'
        : 'Todos';
      const reportData = {
        vendedor: vendedorNome,
        periodo: filtroMes || 'Todos os meses',
        totalVendas: resumo.pedidosFinalizados,
        valorTotal: resumo.valorTotal,
        vendas: pedidosFiltrados.map(p => ({
          cliente: p.cliente?.nome || 'Cliente',
          modelo: '',
          valor: p.valor_total || 0,
          status: 'finalizado',
          data: new Date(p.created_at).toLocaleDateString('pt-BR')
        }))
      };
      const doc = await generateReportPDF(reportData);
      const pdfBlob = doc.output('blob');
      const fileName = `Relatorio_${vendedorNome.replace(/\s+/g, '_')}_${new Date()
        .toISOString()
        .split('T')[0]}.pdf`;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(pdfBlob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF.');
    }
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
                <button className="add-btn" onClick={handleExportarPDF} disabled={pedidosFiltrados.length === 0}>Exportar PDF</button>
              </div>
            </div>

            {/* Cards de Resumo */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-info">
                  <div className="stat-value">{resumo.totalPedidos}</div>
                  <div className="stat-label">Pedidos (todos)</div>
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
                <h3 style={{ margin: 0 }}>Pedidos ({pedidosFiltrados.length})</h3>
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
                    </tr>
                  </thead>
                  <tbody>
                    {pedidosFiltrados.map((p) => (
                      <tr key={p.id}>
                        <td style={{ padding: '8px 8px', borderBottom: '1px solid #f3f4f6' }}></td>
                        <td style={{ padding: '8px 8px', borderBottom: '1px solid #f3f4f6' }}>{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                        <td style={{ padding: '8px 8px', borderBottom: '1px solid #f3f4f6' }}>{p.vendedor?.nome || '-'}</td>
                        <td style={{ padding: '8px 8px', borderBottom: '1px solid #f3f4f6' }}>{p.cliente?.nome || '-'}</td>
                        <td style={{ padding: '8px 8px', borderBottom: '1px solid #f3f4f6', color: corStatus('finalizado') }}>{textoStatus('finalizado')}</td>
                        <td style={{ padding: '8px 8px', borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>{formatCurrency(p.valor_total || 0)}</td>
                      </tr>
                    ))}
                    {pedidosFiltrados.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ padding: 16, textAlign: 'center', color: '#6b7280' }}>Sem dados para os filtros selecionados</td>
                      </tr>
                    )}
                  </tbody>
                  {pedidosFiltrados.length > 0 && (
                    <tfoot>
                      <tr>
                        <td colSpan="5" style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>Total (finalizados):</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(resumo.valorTotal)}</td>
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