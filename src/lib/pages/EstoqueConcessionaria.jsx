import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { db, supabase } from '../../config/supabase';
import '../../styles/EstoqueConcessionaria.css';

const EstoqueConcessionaria = () => {
  const navigate = useNavigate();
  const { user } = useOutletContext();
  const [isLoading, setIsLoading] = useState(true);
  const [estoque, setEstoque] = useState([]);
  const [guindastes, setGuindastes] = useState([]);
  const [concessionaria, setConcessionaria] = useState(null);

  useEffect(() => {
    if (!user) return;
    if (user.tipo !== 'admin_concessionaria') {
      navigate('/');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Carregar dados da concessionÃ¡ria
      const conc = await db.getConcessionariaById(user.concessionaria_id);
      setConcessionaria(conc);

      // Carregar estoque
      const estoqueData = await db.getEstoqueConcessionaria(user.concessionaria_id);
      
      // Carregar apenas os guindastes que estÃ£o no estoque (otimizado)
      const idsNoEstoque = estoqueData.map(item => item.guindaste_id);
      
      // Buscar dados dos guindastes (apenas campos necessÃ¡rios)
      const { data: guindastesData, error } = await supabase
        .from('guindastes')
        .select('id, subgrupo, modelo, codigo_referencia, imagem_url')
        .in('id', idsNoEstoque);
      
      if (error) throw error;
      
      // Criar mapa de guindastes por ID
      const guindasteMap = (guindastesData || []).reduce((acc, g) => {
        acc[g.id] = g;
        return acc;
      }, {});

      // Combinar estoque com dados dos guindastes
      const estoqueCompleto = estoqueData
        .map(item => ({
          ...item,
          guindaste: guindasteMap[item.guindaste_id]
        }))
        .filter(item => item.guindaste) // Apenas itens com guindaste vÃ¡lido
        .sort((a, b) => {
          // Ordenar: primeiro com estoque > 0, depois por nome
          if (a.quantidade > 0 && b.quantidade === 0) return -1;
          if (a.quantidade === 0 && b.quantidade > 0) return 1;
          return (a.guindaste?.subgrupo || '').localeCompare(b.guindaste?.subgrupo || '');
        });

      setEstoque(estoqueCompleto);
    } catch (error) {
      console.error('Erro ao carregar estoque:', error);
      alert('Erro ao carregar estoque. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const totalEmEstoque = estoque.reduce((sum, item) => sum + (item.quantidade || 0), 0);
  const modelosComEstoque = estoque.filter(item => item.quantidade > 0).length;

  if (!user || user.tipo !== 'admin_concessionaria') {
    return null;
  }

  return (
    <div className="estoque-container">
        <div className="estoque-content">
          {/* Header com estatÃ­sticas */}
          <div className="estoque-header">
            <div className="header-info">
              <h1>ðŸ“¦ Estoque de Guindastes</h1>
              <p>Gerencie o inventÃ¡rio da sua concessionÃ¡ria</p>
            </div>
            
            <div className="estoque-stats">
              <div className="stat-card">
                <div className="stat-icon"></div>
                <div className="stat-info">
                  <span className="stat-label">Total em Estoque</span>
                  <span className="stat-value">{totalEmEstoque}</span>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon"></div>
                <div className="stat-info">
                  <span className="stat-label">Modelos DisponÃ­veis</span>
                  <span className="stat-value">{modelosComEstoque}</span>
                </div>
              </div>
            </div>
          </div>

          {/* BotÃµes de aÃ§Ã£o */}
          <div className="estoque-actions">
            <button 
              onClick={() => navigate('/nova-proposta-concessionaria')}
              className="btn-primary"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              Comprar Guindastes
            </button>
            
            <button 
              onClick={loadData}
              className="btn-secondary"
              disabled={isLoading}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
              </svg>
              Atualizar
            </button>
          </div>

          {/* Tabela de estoque */}
          {isLoading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Carregando estoque...</p>
            </div>
          ) : estoque.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"></div>
              <h3>Estoque Vazio</h3>
              <p>VocÃª ainda nÃ£o possui guindastes em estoque.</p>
              <button 
                onClick={() => navigate('/nova-proposta-concessionaria')}
                className="btn-primary"
              >
                Fazer Primeiro Pedido
              </button>
            </div>
          ) : (
            <div className="estoque-table-container">
              <table className="estoque-table">
                <thead>
                  <tr>
                    <th>Imagem</th>
                    <th>Modelo</th>
                    <th>CÃ³digo</th>
                    <th className="text-center">Quantidade</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {estoque.map((item) => (
                    <tr key={item.id} className={item.quantidade === 0 ? 'sem-estoque' : ''}>
                      <td>
                        <div className="guindaste-image">
                          <img 
                            src={item.guindaste?.imagem_url || '/placeholder.png'} 
                            alt={item.guindaste?.subgrupo}
                            onError={(e) => { e.target.src = '/header-bg.jpg'; }}
                          />
                        </div>
                      </td>
                      <td>
                        <div className="guindaste-info">
                          <strong>{item.guindaste?.subgrupo}</strong>
                          <small>{item.guindaste?.modelo}</small>
                        </div>
                      </td>
                      <td>
                        <code>{item.guindaste?.codigo_referencia || 'N/A'}</code>
                      </td>
                      <td className="text-center">
                        <span className={`quantidade-badge ${item.quantidade > 0 ? 'disponivel' : 'esgotado'}`}>
                          {item.quantidade}
                        </span>
                      </td>
                      <td className="text-center">
                        {item.quantidade > 0 ? (
                          <span className="status-badge disponivel">âœ“ DisponÃ­vel</span>
                        ) : (
                          <span className="status-badge esgotado">âœ— Esgotado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* InformaÃ§Ãµes adicionais */}
          <div className="estoque-info-box">
            <h3>â„¹ï¸ Como funciona o estoque?</h3>
            <ul>
              <li><strong>Comprar Guindastes:</strong> FaÃ§a pedidos de compra Ã  Stark para adicionar guindastes ao seu estoque.</li>
              <li><strong>Vendas:</strong> Quando seus vendedores fazem uma venda, o estoque Ã© descontado automaticamente.</li>
              <li><strong>Visibilidade:</strong> Seus vendedores sÃ³ veem guindastes que estÃ£o em estoque (quantidade {'>'} 0).</li>
              <li><strong>PreÃ§os:</strong> Use o botÃ£o "PreÃ§o" em Gerenciar Guindastes para definir seus preÃ§os de venda.</li>
            </ul>
          </div>
        </div>
    </div>
  );
};

export default EstoqueConcessionaria;




