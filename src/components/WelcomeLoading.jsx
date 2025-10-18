import React, { useState, useEffect } from 'react';
import '../styles/WelcomeLoading.css';

/**
 * Componente de loading de boas-vindas personalizado
 * Exibido após login enquanto o dashboard carrega os dados
 */
const WelcomeLoading = ({ userName, userRole, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = [
    {
      text: `Bem-vindo de volta, ${userName}!`,
      description: 'Preparando seu painel administrativo...',
      duration: 1000
    },
    {
      text: 'Carregando dados do sistema',
      description: 'Buscando informações atualizadas...',
      duration: 1200
    },
    {
      text: 'Preparando guindastes',
      description: 'Organizando equipamentos disponíveis...',
      duration: 1000
    },
    {
      text: 'Atualizando métricas',
      description: 'Calculando estatísticas em tempo real...',
      duration: 800
    },
    {
      text: 'Tudo pronto!',
      description: 'Seu dashboard está carregado.',
      duration: 500
    }
  ];

  useEffect(() => {
    const totalDuration = steps.reduce((acc, step) => acc + step.duration, 0);
    const stepDuration = 100; // Atualizar progresso a cada 100ms
    const progressIncrement = (100 / totalDuration) * stepDuration;

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => onComplete(), 300);
          return 100;
        }
        return Math.min(prev + progressIncrement, 100);
      });
    }, stepDuration);

    return () => clearInterval(progressInterval);
  }, [onComplete]);

  useEffect(() => {
    let stepIndex = 0;
    let accumulatedTime = 0;

    const stepInterval = setInterval(() => {
      if (stepIndex < steps.length) {
        setCurrentStep(stepIndex);
        accumulatedTime += steps[stepIndex].duration;
        stepIndex++;
      } else {
        clearInterval(stepInterval);
      }
    }, steps[0].duration);

    return () => clearInterval(stepInterval);
  }, []);

  const currentStepData = steps[currentStep] || steps[0];

  return (
    <div className="welcome-loading">
      <div className="welcome-container">
        {/* Logo/Header com branding STARK */}
        <div className="welcome-header">
          <div className="logo-container">
            <img src="/favicon.png" alt="STARK" className="logo-image" />
            <h1 className="logo-text">STARK</h1>
            <span className="logo-subtitle">industrial</span>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="welcome-content">
          <h2 className="welcome-title">
            {currentStepData.text}
          </h2>
          
          <p className="welcome-description">
            {currentStepData.description}
          </p>

          {/* Etapas discretas */}
          <div className="steps">
            <span className={`step-dot ${currentStep >= 0 ? 'active' : ''}`}></span>
            <span className={`step-dot ${currentStep >= 1 ? 'active' : ''}`}></span>
            <span className={`step-dot ${currentStep >= 2 ? 'active' : ''}`}></span>
            <span className={`step-dot ${currentStep >= 3 ? 'active' : ''}`}></span>
          </div>

          {/* Barra de Progresso */}
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="progress-text">
              {Math.round(progress)}%
            </span>
          </div>

          {/* Informações do Usuário */}
          <div className="user-info">
            <div className="user-role">
              <span className="role-text">
                {userRole === 'admin' ? 'Administrador' : 'Vendedor'}
              </span>
            </div>
            <div className="loading-tips">
              <p className="values-title">Valores</p>
              <p className="values-text">Ambição em fazer o melhor e crescer juntos, com transparência, honestidade e qualidade.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="welcome-footer">
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p className="footer-text">
            Carregando dados em tempo real...
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeLoading;
