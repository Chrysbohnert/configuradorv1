import React, { useState, useEffect } from 'react';
import { extrairConfiguracoes } from '../utils/guindasteHelper';
import LazyGuindasteImage from './LazyGuindasteImage';
import '../styles/GuindasteSelector.css';

const GuindasteSelector = ({
  guindastes = [],
  onGuindasteSelect,
  isLoading = false,
  selectedCapacidade = null,
  selectedModelo = null,
  onCapacidadeSelect,
  onModeloSelect
}) => {
  const [currentStep, setCurrentStep] = useState(1);

  // Capacidades disponíveis
  const getCapacidadesUnicas = () => {
    return ['6.5', '8.0', '10.8', '12.8', '13.0', '15.0', '15.8'];
  };

  // Modelos por capacidade
  const getModelosPorCapacidade = (capacidade) => {
    const modelos = new Map();
    
    guindastes.forEach(guindaste => {
      const subgrupo = guindaste.subgrupo || '';
      const modeloBase = subgrupo.replace(/^(Guindaste\s+)+/, '').split(' ').slice(0, 2).join(' ');
      
      const match = modeloBase.match(/(\d+\.?\d*)/);
      if (match && match[1] === capacidade) {
        if (!modelos.has(modeloBase)) {
          modelos.set(modeloBase, guindaste);
        }
      }
    });
    
    return Array.from(modelos.values());
  };

  // Configurações por modelo
  const getGuindastesPorModelo = (modelo) => {
    return guindastes.filter(guindaste => {
      const subgrupo = guindaste.subgrupo || '';
      const modeloBase = subgrupo.replace(/^(Guindaste\s+)+/, '').split(' ').slice(0, 2).join(' ');
      return modeloBase === modelo;
    });
  };

  const capacidades = getCapacidadesUnicas();
  const modelosDisponiveis = selectedCapacidade ? getModelosPorCapacidade(selectedCapacidade) : [];
  const guindastesDisponiveis = selectedModelo ? getGuindastesPorModelo(selectedModelo) : [];

  const handleCapacidadeClick = (capacidade) => {
    onCapacidadeSelect(capacidade);
    
    // Adicionar animação de transição
    const container = document.querySelector('.guindaste-selector');
    container.classList.add('step-changing');
    
    // Mostrar indicador de carregamento
    const progressStep = document.querySelector('.progress-step:nth-child(3)');
    if (progressStep) {
      progressStep.classList.add('loading');
    }
    
    // Navegação automática para a próxima etapa após 500ms
    setTimeout(() => {
      if (currentStep === 1) {
        setCurrentStep(2);
        container.classList.remove('step-changing');
        if (progressStep) {
          progressStep.classList.remove('loading');
        }
      }
    }, 500);
  };

  const handleModeloClick = (modelo) => {
    const modeloBase = modelo.subgrupo.replace(/^(Guindaste\s+)+/, '').split(' ').slice(0, 2).join(' ');
    onModeloSelect(modeloBase);
    
    // Adicionar animação de transição
    const container = document.querySelector('.guindaste-selector');
    container.classList.add('step-changing');
    
    // Mostrar indicador de carregamento
    const progressStep = document.querySelector('.progress-step:nth-child(5)');
    if (progressStep) {
      progressStep.classList.add('loading');
    }
    
    // Navegação automática para a próxima etapa após 500ms
    setTimeout(() => {
      if (currentStep === 2) {
        setCurrentStep(3);
        container.classList.remove('step-changing');
        if (progressStep) {
          progressStep.classList.remove('loading');
        }
      }
    }, 500);
  };

  const handleNext = (e) => {
    if (currentStep < 3) {
      // Adicionar animação de clique
      e.target.classList.add('btn-clicked');
      setTimeout(() => {
        e.target.classList.remove('btn-clicked');
      }, 600);
      
      // Adicionar animação de transição
      const container = document.querySelector('.guindaste-selector');
      container.classList.add('step-changing');
      
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        container.classList.remove('step-changing');
      }, 300);
    }
  };

  const handlePrevious = (e) => {
    if (currentStep > 1) {
      // Adicionar animação de clique
      e.target.classList.add('btn-clicked');
      setTimeout(() => {
        e.target.classList.remove('btn-clicked');
      }, 600);
      
      // Adicionar animação de transição
      const container = document.querySelector('.guindaste-selector');
      container.classList.add('step-changing');
      
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        container.classList.remove('step-changing');
      }, 300);
    }
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return selectedCapacidade !== null;
      case 2:
        return selectedModelo !== null;
      case 3:
        return false; // No próximo step após configuração
      default:
        return false;
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price || 0);
  };

  return (
    <div className="guindaste-selector">
      {/* Header */}
      <div className="selector-header">
        <h1 className="selector-title">Selecione o Guindaste Ideal</h1>
        <p className="selector-subtitle">
          Escolha o guindaste que melhor atende às suas necessidades
        </p>
      </div>

      {/* Progress Steps */}
      <div className="selection-progress">
        <div className={`progress-step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
          <div className="progress-circle">
            {currentStep > 1 ? '✓' : '1'}
          </div>
          <span className="progress-label">Capacidade</span>
        </div>
        
        <div className={`progress-connector ${currentStep > 1 ? 'completed' : ''}`}></div>
        
        <div className={`progress-step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
          <div className="progress-circle">
            {currentStep > 2 ? '✓' : '2'}
          </div>
          <span className="progress-label">Modelo</span>
        </div>
        
        <div className={`progress-connector ${currentStep > 2 ? 'completed' : ''}`}></div>
        
        <div className={`progress-step ${currentStep >= 3 ? 'active' : ''}`}>
          <div className="progress-circle">3</div>
          <span className="progress-label">Configuração</span>
        </div>
      </div>

      {/* Renderizar apenas o step atual */}
      {currentStep === 1 && (
        <div className="selection-step visible fade-in">
          <div className="step-header">
            <h2 className="step-title">
              <span className="step-number">1</span>
              Escolha a Capacidade
            </h2>
            <p className="step-description">
              Selecione a capacidade do guindaste em toneladas
            </p>
          </div>

          <div className="capacity-grid">
            {capacidades.map((capacidade) => (
              <div
                key={capacidade}
                className={`capacity-card ${selectedCapacidade === capacidade ? 'selected' : ''}`}
                onClick={() => handleCapacidadeClick(capacidade)}
                data-capacidade={capacidade}
              >
                <div className="capacity-icon">🏗️</div>
                <div className="capacity-value">{capacidade} Ton</div>
                <div className="capacity-label">Capacidade {capacidade} toneladas</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Modelo */}
      {currentStep === 2 && (
        <div className="selection-step visible fade-in">
          <div className="step-header">
            <h2 className="step-title">
              <span className="step-number">2</span>
              Escolha o Modelo
            </h2>
            <p className="step-description">
              Modelos disponíveis para {selectedCapacidade} ton
            </p>
          </div>

          {modelosDisponiveis.length > 0 ? (
            <div className="model-grid">
              {modelosDisponiveis.map((modelo) => {
                const modeloBase = modelo.subgrupo.replace(/^(Guindaste\s+)+/, '').split(' ').slice(0, 2).join(' ');
                const isSelected = selectedModelo === modeloBase;
                
                return (
                  <div
                    key={modelo.id}
                    className={`model-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleModeloClick(modelo)}
                    data-modelo={modeloBase}
                  >
                    <div className="model-header">
                      <div className="model-icon">
                        <img
                          src={modelo.imagem_url || '/header-bg.jpg'}
                          alt={modeloBase}
                          className="model-image"
                          onError={(e) => {
                            e.currentTarget.src = '/header-bg.jpg';
                          }}
                        />
                      </div>
                      <div className="model-info">
                        <h3>{modeloBase}</h3>
                        <p>Guindaste</p>
                      </div>
                    </div>
                    
                    <div className="model-specs">
                      <div className="spec-item">
                        <span className="spec-value">{selectedCapacidade}</span>
                        <span className="spec-label">Toneladas</span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-value">{modelo.codigo_referencia || '---'}</span>
                        <span className="spec-label">Código</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-title">Nenhum modelo encontrado</div>
              <div className="empty-state-description">
                Não há modelos disponíveis para a capacidade selecionada
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Configuração */}
      {currentStep === 3 && (
        <div className="selection-step visible fade-in">
          <div className="step-header">
            <h2 className="step-title">
              <span className="step-number">3</span>
              Escolha a Configuração
            </h2>
            <p className="step-description">
              Configurações disponíveis para {selectedModelo}
            </p>
          </div>

          {guindastesDisponiveis.length > 0 ? (
            <div className="config-grid">
              {guindastesDisponiveis.map((guindaste, index) => {
                const hasRemoteControl = guindaste.tem_contr === 'Sim';
                const configName = guindaste.peso_kg || 'Configuração Padrão';
                const configuracoes = extrairConfiguracoes(guindaste.subgrupo);
                
                return (
                  <div
                    key={guindaste.id}
                    className="config-card"
                    onClick={() => onGuindasteSelect(guindaste)}
                  >
                    <div className="config-header">
                      <div className="config-image-container">
                        <LazyGuindasteImage 
                          guindasteId={guindaste.id}
                          subgrupo={guindaste.subgrupo}
                          className="config-image-photo"
                          alt={configName}
                        />
                      </div>
                      
                      <div className="config-info">
                        <div className="config-title">{configName}</div>
                        <div className="config-subtitle">
                          {selectedModelo} - {selectedCapacidade} Ton
                        </div>
                        <div className="config-code">
                          Cód: {guindaste.codigo_referencia || 'N/A'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="config-specs">
                      <div className="spec-row">
                        <span className="spec-label">Modelo:</span>
                        <span className="spec-value">{guindaste.modelo || 'N/A'}</span>
                      </div>
                      {guindaste.configuracao_lancas && (
                        <div className="spec-row">
                          <span className="spec-label">Lanças:</span>
                          <span className="spec-value">{guindaste.configuracao_lancas}</span>
                        </div>
                      )}
                      {guindaste.configuracao && (
                        <div className="spec-row">
                          <span className="spec-label">Config:</span>
                          <span className="spec-value">{guindaste.configuracao.slice(0, 20)}...</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="config-features">
                      {configuracoes.map((config, idx) => (
                        <span key={idx} className="config-feature optional" title={config.text}>
                          {config.icon} {config.text}
                        </span>
                      ))}
                      {guindaste.codigo_finame && (
                        <span className="config-feature finame">🏦 FINAME</span>
                      )}
                      {guindaste.grafico_carga_url && (
                        <span className="config-feature chart">📊 Gráfico</span>
                      )}
                    </div>
                    
                    <div className="config-footer">
                      <div className="config-action">
                        Selecionar →
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">⚙️</div>
              <div className="empty-state-title">Nenhuma configuração encontrada</div>
              <div className="empty-state-description">
                Não há configurações disponíveis para o modelo selecionado
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="empty-state">
          <div className="loading-spinner"></div>
          <div className="empty-state-title">Carregando guindastes...</div>
          <div className="empty-state-description">
            Aguarde enquanto buscamos os equipamentos disponíveis
          </div>
        </div>
      )}

      {/* Botões de Navegação */}
      <div className="action-buttons">
        <button 
          className="btn-secondary" 
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          <span>←</span>
          Voltar
        </button>
        
        <div className="step-info">
          <div className="step-current">Etapa {currentStep}</div>
          <div className="step-total">de 3 etapas</div>
        </div>
        
        <button 
          className="btn-primary" 
          onClick={handleNext}
          disabled={!canGoNext()}
        >
          Avançar
          <span>→</span>
        </button>
      </div>
    </div>
  );
};

export default GuindasteSelector;
