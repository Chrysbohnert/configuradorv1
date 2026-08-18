import React from 'react';

/**
 * Formulário de dados do caminhão com estudo veicular
 * @param {Object} props
 * @param {Object} props.formData - Dados do formulário
 * @param {Function} props.setFormData - Função para atualizar dados
 * @param {Object} props.errors - Erros de validação
 * @param {Array} props.carrinho - Itens do carrinho (para decidir medidas)
 */
const CaminhaoForm = ({ formData = {}, setFormData, errors = {}, carrinho = [] }) => {
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...(prev || {}), [field]: value }));
  };

  // Função para calcular o patolamento baseado na medida C
  const calcularPatolamento = (medidaC) => {
    if (!medidaC) return '';
    const medida = parseFloat(medidaC);
    if (isNaN(medida)) return '';

    // Regras: >= 70cm → 580mm | 60-69cm → 440mm | < 60cm → 390mm
    if (medida >= 70) return '580mm';
    if (medida >= 60) return '440mm';
    return '390mm';
  };

  const itensCarrinhoValidos = (carrinho || []).filter(Boolean);
  const temGSI = React.useMemo(() =>
    itensCarrinhoValidos.some(item => item?.tipo === 'guindaste' && item.modelo?.toUpperCase().includes('GSI')),
    [itensCarrinhoValidos]
  );
  const temGSE = React.useMemo(() =>
    itensCarrinhoValidos.some(item => item?.tipo === 'guindaste' && item.modelo?.toUpperCase().includes('GSE')),
    [itensCarrinhoValidos]
  );
  const noDetection = !temGSI && !temGSE;
  const showMedidaA = noDetection || temGSI;
  const showMedidaB = noDetection || temGSI;
  const showMedidaD = (noDetection || temGSE) && formData.tipo === 'Bitruck';
  const showComprimento = noDetection || temGSE;
  const instrucaoMedidas = noDetection
    ? 'Preencha conforme a imagem. Caminhão 1 = GSI Interno · Caminhão 2 = GSE Externo.'
    : temGSI && !temGSE
      ? 'Para instalação GSI, preencha as medidas A, B e C.'
      : !temGSI && temGSE
        ? 'Para instalação GSE, preencha a medida C (define patolamento), o comprimento do chassi e, se Bitruck, a medida D.'
        : 'Preencha conforme a imagem. Caminhão 1 = GSI Interno · Caminhão 2 = GSE Externo.';

  const years = (() => {
    const current = new Date().getFullYear();
    const start = 1960;
    const list = [];
    for (let y = current; y >= start; y--) list.push(y);
    return list;
  })();

  return (
    <div className="client-form-container">
      {/* Informações do Veículo */}
      <div className="form-section">
        <div className="section-header">
          <h3>Informações do Veículo</h3>
        </div>

        <div className="form-grid">
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
            {errors.ano && <span className="error-message">{errors.ano}</span>}
          </div>

          <div className="form-group">
            <label>Voltagem *</label>
            <select
              value={formData.voltagem || ''}
              onChange={(e) => handleChange('voltagem', e.target.value)}
              className={errors.voltagem ? 'error' : ''}
            >
              <option value="">Selecione a voltagem</option>
              <option value="12V">12V (1 bateria)</option>
              <option value="24V">24V (2 baterias)</option>
            </select>
            {errors.voltagem && <span className="error-message">{errors.voltagem}</span>}
          </div>

          <div className="form-group full-width">
            <label>Observações</label>
            <textarea
              value={formData.observacoes || ''}
              onChange={(e) => handleChange('observacoes', e.target.value)}
              placeholder="Informações adicionais sobre o caminhão..."
              rows="2"
            />
          </div>
        </div>
      </div>

      {/* Seção de Medidas */}
      <div className="form-section">
        <div className="section-header">
          <h3>Medidas para Instalação</h3>
        </div>

        <div className="estudo-veicular-container">
          {/* Imagem do Estudo Veicular */}
          <div className="estudo-veicular-image">
            <img
              src="/estudoveicular.png"
              alt="Estudo Veicular"
              className="estudo-veicular-img"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div className="estudo-veicular-fallback">
              <p>Imagem não disponível</p>
            </div>
          </div>

          {/* Campos de Medidas */}
          <div className="estudo-veicular-form">
            <p className="estudo-veicular-instructions">{instrucaoMedidas}</p>

            <div className="form-grid">
              {showMedidaA && (
                <div className="form-group">
                  <label>Medida A — Chassi ao Assoalho (cm)</label>
                  <input
                    type="text"
                    value={formData.medidaA || ''}
                    onChange={(e) => handleChange('medidaA', e.target.value)}
                    placeholder="Ex: 63"
                  />
                </div>
              )}

              {showMedidaB && (
                <div className="form-group">
                  <label>Medida B — Chassi (cm)</label>
                  <input
                    type="text"
                    value={formData.medidaB || ''}
                    onChange={(e) => handleChange('medidaB', e.target.value)}
                    placeholder="Ex: 70"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Medida C — Solo ao Chassi (cm)</label>
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

              {showMedidaD && (
                <div className="form-group">
                  <label>Medida D — Dist. entre Eixos, GSE (cm)</label>
                  <input
                    type="text"
                    value={formData.medidaD || ''}
                    onChange={(e) => handleChange('medidaD', e.target.value)}
                    placeholder="Ex: 30"
                  />
                </div>
              )}

              {showComprimento && (
                <div className="form-group full-width">
                  <label>Comprimento do Chassi (metros)</label>
                  <input
                    type="text"
                    value={formData.comprimentoChassi || ''}
                    onChange={(e) => handleChange('comprimentoChassi', e.target.value)}
                    placeholder="Ex: 10"
                  />
                </div>
              )}
            </div>

            {/* Patolamento */}
            {formData.patolamento && (
              <div className="patolamento-result">
                <span className="patolamento-label">Patolamento calculado:</span>
                <span className="patolamento-value">{formData.patolamento}</span>
                <span className="patolamento-note">
                  {parseFloat(formData.medidaC) >= 70 && 'Medida C ≥ 70cm'}
                  {parseFloat(formData.medidaC) >= 60 && parseFloat(formData.medidaC) < 70 && 'Medida C entre 60–69cm'}
                  {parseFloat(formData.medidaC) < 60 && 'Medida C < 60cm'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaminhaoForm;
