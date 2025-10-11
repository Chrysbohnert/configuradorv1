import React, { useState, useEffect } from 'react';
import { validatePlate } from '../../utils/validation';

/**
 * Componente do formulário de dados do caminhão
 * @param {Object} props
 * @param {Object} props.caminhaoData - Dados do caminhão
 * @param {Function} props.onCaminhaoDataChange - Callback quando dados mudam
 * @param {Object} props.errors - Erros de validação
 * @param {Function} props.onErrorsChange - Callback quando erros mudam
 */
const CaminhaoForm = React.memo(({ 
  caminhaoData, 
  onCaminhaoDataChange, 
  errors, 
  onErrorsChange 
}) => {
  const [formData, setFormData] = useState(caminhaoData);

  // Sincronizar com dados externos
  useEffect(() => {
    setFormData(caminhaoData);
  }, [caminhaoData]);

  const handleInputChange = (field, value) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onCaminhaoDataChange(newData);

    // Limpar erro do campo quando usuário digita
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      onErrorsChange(newErrors);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validar placa
    if (formData.placa) {
      const placaError = validatePlate(formData.placa);
      if (placaError) newErrors.placa = placaError;
    }

    onErrorsChange(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validar automaticamente quando dados mudam
  useEffect(() => {
    if (formData.placa) {
      validateForm();
    }
  }, [formData]);

  return (
    <div className="caminhao-form">
      <h3>Estudo Veicular</h3>
      
      {/* Tipo */}
      <div className="form-group">
        <label htmlFor="tipo">Tipo *</label>
        <select
          id="tipo"
          value={formData.tipo || ''}
          onChange={(e) => handleInputChange('tipo', e.target.value)}
        >
          <option value="">Selecione o tipo</option>
          <option value="Truck">Truck</option>
          <option value="Caminhão">Caminhão</option>
          <option value="Carreta">Carreta</option>
          <option value="Bitrem">Bitrem</option>
          <option value="Rodotrem">Rodotrem</option>
          <option value="Outro">Outro</option>
        </select>
      </div>

      {/* Marca */}
      <div className="form-group">
        <label htmlFor="marca">Marca *</label>
        <input
          id="marca"
          type="text"
          value={formData.marca || ''}
          onChange={(e) => handleInputChange('marca', e.target.value)}
          placeholder="Ex: Mercedes-Benz, Volvo, Scania..."
        />
      </div>

      {/* Modelo */}
      <div className="form-group">
        <label htmlFor="modelo">Modelo *</label>
        <input
          id="modelo"
          type="text"
          value={formData.modelo || ''}
          onChange={(e) => handleInputChange('modelo', e.target.value)}
          placeholder="Ex: Actros, FH, R450..."
        />
      </div>

      {/* Ano */}
      <div className="form-group">
        <label htmlFor="ano">Ano *</label>
        <select
          id="ano"
          value={formData.ano || ''}
          onChange={(e) => handleInputChange('ano', e.target.value)}
        >
          <option value="">Selecione o ano</option>
          {(() => {
            const currentYear = new Date().getFullYear();
            const years = [];
            for (let year = currentYear; year >= currentYear - 20; year--) {
              years.push(year);
            }
            return years.map(year => (
              <option key={year} value={year}>{year}</option>
            ));
          })()}
        </select>
      </div>

      {/* Placa */}
      <div className="form-group">
        <label htmlFor="placa">Placa *</label>
        <input
          id="placa"
          type="text"
          value={formData.placa || ''}
          onChange={(e) => handleInputChange('placa', e.target.value.toUpperCase())}
          placeholder="ABC-1234 ou ABC1D23"
          className={errors.placa ? 'error' : ''}
        />
        {errors.placa && <span className="error-message">{errors.placa}</span>}
      </div>

      {/* Voltagem */}
      <div className="form-group">
        <label htmlFor="voltagem">Voltagem *</label>
        <select
          id="voltagem"
          value={formData.voltagem || ''}
          onChange={(e) => handleInputChange('voltagem', e.target.value)}
        >
          <option value="">Selecione a voltagem</option>
          <option value="12V">12V</option>
          <option value="24V">24V</option>
          <option value="12V/24V">12V/24V</option>
        </select>
      </div>

      {/* Observações */}
      <div className="form-group">
        <label htmlFor="observacoes">Observações</label>
        <textarea
          id="observacoes"
          value={formData.observacoes || ''}
          onChange={(e) => handleInputChange('observacoes', e.target.value)}
          placeholder="Informações adicionais sobre o veículo"
          rows="3"
        />
      </div>
    </div>
  );
});

CaminhaoForm.displayName = 'CaminhaoForm';

export default CaminhaoForm;
