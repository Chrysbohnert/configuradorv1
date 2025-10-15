import { useState, useEffect } from 'react';
import { db } from '../config/supabase';

/**
 * Hook customizado para gerenciar dados de frete
 * Carrega e gerencia informações de frete do banco de dados
 */
export const useFretes = (localInstalacao) => {
  const [fretes, setFretes] = useState([]);
  const [dadosFreteAtual, setDadosFreteAtual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carregar dados de frete do banco
  useEffect(() => {
    const carregarFretes = async () => {
      try {
        setLoading(true);
        const dadosFretes = await db.getFretes();
        setFretes(dadosFretes);
        setError(null);
      } catch (err) {
        console.error('Erro ao carregar fretes:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    carregarFretes();
  }, []);

  // Atualizar dados do frete quando o local de instalação mudar
  useEffect(() => {
    if (localInstalacao && fretes.length > 0) {
      // Extrair cidade e oficina do localInstalacao (formato: "Nome - Cidade/UF")
      const partes = localInstalacao.split(' - ');
      if (partes.length === 2) {
        const cidadeParte = partes[1].split('/')[0];

        // Buscar dados de frete para a cidade
        const freteEncontrado = fretes.find(frete =>
          frete.cidade?.toLowerCase() === cidadeParte?.toLowerCase()
        );

        if (freteEncontrado) {
          setDadosFreteAtual(freteEncontrado);
        } else {
          setDadosFreteAtual(null);
        }
      }
    } else {
      setDadosFreteAtual(null);
    }
  }, [localInstalacao, fretes]);

  return { fretes, dadosFreteAtual, loading, error };
};
