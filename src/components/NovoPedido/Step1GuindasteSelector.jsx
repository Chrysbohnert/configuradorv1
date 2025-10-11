import React from 'react';
import GuindasteCard from './GuindasteCard';

/**
 * Step 1 - Seleção de guindaste com cascata (Capacidade → Modelo → Configuração)
 * @param {Object} props
 * @param {Array} props.capacidades - Lista de capacidades disponíveis
 * @param {string} props.selectedCapacidade - Capacidade selecionada
 * @param {string} props.selectedModelo - Modelo selecionado
 * @param {Array} props.modelosDisponiveis - Modelos disponíveis para capacidade selecionada
 * @param {Array} props.guindastesDisponiveis - Guindastes disponíveis para modelo selecionado
 * @param {Array} props.guindastesSelecionados - Guindastes selecionados
 * @param {Function} props.onSelecionarCapacidade - Callback ao selecionar capacidade
 * @param {Function} props.onSelecionarModelo - Callback ao selecionar modelo
 * @param {Function} props.onSelecionarGuindaste - Callback ao selecionar guindaste
 * @param {Object} props.validationErrors - Erros de validação
 */
const Step1GuindasteSelector = ({
  capacidades,
  selectedCapacidade,
  selectedModelo,
  modelosDisponiveis,
  guindastesDisponiveis,
  guindastesSelecionados,
  onSelecionarCapacidade,
  onSelecionarModelo,
  onSelecionarGuindaste,
  validationErrors = {}
}) => {
  return (
    <div className="step-content">
      <div className="step-header">
        <h2>Selecione o Guindaste Ideal</h2>
        <p>Escolha o guindaste que melhor atende às suas necessidades</p>
      </div>

      <div className="cascata-container">
        {/* Indicador de Progresso */}
        <div className="progress-indicator">
          <div className={`progress-step ${selectedCapacidade ? 'completed' : 'active'}`}>
            <div className="step-number">1</div>
            <span>Capacidade</span>
          </div>
          <div className={`progress-line ${selectedCapacidade ? 'completed' : ''}`}></div>
          <div className={`progress-step ${selectedCapacidade && selectedModelo ? 'completed' : selectedCapacidade ? 'active' : ''}`}>
            <div className="step-number">2</div>
            <span>Modelo</span>
          </div>
          <div className={`progress-line ${selectedCapacidade && selectedModelo ? 'completed' : ''}`}></div>
          <div className={`progress-step ${guindastesSelecionados.length > 0 ? 'completed' : selectedModelo ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <span>Configuração</span>
          </div>
        </div>

        {/* Passo 1: Selecionar Capacidade */}
        <div className="cascata-step">
          <div className="step-title">
            <h3>1. Escolha a Capacidade</h3>
            <p>Selecione a capacidade do guindaste</p>
          </div>
          
          <div className="capacidades-grid">
            {capacidades.map((capacidade) => (
              <button
                key={capacidade}
                className={`capacidade-card no-photo ${selectedCapacidade === capacidade ? 'selected' : ''}`}
                onClick={() => onSelecionarCapacidade(capacidade)}
                data-capacidade={capacidade}
              >
                <div className="capacidade-icon">
                  <div className="capacidade-fallback" aria-hidden="true">🏗️</div>
                </div>
                <div className="capacidade-info">
                  <h4>{capacidade} Ton</h4>
                  <p>Capacidade {capacidade} toneladas</p>
                </div>
                {selectedCapacidade === capacidade && (
                  <div className="selected-indicator">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Passo 2: Selecionar Modelo (apenas se capacidade foi selecionada) */}
        {selectedCapacidade && (
          <div className="cascata-step">
            <div className="step-title">
              <h3>2. Escolha o Modelo</h3>
              <p>Modelos disponíveis para {selectedCapacidade} ton</p>
            </div>
            
            <div className="modelos-grid">
              {modelosDisponiveis.map((guindaste) => {
                const subgrupo = guindaste.subgrupo || '';
                const modeloBase = subgrupo
                  .replace(/^(Guindaste\s+)+/, '')
                  .split(' ')
                  .slice(0, 2)
                  .join(' ');
                
                return (
                  <button
                    key={guindaste.id}
                    className={`modelo-card ${selectedModelo === modeloBase ? 'selected' : ''}`}
                    onClick={() => onSelecionarModelo(modeloBase)}
                    data-modelo={modeloBase}
                  >
                    <div className="modelo-icon">
                      {guindaste.imagem_url ? (
                        <img
                          src={guindaste.imagem_url}
                          alt={modeloBase}
                          className="modelo-thumbnail"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : (
                        <div className="modelo-fallback">
                          <span>{modeloBase.includes('GSI') ? '🏭' : '🏗️'}</span>
                        </div>
                      )}
                    </div>
                    <div className="modelo-info">
                      <h4>{modeloBase}</h4>
                      <p>{guindaste.Grupo || 'Guindaste'}</p>
                      <span className="modelo-codigo">{guindaste.codigo_referencia}</span>
                    </div>
                    {selectedModelo === modeloBase && (
                      <div className="selected-indicator">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Passo 3: Selecionar Guindaste Específico (apenas se modelo foi selecionado) */}
        {selectedModelo && (
          <div className="cascata-step">
            <div className="step-title">
              <h3>3. Escolha a Configuração</h3>
              <p>Configurações disponíveis para {selectedModelo}</p>
            </div>
            
            <div className="guindastes-grid">
              {guindastesDisponiveis.map((guindaste) => (
                <GuindasteCard
                  key={guindaste.id}
                  guindaste={guindaste}
                  isSelected={guindastesSelecionados.some(g => g.id === guindaste.id)}
                  onSelect={() => onSelecionarGuindaste(guindaste)}
                />
              ))}
            </div>
            
            {validationErrors.guindaste && (
              <div className="validation-error">
                <span className="error-message">{validationErrors.guindaste}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Step1GuindasteSelector;

