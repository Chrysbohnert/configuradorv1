import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import PDFGenerator from '../components/PDFGenerator';
import PaymentPolicy from '../features/payment/PaymentPolicy';
import { 
  MemoizedClienteForm, 
  MemoizedCaminhaoForm, 
  MemoizedCarrinhoForm, 
  MemoizedCardGuindaste 
} from '../components';
import { useStableCallback, useStableMemo, useFilteredList } from '../hooks/useMemoization';

import { db } from '../config/supabase';
import { formatCurrency, generateCodigoProduto } from '../utils/formatters';
import { CODIGOS_MODELOS, DESCRICOES_OPCIONAIS } from '../config/codigosGuindaste';
import '../styles/NovoPedido.css';

/**
 * Versão do NovoPedido com memoização para otimizar performance
 * Este é um exemplo de como usar os componentes memoizados
 */
const NovoPedidoMemoized = () => {
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

  // Callbacks memoizados para evitar re-renders desnecessários
  const handleClienteDataChange = useStableCallback((data) => {
    setClienteData(data);
  }, []);

  const handleCaminhaoDataChange = useStableCallback((data) => {
    setCaminhaoData(data);
  }, []);

  const handleCarrinhoChange = useStableCallback((newCarrinho) => {
    setCarrinho(newCarrinho);
    localStorage.setItem('carrinho', JSON.stringify(newCarrinho));
  }, []);

  const handlePagamentoDataChange = useStableCallback((data) => {
    setPagamentoData(data);
  }, []);

  const handleErrorsChange = useStableCallback((errors) => {
    setValidationErrors(errors);
  }, []);

  const handleClienteIEChange = useStableCallback((temIE) => {
    setClienteTemIE(temIE);
  }, []);

  // Handlers específicos do carrinho
  const handleGuindasteSelect = useStableCallback((guindaste) => {
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
  }, [carrinho, handleCarrinhoChange]);

  const handleRemoveItem = useStableCallback((index) => {
    const newCarrinho = carrinho.filter((_, i) => i !== index);
    handleCarrinhoChange(newCarrinho);
  }, [carrinho, handleCarrinhoChange]);

  const handleUpdateQuantity = useStableCallback((index, quantity) => {
    const newCarrinho = [...carrinho];
    newCarrinho[index].quantidade = quantity;
    handleCarrinhoChange(newCarrinho);
  }, [carrinho, handleCarrinhoChange]);

  // Navegação
  const handleNext = useStableCallback(() => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep]);

  const handlePrevious = useStableCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  // Validação memoizada
  const canGoNext = useStableMemo(() => {
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
  }, [currentStep, clienteData, caminhaoData, carrinho, pagamentoData]);

  // Total do carrinho memoizado
  const totalCarrinho = useStableMemo(() => {
    return carrinho.reduce((total, item) => {
      return total + (item.preco * (item.quantidade || 1));
    }, 0);
  }, [carrinho]);

  // Guindastes filtrados memoizados
  const filteredGuindastes = useFilteredList(
    guindastes,
    (guindaste) => {
      // Aqui você pode adicionar lógica de filtro
      return true;
    },
    [guindastes]
  );

  // Renderizar conteúdo do step atual
  const renderStepContent = useStableMemo(() => {
    switch (currentStep) {
      case 1:
        return (
          <MemoizedClienteForm
            clienteData={clienteData}
            onClienteDataChange={handleClienteDataChange}
            errors={validationErrors}
            onErrorsChange={handleErrorsChange}
            clienteTemIE={clienteTemIE}
            onClienteIEChange={handleClienteIEChange}
            user={user}
          />
        );
      
      case 2:
        return (
          <MemoizedCaminhaoForm
            caminhaoData={caminhaoData}
            onCaminhaoDataChange={handleCaminhaoDataChange}
            errors={validationErrors}
            onErrorsChange={handleErrorsChange}
          />
        );
      
      case 3:
        return (
          <MemoizedCarrinhoForm
            carrinho={carrinho}
            onCarrinhoChange={handleCarrinhoChange}
            guindastes={filteredGuindastes}
            onGuindasteSelect={handleGuindasteSelect}
            onRemoveItem={handleRemoveItem}
            onUpdateQuantity={handleUpdateQuantity}
          />
        );
      
      case 4:
        return (
          <div>
            <PaymentPolicy
              precoBase={totalCarrinho}
              onPaymentComputed={handlePagamentoDataChange}
              user={user}
              clienteTemIE={clienteTemIE}
              onClienteIEChange={handleClienteIEChange}
            />
          </div>
        );
      
      case 5:
        return (
          <div className="resumo-final">
            <h3>Resumo do Pedido</h3>
            <p><strong>Cliente:</strong> {clienteData.nome}</p>
            <p><strong>Caminhão:</strong> {caminhaoData.modelo}</p>
            <p><strong>Itens:</strong> {carrinho.length}</p>
            <p><strong>Total:</strong> {formatCurrency(totalCarrinho)}</p>
          </div>
        );
      
      default:
        return <div>Step não encontrado</div>;
    }
  }, [
    currentStep,
    clienteData,
    caminhaoData,
    carrinho,
    pagamentoData,
    validationErrors,
    clienteTemIE,
    user,
    filteredGuindastes,
    totalCarrinho,
    handleClienteDataChange,
    handleCaminhaoDataChange,
    handleCarrinhoChange,
    handlePagamentoDataChange,
    handleErrorsChange,
    handleClienteIEChange,
    handleGuindasteSelect,
    handleRemoveItem,
    handleUpdateQuantity
  ]);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="novo-pedido-memoized">
      <UnifiedHeader
        showBackButton={true}
        showSupportButton={true}
        showUserInfo={true}
        title="Novo Pedido (Memoizado)"
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
          {renderStepContent}
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
              disabled={!canGoNext}
            >
              Próximo
            </button>
          ) : (
            <button 
              className="btn-success"
              onClick={() => {
                console.log('Finalizar pedido com memoização');
                console.log('Estado atual:', { clienteData, caminhaoData, carrinho, pagamentoData });
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
            <h4>Debug Info (Memoização):</h4>
            <p><strong>Step atual:</strong> {currentStep}</p>
            <p><strong>Cliente:</strong> {clienteData.nome || 'Não informado'}</p>
            <p><strong>Caminhão:</strong> {caminhaoData.modelo || 'Não informado'}</p>
            <p><strong>Carrinho:</strong> {carrinho.length} itens</p>
            <p><strong>Total:</strong> {formatCurrency(totalCarrinho)}</p>
            <p><strong>Pode avançar:</strong> {canGoNext ? 'Sim' : 'Não'}</p>
            <p><strong>Guindastes:</strong> {guindastes.length} disponíveis</p>
            <p><strong>Filtrados:</strong> {filteredGuindastes.length} disponíveis</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NovoPedidoMemoized;
