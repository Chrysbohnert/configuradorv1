/**
 * Hook customizado para gerenciar o carrinho de compras
 * Centraliza toda a lógica relacionada ao carrinho
 */

import { useState, useEffect, useCallback } from 'react';

export function useCarrinho() {
  // Estado do carrinho (inicializa do localStorage)
  const [carrinho, setCarrinho] = useState(() => {
    const savedCart = localStorage.getItem('carrinho');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  // Sincronizar com localStorage sempre que o carrinho mudar
  useEffect(() => {
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
  }, [carrinho]);

  /**
   * Adiciona um item ao carrinho
   */
  const addItem = useCallback((item) => {
    setCarrinho(prev => {
      // Verificar se já existe
      const exists = prev.find(i => i.id === item.id && i.tipo === item.tipo);
      
      if (exists) {
        // ❌ NÃO aumentar quantidade! Apenas retornar o carrinho atual
        // (No sistema de guindastes, não faz sentido ter múltiplas unidades do mesmo item)
        console.warn(`⚠️ Item "${item.nome}" já existe no carrinho. Não será adicionado novamente.`);
        return prev;
      }
      
      // Se não existe, adiciona com quantidade sempre = 1
      return [...prev, { ...item, quantidade: 1 }];
    });
  }, []);

  /**
   * Remove um item do carrinho
   */
  const removeItem = useCallback((itemId, tipo = 'guindaste') => {
    setCarrinho(prev => prev.filter(item => !(item.id === itemId && item.tipo === tipo)));
  }, []);

  /**
   * Atualiza quantidade de um item
   */
  const updateQuantity = useCallback((itemId, quantidade, tipo = 'guindaste') => {
    if (quantidade <= 0) {
      removeItem(itemId, tipo);
      return;
    }

    setCarrinho(prev => 
      prev.map(item => 
        item.id === itemId && item.tipo === tipo
          ? { ...item, quantidade }
          : item
      )
    );
  }, [removeItem]);

  /**
   * Atualiza preço de um item (útil quando muda região/IE)
   */
  const updatePrice = useCallback((itemId, novoPreco, tipo = 'guindaste') => {
    setCarrinho(prev =>
      prev.map(item =>
        item.id === itemId && item.tipo === tipo
          ? { ...item, preco: novoPreco }
          : item
      )
    );
  }, []);

  /**
   * Atualiza todos os preços (útil quando muda região/IE)
   */
  const updateAllPrices = useCallback((updates) => {
    setCarrinho(prev =>
      prev.map(item => {
        const update = updates.find(u => u.id === item.id && u.tipo === item.tipo);
        return update ? { ...item, preco: update.preco } : item;
      })
    );
  }, []);

  /**
   * Limpa todo o carrinho
   */
  const clearCart = useCallback(() => {
    setCarrinho([]);
    localStorage.removeItem('carrinho');
  }, []);

  /**
   * Calcula total do carrinho
   */
  const getTotal = useCallback(() => {
    return carrinho.reduce((total, item) => {
      const preco = parseFloat(item.preco) || 0;
      const quantidade = parseInt(item.quantidade) || 1;
      return total + (preco * quantidade);
    }, 0);
  }, [carrinho]);

  /**
   * Calcula total de guindastes no carrinho
   */
  const getTotalGuindastes = useCallback(() => {
    return carrinho
      .filter(item => item.tipo === 'guindaste')
      .reduce((total, item) => total + (parseInt(item.quantidade) || 1), 0);
  }, [carrinho]);

  /**
   * Verifica se um item está no carrinho
   */
  const isInCart = useCallback((itemId, tipo = 'guindaste') => {
    return carrinho.some(item => item.id === itemId && item.tipo === tipo);
  }, [carrinho]);

  /**
   * Obtém um item específico do carrinho
   */
  const getItem = useCallback((itemId, tipo = 'guindaste') => {
    return carrinho.find(item => item.id === itemId && item.tipo === tipo);
  }, [carrinho]);

  return {
    // Estado
    carrinho,
    setCarrinho,
    
    // Ações
    addItem,
    removeItem,
    updateQuantity,
    updatePrice,
    updateAllPrices,
    clearCart,
    
    // Calculadoras
    getTotal,
    getTotalGuindastes,
    
    // Utilidades
    isInCart,
    getItem,
    
    // Informações
    isEmpty: carrinho.length === 0,
    itemCount: carrinho.length,
  };
}

