import React from 'react';
import { formatCurrency } from '../utils/formatters';

const CardGuindaste = React.memo(({ guindaste, onAddToCart, onRemoveFromCart, isInCart }) => {

  const handleCartAction = (e) => {
    e.stopPropagation();
    if (isInCart) {
      onRemoveFromCart(guindaste);
    } else {
      onAddToCart(guindaste);
    }
  };

  return (
    <div 
      className="relative bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group cursor-pointer border border-gray-100"
      onClick={() => guindaste.onClick && guindaste.onClick(guindaste)}
      style={{
        background: 'linear-gradient(135deg, var(--empresa-branco) 0%, var(--empresa-cinza-muito-claro) 100%)'
      }}
    >
      {/* Header com gradiente */}
      <div 
        className="h-2 w-full"
        style={{
          background: 'linear-gradient(90deg, var(--empresa-cinza-escuro) 0%, var(--empresa-cinza) 50%, var(--empresa-azul) 100%)'
        }}
      />

      {/* Status Badge */}
      {isInCart && (
        <div 
          className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold z-10 shadow-md"
          style={{
            backgroundColor: 'var(--empresa-verde)',
            color: 'var(--empresa-branco)'
          }}
        >
          ✓ No Carrinho
        </div>
      )}

      <div className="p-6">
        {/* Imagem com overlay */}
        <div className="relative mb-6 h-48 overflow-hidden rounded-lg group-hover:scale-105 transition-transform duration-300">
          <img 
            src={guindaste.imagem_url || '/header-bg.jpg'} 
            alt={guindaste.nome}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = '/header-bg.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Título e Modelo */}
        <div className="mb-4">
          <h3 
            className="font-bold text-xl mb-2 leading-tight"
            style={{ color: 'var(--empresa-cinza-escuro)' }}
          >
            {guindaste.nome}
          </h3>
          <div 
            className="inline-block px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: 'var(--empresa-cinza-muito-claro)',
              color: 'var(--empresa-cinza-claro)'
            }}
          >
            Modelo: {guindaste.modelo}
          </div>
        </div>

        {/* Especificações em Grid */}
        <div className="grid grid-cols-1 gap-3 mb-6">
          <div 
            className="flex items-center justify-between p-3 rounded-lg"
            style={{ backgroundColor: 'var(--empresa-branco)' }}
          >
            <div className="flex items-center space-x-2">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: 'var(--empresa-azul)' }}
              />
              <span 
                className="text-sm font-medium"
                style={{ color: 'var(--empresa-cinza-claro)' }}
              >
                Capacidade
              </span>
            </div>
            <span 
              className="font-bold"
              style={{ color: 'var(--empresa-cinza-escuro)' }}
            >
              {guindaste.capacidade}
            </span>
          </div>

          <div 
            className="flex items-center justify-between p-3 rounded-lg"
            style={{ backgroundColor: 'var(--empresa-branco)' }}
          >
            <div className="flex items-center space-x-2">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: 'var(--empresa-verde)' }}
              />
              <span 
                className="text-sm font-medium"
                style={{ color: 'var(--empresa-cinza-claro)' }}
              >
                Alcance
              </span>
            </div>
            <span 
              className="font-bold"
              style={{ color: 'var(--empresa-cinza-escuro)' }}
            >
              {guindaste.alcance}
            </span>
          </div>

          <div 
            className="flex items-center justify-between p-3 rounded-lg"
            style={{ backgroundColor: 'var(--empresa-branco)' }}
          >
            <div className="flex items-center space-x-2">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: 'var(--empresa-vermelho)' }}
              />
              <span 
                className="text-sm font-medium"
                style={{ color: 'var(--empresa-cinza-claro)' }}
              >
                Altura
              </span>
            </div>
            <span 
              className="font-bold"
              style={{ color: 'var(--empresa-cinza-escuro)' }}
            >
              {guindaste.altura}
            </span>
          </div>
        </div>

        {/* Preço destacado */}
        <div 
          className="p-4 rounded-lg mb-4 text-center"
          style={{
            background: 'linear-gradient(135deg, var(--empresa-cinza-escuro) 0%, var(--empresa-preto) 100%)'
          }}
        >
          <div 
            className="text-sm font-medium mb-1"
            style={{ color: 'var(--empresa-cinza-claro)' }}
          >
            Preço
          </div>
          <div 
            className="text-2xl font-bold"
            style={{ color: 'var(--empresa-branco)' }}
          >
            {formatCurrency(guindaste.preco)}
          </div>
        </div>

        {/* Descrição Técnica */}
        {guindaste.descricao && (
          <div 
            className="mb-4 p-3 rounded-lg"
            style={{ backgroundColor: '#e3f2fd' }}
          >
            <p 
              className="text-xs font-semibold mb-1"
              style={{ color: '#1976d2' }}
            >
              📋 Descrição Técnica:
            </p>
            <p 
              className="text-sm line-clamp-3"
              style={{ color: '#424242' }}
            >
              {guindaste.descricao}
            </p>
          </div>
        )}

        {/* Não Incluído */}
        {guindaste.nao_incluido && (
          <div 
            className="mb-4 p-3 rounded-lg border-l-4"
            style={{ 
              backgroundColor: '#fff3cd',
              borderLeftColor: '#ffc107'
            }}
          >
            <p 
              className="text-xs font-semibold mb-1"
              style={{ color: '#856404' }}
            >
              ⚠️ Não está incluído:
            </p>
            <p 
              className="text-sm line-clamp-2"
              style={{ color: '#856404' }}
            >
              {guindaste.nao_incluido}
            </p>
          </div>
        )}

        {/* Botão de Ação */}
        <button
          onClick={handleCartAction}
          className={`w-full py-3 px-6 rounded-lg font-bold text-sm transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-1 ${
            isInCart
              ? 'hover:scale-105'
              : 'hover:scale-105'
          }`}
          style={{
            backgroundColor: isInCart ? 'var(--empresa-vermelho)' : 'var(--empresa-azul)',
            color: 'var(--empresa-branco)',
            border: `2px solid ${isInCart ? 'var(--empresa-vermelho)' : 'var(--empresa-azul)'}`
          }}
        >
          <span className="text-lg">
            {isInCart ? '🗑️' : '🛒'}
          </span>
          <span>
            {isInCart ? 'Remover do Carrinho' : 'Adicionar ao Carrinho'}
          </span>
        </button>
      </div>
    </div>
  );
});

CardGuindaste.displayName = 'CardGuindaste';

export default CardGuindaste;