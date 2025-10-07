import React, { memo, useCallback } from 'react';
import { ClienteForm } from './NovoPedido';

/**
 * ClienteForm memoizado para evitar re-renders desnecessários
 * @param {Object} props
 * @param {Object} props.clienteData - Dados do cliente
 * @param {Function} props.onClienteDataChange - Callback quando dados mudam
 * @param {Object} props.errors - Erros de validação
 * @param {Function} props.onErrorsChange - Callback quando erros mudam
 * @param {boolean} props.clienteTemIE - Se cliente tem IE
 * @param {Function} props.onClienteIEChange - Callback quando IE muda
 * @param {Object} props.user - Dados do usuário logado
 */
const MemoizedClienteForm = memo(({ 
  clienteData, 
  onClienteDataChange, 
  errors, 
  onErrorsChange, 
  clienteTemIE, 
  onClienteIEChange, 
  user 
}) => {
  // Memoizar callbacks para evitar re-renders desnecessários
  const handleClienteDataChange = useCallback((data) => {
    onClienteDataChange(data);
  }, [onClienteDataChange]);

  const handleErrorsChange = useCallback((errors) => {
    onErrorsChange(errors);
  }, [onErrorsChange]);

  const handleClienteIEChange = useCallback((temIE) => {
    onClienteIEChange(temIE);
  }, [onClienteIEChange]);

  return (
    <ClienteForm
      clienteData={clienteData}
      onClienteDataChange={handleClienteDataChange}
      errors={errors}
      onErrorsChange={handleErrorsChange}
      clienteTemIE={clienteTemIE}
      onClienteIEChange={handleClienteIEChange}
      user={user}
    />
  );
});

// Definir displayName para debugging
MemoizedClienteForm.displayName = 'MemoizedClienteForm';

export default MemoizedClienteForm;
