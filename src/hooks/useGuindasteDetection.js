import { useMemo } from 'react';

/**
 * Hook customizado para detectar tipos de guindastes no carrinho
 * Identifica se há guindastes GSE ou GSI
 */
export const useGuindasteDetection = (carrinho = []) => {
  // Verificar se há guindastes GSE no carrinho
  const temGuindasteGSE = useMemo(() => {
    return carrinho.some(item => 
      item.tipo === 'guindaste' && 
      item.modelo?.toUpperCase().includes('GSE')
    );
  }, [carrinho]);

  // Verificar se há guindastes GSI no carrinho
  const temGuindasteGSI = useMemo(() => {
    return carrinho.some(item => 
      item.tipo === 'guindaste' && 
      item.modelo?.toUpperCase().includes('GSI')
    );
  }, [carrinho]);

  // Contar quantidade de guindastes GSI
  const quantidadeGSI = useMemo(() => {
    return carrinho.filter(item => 
      item.tipo === 'guindaste' && 
      item.modelo?.toUpperCase().includes('GSI')
    ).length;
  }, [carrinho]);

  // Verificar se deve aplicar regra GSI sem participação
  const aplicarRegraGSISemParticipacao = (tipoCliente, participacaoRevenda, revendaTemIE) => {
    return temGuindasteGSI &&
           tipoCliente === 'cliente' &&
           participacaoRevenda === 'nao' &&
           revendaTemIE === 'sim';
  };

  return {
    temGuindasteGSE,
    temGuindasteGSI,
    quantidadeGSI,
    aplicarRegraGSISemParticipacao
  };
};
