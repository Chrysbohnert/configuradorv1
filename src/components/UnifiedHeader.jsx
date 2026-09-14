import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/UnifiedHeader.css';

const UnifiedHeader = ({ 
  showBackButton = false, 
  onBackClick, 
  showSupportButton = true, 
  title = "STARK Orçamento",
  subtitle = "Sistema Profissional de Orçamentos"
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      navigate(-1);
    }
  };

  const handleSupport = () => {
    navigate('/suporte');
  };

  const shouldShowBack = showBackButton;

  return (
    <div className="unified-header">
      <div className="header-container">
        <div className="header-left">
          {shouldShowBack && (
            <button onClick={handleBack} className="back-button" aria-label="Voltar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              <span>Voltar</span>
            </button>
          )}
          
          <div className="header-brand">
            <div className="brand-content">
              <div className="brand-title-wrapper">
                <h1 className="brand-title">{title}</h1>
              </div>
              {subtitle && <p className="brand-subtitle">{subtitle}</p>}
            </div>
          </div>
        </div>

        <div className="header-right">
          {showSupportButton && (
            <button onClick={handleSupport} className="support-button" aria-label="Suporte">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>Suporte</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedHeader; 