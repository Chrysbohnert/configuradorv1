import React, { useState, useEffect } from 'react';
import '../styles/LoadingSpinner.css';

/**
 * Componente de loading otimizado com progresso
 * @param {Object} props
 * @param {string} props.message - Mensagem de loading
 * @param {number} props.progress - Progresso (0-100)
 * @param {boolean} props.showProgress - Mostrar barra de progresso
 * @param {string} props.size - Tamanho do spinner (sm, md, lg)
 * @param {string} props.color - Cor do spinner
 */
const OptimizedLoadingSpinner = ({ 
  message = 'Carregando...', 
  progress = 0, 
  showProgress = false,
  size = 'md',
  color = 'blue'
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [dots, setDots] = useState('');

  // Animação de progresso
  useEffect(() => {
    if (showProgress) {
      const interval = setInterval(() => {
        setDisplayProgress(prev => {
          if (prev < progress) {
            return Math.min(prev + 2, progress);
          }
          return prev;
        });
      }, 50);

      return () => clearInterval(interval);
    }
  }, [progress, showProgress]);

  // Animação de pontos
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Classes CSS baseadas no tamanho
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  // Classes CSS baseadas na cor
  const colorClasses = {
    blue: 'border-blue-600',
    green: 'border-green-600',
    red: 'border-red-600',
    yellow: 'border-yellow-600',
    purple: 'border-purple-600'
  };

  return (
    <div className="optimized-loading-container">
      <div className="loading-content">
        {/* Spinner */}
        <div className={`loading-spinner ${sizeClasses[size]} ${colorClasses[color]}`}>
          <div className="spinner-inner"></div>
        </div>
        
        {/* Mensagem */}
        <div className="loading-message">
          <p className="text-lg font-medium text-gray-700">
            {message}
            {!showProgress && <span className="dots">{dots}</span>}
          </p>
        </div>
        
        {/* Barra de progresso */}
        {showProgress && (
          <div className="loading-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${displayProgress}%` }}
              ></div>
            </div>
            <div className="progress-text">
              {Math.round(displayProgress)}%
            </div>
          </div>
        )}
        
        {/* Dicas de otimização */}
        <div className="loading-tips">
          <p className="text-sm text-gray-500">
            💡 Dica: Os dados são carregados com cache para melhor performance
          </p>
        </div>
      </div>
    </div>
  );
};

export default OptimizedLoadingSpinner;
