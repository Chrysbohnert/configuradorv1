import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import UnifiedHeader from '../UnifiedHeader';
import PDFGenerator from '../PDFGenerator';
import PaymentPolicy from '../../features/payment/PaymentPolicy';
import { ClienteForm, CaminhaoForm, CarrinhoForm, ResumoForm } from './index';

import { db } from '../../config/supabase';
import { formatCurrency, generateCodigoProduto } from '../../utils/formatters';
import { CODIGOS_MODELOS, DESCRICOES_OPCIONAIS } from '../../config/codigosGuindaste';
import '../../styles/NovoPedido.css';

/**
 * Versão refatorada do NovoPedido usando componentes menores
 * Este é um exemplo de como usar os novos componentes
 */
const NovoPedidoRefatorado = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Estados principais
  const [currentStep, setCurrentStep] = useState(1);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados dos formulários
  const [clienteData, setClienteData] = useState({});
  const [caminhaoData, setCaminhaoData] = useState({});
  const [carrinho, setCarrinho] = useState(() => {
    const savedCart = localStorage.getItem('carrinho');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [pagamentoData, setPagamentoData] = useState({
    tipoPagamento: '',
    prazoPagamento: '',
    desconto: 0,
    acrescimo: 0,
    valorFinal: 0,
    localInstalacao: '',
    tipoInstalacao: ''
  });
  
  // Estados de controle
  const [clienteTemIE, setClienteTemIE] = useState(true);
  const [guindastes, setGuindastes] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});

  // Carregar dados do usuário
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/');
    }
  }, [navigate]);

  // Carregar dados iniciais
  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const guindastesData = await db.getGuindastes();
      setGuindastes(guindastesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
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
    localStorage.setItem('carrinho', JSON.stringify(newCarrinho));
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
    
    const newCarrinho = [...carrinho, produto];
    handleCarrinhoChange(newCarrinho);
  };

  const handleRemoveItem = (index) => {
    const newCarrinho = carrinho.filter((_, i) => i !== index);
    handleCarrinhoChange(newCarrinho);
  };

  const handleUpdateQuantity = (index, quantity) => {
    const newCarrinho = [...carrinho];
    newCarrinho[index].quantidade = quantity;
    handleCarrinhoChange(newCarrinho);
  };

  // Navegação entre steps
  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 1: // Dados do Cliente
        return clienteData.nome && clienteData.documento && clienteData.telefone;
      case 2: // Dados do Caminhão
        return caminhaoData.tipo && caminhaoData.marca && caminhaoData.modelo;
      case 3: // Carrinho
        return carrinho.length > 0;
      case 4: // Pagamento
        return pagamentoData.tipoPagamento && pagamentoData.prazoPagamento;
      case 5: // Resumo
        return true;
      default:
        return false;
    }
  };

  // Renderizar conteúdo do step atual
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <ClienteForm
            clienteData={clienteData}
            onClienteDataChange={handleClienteDataChange}
            errors={validationErrors}
            onErrorsChange={handleErrorsChange}
            clienteTemIE={clienteTemIE}
            onClienteIEChange={setClienteTemIE}
            user={user}
          />
        );
      
      case 2:
        return (
          <CaminhaoForm
            caminhaoData={caminhaoData}
            onCaminhaoDataChange={handleCaminhaoDataChange}
            errors={validationErrors}
            onErrorsChange={handleErrorsChange}
          />
        );
      
      case 3:
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
      
      case 4:
        return (
          <div>
            <PaymentPolicy
              precoBase={carrinho.reduce((total, item) => total + (item.preco * (item.quantidade || 1)), 0)}
              onPaymentComputed={handlePagamentoDataChange}
              user={user}
              clienteTemIE={clienteTemIE}
              onClienteIEChange={setClienteTemIE}
            />
          </div>
        );
      
      case 5:
        return (
          <ResumoForm
            clienteData={clienteData}
            caminhaoData={caminhaoData}
            carrinho={carrinho}
            pagamentoData={pagamentoData}
            user={user}
          />
        );
      
      default:
        return <div>Step não encontrado</div>;
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="novo-pedido-refatorado">
      <UnifiedHeader
        showBackButton={true}
        showSupportButton={true}
        showUserInfo={true}
        title="Nova Proposta"
        subtitle="Sistema de Orçamentos"
      />
      
      <div className="pedido-container">
        {/* Progress Steps */}
        <div className="steps-container">
          <div className="steps">
            {[1, 2, 3, 4, 5].map(step => (
              <div 
                key={step} 
                className={`step ${currentStep >= step ? 'active' : ''} ${currentStep === step ? 'current' : ''}`}
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
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            Anterior
          </button>
          
          {currentStep < 5 ? (
            <button 
              className="btn-primary"
              onClick={handleNext}
              disabled={!canGoNext()}
            >
              Próximo
            </button>
          ) : (
            <button 
              className="btn-success"
              onClick={() => {
                // Aqui seria a lógica para finalizar o pedido
                console.log('Finalizar pedido');
              }}
            >
              Finalizar Pedido
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NovoPedidoRefatorado;
