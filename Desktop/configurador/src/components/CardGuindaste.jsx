import React from 'react';
import { formatCurrency } from '../utils/formatters';

const CardGuindaste = ({ guindaste, onAddToCart, onRemoveFromCart, isInCart }) => {

  const handleCartAction = () => {
    if (isInCart) {
      onRemoveFromCart(guindaste);
    } else {
      onAddToCart(guindaste);
    }
  };

  // Imagem padrão para guindastes sem foto
  const defaultImage = '/header-bg.jpg'; // Imagem do projeto

  return (
    <div className="card cursor-pointer transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1 border-gray-200">
      {/* Imagem do Guindaste */}
      <div className="relative mb-4">
        <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
          <img 
            src={guindaste.imagem_url || defaultImage} 
            alt={guindaste.nome}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.src = defaultImage;
            }}
          />
        </div>
        
        {/* Badge de Status */}
        {isInCart && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-empresa-vermelho rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white text-xs">✓</span>
          </div>
        )}
      </div>

      {/* Informações do Guindaste */}
      <div className="space-y-3">
        {/* Nome e Modelo */}
        <div>
          <h3 className="font-semibold text-empresa-cinza text-lg leading-tight">
            {guindaste.nome}
          </h3>
          <p className="text-sm text-gray-600 font-medium">
            {guindaste.modelo}
          </p>
        </div>

        {/* Especificações */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Capacidade:</span>
            <span className="font-semibold text-empresa-cinza">{guindaste.capacidade}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Alcance:</span>
            <span className="font-semibold text-empresa-cinza">{guindaste.alcance}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Altura:</span>
            <span className="font-semibold text-empresa-cinza">{guindaste.altura}</span>
          </div>
        </div>

        {/* Preço */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Preço</span>
            <span className="text-lg font-bold text-empresa-vermelho">
              {formatCurrency(guindaste.preco)}
            </span>
          </div>
        </div>

        {/* Botão de Carrinho */}
        <button
          onClick={handleCartAction}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
            isInCart
              ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
              : 'bg-empresa-vermelho text-white hover:bg-red-700 shadow-lg'
          }`}
        >
          <span className="text-sm">
            {isInCart ? '🛒 Remover' : '🛒 Adicionar'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default CardGuindaste; 