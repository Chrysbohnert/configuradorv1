import React from 'react';
import '../styles/LoadingSpinner.css';

/**
 * Componente de loading reutilizável para lazy loading
 * @param {Object} props
 * @param {string} props.message - Mensagem de loading
 * @param {string} props.size - Tamanho do spinner (small, medium, large)
 */
const LoadingSpinner = ({ 
  message = 'Carregando...', 
  size = 'medium' 
}) => {
  return (
    <div className={`loading-container ${size}`}>
      <div className="loading-spinner">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      <p className="loading-message">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
