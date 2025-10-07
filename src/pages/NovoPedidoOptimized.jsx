import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import { useLogger } from '../hooks/useLogger';
import { LOG_CATEGORIES } from '../utils/logger';
import { 
  loadGuindastesOptimized, 
  getCapacidadesUnicas, 
  getModelosPorCapacidade, 
  getGuindastesPorModelo,
  preloadEssentialData
} from '../utils/guindasteOptimizer';
import { db } from '../config/supabase';
import { formatCurrency } from '../utils/formatters';
import '../styles/NovoPedido.css';

/**
 * Versão otimizada do NovoPedido com foco em performance
 * Resolve o problema de lentidão na escolha de capacidade
 */
const NovoPedidoOptimized = () => {
  const navigate = useNavigate();
  const logger = useLogger('NovoPedidoOptimized', LOG_CATEGORIES.UI);
  
  // Estados principais
  const [currentStep, setCurrentStep] = useState(1);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Carregando...');
  
  // Estados dos dados
  const [guindastesData, setGuindastesData] = useState(null);
  const [capacidades, setCapacidades] = useState([]);
  const [selectedCapacidade, setSelectedCapacidade] = useState(null);
  const [selectedModelo, setSelectedModelo] = useState(null);
  const [guindastesDisponiveis, setGuindastesDisponiveis] = useState([]);
  
  // Estados do carrinho
  const [carrinho, setCarrinho] = useState(() => {
    const savedCart = localStorage.getItem('carrinho');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  // Carregar dados do usuário
  useEffect(() => {
    logger.logLifecycle('mounted');
    
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/');
    }
    
    return () => {
      logger.logLifecycle('unmounted');
    };
  }, [navigate, logger]);

  // Carregar dados essenciais
  useEffect(() => {
    if (!user) return;
    
    loadEssentialData();
  }, [user]);

  // Função otimizada para carregar dados
  const loadEssentialData = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadingMessage('Carregando guindastes...');
      logger.startTimer('load-guindastes');
      
      // Pré-carregar dados essenciais
      const result = await preloadEssentialData();
      
      if (result.fromCache) {
        logger.logInfo('Dados carregados do cache', { 
          guindastes: result.guindastes.length,
          capacidades: result.capacidades.length 
        });
      } else {
        logger.logInfo('Dados carregados do banco', { 
          loadTime: result.loadTime,
          guindastes: result.guindastes.length,
          capacidades: result.capacidades.length 
        });
      }
      
      // Atualizar estados
      setGuindastesData(result);
      setCapacidades(result.capacidades);
      
      logger.endTimer('load-guindastes');
      logger.logSuccess('Dados carregados com sucesso');
      
    } catch (error) {
      logger.logError('Erro ao carregar dados', { error: error.message }, error);
      alert('Erro ao carregar dados. Verifique a conexão.');
    } finally {
      setIsLoading(false);
    }
  }, [logger]);

  // Handlers otimizados
  const handleCapacidadeSelect = useCallback((capacidade) => {
    logger.logUserAction('capacidade-selected', { capacidade });
    setSelectedCapacidade(capacidade);
    setSelectedModelo(null);
    setGuindastesDisponiveis([]);
    
    // Carregar modelos para a capacidade selecionada
    const modelos = getModelosPorCapacidade(capacidade);
    setGuindastesDisponiveis(modelos);
    
    logger.logInfo('Modelos carregados', { 
      capacidade, 
      modelos: modelos.length 
    });
  }, [logger]);

  const handleModeloSelect = useCallback((modelo) => {
    logger.logUserAction('modelo-selected', { modelo });
    setSelectedModelo(modelo);
    
    // Carregar guindastes para o modelo selecionado
    const guindastes = getGuindastesPorModelo(modelo);
    setGuindastesDisponiveis(guindastes);
    
    logger.logInfo('Guindastes carregados', { 
      modelo, 
      guindastes: guindastes.length 
    });
  }, [logger]);

  const handleGuindasteSelect = useCallback(async (guindaste) => {
    try {
      logger.logUserAction('guindaste-selected', { 
        id: guindaste.id, 
        subgrupo: guindaste.subgrupo 
      });
      
      // Buscar preço do guindaste
      let precoGuindaste = 0;
      try {
        const regiaoVendedor = user?.regiao || 'sul-sudeste';
        precoGuindaste = await db.getPrecoPorRegiao(guindaste.id, regiaoVendedor);
        
        if (!precoGuindaste || precoGuindaste === 0) {
          logger.logWarn('Preço não encontrado', { 
            guindasteId: guindaste.id, 
            regiao: regiaoVendedor 
          });
          alert('Atenção: Este guindaste não possui preço definido para a sua região.');
        }
      } catch (error) {
        logger.logError('Erro ao buscar preço', { 
          guindasteId: guindaste.id, 
          error: error.message 
        }, error);
        alert('Erro ao buscar preço do guindaste.');
      }
      
      // Adicionar ao carrinho
      const produto = {
        id: guindaste.id,
        nome: guindaste.subgrupo,
        modelo: guindaste.modelo,
        codigo_produto: guindaste.codigo_referencia,
        grafico_carga_url: guindaste.grafico_carga_url,
        preco: precoGuindaste,
        tipo: 'guindaste',
        quantidade: 1
      };
      
      const newCarrinho = [...carrinho, produto];
      setCarrinho(newCarrinho);
      localStorage.setItem('carrinho', JSON.stringify(newCarrinho));
      
      logger.logSuccess('Guindaste adicionado ao carrinho', { 
        produto,
        carrinhoSize: newCarrinho.length 
      });
      
    } catch (error) {
      logger.logError('Erro ao selecionar guindaste', { 
        guindasteId: guindaste.id, 
        error: error.message 
      }, error);
    }
  }, [carrinho, user, logger]);

  // Navegação
  const handleNext = useCallback(() => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
      logger.logNavigation(`step-${currentStep}`, `step-${currentStep + 1}`);
    }
  }, [currentStep, logger]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      logger.logNavigation(`step-${currentStep}`, `step-${currentStep - 1}`);
    }
  }, [currentStep, logger]);

  // Renderizar seleção de guindaste (otimizado)
  const renderGuindasteSelection = () => {
    if (isLoading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>{loadingMessage}</p>
        </div>
      );
    }

    return (
      <div className="guindaste-selection">
        <h2 className="text-2xl font-bold mb-6">Selecione o Guindaste Ideal</h2>
        <p className="text-gray-600 mb-8">Escolha o guindaste que melhor atende às suas necessidades</p>
        
        {/* Progress Steps */}
        <div className="steps-container mb-8">
          <div className="steps">
            <div className="step active">
              <div className="step-number">1</div>
              <div className="step-label">Capacidade</div>
            </div>
            <div className={`step ${selectedCapacidade ? 'active' : ''}`}>
              <div className="step-number">2</div>
              <div className="step-label">Modelo</div>
            </div>
            <div className={`step ${selectedModelo ? 'active' : ''}`}>
              <div className="step-number">3</div>
              <div className="step-label">Configuração</div>
            </div>
          </div>
        </div>

        {/* Seleção de Capacidade */}
        <div className="capacity-selection mb-8">
          <h3 className="text-xl font-semibold mb-4">1. Escolha a Capacidade</h3>
          <p className="text-gray-600 mb-6">Selecione a capacidade do guindaste</p>
          
          <div className="capacity-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {capacidades.map((capacidade) => (
              <button
                key={capacidade}
                onClick={() => handleCapacidadeSelect(capacidade)}
                className={`capacity-card p-4 rounded-lg border-2 transition-all ${
                  selectedCapacidade === capacidade
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                <div className="text-2xl font-bold">{capacidade}</div>
                <div className="text-sm text-gray-600">Toneladas</div>
              </button>
            ))}
          </div>
        </div>

        {/* Seleção de Modelo */}
        {selectedCapacidade && (
          <div className="model-selection mb-8">
            <h3 className="text-xl font-semibold mb-4">2. Escolha o Modelo</h3>
            <p className="text-gray-600 mb-6">Selecione o modelo do guindaste</p>
            
            <div className="model-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {guindastesDisponiveis.map((modelo) => (
                <button
                  key={modelo.id}
                  onClick={() => handleModeloSelect(modelo.modelo)}
                  className={`model-card p-4 rounded-lg border-2 transition-all ${
                    selectedModelo === modelo.modelo
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-semibold">{modelo.modelo}</div>
                  <div className="text-sm text-gray-600">{modelo.subgrupo}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Seleção de Guindaste */}
        {selectedModelo && (
          <div className="guindaste-selection">
            <h3 className="text-xl font-semibold mb-4">3. Escolha a Configuração</h3>
            <p className="text-gray-600 mb-6">Selecione a configuração específica do guindaste</p>
            
            <div className="guindaste-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {guindastesDisponiveis.map((guindaste) => (
                <div
                  key={guindaste.id}
                  className="guindaste-card bg-white p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow"
                >
                  <div className="mb-4">
                    <h4 className="font-semibold text-lg">{guindaste.subgrupo}</h4>
                    <p className="text-gray-600">{guindaste.modelo}</p>
                  </div>
                  
                  {guindaste.imagem_url && (
                    <div className="mb-4">
                      <img
                        src={guindaste.imagem_url}
                        alt={guindaste.subgrupo}
                        className="w-full h-32 object-cover rounded"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      <strong>Código:</strong> {guindaste.codigo_referencia}
                    </p>
                    {guindaste.peso_kg && (
                      <p className="text-sm text-gray-600">
                        <strong>Peso:</strong> {guindaste.peso_kg} kg
                      </p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleGuindasteSelect(guindaste)}
                    className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
                  >
                    Selecionar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Renderizar outros steps (simplificado)
  const renderPagamento = () => (
    <div className="pagamento-step">
      <h2 className="text-2xl font-bold mb-6">Política de Pagamento</h2>
      <p className="text-gray-600">Configuração de pagamento será implementada aqui.</p>
    </div>
  );

  const renderCliente = () => (
    <div className="cliente-step">
      <h2 className="text-2xl font-bold mb-6">Dados do Cliente</h2>
      <p className="text-gray-600">Formulário do cliente será implementado aqui.</p>
    </div>
  );

  const renderCaminhao = () => (
    <div className="caminhao-step">
      <h2 className="text-2xl font-bold mb-6">Estudo Veicular</h2>
      <p className="text-gray-600">Configuração do veículo será implementada aqui.</p>
    </div>
  );

  const renderFinalizar = () => (
    <div className="finalizar-step">
      <h2 className="text-2xl font-bold mb-6">Finalizar Pedido</h2>
      <p className="text-gray-600">Revisão e confirmação do pedido.</p>
      <div className="mt-4">
        <p><strong>Itens no carrinho:</strong> {carrinho.length}</p>
        <p><strong>Total:</strong> {formatCurrency(carrinho.reduce((sum, item) => sum + (item.preco * item.quantidade), 0))}</p>
      </div>
    </div>
  );

  // Renderizar conteúdo do step atual
  const renderStepContent = useMemo(() => {
    switch (currentStep) {
      case 1:
        return renderGuindasteSelection();
      case 2:
        return renderPagamento();
      case 3:
        return renderCliente();
      case 4:
        return renderCaminhao();
      case 5:
        return renderFinalizar();
      default:
        return <div>Step não encontrado</div>;
    }
  }, [currentStep, capacidades, selectedCapacidade, selectedModelo, guindastesDisponiveis, isLoading, loadingMessage, carrinho]);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>{loadingMessage}</p>
      </div>
    );
  }

  return (
    <div className="novo-pedido-optimized">
      <UnifiedHeader
        showBackButton={true}
        showSupportButton={true}
        showUserInfo={true}
        title="Novo Pedido (Otimizado)"
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
                  {step === 1 && 'Guindaste'}
                  {step === 2 && 'Pagamento'}
                  {step === 3 && 'Cliente'}
                  {step === 4 && 'Caminhão'}
                  {step === 5 && 'Finalizar'}
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
          
          <button 
            className="btn-primary"
            onClick={handleNext}
            disabled={currentStep === 5}
          >
            Próximo
          </button>
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
            <h4>Debug Info (Otimizado):</h4>
            <p><strong>Step atual:</strong> {currentStep}</p>
            <p><strong>Capacidades:</strong> {capacidades.length}</p>
            <p><strong>Capacidade selecionada:</strong> {selectedCapacidade || 'Nenhuma'}</p>
            <p><strong>Modelo selecionado:</strong> {selectedModelo || 'Nenhum'}</p>
            <p><strong>Guindastes disponíveis:</strong> {guindastesDisponiveis.length}</p>
            <p><strong>Carrinho:</strong> {carrinho.length} itens</p>
            <p><strong>Cache válido:</strong> {guindastesData?.fromCache ? 'Sim' : 'Não'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NovoPedidoOptimized;
