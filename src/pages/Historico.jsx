import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import PDFGenerator from '../components/PDFGenerator';
import { formatCurrency } from '../utils/formatters';
import '../styles/Historico.css';
import { db } from '../config/supabase';

const Historico = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/');
      return;
    }

    // Buscar pedidos reais do banco
    const fetchPedidos = async () => {
      try {
        const pedidosData = await db.getPedidos();
        
        // Filtrar pedidos do vendedor logado (se for vendedor)
        let pedidosFiltrados = pedidosData;
        if (userData) {
          const user = JSON.parse(userData);
          if (user.tipo === 'vendedor') {
            pedidosFiltrados = pedidosData.filter(pedido => 
              pedido.vendedor_id === user.id
            );
          }
        }
        
        setPedidos(pedidosFiltrados);
      } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        setPedidos([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPedidos();
  }, [navigate]);

  const handlePDFGenerated = (fileName) => {
    alert(`PDF gerado com sucesso: ${fileName}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'finalizado':
        return '#28a745';
      case 'em_andamento':
        return '#ffc107';
      case 'cancelado':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const handleVerDetalhes = async (pedido) => {
    try {
      // Buscar itens do pedido
      const itens = await db.getPedidoItens(pedido.id);
      
      // Preparar dados para o PDF
    const pedidoData = {
        carrinho: itens.map(item => ({
          nome: item.guindaste?.nome || item.opcional?.nome || 'Item não encontrado',
          tipo: item.tipo,
          preco: item.preco_unitario
        })),
      clienteData: {
          nome: pedido.cliente?.nome || 'Cliente não informado',
          telefone: pedido.cliente?.telefone || '',
          email: pedido.cliente?.email || '',
          documento: pedido.cliente?.documento || '',
          endereco: pedido.cliente?.endereco || ''
      },
      caminhaoData: {
          placa: pedido.caminhao?.placa || '',
          modelo: pedido.caminhao?.modelo || '',
          ano: pedido.caminhao?.ano || '',
          cor: pedido.caminhao?.cor || ''
      }
    };

    // Gerar PDF diretamente
    const pdfGenerator = new PDFGenerator({ pedidoData, onGenerate: handlePDFGenerated });
    pdfGenerator.generatePDF();
    } catch (error) {
      console.error('Erro ao buscar detalhes do pedido:', error);
      alert('Erro ao buscar detalhes do pedido.');
    }
  };

  const handleWhatsApp = (pedido) => {
    const message = encodeURIComponent(
      `Olá! Gostaria de discutir o pedido ${pedido.numero_pedido} - ${pedido.cliente?.nome || 'Cliente'} por ${formatCurrency(pedido.valor_total)}. Status: ${pedido.status === 'finalizado' ? 'Finalizado' : pedido.status}`
    );
    window.open(`https://wa.me/55981721286?text=${message}`, '_blank');
  };

  

  if (!user) {
    return null;
  }

  return (
    <div className="historico-container">
      <UnifiedHeader 
        showBackButton={true}
        onBackClick={() => navigate('/dashboard')}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title="Histórico"
        subtitle="Pedidos e Orçamentos"
      />

      <div className="historico-content">
        <div className="historico-header">
          <div className="header-info">
            <h1>Pedidos</h1>
            <p>Histórico completo de orçamentos e pedidos</p>
          </div>
          
          <div className="header-actions">
            <button 
              onClick={() => navigate('/novo-pedido')}
              className="new-order-btn"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Novo Pedido
            </button>
          </div>
        </div>

        <div className="pedidos-list">
          {pedidos.map((pedido) => (
            <div key={pedido.id} className="pedido-card">
              <div className="pedido-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                </svg>
              </div>
              
              <div className="pedido-info">
                <div className="pedido-header">
                  <h3 className="cliente-name">{pedido.cliente?.nome || 'Cliente não informado'}</h3>
                  <div 
                    className="pedido-status"
                    style={{ color: getStatusColor(pedido.status) }}
                  >
                    {pedido.status === 'finalizado' ? 'Finalizado' : 
                     pedido.status === 'em_andamento' ? 'Em Andamento' : 
                     pedido.status === 'cancelado' ? 'Cancelado' : pedido.status}
                  </div>
                </div>
                
                <div className="pedido-details">
                  <div className="detail-item">
                    <span className="detail-label">Número:</span>
                    <span className="detail-value">{pedido.numero_pedido}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Preço:</span>
                    <span className="detail-value price">{formatCurrency(pedido.valor_total)}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Data:</span>
                    <span className="detail-value">
                      {new Date(pedido.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  
                  {pedido.vendedor && (
                    <div className="detail-item">
                      <span className="detail-label">Vendedor:</span>
                      <span className="detail-value">{pedido.vendedor.nome}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="pedido-actions">
                <button 
                  onClick={() => handleVerDetalhes(pedido)}
                  className="action-btn details-btn"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                  Ver Detalhes
                </button>
                
                <button 
                  onClick={() => handleWhatsApp(pedido)}
                  className="action-btn whatsapp-btn"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                  </svg>
                  Enviar WhatsApp
                </button>
              </div>
            </div>
          ))}
        </div>

        {pedidos.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
            </div>
            <h3>Nenhum pedido encontrado</h3>
            <p>Comece criando seu primeiro orçamento</p>
            <button 
              onClick={() => navigate('/novo-pedido')}
              className="new-order-btn"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Criar Primeiro Pedido
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Historico; 