import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/formatters';

/**
 * Componente do carrinho de compras
 * @param {Object} props
 * @param {Array} props.carrinho - Itens do carrinho
 * @param {Function} props.onCarrinhoChange - Callback quando carrinho muda
 * @param {Array} props.guindastes - Lista de guindastes disponíveis
 * @param {Function} props.onGuindasteSelect - Callback quando guindaste é selecionado
 * @param {Function} props.onRemoveItem - Callback para remover item
 * @param {Function} props.onUpdateQuantity - Callback para atualizar quantidade
 */
const CarrinhoForm = ({ 
  carrinho, 
  onCarrinhoChange,
  guindastes,
  onGuindasteSelect,
  onRemoveItem,
  onUpdateQuantity
}) => {
  const [selectedCapacidade, setSelectedCapacidade] = useState(null);
  const [selectedModelo, setSelectedModelo] = useState(null);
  const [filteredGuindastes, setFilteredGuindastes] = useState([]);

  // Filtrar guindastes por capacidade e modelo
  useEffect(() => {
    let filtered = guindastes;

    if (selectedCapacidade) {
      filtered = filtered.filter(g => g.capacidade === selectedCapacidade);
    }

    if (selectedModelo) {
      filtered = filtered.filter(g => g.modelo === selectedModelo);
    }

    setFilteredGuindastes(filtered);
  }, [guindastes, selectedCapacidade, selectedModelo]);

  // Obter capacidades únicas
  const getCapacidadesUnicas = () => {
    const capacidades = new Set();
    guindastes.forEach(guindaste => {
      if (guindaste.capacidade) {
        capacidades.add(guindaste.capacidade);
      }
    });
    return Array.from(capacidades).sort();
  };

  // Obter modelos únicos por capacidade
  const getModelosUnicos = () => {
    const modelos = new Map();
    guindastes.forEach(guindaste => {
      if (guindaste.capacidade === selectedCapacidade && guindaste.modelo) {
        if (!modelos.has(guindaste.modelo)) {
          modelos.set(guindaste.modelo, {
            nome: guindaste.modelo,
            count: 0
          });
        }
        modelos.get(guindaste.modelo).count++;
      }
    });
    return Array.from(modelos.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  };

  const handleCapacidadeChange = (capacidade) => {
    setSelectedCapacidade(capacidade);
    setSelectedModelo(null); // Reset modelo quando capacidade muda
  };

  const handleModeloChange = (modelo) => {
    setSelectedModelo(modelo);
  };

  const handleGuindasteSelect = (guindaste) => {
    if (onGuindasteSelect) {
      onGuindasteSelect(guindaste);
    }
  };

  const getTotalCarrinho = () => {
    return carrinho.reduce((total, item) => {
      return total + (item.preco * (item.quantidade || 1));
    }, 0);
  };

  const capacidades = getCapacidadesUnicas();
  const modelos = getModelosUnicos();

  return (
    <div className="carrinho-form">
      <h3>Carrinho de Compras</h3>
      
      {/* Filtros */}
      <div className="filters-section">
        <div className="form-group">
          <label htmlFor="capacidade">Filtrar por Capacidade</label>
          <select
            id="capacidade"
            value={selectedCapacidade || ''}
            onChange={(e) => handleCapacidadeChange(e.target.value)}
          >
            <option value="">Todas as capacidades</option>
            {capacidades.map(capacidade => (
              <option key={capacidade} value={capacidade}>
                {capacidade}
              </option>
            ))}
          </select>
        </div>

        {selectedCapacidade && (
          <div className="form-group">
            <label htmlFor="modelo">Filtrar por Modelo</label>
            <select
              id="modelo"
              value={selectedModelo || ''}
              onChange={(e) => handleModeloChange(e.target.value)}
            >
              <option value="">Todos os modelos</option>
              {modelos.map(modelo => (
                <option key={modelo.nome} value={modelo.nome}>
                  {modelo.nome} ({modelo.count} disponível{modelo.count !== 1 ? 'is' : ''})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Lista de Guindastes */}
      <div className="guindastes-grid">
        {filteredGuindastes.map(guindaste => (
          <div key={guindaste.id} className="guindaste-card">
            <div className="guindaste-image">
              {guindaste.imagem_url ? (
                <img 
                  src={guindaste.imagem_url} 
                  alt={guindaste.subgrupo}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="no-image">
                  <span>Sem imagem</span>
                </div>
              )}
            </div>
            
            <div className="guindaste-info">
              <h4>{guindaste.subgrupo}</h4>
              <p><strong>Modelo:</strong> {guindaste.modelo}</p>
              <p><strong>Capacidade:</strong> {guindaste.capacidade}</p>
              <p><strong>Peso:</strong> {guindaste.peso_kg ? `${guindaste.peso_kg} kg` : 'N/A'}</p>
              <p><strong>Preço:</strong> {formatCurrency(guindaste.preco || 0)}</p>
              
              {guindaste.descricao && (
                <p className="descricao">{guindaste.descricao}</p>
              )}
            </div>
            
            <div className="guindaste-actions">
              <button 
                className="btn-primary"
                onClick={() => handleGuindasteSelect(guindaste)}
              >
                Adicionar ao Carrinho
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Carrinho Atual */}
      {carrinho.length > 0 && (
        <div className="carrinho-atual">
          <h4>Itens no Carrinho</h4>
          <div className="carrinho-items">
            {carrinho.map((item, index) => (
              <div key={`${item.id}-${index}`} className="carrinho-item">
                <div className="item-info">
                  <h5>{item.nome}</h5>
                  <p>{item.modelo}</p>
                  <p>Preço: {formatCurrency(item.preco)}</p>
                </div>
                
                <div className="item-quantity">
                  <label>Quantidade:</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantidade || 1}
                    onChange={(e) => onUpdateQuantity && onUpdateQuantity(index, parseInt(e.target.value))}
                  />
                </div>
                
                <div className="item-total">
                  <strong>{formatCurrency(item.preco * (item.quantidade || 1))}</strong>
                </div>
                
                <div className="item-actions">
                  <button 
                    className="btn-danger"
                    onClick={() => onRemoveItem && onRemoveItem(index)}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="carrinho-total">
            <h3>Total: {formatCurrency(getTotalCarrinho())}</h3>
          </div>
        </div>
      )}

      {/* Mensagem quando carrinho está vazio */}
      {carrinho.length === 0 && (
        <div className="carrinho-vazio">
          <p>Seu carrinho está vazio. Selecione um guindaste para começar.</p>
        </div>
      )}
    </div>
  );
};

export default CarrinhoForm;
