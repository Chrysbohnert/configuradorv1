import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNavigation from '../components/AdminNavigation';
import GuindasteLoading from '../components/GuindasteLoading';
import { db } from '../config/supabase';
import { formatCurrency } from '../utils/formatters';
import { generateReportPDF } from '../utils/pdfGenerator';
import '../styles/Dashboard.css';

const RelatorioCompleto = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [vendedores, setVendedores] = useState([]);
  const [resumoGeral, setResumoGeral] = useState({
    totalVendedores: 0,
    totalPedidos: 0,
    totalValor: 0,
    pedidosFinalizados: 0,
    pedidosEmAndamento: 0,
    pedidosCancelados: 0
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const userObj = JSON.parse(userData);
      if (userObj.tipo !== 'admin') {
        navigate('/dashboard');
        return;
      }
      setUser(userObj);
    } else {
      navigate('/');
      return;
    }

    loadRelatorio();
  }, [navigate]);

  const loadRelatorio = async () => {
    try {
      setIsLoading(true);
      
      // Carregar todos os dados necessários
      const [users, pedidos] = await Promise.all([
        db.getUsers(),
        db.getPedidos()
      ]);

      // Filtrar apenas vendedores
      const vendedoresData = users.filter(u => u.tipo === 'vendedor');
      
      // Processar dados de cada vendedor
      const vendedoresComDados = vendedoresData.map(vendedor => {
        const pedidosDoVendedor = pedidos.filter(p => p.vendedor_id === vendedor.id);
        
        // Calcular estatísticas
        const totalPedidos = pedidosDoVendedor.length;
        const pedidosFinalizados = pedidosDoVendedor.filter(p => p.status === 'finalizado');
        const pedidosEmAndamento = pedidosDoVendedor.filter(p => p.status === 'em_andamento');
        const pedidosCancelados = pedidosDoVendedor.filter(p => p.status === 'cancelado');
        
        const valorTotal = pedidosFinalizados.reduce((total, p) => total + (p.valor_total || 0), 0);
        const valorEmAndamento = pedidosEmAndamento.reduce((total, p) => total + (p.valor_total || 0), 0);
        
        return {
          ...vendedor,
          totalPedidos,
          pedidosFinalizados: pedidosFinalizados.length,
          pedidosEmAndamento: pedidosEmAndamento.length,
          pedidosCancelados: pedidosCancelados.length,
          valorTotal,
          valorEmAndamento,
          pedidos: pedidosDoVendedor
        };
      });

      // Calcular resumo geral
      const resumo = {
        totalVendedores: vendedoresData.length,
        totalPedidos: pedidos.length,
        totalValor: pedidos.reduce((total, p) => total + (p.valor_total || 0), 0),
        pedidosFinalizados: pedidos.filter(p => p.status === 'finalizado').length,
        pedidosEmAndamento: pedidos.filter(p => p.status === 'em_andamento').length,
        pedidosCancelados: pedidos.filter(p => p.status === 'cancelado').length
      };

      setVendedores(vendedoresComDados);
      setResumoGeral(resumo);
      
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
      alert('Erro ao carregar dados. Verifique a conexão com o banco.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGerarRelatorioPDF = async (vendedor) => {
    try {
      const reportData = {
        vendedor: vendedor.nome,
        periodo: 'Todos os períodos',
        status: 'Todos os status',
        totalVendas: vendedor.pedidos.length,
        valorTotal: vendedor.valorTotal,
        vendas: vendedor.pedidos.map(pedido => ({
          cliente: pedido.cliente?.nome || 'Cliente não informado',
          modelo: `Pedido #${pedido.numero_pedido}`,
          valor: pedido.valor_total || 0,
          status: pedido.status,
          data: new Date(pedido.created_at).toLocaleDateString('pt-BR')
        }))
      };
      
      const doc = await generateReportPDF(reportData);
      
      // Gerar e fazer download do PDF
      const pdfBlob = doc.output('blob');
      const fileName = `Relatorio_${vendedor.nome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(pdfBlob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpar URL
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      
      alert(`Relatório PDF gerado com sucesso!\nArquivo: ${fileName}`);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      alert('Erro ao gerar relatório PDF. Verifique se há dados para gerar o relatório.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'finalizado': return '#27b207';
      case 'em_andamento': return '#fd7e14';
      case 'cancelado': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'finalizado': return 'Finalizado';
      case 'em_andamento': return 'Em Andamento';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  if (isLoading) {
    return <GuindasteLoading />;
  }

  return (
    <div className="admin-layout">
      <AdminNavigation user={user} />
      
      <div className="admin-content">
        <div className="dashboard-container">
          <div className="dashboard-content">
            <div className="dashboard-header">
              <div className="welcome-section">
                <h1>Relatório Completo de Vendedores</h1>
                <p>Visualize todos os vendedores e seus orçamentos</p>
              </div>
            </div>

            {/* Resumo Geral */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#e3f2fd' }}>
                  <svg viewBox="0 0 24 24" fill="#1976d2">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <div className="stat-info">
                  <div className="stat-value">{resumoGeral.totalVendedores}</div>
                  <div className="stat-label">Vendedores</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#e8f5e8' }}>
                  <svg viewBox="0 0 24 24" fill="#27b207">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                  </svg>
                </div>
                <div className="stat-info">
                  <div className="stat-value">{resumoGeral.totalPedidos}</div>
                  <div className="stat-label">Total de Pedidos</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#fff3e0' }}>
                  <svg viewBox="0 0 24 24" fill="#fd7e14">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div className="stat-info">
                  <div className="stat-value">{resumoGeral.pedidosFinalizados}</div>
                  <div className="stat-label">Finalizados</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#fce4ec' }}>
                  <svg viewBox="0 0 24 24" fill="#e91e63">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/>
                  </svg>
                </div>
                <div className="stat-info">
                  <div className="stat-value">{formatCurrency(resumoGeral.totalValor)}</div>
                  <div className="stat-label">Valor Total</div>
                </div>
              </div>
            </div>

            {/* Lista de Vendedores */}
            <div className="vendedores-grid">
              {vendedores.map((vendedor) => (
                <div key={vendedor.id} className="vendedor-card">
                  <div className="vendedor-header">
                    <div className="vendedor-avatar">
                      {vendedor.nome.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <div className="vendedor-info">
                      <h3>{vendedor.nome}</h3>
                      <p>{vendedor.email}</p>
                      <p className="comissao">Comissão: {vendedor.comissao}%</p>
                    </div>
                  </div>

                  <div className="vendedor-stats">
                    <div className="stat-row">
                      <div className="stat-item">
                        <span className="stat-label">Total:</span>
                        <span className="stat-value">{vendedor.totalPedidos}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Finalizados:</span>
                        <span className="stat-value success">{vendedor.pedidosFinalizados}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Em Andamento:</span>
                        <span className="stat-value warning">{vendedor.pedidosEmAndamento}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Cancelados:</span>
                        <span className="stat-value danger">{vendedor.pedidosCancelados}</span>
                      </div>
                    </div>
                    <div className="stat-row">
                      <div className="stat-item full-width">
                        <span className="stat-label">Valor Total:</span>
                        <span className="stat-value price">{formatCurrency(vendedor.valorTotal)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Lista de Pedidos */}
                  <div className="pedidos-section">
                    <h4>Pedidos ({vendedor.pedidos.length})</h4>
                    {vendedor.pedidos.length > 0 ? (
                      <div className="pedidos-list">
                        {vendedor.pedidos.slice(0, 5).map((pedido) => (
                          <div key={pedido.id} className="pedido-item">
                            <div className="pedido-info">
                              <div className="pedido-numero">#{pedido.numero_pedido}</div>
                              <div className="pedido-cliente">
                                {pedido.cliente?.nome || 'Cliente não informado'}
                              </div>
                              <div className="pedido-data">
                                {new Date(pedido.created_at).toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                            <div className="pedido-valor">
                              {formatCurrency(pedido.valor_total)}
                            </div>
                            <div 
                              className="pedido-status"
                              style={{ color: getStatusColor(pedido.status) }}
                            >
                              {getStatusText(pedido.status)}
                            </div>
                          </div>
                        ))}
                        {vendedor.pedidos.length > 5 && (
                          <div className="pedido-item more-pedidos">
                            <span>+ {vendedor.pedidos.length - 5} pedidos mais...</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="no-pedidos">Nenhum pedido encontrado.</p>
                    )}
                  </div>

                  <div className="vendedor-actions">
                    <button 
                      className="btn-relatorio"
                      onClick={() => handleGerarRelatorioPDF(vendedor)}
                      disabled={vendedor.pedidos.length === 0}
                    >
                      📊 Gerar Relatório PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {vendedores.length === 0 && (
              <div className="empty-state">
                <p>Nenhum vendedor encontrado.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelatorioCompleto; 