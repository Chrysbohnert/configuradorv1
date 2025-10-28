/**
 * EXEMPLO: Como carregar proposta em edição no NovoPedido.jsx
 * 
 * Adicione este código no componente NovoPedido para permitir
 * que propostas pendentes sejam reabertas e editadas
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const NovoPedido = () => {
  const navigate = useNavigate();
  
  // Estados existentes
  const [clienteData, setClienteData] = useState({});
  const [carrinho, setCarrinho] = useState([]);
  const [caminhaoData, setCaminhaoData] = useState({});
  const [pagamentoData, setPagamentoData] = useState({});
  
  // ✅ ADICIONAR ESTE useEffect
  useEffect(() => {
    // Verificar se há proposta em edição no localStorage
    const propostaEmEdicaoStr = localStorage.getItem('proposta_em_edicao');
    
    if (propostaEmEdicaoStr) {
      try {
        const { id, numero_proposta, dados } = JSON.parse(propostaEmEdicaoStr);
        
        console.log('📋 Carregando proposta em edição:', numero_proposta);
        
        // Carregar dados no formulário
        if (dados.clienteData) {
          setClienteData(dados.clienteData);
        }
        
        if (dados.carrinho && Array.isArray(dados.carrinho)) {
          setCarrinho(dados.carrinho);
        }
        
        if (dados.caminhaoData) {
          setCaminhaoData(dados.caminhaoData);
        }
        
        if (dados.pagamentoData) {
          setPagamentoData(dados.pagamentoData);
        }
        
        // Limpar localStorage após carregar
        localStorage.removeItem('proposta_em_edicao');
        
        // Notificar usuário
        alert(`✅ Proposta #${numero_proposta} carregada!\n\nContinue o preenchimento dos dados e gere a proposta final.`);
        
      } catch (error) {
        console.error('❌ Erro ao carregar proposta em edição:', error);
        localStorage.removeItem('proposta_em_edicao');
      }
    }
  }, []);
  
  // ... resto do componente
  
  return (
    <div>
      {/* Seu JSX existente */}
    </div>
  );
};

export default NovoPedido;

/**
 * ALTERNATIVA: Mostrar banner informativo
 * 
 * Se preferir mostrar um banner ao invés de alert:
 */

const NovoPedidoComBanner = () => {
  const [propostaCarregada, setPropostaCarregada] = useState(null);
  
  useEffect(() => {
    const propostaEmEdicaoStr = localStorage.getItem('proposta_em_edicao');
    
    if (propostaEmEdicaoStr) {
      try {
        const { id, numero_proposta, dados } = JSON.parse(propostaEmEdicaoStr);
        
        // Carregar dados (mesmo código acima)
        // ...
        
        // Guardar info para mostrar banner
        setPropostaCarregada(numero_proposta);
        
        // Limpar após 10 segundos
        setTimeout(() => setPropostaCarregada(null), 10000);
        
        localStorage.removeItem('proposta_em_edicao');
      } catch (error) {
        console.error('Erro:', error);
      }
    }
  }, []);
  
  return (
    <div>
      {/* Banner informativo */}
      {propostaCarregada && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#28a745',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '24px' }}>✅</span>
          <div>
            <strong>Proposta #{propostaCarregada} carregada!</strong>
            <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px' }}>
              Continue o preenchimento e gere a proposta final
            </div>
          </div>
          <button
            onClick={() => setPropostaCarregada(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px 8px'
            }}
          >
            ×
          </button>
        </div>
      )}
      
      {/* Resto do componente */}
    </div>
  );
};
