import React from 'react';

/**
 * Formulário detalhado de caminhão/veículo com estudo veicular
 * @param {Object} props
 * @param {Object} props.formData - Dados do formulário
 * @param {Function} props.setFormData - Função para atualizar dados
 * @param {Object} props.errors - Erros de validação
 */
const CaminhaoFormDetalhado = ({ formData, setFormData, errors = {} }) => {
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Função para calcular o patolamento baseado na medida C
  const calcularPatolamento = (medidaC) => {
    if (!medidaC) return '';
    
    // Converter para número (remove texto e converte)
    const medida = parseFloat(medidaC);
    
    if (isNaN(medida)) return '';
    
    // Regras de patolamento:
    // >= 70cm → 580mm
    // 60-69cm → 440mm
    // < 60cm → 390mm
    if (medida >= 70) return '580mm';
    if (medida >= 60) return '440mm';
    return '390mm';
  };

  // Calcular patolamento automaticamente quando medidaC mudar
  const patolamentoCalculado = calcularPatolamento(formData.medidaC);

  // Gerar lista de anos (1960 até ano atual)
  const years = (() => {
    const current = new Date().getFullYear();
    const start = 1960;
    const list = [];
    for (let y = current; y >= start; y--) list.push(y);
    return list;
  })();

  return (
    <div className="form-container">
      <div className="form-grid">
        {/* Tipo */}
        <div className="form-group">
          <label>Tipo *</label>
          <select
            value={formData.tipo || ''}
            onChange={(e) => handleChange('tipo', e.target.value)}
            className={errors.tipo ? 'error' : ''}
          >
            <option value="">Selecione o tipo</option>
            <option value="Truck">Truck</option>
            <option value="Tractor CAVALINHO">Tractor CAVALINHO</option>
            <option value="3/4">3/4</option>
            <option value="Toco">Toco</option>
            <option value="Carreta">Carreta</option>
            <option value="Bitruck">Bitruck</option>
            <option value="Outro">Outro</option>
          </select>
          {errors.tipo && <span className="error-message">{errors.tipo}</span>}
        </div>
        
        {/* Marca */}
        <div className="form-group">
          <label>Marca *</label>
          <select
            value={formData.marca || ''}
            onChange={(e) => handleChange('marca', e.target.value)}
            className={errors.marca ? 'error' : ''}
          >
            <option value="">Selecione a marca</option>
            <option value="Mercedes-Benz">Mercedes-Benz</option>
            <option value="Volvo">Volvo</option>
            <option value="Scania">Scania</option>
            <option value="Iveco">Iveco</option>
            <option value="DAF">DAF</option>
            <option value="MAN">MAN</option>
            <option value="Ford">Ford</option>
            <option value="Chevrolet">Chevrolet</option>
            <option value="Volkswagen">Volkswagen</option>
            <option value="Outra">Outra</option>
          </select>
          {errors.marca && <span className="error-message">{errors.marca}</span>}
        </div>
        
        {/* Modelo */}
        <div className="form-group">
          <label>Modelo *</label>
          <input
            type="text"
            value={formData.modelo || ''}
            onChange={(e) => handleChange('modelo', e.target.value)}
            placeholder="Ex: Actros, FH, R-Series"
            className={errors.modelo ? 'error' : ''}
          />
          {errors.modelo && <span className="error-message">{errors.modelo}</span>}
        </div>
        
        {/* Ano */}
        <div className="form-group">
          <label>Ano</label>
          <select
            value={formData.ano || ''}
            onChange={(e) => handleChange('ano', e.target.value)}
          >
            <option value="">Selecione o ano</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        
        {/* Voltagem */}
        <div className="form-group">
          <label>Voltagem *</label>
          <select
            value={formData.voltagem || ''}
            onChange={(e) => handleChange('voltagem', e.target.value)}
            className={errors.voltagem ? 'error' : ''}
          >
            <option value="">Selecione a voltagem</option>
            <option value="12V">12V</option>
            <option value="24V">24V</option>
          </select>
          {errors.voltagem && <span className="error-message">{errors.voltagem}</span>}
        </div>
        
        {/* Erro de Ano (se houver) */}
        {errors.ano && (
          <div className="form-group full-width">
            <span className="error-message">{errors.ano}</span>
          </div>
        )}
        
        {/* Observações */}
        <div className="form-group full-width">
          <label>Observações</label>
          <textarea
            value={formData.observacoes || ''}
            onChange={(e) => handleChange('observacoes', e.target.value)}
            placeholder="Informações adicionais sobre o caminhão..."
            rows="3"
          />
        </div>

        {/* Seção de Estudo Veicular com Imagem e Medidas */}
        <div className="form-group full-width" style={{ marginTop: '30px' }}>
          <h3 style={{ 
            color: '#495057', 
            fontSize: '20px', 
            marginBottom: '15px', 
            borderBottom: '2px solid #dee2e6', 
            paddingBottom: '10px' 
          }}>
            Estudo Veicular - Medidas
          </h3>
          
          <div style={{ 
            display: 'flex', 
            gap: '30px', 
            alignItems: 'flex-start', 
            flexWrap: 'wrap' 
          }}>
            {/* Imagem do Estudo Veicular */}
            <div style={{ flex: '1', minWidth: '300px', textAlign: 'center' }}>
              <img 
                src="/estudoveicular.png" 
                alt="Estudo Veicular" 
                style={{ 
                  width: '100%', 
                  maxWidth: '500px', 
                  height: 'auto', 
                  border: '2px solid #dee2e6',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div style={{ 
                display: 'none', 
                padding: '20px', 
                background: '#f8f9fa', 
                border: '2px dashed #dee2e6', 
                borderRadius: '8px' 
              }}>
                <p style={{ color: '#6c757d', margin: '0' }}>Imagem não disponível</p>
              </div>
            </div>

            {/* Campos de Medidas */}
            <div style={{ flex: '1', minWidth: '300px' }}>
              <p style={{ 
                marginBottom: '15px', 
                color: '#6c757d', 
                fontSize: '14px' 
              }}>
                Preencha as medidas conforme indicado na imagem, Caminhão 1 Guindaste GSI Interno, caminhão 2 Guindaste GSE Externo:
              </p>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '15px' 
              }}>
                <div className="form-group">
                  <label>Medida A (mm)</label>
                  <input
                    type="text"
                    value={formData.medidaA || ''}
                    onChange={(e) => handleChange('medidaA', e.target.value)}
                    placeholder="Ex: 150"
                  />
                </div>
                
                <div className="form-group">
                  <label>Medida B (mm)</label>
                  <input
                    type="text"
                    value={formData.medidaB || ''}
                    onChange={(e) => handleChange('medidaB', e.target.value)}
                    placeholder="Ex: 200"
                  />
                </div>
                
                <div className="form-group">
                  <label>Medida C (cm) - Solo ao Chassi</label>
                  <input
                    type="text"
                    value={formData.medidaC || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleChange('medidaC', value);
                      // Calcular e salvar patolamento automaticamente
                      const patolamento = calcularPatolamento(value);
                      handleChange('patolamento', patolamento);
                    }}
                    placeholder="Ex: 65"
                  />
                </div>
                
                <div className="form-group">
                  <label>Medida D (cm) - Dist. Entre Eixos</label>
                  <input
                    type="text"
                    value={formData.medidaD || ''}
                    onChange={(e) => handleChange('medidaD', e.target.value)}
                    placeholder="Ex: 30"
                  />
                </div>
              </div>
              
              {/* Patolamento Calculado Automaticamente */}
              {patolamentoCalculado && (
                <div style={{ 
                  marginTop: '20px', 
                  padding: '15px', 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    color: 'white'
                  }}>
                    <span style={{ fontSize: '24px' }}>🔧</span>
                    <div>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: '600',
                        marginBottom: '4px'
                      }}>
                        Patolamento Calculado Automaticamente:
                      </div>
                      <div style={{ 
                        fontSize: '24px', 
                        fontWeight: 'bold',
                        letterSpacing: '1px'
                      }}>
                        {patolamentoCalculado}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        opacity: '0.9',
                        marginTop: '4px'
                      }}>
                        {formData.medidaC >= 70 && 'Medida C ≥ 70cm'}
                        {formData.medidaC >= 60 && formData.medidaC < 70 && 'Medida C entre 60-69cm'}
                        {formData.medidaC < 60 && 'Medida C < 60cm'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaminhaoFormDetalhado;

