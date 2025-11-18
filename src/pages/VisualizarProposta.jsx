import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import LazyPDFGenerator from '../components/LazyPDFGenerator';
import { db } from '../config/supabase';

const VisualizarProposta = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pedidoData, setPedidoData] = useState(null);

  useEffect(() => {
    const carregarProposta = async () => {
      try {
        setLoading(true);
        setError('');

        const proposta = await db.getPropostaById(id);
        if (!proposta) {
          setError('Proposta não encontrada.');
          return;
        }

        const dados = proposta.dados_serializados || {};

        setPedidoData({
          carrinho: dados.carrinho || [],
          clienteData: dados.clienteData || {},
          caminhaoData: dados.caminhaoData || {},
          pagamentoData: dados.pagamentoData || {},
          guindastes: dados.guindastes || [],
          vendedor: proposta.vendedor_nome || 'Vendedor',
          numeroProposta: proposta.numero_proposta,
        });
      } catch (err) {
        console.error('Erro ao carregar proposta para visualização:', err);
        setError('Erro ao carregar a proposta.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      carregarProposta();
    } else {
      setError('ID da proposta não informado.');
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <p style={{ color: '#666' }}>Carregando proposta...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <p style={{ color: '#666' }}>{error}</p>
      </div>
    );
  }

  if (!pedidoData) {
    return null;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: '#111', textAlign: 'center' }}>
        Proposta Comercial
      </h1>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px', textAlign: 'center' }}>
        Visualização da proposta #{pedidoData.numeroProposta}
      </p>

      <div style={{ marginBottom: '24px' }}>
        <LazyPDFGenerator
          pedidoData={pedidoData}
          numeroProposta={pedidoData.numeroProposta}
        />
      </div>
    </div>
  );
};

export default VisualizarProposta;
