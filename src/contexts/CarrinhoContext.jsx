import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../config/supabase';
import { normalizarRegiao } from '../utils/regiaoHelper';

const CarrinhoContext = createContext(null);

export const useCarrinho = () => {
  const context = useContext(CarrinhoContext);
  if (!context) {
    throw new Error('useCarrinho deve ser usado dentro de um CarrinhoProvider');
  }
  return context;
};

export const CarrinhoProvider = ({ children }) => {
  const { user } = useAuth();
  const [carrinho, setCarrinho] = useState(() => {
    const savedCart = localStorage.getItem('carrinho');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [clienteTemIE, setClienteTemIE] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Salvar carrinho no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
  }, [carrinho]);

  // Determinar se cliente tem IE baseado no contexto
  const determinarClienteTemIE = useCallback((currentStep, pagamentoData) => {
    // Para RS: sempre usa o estado clienteTemIE quando estiver na etapa 2+
    if (currentStep >= 2 && user?.regiao === 'rio grande do sul') {
      return !!clienteTemIE;
    }
    return true;
  }, [clienteTemIE, user]);

  // Adicionar item ao carrinho
  const adicionarAoCarrinho = useCallback((item, tipo) => {
    const itemComTipo = { ...item, tipo };
    
    setCarrinho(prev => {
      let newCart;

      if (tipo === 'guindaste') {
        // Para guindastes, remove qualquer guindaste existente e adiciona o novo
        const carrinhoSemGuindastes = prev.filter(item => item.tipo !== 'guindaste');
        newCart = [...carrinhoSemGuindastes, itemComTipo];
      } else {
        // Para opcionais, apenas adiciona
        newCart = [...prev, itemComTipo];
      }

      return newCart;
    });
  }, []);

  // Remover item do carrinho
  const removerDoCarrinho = useCallback((itemId, tipo) => {
    setCarrinho(prev => prev.filter(item => !(item.id === itemId && item.tipo === tipo)));
  }, []);

  // Limpar carrinho
  const limparCarrinho = useCallback(() => {
    setCarrinho([]);
    localStorage.removeItem('carrinho');
  }, []);

  // Atualizar quantidade de um item
  const atualizarQuantidade = useCallback((itemId, tipo, quantidade) => {
    if (quantidade <= 0) {
      removerDoCarrinho(itemId, tipo);
      return;
    }

    setCarrinho(prev => prev.map(item => 
      item.id === itemId && item.tipo === tipo
        ? { ...item, quantidade }
        : item
    ));
  }, [removerDoCarrinho]);

  // Recalcular preços do carrinho baseado na região e contexto
  const recalcularPrecos = useCallback(async (currentStep = 1, pagamentoData = {}) => {
    if (carrinho.length === 0 || !user?.regiao || isRecalculating) {
      return;
    }

    setIsRecalculating(true);

    try {
      const temIE = determinarClienteTemIE(currentStep, pagamentoData);
      const regiaoVendedor = normalizarRegiao(user.regiao, temIE);

      console.log('🔄 [CarrinhoContext] Recalculando preços...');
      console.log('   Região do vendedor:', user.regiao);
      console.log('   Cliente tem IE:', temIE);
      console.log('   Região normalizada:', regiaoVendedor);

      const carrinhoAtualizado = [];
      let precisaAtualizar = false;

      for (const item of carrinho) {
        if (item.tipo === 'guindaste') {
          try {
            const novoPreco = await db.getPrecoPorRegiao(item.id, regiaoVendedor);

            if (novoPreco !== item.preco) {
              console.log(`   💰 Preço atualizado: ${item.nome} - R$ ${item.preco} → R$ ${novoPreco}`);
              precisaAtualizar = true;
            }

            carrinhoAtualizado.push({
              ...item,
              preco: novoPreco || item.preco || 0
            });
          } catch (error) {
            console.error('Erro ao buscar preço:', error);
            carrinhoAtualizado.push(item);
          }
        } else {
          carrinhoAtualizado.push(item);
        }
      }

      // Só atualiza se realmente houver mudança nos preços
      if (precisaAtualizar) {
        console.log('✅ [CarrinhoContext] Preços atualizados com sucesso');
        setCarrinho(carrinhoAtualizado);
      } else {
        console.log('ℹ️ [CarrinhoContext] Nenhuma mudança de preço detectada');
      }
    } catch (error) {
      console.error('❌ [CarrinhoContext] Erro ao recalcular preços:', error);
    } finally {
      setIsRecalculating(false);
    }
  }, [carrinho, user, clienteTemIE, determinarClienteTemIE, isRecalculating]);

  // Calcular total do carrinho
  const calcularTotal = useCallback(() => {
    return carrinho.reduce((total, item) => {
      const preco = item.preco || 0;
      const quantidade = item.quantidade || 1;
      return total + (preco * quantidade);
    }, 0);
  }, [carrinho]);

  // Obter guindastes no carrinho
  const getGuindastes = useCallback(() => {
    return carrinho.filter(item => item.tipo === 'guindaste');
  }, [carrinho]);

  // Obter opcionais no carrinho
  const getOpcionais = useCallback(() => {
    return carrinho.filter(item => item.tipo === 'opcional');
  }, [carrinho]);

  // Verificar se tem guindaste no carrinho
  const temGuindaste = useCallback(() => {
    return carrinho.some(item => item.tipo === 'guindaste');
  }, [carrinho]);

  // Obter quantidade de itens
  const getQuantidadeItens = useCallback(() => {
    return carrinho.reduce((total, item) => total + (item.quantidade || 1), 0);
  }, [carrinho]);

  const value = {
    carrinho,
    clienteTemIE,
    setClienteTemIE,
    isRecalculating,
    adicionarAoCarrinho,
    removerDoCarrinho,
    limparCarrinho,
    atualizarQuantidade,
    recalcularPrecos,
    calcularTotal,
    getGuindastes,
    getOpcionais,
    temGuindaste,
    getQuantidadeItens
  };

  return (
    <CarrinhoContext.Provider value={value}>
      {children}
    </CarrinhoContext.Provider>
  );
};
