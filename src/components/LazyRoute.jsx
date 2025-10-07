import React, { Suspense } from 'react';
import LoadingSpinner from './LoadingSpinner';

/**
 * Componente wrapper para rotas lazy com Suspense
 * @param {Object} props
 * @param {React.Component} props.children - Componente lazy a ser carregado
 * @param {string} props.loadingMessage - Mensagem de loading personalizada
 * @param {string} props.loadingSize - Tamanho do loading (small, medium, large)
 */
const LazyRoute = ({ 
  children, 
  loadingMessage = 'Carregando página...', 
  loadingSize = 'medium' 
}) => {
  return (
    <Suspense 
      fallback={
        <LoadingSpinner 
          message={loadingMessage} 
          size={loadingSize} 
        />
      }
    >
      {children}
    </Suspense>
  );
};

export default LazyRoute;
