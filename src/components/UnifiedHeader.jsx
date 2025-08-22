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
      <div className="header-background">
        <img src="/header-bg.jpg" alt="STARK Orçamento" className="header-bg-image" />
        <div className="header-overlay"></div>
      </div>
      
      <div className="header-content">
        <div className="header-left">
          {showBackButton && (
            <button onClick={handleBack} className="back-button">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
              Voltar
            </button>
          )}
          
          <div className="header-brand">
            <div className="brand-logo">
              <img src="/header-bg.jpg" alt="Logo STARK" className="logo-image" />
            </div>
            <div className="brand-text">
              <h1>{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
        </div>

        <div className="header-right">
          {showSupportButton && (
            <button onClick={handleSupport} className="support-button">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              Suporte
            </button>
          )}

          {showUserInfo && user && (
            <div className="user-info">
              <div className="user-avatar">
                {user.nome.charAt(0).toUpperCase()}
              </div>
              <div className="user-details">
                <div className="user-name">{user.nome}</div>
                <div className="user-role">{user.tipo}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedHeader; 