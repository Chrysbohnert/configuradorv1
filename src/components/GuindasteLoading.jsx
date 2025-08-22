import React from 'react';
import '../styles/Loading.css';

const GuindasteLoading = ({ text = "Carregando..." }) => {
  return (
    <div className="guindaste-loading-container">
      <div className="guindaste-scene">
        {/* Base do guindaste */}
        <div className="guindaste-base">
          <div className="guindaste-cabin"></div>
          <div className="guindaste-arm">
            <div className="guindaste-cable"></div>
            <div className="guindaste-hook"></div>
          </div>
        </div>
        
        {/* Carga sendo movida */}
        <div className="cargo">
          <div className="cargo-box"></div>
        </div>
        
        {/* Partículas de movimento */}
        <div className="particles">
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
        </div>
      </div>
      
      <div className="loading-text">
        {text}
      </div>
      
      {/* Progress bar */}
      <div className="progress-container">
        <div className="progress-bar"></div>
      </div>
    </div>
  );
};

export default GuindasteLoading; 