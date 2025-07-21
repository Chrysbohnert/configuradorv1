import React from 'react';
import { formatCurrency } from '../utils/formatters';

const Carrinho = ({ itens, onRemoverItem, onLimparCarrinho }) => {

  const getTotal = () => {
    return itens.reduce((total, item) => total + item.preco, 0);
  };

  const getQuantidadePorTipo = () => {
    const guindastes = itens.filter(item => item.tipo === 'guindaste');
    const opcionais = itens.filter(item => item.tipo === 'opcional');
    
    return { guindastes: guindastes.length, opcionais: opcionais.length };
  };

  const { guindastes, opcionais } = getQuantidadePorTipo();

  if (itens.length === 0) {
    return (
      <div className="card bg-gray-50 border-2 border-dashed border-gray-300">
        <div className="text-center py-8">
          <span className="text-4xl mb-4 block">🛒</span>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Carrinho Vazio</h3>
          <p className="text-sm text-gray-500">Adicione guindastes e opcionais ao seu carrinho</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      {/* Header do Carrinho */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center">
          <span className="text-2xl mr-3">🛒</span>
          <div>
            <h3 className="text-lg font-semibold text-empresa-cinza">Carrinho</h3>
            <p className="text-sm text-gray-600">
              {guindastes} guindaste{guindastes !== 1 ? 's' : ''} • {opcionais} opcional{opcionais !== 1 ? 'is' : ''}
            </p>
          </div>
        </div>
        
        {itens.length > 0 && (
          <button
            onClick={onLimparCarrinho}
            className="text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Lista de Itens */}
      <div className="space-y-3 mb-4">
        {itens.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="flex items-center flex-1">
              {/* Ícone do tipo */}
              <div className="w-8 h-8 rounded-full bg-empresa-vermelho flex items-center justify-center mr-3">
                <span className="text-white text-xs">
                  {item.tipo === 'guindaste' ? '🏗️' : '⚙️'}
                </span>
              </div>
              
              {/* Informações do item */}
              <div className="flex-1">
                <h4 className="font-medium text-empresa-cinza text-sm">
                  {item.nome}
                </h4>
                {item.tipo === 'guindaste' && (
                  <p className="text-xs text-gray-600">{item.modelo}</p>
                )}
                {item.tipo === 'opcional' && (
                  <p className="text-xs text-gray-600">{item.categoria}</p>
                )}
              </div>
            </div>
            
            {/* Preço e botão remover */}
            <div className="flex items-center space-x-3">
              <span className="font-semibold text-empresa-vermelho text-sm">
                {formatCurrency(item.preco)}
              </span>
              <button
                onClick={() => onRemoverItem(index)}
                className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors"
              >
                <span className="text-red-600 text-xs">×</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-empresa-cinza">Total</span>
          <span className="text-xl font-bold text-empresa-vermelho">
            {formatCurrency(getTotal())}
          </span>
        </div>
        
        <p className="text-xs text-gray-500 mt-1">
          {itens.length} item{itens.length !== 1 ? 's' : ''} no carrinho
        </p>
      </div>
    </div>
  );
};

export default Carrinho; 