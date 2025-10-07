import React, { memo, useCallback } from 'react';
import { CaminhaoForm } from './NovoPedido';

/**
 * CaminhaoForm memoizado para evitar re-renders desnecessários
 * @param {Object} props
 * @param {Object} props.caminhaoData - Dados do caminhão
 * @param {Function} props.onCaminhaoDataChange - Callback quando dados mudam
 * @param {Object} props.errors - Erros de validação
 * @param {Function} props.onErrorsChange - Callback quando erros mudam
 */
const MemoizedCaminhaoForm = memo(({ 
  caminhaoData, 
  onCaminhaoDataChange, 
  errors, 
  onErrorsChange 
}) => {
  // Memoizar callbacks para evitar re-renders desnecessários
  const handleCaminhaoDataChange = useCallback((data) => {
    onCaminhaoDataChange(data);
  }, [onCaminhaoDataChange]);

  const handleErrorsChange = useCallback((errors) => {
    onErrorsChange(errors);
  }, [onErrorsChange]);

  return (
    <CaminhaoForm
      caminhaoData={caminhaoData}
      onCaminhaoDataChange={handleCaminhaoDataChange}
      errors={errors}
      onErrorsChange={handleErrorsChange}
    />
  );
});

// Definir displayName para debugging
MemoizedCaminhaoForm.displayName = 'MemoizedCaminhaoForm';

export default MemoizedCaminhaoForm;
