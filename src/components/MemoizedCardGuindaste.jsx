import React, { memo, useCallback } from 'react';
import { formatCurrency } from '../utils/formatters';

/**
 * CardGuindaste memoizado para evitar re-renders desnecessários
 * @param {Object} props
 * @param {Object} props.guindaste - Dados do guindaste
 * @param {Function} props.onAddToCart - Callback para adicionar ao carrinho
 * @param {Function} props.onRemoveFromCart - Callback para remover do carrinho
 * @param {boolean} props.isInCart - Se o guindaste está no carrinho
 */
const MemoizedCardGuindaste = memo(({ guindaste, onAddToCart, onRemoveFromCart, isInCart }) => {
  const handleCartAction = useCallback(() => {
    if (isInCart) {
      onRemoveFromCart(guindaste);
    } else {
      onAddToCart(guindaste);
    }
  }, [isInCart, onAddToCart, onRemoveFromCart, guindaste]);

  // Imagem padrão para guindastes sem foto
  const defaultImage = '/header-bg.jpg';

  return (
    <div className="card cursor-pointer transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1 border-gray-200">
      {/* Imagem do Guindaste */}
      <div className="relative mb-4">
        <img
          src={guindaste.imagem_url || defaultImage}
          alt={guindaste.subgrupo}
          className="w-full h-48 object-cover rounded-t-lg"
          onError={(e) => {
            e.target.src = defaultImage;
          }}
        />
        {guindaste.grafico_carga_url && (
          <div className="absolute top-2 right-2">
            <a
              href={guindaste.grafico_carga_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
              onClick={(e) => e.stopPropagation()}
            >
              📊 Gráfico
            </a>
          </div>
        )}
      </div>

      {/* Conteúdo do Card */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          {guindaste.subgrupo}
        </h3>
        
        <div className="space-y-2 mb-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Modelo:</span> {guindaste.modelo}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Capacidade:</span> {guindaste.capacidade}
          </p>
          {guindaste.peso_kg && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Peso:</span> {guindaste.peso_kg} kg
            </p>
          )}
          <p className="text-sm text-gray-600">
            <span className="font-medium">Código:</span> {guindaste.codigo_referencia}
          </p>
        </div>

        {/* Preço */}
        <div className="mb-4">
          <p className="text-xl font-bold text-green-600">
            {formatCurrency(guindaste.preco || 0)}
          </p>
        </div>

        {/* Descrição */}
        {guindaste.descricao && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-3">
            {guindaste.descricao}
          </p>
        )}

        {/* Botão de Ação */}
        <button
          onClick={handleCartAction}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors duration-200 ${
            isInCart
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isInCart ? 'Remover do Carrinho' : 'Adicionar ao Carrinho'}
        </button>
      </div>
    </div>
  );
});

// Definir displayName para debugging
MemoizedCardGuindaste.displayName = 'MemoizedCardGuindaste';

export default MemoizedCardGuindaste;
