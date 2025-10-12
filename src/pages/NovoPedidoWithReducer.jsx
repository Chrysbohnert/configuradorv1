import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import PDFGenerator from '../components/PDFGenerator';
import PaymentPolicy from '../features/payment/PaymentPolicy';
import { ClienteForm, CaminhaoForm, CarrinhoForm, ResumoForm } from '../components/NovoPedido';
import { useNovoPedido } from '../hooks/useNovoPedido';

import { db } from '../config/supabase';
import { formatCurrency, generateCodigoProduto } from '../utils/formatters';
import { CODIGOS_MODELOS, DESCRICOES_OPCIONAIS } from '../config/codigosGuindaste';
import '../styles/NovoPedido.css';

/**
 * Versão do NovoPedido usando useReducer para gerenciar estados complexos
 * Este é um exemplo de como usar o hook useNovoPedido
 */
const NovoPedidoWithReducer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Hook personalizado com useReducer
  const {
    state,
    setUser,
    setLoading,
    setClienteData,
    updateClienteField,
    setClienteIE,
    setCaminhaoData,
    updateCaminhaoField,
    setCarrinho,
    addToCarrinho,
    removeFromCarrinho,
    updateCarrinhoItem,
    setPagamentoData,
    updatePagamentoField,
    setGuindastes,
    setSelectedCapacidade,
    setSelectedModelo,
    setValidationErrors,
    updateValidationError,
    setCurrentStep,
    nextStep,
    previousStep,
    getTotalCarrinho,
    canGoNext
  } = useNovoPedido();

  // Carregar dados do usuário
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/');
    }
  }, [navigate, setUser]);

  // Carregar dados iniciais
  useEffect(() => {
    if (!state.user) return;
    loadData();
  }, [state.user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const guindastesData = await db.getGuindastes();
      setGuindastes(guindastesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handlers para os formulários
  const handleClienteDataChange = (data) => {
    setClienteData(data);
  };

  const handleCaminhaoDataChange = (data) => {
    setCaminhaoData(data);
  };

  const handleCarrinhoChange = (newCarrinho) => {
    setCarrinho(newCarrinho);
  };

  const handlePagamentoDataChange = (data) => {
    setPagamentoData(data);
  };

  const handleErrorsChange = (errors) => {
    setValidationErrors(errors);
  };

  // Handlers específicos do carrinho
  const handleGuindasteSelect = (guindaste) => {
    const produto = {
      id: guindaste.id,
      nome: guindaste.subgrupo,
      modelo: guindaste.modelo,
      codigo_produto: guindaste.codigo_referencia,
      grafico_carga_url: guindaste.grafico_carga_url,
      preco: guindaste.preco || 0,
      tipo: 'guindaste',
      quantidade: 1
    };
    
    addToCarrinho(produto);
  };

  const handleRemoveItem = (index) => {
    removeFromCarrinho(index);
  };

  const handleUpdateQuantity = (index, quantity) => {
    updateCarrinhoItem(index, { quantidade: quantity });
  };

  // Renderizar conteúdo do step atual
  const renderStepContent = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <ClienteForm
            clienteData={state.clienteData}
            onClienteDataChange={handleClienteDataChange}
            errors={state.validationErrors}
            onErrorsChange={handleErrorsChange}
            clienteTemIE={state.clienteTemIE}
            onClienteIEChange={setClienteIE}
            user={state.user}
          />
        );
      
      case 2:
        return (
          <CaminhaoForm
            caminhaoData={state.caminhaoData}
            onCaminhaoDataChange={handleCaminhaoDataChange}
            errors={state.validationErrors}
            onErrorsChange={handleErrorsChange}
          />
        );
      
      case 3:
        return (
          <CarrinhoForm
            carrinho={state.carrinho}
            onCarrinhoChange={handleCarrinhoChange}
            guindastes={state.guindastes}
            onGuindasteSelect={handleGuindasteSelect}
            onRemoveItem={handleRemoveItem}
            onUpdateQuantity={handleUpdateQuantity}
          />
        );
      
      case 4:
        return (
          <div>
            <PaymentPolicy
              precoBase={getTotalCarrinho()}
              onPaymentComputed={handlePagamentoDataChange}
              user={state.user}
              clienteTemIE={state.clienteTemIE}
              onClienteIEChange={setClienteIE}
            />
          </div>
        );
      
      case 5:
        return (
          <ResumoForm
            clienteData={state.clienteData}
            caminhaoData={state.caminhaoData}
            carrinho={state.carrinho}
            pagamentoData={state.pagamentoData}
            user={state.user}
          />
        );
      
      default:
        return <div>Step não encontrado</div>;
    }
  };

  if (state.isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="novo-pedido-with-reducer">
      <UnifiedHeader
        showBackButton={true}
        showSupportButton={true}
        showUserInfo={true}
        title="Novo Pedido (useReducer)"
        subtitle="Sistema de Orçamentos"
      />
      
      <div className="pedido-container">
        {/* Progress Steps */}
        <div className="steps-container">
          <div className="steps">
            {[1, 2, 3, 4, 5].map(step => (
              <div 
                key={step} 
                className={`step ${state.currentStep >= step ? 'active' : ''} ${state.currentStep === step ? 'current' : ''}`}
              >
                <div className="step-number">{step}</div>
                <div className="step-label">
                  {step === 1 && 'Cliente'}
                  {step === 2 && 'Caminhão'}
                  {step === 3 && 'Carrinho'}
                  {step === 4 && 'Pagamento'}
                  {step === 5 && 'Resumo'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conteúdo do Step */}
        <div className="step-content">
          {renderStepContent()}
        </div>

        {/* Navegação */}
        <div className="step-navigation">
          <button 
            className="btn-secondary"
            onClick={previousStep}
            disabled={state.currentStep === 1}
          >
            Anterior
          </button>
          
          {state.currentStep < 5 ? (
            <button 
              className="btn-primary"
              onClick={nextStep}
              disabled={!canGoNext()}
            >
              Próximo
            </button>
          ) : (
            <button 
              className="btn-success"
              onClick={() => {
                // Aqui seria a lógica para finalizar o pedido
                console.log('Finalizar pedido com useReducer');
                console.log('Estado atual:', state);
              }}
            >
              Finalizar Pedido
            </button>
          )}
        </div>

        {/* Debug Info (apenas em desenvolvimento) */}
        {import.meta.env.DEV && (
          <div className="debug-info" style={{ 
            marginTop: '2rem', 
            padding: '1rem', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px',
            fontSize: '0.875rem'
          }}>
            <h4>Debug Info (useReducer):</h4>
            <p><strong>Step atual:</strong> {state.currentStep}</p>
            <p><strong>Cliente:</strong> {state.clienteData.nome || 'Não informado'}</p>
            <p><strong>Caminhão:</strong> {state.caminhaoData.modelo || 'Não informado'}</p>
            <p><strong>Carrinho:</strong> {state.carrinho.length} itens</p>
            <p><strong>Total:</strong> {formatCurrency(getTotalCarrinho())}</p>
            <p><strong>Pode avançar:</strong> {canGoNext() ? 'Sim' : 'Não'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NovoPedidoWithReducer;
