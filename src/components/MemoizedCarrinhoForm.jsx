import React, { memo, useCallback } from 'react';
import { CarrinhoForm } from './NovoPedido';

/**
 * CarrinhoForm memoizado para evitar re-renders desnecessários
 * @param {Object} props
 * @param {Array} props.carrinho - Itens do carrinho
 * @param {Function} props.onCarrinhoChange - Callback quando carrinho muda
 * @param {Array} props.guindastes - Lista de guindastes disponíveis
 * @param {Function} props.onGuindasteSelect - Callback quando guindaste é selecionado
 * @param {Function} props.onRemoveItem - Callback para remover item
 * @param {Function} props.onUpdateQuantity - Callback para atualizar quantidade
 */
const MemoizedCarrinhoForm = memo(({ 
  carrinho, 
  onCarrinhoChange,
  guindastes,
  onGuindasteSelect,
  onRemoveItem,
  onUpdateQuantity
}) => {
  // Memoizar callbacks para evitar re-renders desnecessários
  const handleCarrinhoChange = useCallback((newCarrinho) => {
    onCarrinhoChange(newCarrinho);
  }, [onCarrinhoChange]);

  const handleGuindasteSelect = useCallback((guindaste) => {
    onGuindasteSelect(guindaste);
  }, [onGuindasteSelect]);

  const handleRemoveItem = useCallback((index) => {
    onRemoveItem(index);
  }, [onRemoveItem]);

  const handleUpdateQuantity = useCallback((index, quantity) => {
    onUpdateQuantity(index, quantity);
  }, [onUpdateQuantity]);

  return (
    <CarrinhoForm
      carrinho={carrinho}
      onCarrinhoChange={handleCarrinhoChange}
      guindastes={guindastes}
      onGuindasteSelect={handleGuindasteSelect}
      onRemoveItem={handleRemoveItem}
      onUpdateQuantity={handleUpdateQuantity}
    />
  );
});

// Definir displayName para debugging
MemoizedCarrinhoForm.displayName = 'MemoizedCarrinhoForm';

export default MemoizedCarrinhoForm;
