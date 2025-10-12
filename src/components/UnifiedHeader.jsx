import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/UnifiedHeader.css';

const UnifiedHeader = ({ 
  showBackButton = false, 
  onBackClick, 
  showSupportButton = true, 
  showUserInfo = true,
  user = null,
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

  return (
    <div className="unified-header">
      {/* Decorative Elements */}
      <div className="header-decoration">
        <div className="deco-line deco-line-1"></div>
        <div className="deco-line deco-line-2"></div>
      </div>
      
      <div className="header-container">
        <div className="header-left">
          {showBackButton && (
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
              {subtitle && (
                <p className="brand-subtitle">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="subtitle-icon">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                  {subtitle}
                </p>
              )}
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
              <div className="button-glow"></div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedHeader; 