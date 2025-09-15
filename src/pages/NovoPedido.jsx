import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import PDFGenerator from '../components/PDFGenerator';

import { db } from '../config/supabase';
import { formatCurrency, generateCodigoProduto } from '../utils/formatters';
import { CODIGOS_MODELOS, DESCRICOES_OPCIONAIS } from '../config/codigosGuindaste';
import '../styles/NovoPedido.css';

const NovoPedido = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [carrinho, setCarrinho] = useState(() => {
    const savedCart = localStorage.getItem('carrinho');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [clienteData, setClienteData] = useState({});
  const [caminhaoData, setCaminhaoData] = useState({});
  const [pagamentoData, setPagamentoData] = useState({
    tipoPagamento: '',
    prazoPagamento: '',
    desconto: 0,
    acrescimo: 0,
    valorFinal: 0,
    localInstalacao: '',
    tipoInstalacao: ''
  });
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [guindastes, setGuindastes] = useState([]);
  const [guindastesSelecionados, setGuindastesSelecionados] = useState([]);
  const [selectedCapacidade, setSelectedCapacidade] = useState(null);
  const [selectedModelo, setSelectedModelo] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, navigate]);

  // Verificar se há um guindaste selecionado vindo da tela de detalhes
  useEffect(() => {
    if (location.state?.guindasteSelecionado) {
      const guindaste = location.state.guindasteSelecionado;
      setGuindastesSelecionados([guindaste]);
      
      // Adicionar ao carrinho se não estiver
      const produto = {
        id: guindaste.id,
        nome: guindaste.subgrupo,
        modelo: guindaste.modelo,
        codigo_produto: guindaste.codigo_referencia,
        preco: guindaste.preco || 0,
        tipo: 'guindaste'
      };
      
      adicionarAoCarrinho(produto, 'guindaste');
      
      // Definir step correto
      if (location.state.step) {
        setCurrentStep(location.state.step);
      }
      
      // Limpar o estado da navegação
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Carregar apenas guindastes do Supabase
      const guindastesData = await db.getGuindastes();
      setGuindastes(guindastesData);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados. Verifique a conexão com o banco.');
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { id: 1, title: 'Selecionar Guindaste', icon: '🏗️', description: 'Escolha o guindaste ideal' },
    { id: 2, title: 'Pagamento', icon: '💳', description: 'Política de pagamento' },
    { id: 3, title: 'Dados do Cliente', icon: '👤', description: 'Informações do cliente' },
    { id: 4, title: 'Estudo Veicular', icon: '🚛', description: 'Configuração do veículo' },
    { id: 5, title: 'Finalizar', icon: '✅', description: 'Revisar e confirmar' }
  ];

  // Funções para extrair capacidades e modelos dos guindastes
  const getCapacidadesUnicas = () => {
    const capacidades = new Set();
    
    guindastes.forEach(guindaste => {
      const subgrupo = guindaste.subgrupo || '';
      const modeloBase = subgrupo.replace(/^(Guindaste\s+)+/, '').split(' ').slice(0, 2).join(' ');
      
      // Extrair apenas o número (6.5, 8.0, 10.8, etc.)
      const match = modeloBase.match(/(\d+\.?\d*)/);
      if (match) {
        capacidades.add(match[1]);
      }
    });
    
    return Array.from(capacidades).sort((a, b) => parseFloat(a) - parseFloat(b));
  };

  const getModelosPorCapacidade = (capacidade) => {
    const modelos = new Map();
    
    guindastes.forEach(guindaste => {
      const subgrupo = guindaste.subgrupo || '';
      const modeloBase = subgrupo.replace(/^(Guindaste\s+)+/, '').split(' ').slice(0, 2).join(' ');
      
      const match = modeloBase.match(/(\d+\.?\d*)/);
      if (match && match[1] === capacidade) {
        // Agrupar por modelo base (GSI 6.5, GSE 8.0C, etc.) - coluna "Modelo" da tabela
        if (!modelos.has(modeloBase)) {
          modelos.set(modeloBase, guindaste);
        }
      }
    });
    
    return Array.from(modelos.values());
  };

  const getGuindastesPorModelo = (modelo) => {
    return guindastes.filter(guindaste => {
      const subgrupo = guindaste.subgrupo || '';
      const modeloBase = subgrupo.replace(/^(Guindaste\s+)+/, '').split(' ').slice(0, 2).join(' ');
      return modeloBase === modelo;
    });
  };

  // Funções do Carrinho
  const adicionarAoCarrinho = (item, tipo) => {
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
      
      localStorage.setItem('carrinho', JSON.stringify(newCart));
      return newCart;
    });
  };



  // Obter dados para a interface em cascata
  const capacidades = getCapacidadesUnicas();
  const modelosDisponiveis = selectedCapacidade ? getModelosPorCapacidade(selectedCapacidade) : [];
  const guindastesDisponiveis = selectedModelo ? getGuindastesPorModelo(selectedModelo) : [];

  // Função para selecionar guindaste
  const handleSelecionarGuindaste = (guindaste) => {
    // Verificar se o guindaste já está selecionado
    const jaSelecionado = guindastesSelecionados.find(g => g.id === guindaste.id);
    
    if (jaSelecionado) {
      // Remover se já estiver selecionado
      setGuindastesSelecionados(prev => prev.filter(g => g.id !== guindaste.id));
      removerItemPorIndex(carrinho.findIndex(item => item.id === guindaste.id));
    } else {
      // Adicionar se não estiver selecionado
      setGuindastesSelecionados(prev => [...prev, guindaste]);
      
      const produto = {
        id: guindaste.id,
        nome: guindaste.subgrupo,
        modelo: guindaste.modelo,
        codigo_produto: guindaste.codigo_referencia,
        preco: guindaste.preco || 0,
        tipo: 'guindaste'
      };
      
      adicionarAoCarrinho(produto, 'guindaste');
      
      // Navegar para a tela de detalhes do guindaste
      setTimeout(() => {
        navigate('/detalhes-guindaste', { 
          state: { 
            guindaste: guindaste,
            returnTo: '/novo-pedido',
            step: 2
          } 
        });
      }, 800);
    }
  };

  // Função para selecionar capacidade
  const handleSelecionarCapacidade = (capacidade) => {
    setSelectedCapacidade(capacidade);
    setSelectedModelo(null);
    setGuindastesSelecionados([]);
    
    // Adicionar efeito visual de destaque
    const card = document.querySelector(`[data-capacidade="${capacidade}"]`);
    if (card) {
      card.classList.add('selection-highlight');
      setTimeout(() => card.classList.remove('selection-highlight'), 1000);
    }
    
    // Scroll automático para a próxima etapa após um pequeno delay
    setTimeout(() => {
      const stepElement = document.querySelector('.cascata-step:nth-child(2)');
      if (stepElement) {
        // Calcular offset para mobile
        const isMobile = window.innerWidth <= 768;
        const offset = isMobile ? 120 : 80;
        
        const elementPosition = stepElement.offsetTop - offset;
        window.scrollTo({
          top: elementPosition,
          behavior: 'smooth'
        });
      }
    }, 300);
  };

  // Função para selecionar modelo
  const handleSelecionarModelo = (modelo) => {
    setSelectedModelo(modelo);
    setGuindastesSelecionados([]);
    
    // Adicionar efeito visual de destaque
    const card = document.querySelector(`[data-modelo="${modelo}"]`);
    if (card) {
      card.classList.add('selection-highlight');
      setTimeout(() => card.classList.remove('selection-highlight'), 1000);
    }
    
    // Scroll automático para a próxima etapa após um pequeno delay
    setTimeout(() => {
      const stepElement = document.querySelector('.cascata-step:nth-child(3)');
      if (stepElement) {
        // Calcular offset para mobile
        const isMobile = window.innerWidth <= 768;
        const offset = isMobile ? 120 : 80;
        
        const elementPosition = stepElement.offsetTop - offset;
        window.scrollTo({
          top: elementPosition,
          behavior: 'smooth'
        });
      }
    }, 300);
  };



  const removerItemPorIndex = (index) => {
    setCarrinho(prev => {
      const newCart = prev.filter((_, i) => i !== index);
      localStorage.setItem('carrinho', JSON.stringify(newCart));
      return newCart;
    });
  };

  const limparCarrinho = () => {
    setCarrinho([]);
    localStorage.removeItem('carrinho');
  };



  const getTotalCarrinho = () => {
    return carrinho.reduce((total, item) => {
      const preco = parseFloat(item.preco) || 0;
      return total + preco;
    }, 0);
  };





  // Renderizar conteúdo do step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>Selecione o Guindaste Ideal</h2>
              <p>Escolha o guindaste que melhor atende às suas necessidades</p>
            </div>

            <div className="cascata-container">
              {/* Indicador de Progresso */}
              <div className="progress-indicator">
                <div className={`progress-step ${selectedCapacidade ? 'completed' : 'active'}`}>
                  <div className="step-number">1</div>
                  <span>Capacidade</span>
                </div>
                <div className={`progress-line ${selectedCapacidade ? 'completed' : ''}`}></div>
                <div className={`progress-step ${selectedCapacidade && selectedModelo ? 'completed' : selectedCapacidade ? 'active' : ''}`}>
                  <div className="step-number">2</div>
                  <span>Modelo</span>
                </div>
                <div className={`progress-line ${selectedCapacidade && selectedModelo ? 'completed' : ''}`}></div>
                              <div className={`progress-step ${guindastesSelecionados.length > 0 ? 'completed' : selectedModelo ? 'active' : ''}`}>
                <div className="step-number">3</div>
                <span>Configuração</span>
              </div>
              </div>

              {/* Passo 1: Selecionar Capacidade */}
              <div className="cascata-step">
                <div className="step-title">
                  <h3>1. Escolha a Capacidade</h3>
                  <p>Selecione a capacidade do guindaste</p>
                </div>
                
                <div className="capacidades-grid">
                  {capacidades.map((capacidade) => (
                    <button
                      key={capacidade}
                      className={`capacidade-card ${selectedCapacidade === capacidade ? 'selected' : ''}`}
                      onClick={() => handleSelecionarCapacidade(capacidade)}
                      data-capacidade={capacidade}
                    >
                      <div className="capacidade-icon">
                        {(() => {
                          // Encontrar um guindaste "standard" desta capacidade para mostrar a imagem
                          const guindasteStandard = guindastes.find(g => {
                            const subgrupo = g.subgrupo || '';
                            const modeloBase = subgrupo.replace(/^(Guindaste\s+)+/, '').split(' ').slice(0, 2).join(' ');
                            const match = modeloBase.match(/(\d+\.?\d*)/);
                            return match && match[1] === capacidade && g.imagem_url;
                          });
                          
                          if (guindasteStandard && guindasteStandard.imagem_url) {
                            return (
                              <img
                                src={guindasteStandard.imagem_url}
                                alt={`Guindaste ${capacidade} ton`}
                                className="capacidade-thumbnail"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            );
                          }
                          
                          return (
                            <div className="capacidade-fallback">
                              <span>🏗️</span>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="capacidade-info">
                        <h4>{capacidade} Ton</h4>
                        <p>Capacidade {capacidade} toneladas</p>
                      </div>
                      {selectedCapacidade === capacidade && (
                        <div className="selected-indicator">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Passo 2: Selecionar Modelo (apenas se capacidade foi selecionada) */}
              {selectedCapacidade && (
                <div className="cascata-step">
                  <div className="step-title">
                    <h3>2. Escolha o Modelo</h3>
                    <p>Modelos disponíveis para {selectedCapacidade} ton</p>
                  </div>
                  
                  <div className="modelos-grid">
                    {modelosDisponiveis.map((guindaste) => {
                      const subgrupo = guindaste.subgrupo || '';
                      const modeloBase = subgrupo.replace(/^(Guindaste\s+)+/, '').split(' ').slice(0, 2).join(' ');
                      
                      return (
                        <button
                          key={guindaste.id}
                          className={`modelo-card ${selectedModelo === modeloBase ? 'selected' : ''}`}
                          onClick={() => handleSelecionarModelo(modeloBase)}
                          data-modelo={modeloBase}
                        >
                          <div className="modelo-icon">
                            {guindaste.imagem_url ? (
                              <img
                                src={guindaste.imagem_url}
                                alt={modeloBase}
                                className="modelo-thumbnail"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : (
                              <div className="modelo-fallback">
                                <span>{modeloBase.includes('GSI') ? '🏭' : '🏗️'}</span>
                              </div>
                            )}
                          </div>
                          <div className="modelo-info">
                            <h4>{modeloBase}</h4>
                            <p>{guindaste.Grupo || 'Guindaste'}</p>
                            <span className="modelo-codigo">{guindaste.codigo_referencia}</span>
                          </div>
                          {selectedModelo === modeloBase && (
                            <div className="selected-indicator">
                              <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                              </svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Passo 3: Selecionar Guindaste Específico (apenas se modelo foi selecionado) */}
              {selectedModelo && (
                <div className="cascata-step">
                  <div className="step-title">
                    <h3>3. Escolha a Configuração</h3>
                    <p>Configurações disponíveis para {selectedModelo}</p>
                  </div>
                  
                  <div className="guindastes-grid">
                    {guindastesDisponiveis.map((guindaste) => (
                      <GuindasteCard
                        key={guindaste.id}
                        guindaste={guindaste}
                        isSelected={guindastesSelecionados.some(g => g.id === guindaste.id)}
                        onSelect={() => handleSelecionarGuindaste(guindaste)}
                      />
                    ))}
                  </div>
                  
                  {validationErrors.guindaste && (
                    <div className="validation-error">
                      <span className="error-message">{validationErrors.guindaste}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>Política de Pagamento</h2>
              <p>Selecione a forma de pagamento e visualize os descontos</p>
            </div>
            <PoliticaPagamento 
              carrinho={carrinho}
              clienteData={clienteData}
              onPagamentoChange={setPagamentoData}
              errors={validationErrors}
            />
          </div>
        );

      case 3:
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>Dados do Cliente</h2>
              <p>Preencha as informações do cliente</p>
            </div>
            <ClienteForm formData={clienteData} setFormData={setClienteData} errors={validationErrors} />
          </div>
        );

      case 4:
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>Estudo Veicular</h2>
              <p>Informações do veículo para o serviço</p>
            </div>
            <CaminhaoForm formData={caminhaoData} setFormData={setCaminhaoData} errors={validationErrors} />
          </div>
        );

      case 5:
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>Resumo do Pedido</h2>
              <p>Revise e confirme as informações</p>
            </div>
            <ResumoPedido 
              carrinho={carrinho}
              clienteData={clienteData}
              caminhaoData={caminhaoData}
              pagamentoData={pagamentoData}
              user={user}
              onRemoverItem={removerItemPorIndex}
              onLimparCarrinho={limparCarrinho}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const validateStep = (step) => {
    const errors = {};
    
    switch (step) {
      case 1:
        if (guindastesSelecionados.length === 0) {
          errors.guindaste = 'Selecione pelo menos um guindaste';
        }
        break;
      case 2:
        if (!pagamentoData.tipoPagamento) {
          errors.tipoPagamento = 'Selecione o tipo de pagamento';
        }
        if (!pagamentoData.prazoPagamento) {
          errors.prazoPagamento = 'Selecione o prazo de pagamento';
        }
        if (!pagamentoData.localInstalacao) {
          errors.localInstalacao = 'Informe o local de instalação';
        }
        if (!pagamentoData.tipoInstalacao) {
          errors.tipoInstalacao = 'Selecione o tipo de instalação';
        }
        break;
      case 3:
        if (!clienteData.nome) errors.nome = 'Nome é obrigatório';
        if (!clienteData.telefone) errors.telefone = 'Telefone é obrigatório';
        if (!clienteData.email) errors.email = 'Email é obrigatório';
        if (!clienteData.documento) errors.documento = 'CPF/CNPJ é obrigatório';
        if (!clienteData.inscricao_estadual) errors.inscricao_estadual = 'Inscrição Estadual é obrigatória';
        if (!clienteData.endereco) errors.endereco = 'Endereço é obrigatório';
        break;
      case 4:
        if (!caminhaoData.tipo) errors.tipo = 'Tipo do veículo é obrigatório';
        if (!caminhaoData.marca) errors.marca = 'Marca é obrigatória';
        if (!caminhaoData.modelo) errors.modelo = 'Modelo é obrigatório';
        if (!caminhaoData.voltagem) errors.voltagem = 'Voltagem é obrigatória';
        break;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return guindastesSelecionados.length > 0;
      case 2:
        return pagamentoData.tipoPagamento && 
               pagamentoData.prazoPagamento && 
               pagamentoData.localInstalacao && 
               pagamentoData.tipoInstalacao;
      case 3:
        return clienteData.nome && 
               clienteData.telefone && 
               clienteData.email && 
               clienteData.documento && 
               clienteData.inscricao_estadual && 
               clienteData.endereco;
      case 4:
        return caminhaoData.tipo && 
               caminhaoData.marca && 
               caminhaoData.modelo && 
               caminhaoData.voltagem;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep) && currentStep < 5) {
      setCurrentStep(currentStep + 1);
      setValidationErrors({}); // Limpar erros ao avançar
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };



  const handleFinish = async () => {
    // Limpar carrinho e navegar para histórico
    limparCarrinho();
    navigate('/historico');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="novo-pedido-container">
      <UnifiedHeader 
        showBackButton={true}
        onBackClick={() => navigate('/dashboard')}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title="Novo Pedido"
        subtitle="Criar orçamento profissional"
      />

      <div className="novo-pedido-content">
        {/* Progress Steps */}
        <div className="progress-steps">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`step ${currentStep >= step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}
            >
              <div className="step-number">
                {currentStep > step.id ? (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                ) : (
                  step.id
                )}
              </div>
              <div className="step-info">
                <div className="step-title">{step.title}</div>
                <div className="step-description">{step.description}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="main-content">
          <div className="content-area">
            {renderStepContent()}
          </div>

          {/* Botão Flutuante de Navegação */}
          <div className="floating-nav">
            {currentStep > 1 && (
              <button onClick={handlePrevious} className="floating-nav-btn prev">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
                <span>Anterior</span>
              </button>
            )}
            
            {currentStep < 5 ? (
              <button 
                onClick={handleNext} 
                className={`floating-nav-btn next ${!canGoNext() ? 'disabled' : ''}`}
                disabled={!canGoNext()}
              >
                <span>Próximo</span>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
                </svg>
              </button>
            ) : (
              <button 
                onClick={handleFinish} 
                className="floating-nav-btn finish"
              >
                <span>Finalizar</span>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Função para extrair configurações do título do guindaste
const extrairConfiguracoes = (subgrupo) => {
  const configuracoes = [];
  
  // Extrair configurações do título (mais específico para evitar falsos positivos)
  if (subgrupo.includes(' CR') || subgrupo.includes('CR ') || subgrupo.includes('CR/')) {
    configuracoes.push('CR - Controle Remoto');
  }
  if (subgrupo.includes(' EH') || subgrupo.includes('EH ') || subgrupo.includes('/EH')) {
    configuracoes.push('EH - Extensiva Hidráulica');
  }
  if (subgrupo.includes(' ECL') || subgrupo.includes('ECL ') || subgrupo.includes('/ECL')) {
    configuracoes.push('ECL - Extensiva Cilindro Lateral');
  }
  if (subgrupo.includes(' ECS') || subgrupo.includes('ECS ') || subgrupo.includes('/ECS')) {
    configuracoes.push('ECS - Extensiva Cilindro Superior');
  }
  if (subgrupo.includes(' P') || subgrupo.includes('P ') || subgrupo.includes('/P')) {
    configuracoes.push('P - Preparação p/ Perfuratriz');
  }
  if (subgrupo.includes(' GR') || subgrupo.includes('GR ') || subgrupo.includes('/GR')) {
    configuracoes.push('GR - Preparação p/ Garra e Rotator');
  }
  if (subgrupo.includes('Caminhão 3/4')) {
    configuracoes.push('Caminhão 3/4');
  }
  
  return configuracoes;
};



// Componente Card do Guindaste
const GuindasteCard = ({ guindaste, isSelected, onSelect }) => {
  const configuracoes = extrairConfiguracoes(guindaste.subgrupo);
  
  return (
    <div className={`guindaste-card ${isSelected ? 'selected' : ''}`} onClick={onSelect}>
      <div className="card-header">
        <div className="guindaste-image">
          {guindaste.imagem_url ? (
            <img
              src={guindaste.imagem_url}
              alt={guindaste.subgrupo}
              className="guindaste-thumbnail"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className="guindaste-icon" style={{ display: guindaste.imagem_url ? 'none' : 'flex' }}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
          </div>
        </div>
        <div className="guindaste-info">
          <h3>{guindaste.subgrupo}</h3>
          <p className="modelo">Modelo: {guindaste.modelo}</p>
          <span className="categoria">{guindaste.Grupo}</span>
        </div>
        <div className="price">Código: {guindaste.codigo_referencia}</div>
      </div>
      
      <div className="card-body">
        <div className="specs">
          <div className="spec">
            <span className="spec-label">Peso:</span>
            <span className="spec-value">{guindaste.peso_kg} kg</span>
          </div>
          <div className="spec">
            <span className="spec-label">Configuração:</span>
            <span className="spec-value">
              {configuracoes.length > 0 ? (
                <div className="configuracoes-lista">
                  {configuracoes.map((config, idx) => (
                    <div key={idx} className="config-item">
                      {config}
                    </div>
                  ))}
                </div>
              ) : (
                'STANDARD - Pedido Padrão'
              )}
            </span>
          </div>
        </div>
        
        <div className="card-actions">
          <button className={`btn-select ${isSelected ? 'selected' : ''}`}>
            {isSelected ? (
              <>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                Selecionado
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                Selecionar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente Card do Opcional
const OpcionalCard = ({ opcional, isSelected, onToggle }) => {
  return (
    <div className={`opcional-card ${isSelected ? 'selected' : ''}`} onClick={onToggle}>
      <div className="opcional-header">
        <div className="checkbox">
          <input type="checkbox" checked={isSelected} readOnly />
          <div className="checkmark"></div>
        </div>
        <div className="opcional-info">
          <h4>{opcional.nome}</h4>
          <p>{opcional.descricao}</p>
          <span className="categoria">{opcional.categoria}</span>
        </div>
        <div className="price">{formatCurrency(opcional.preco)}</div>
      </div>
    </div>
  );
};

// Componente Política de Pagamento
const PoliticaPagamento = ({ carrinho, onPagamentoChange, errors = {} }) => {
  const [formData, setFormData] = useState({
    tipoPagamento: '',
    prazoPagamento: '',
    tipoCliente: 'revenda', // revenda ou cnpj_cpf
    localInstalacao: '',
    tipoInstalacao: ''
  });

  // Calcular totais
  const totalGuindastes = carrinho.filter(item => item.tipo === 'guindaste').length;
  const guindastesGSI = carrinho.filter(item => item.tipo === 'guindaste' && item.modelo?.includes('GSI')).length;
  const guindastesGSE = carrinho.filter(item => item.tipo === 'guindaste' && item.modelo?.includes('GSE')).length;
  const valorTotal = carrinho.reduce((total, item) => total + (parseFloat(item.preco) || 0), 0);

  // Calcular desconto baseado na política
  const calcularDesconto = () => {
    let desconto = 0;
    
    if (formData.tipoPagamento === 'revenda_gsi') {
      if (guindastesGSI === 1) desconto = 12;
      else if (guindastesGSI === 2) desconto = 14;
      else if (guindastesGSI >= 3) desconto = 15;
    } else if (formData.tipoPagamento === 'cnpj_cpf_gse') {
      desconto = 3;
    }
    
    return desconto;
  };

  // Calcular acréscimo baseado no prazo
  const calcularAcrescimo = () => {
    let acrescimo = 0;
    
    if (formData.prazoPagamento === '30_dias') {
      if (formData.tipoPagamento === 'revenda_gsi') acrescimo = 3;
      else if (formData.tipoPagamento === 'cnpj_cpf_gse') acrescimo = 3;
    } else if (formData.prazoPagamento === '60_dias') {
      if (formData.tipoPagamento === 'revenda_gsi') acrescimo = 1;
      else if (formData.tipoPagamento === 'cnpj_cpf_gse') acrescimo = 1;
    } else if (formData.prazoPagamento === '120_dias_interno') {
      acrescimo = 0; // Sem acréscimo até 120 dias
    } else if (formData.prazoPagamento === '90_dias_cnpj') {
      acrescimo = 0; // Sem acréscimo até 90 dias
    }
    
    return acrescimo;
  };

  const desconto = calcularDesconto();
  const acrescimo = calcularAcrescimo();
  const valorDesconto = (valorTotal * desconto) / 100;
  const valorAcrescimo = (valorTotal * acrescimo) / 100;
  const valorFinal = valorTotal - valorDesconto + valorAcrescimo;

  const handleChange = (field, value) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    
    // Calcular desconto baseado na nova seleção
    let novoDesconto = 0;
    if (newData.tipoPagamento === 'revenda_gsi') {
      if (guindastesGSI === 1) novoDesconto = 12;
      else if (guindastesGSI === 2) novoDesconto = 14;
      else if (guindastesGSI >= 3) novoDesconto = 15;
    } else if (newData.tipoPagamento === 'cnpj_cpf_gse') {
      novoDesconto = 3;
    }
    
    // Calcular acréscimo baseado na nova seleção
    let novoAcrescimo = 0;
    if (newData.prazoPagamento === '30_dias') {
      if (newData.tipoPagamento === 'revenda_gsi') novoAcrescimo = 3;
      else if (newData.tipoPagamento === 'cnpj_cpf_gse') novoAcrescimo = 3;
    } else if (newData.prazoPagamento === '60_dias') {
      if (newData.tipoPagamento === 'revenda_gsi') novoAcrescimo = 1;
      else if (newData.tipoPagamento === 'cnpj_cpf_gse') novoAcrescimo = 1;
    }
    
    const novoValorFinal = valorTotal - ((valorTotal * novoDesconto) / 100) + ((valorTotal * novoAcrescimo) / 100);
    
    // Atualizar dados de pagamento
    onPagamentoChange({
      ...newData,
      desconto: novoDesconto,
      acrescimo: novoAcrescimo,
      valorFinal: novoValorFinal,
      localInstalacao: newData.localInstalacao,
      tipoInstalacao: newData.tipoInstalacao
    });
  };

  return (
    <div className="politica-pagamento">
      <div className="resumo-carrinho">
        <h3>Resumo do Carrinho</h3>
        <div className="resumo-info">
          <p><strong>Total de Guindastes:</strong> {totalGuindastes}</p>
          <p><strong>Valor Total:</strong> R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="politica-opcoes">
        <h3>Política de Pagamento</h3>
        
        <div className="form-group">
          <label>Tipo de Cliente e Pagamento</label>
          <select
            value={formData.tipoPagamento}
            onChange={(e) => handleChange('tipoPagamento', e.target.value)}
            className={errors.tipoPagamento ? 'error' : ''}
          >
            <option value="">Selecione a opção</option>
            <option value="revenda_gsi">Revenda - Guindastes GSI</option>
            <option value="cnpj_cpf_gse">CNPJ/CPF - Guindastes GSE</option>
            <option value="parcelamento_interno">Parcelamento Interno - Revenda</option>
            <option value="parcelamento_cnpj">Parcelamento - CNPJ/CPF</option>
          </select>
          {errors.tipoPagamento && <span className="error-message">{errors.tipoPagamento}</span>}
        </div>

        <div className="form-group">
          <label>Prazo de Pagamento</label>
          <select
            value={formData.prazoPagamento}
            onChange={(e) => handleChange('prazoPagamento', e.target.value)}
            className={errors.prazoPagamento ? 'error' : ''}
          >
            <option value="">Selecione o prazo</option>
            {formData.tipoPagamento === 'revenda_gsi' && (
              <>
                <option value="a_vista">À Vista</option>
                <option value="30_dias">Até 30 dias (+3%)</option>
                <option value="60_dias">Até 60 dias (+1%)</option>
              </>
            )}
            {formData.tipoPagamento === 'cnpj_cpf_gse' && (
              <>
                <option value="a_vista">À Vista</option>
                <option value="30_dias">Até 30 dias (+3%)</option>
                <option value="60_dias">Até 60 dias (+1%)</option>
              </>
            )}
            {formData.tipoPagamento === 'parcelamento_interno' && (
              <>
                <option value="120_dias_interno">Até 120 dias (sem acréscimo)</option>
                <option value="mais_120_dias">Após 120 dias (+2% ao mês)</option>
              </>
            )}
            {formData.tipoPagamento === 'parcelamento_cnpj' && (
              <>
                <option value="90_dias_cnpj">Até 90 dias (sem acréscimo)</option>
                <option value="mais_90_dias">Após 90 dias (+2% ao mês)</option>
              </>
            )}
          </select>
          {errors.prazoPagamento && <span className="error-message">{errors.prazoPagamento}</span>}
        </div>

        <div className="form-group">
          <label>Local de Instalação *</label>
          <input
            type="text"
            value={formData.localInstalacao}
            onChange={(e) => handleChange('localInstalacao', e.target.value)}
            placeholder="Em qual mecanica o guindaste será instalado?"
            className={errors.localInstalacao ? 'error' : ''}
          />
          {errors.localInstalacao && <span className="error-message">{errors.localInstalacao}</span>}
        </div>

        <div className="form-group">
          <label>Tipo de Instalação *</label>
          <select
            value={formData.tipoInstalacao}
            onChange={(e) => handleChange('tipoInstalacao', e.target.value)}
            className={errors.tipoInstalacao ? 'error' : ''}
          >
            <option value="">Selecione o tipo de instalação</option>
            <option value="cliente">Por conta do cliente</option>
            <option value="fabrica">Por conta da fábrica</option>
          </select>
          {errors.tipoInstalacao && <span className="error-message">{errors.tipoInstalacao}</span>}
        </div>
      </div>

      <div className="calculo-final">
        <h3>Cálculo Final</h3>
        <div className="calculo-item">
          <span>Valor Total:</span>
          <span>R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
        {desconto > 0 && (
          <div className="calculo-item desconto">
            <span>Desconto ({desconto}%):</span>
            <span>- R$ {valorDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        {acrescimo > 0 && (
          <div className="calculo-item acrescimo">
            <span>Acréscimo ({acrescimo}%):</span>
            <span>+ R$ {valorAcrescimo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        <div className="calculo-item total">
          <span><strong>Valor Final:</strong></span>
          <span><strong>R$ {valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
        </div>
      </div>
    </div>
  );
};

// Componente Form do Cliente
const ClienteForm = ({ formData, setFormData, errors = {} }) => {
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="form-container">
      <div className="form-grid">
        <div className="form-group">
          <label>Nome Completo *</label>
          <input
            type="text"
            value={formData.nome || ''}
            onChange={(e) => handleChange('nome', e.target.value)}
            placeholder="Digite o nome completo"
            className={errors.nome ? 'error' : ''}
          />
          {errors.nome && <span className="error-message">{errors.nome}</span>}
        </div>
        
        <div className="form-group">
          <label>Telefone *</label>
          <input
            type="tel"
            value={formData.telefone || ''}
            onChange={(e) => handleChange('telefone', e.target.value)}
            placeholder="(00) 00000-0000"
            className={errors.telefone ? 'error' : ''}
          />
          {errors.telefone && <span className="error-message">{errors.telefone}</span>}
        </div>
        
        <div className="form-group">
          <label>Email *</label>
          <input
            type="email"
            value={formData.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="email@exemplo.com"
            className={errors.email ? 'error' : ''}
          />
          {errors.email && <span className="error-message">{errors.email}</span>}
        </div>
        
        <div className="form-group">
          <label>CPF/CNPJ *</label>
          <input
            type="text"
            value={formData.documento || ''}
            onChange={(e) => handleChange('documento', e.target.value)}
            placeholder="000.000.000-00"
            className={errors.documento ? 'error' : ''}
          />
          {errors.documento && <span className="error-message">{errors.documento}</span>}
        </div>

        <div className="form-group">
          <label>Inscrição Estadual *</label>
          <input
            type="text"
            value={formData.inscricao_estadual || ''}
            onChange={(e) => handleChange('inscricao_estadual', e.target.value)}
            placeholder="00000000000000"
            className={errors.inscricao_estadual ? 'error' : ''}
          />
          {errors.inscricao_estadual && <span className="error-message">{errors.inscricao_estadual}</span>}
        </div>
        
        <div className="form-group full-width">
          <label>Endereço *</label>
          <input
            type="text"
            value={formData.endereco || ''}
            onChange={(e) => handleChange('endereco', e.target.value)}
            placeholder="Rua, número, bairro, cidade"
            className={errors.endereco ? 'error' : ''}
          />
          {errors.endereco && <span className="error-message">{errors.endereco}</span>}
        </div>
        
        <div className="form-group">
          <label>Observações</label>
          <textarea
            value={formData.observacoes || ''}
            onChange={(e) => handleChange('observacoes', e.target.value)}
            placeholder="Informações adicionais..."
            rows="3"
          />
        </div>
      </div>
    </div>
  );
};

// Componente Form do Caminhão
const CaminhaoForm = ({ formData, setFormData, errors = {} }) => {
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="form-container">
      <div className="form-grid">
        <div className="form-group">
          <label>Tipo *</label>
          <select
            value={formData.tipo || ''}
            onChange={(e) => handleChange('tipo', e.target.value)}
            className={errors.tipo ? 'error' : ''}
          >
            <option value="">Selecione o tipo</option>
            <option value="Truck">Truck</option>
            <option value="Tractor CAVALINHO">Tractor CAVALINHO</option>
            <option value="3/4">3/4</option>
            <option value="Toco">Toco</option>
            <option value="Carreta">Carreta</option>
            <option value="Bitruck">Bitruck</option>
            <option value="Outro">Outro</option>
          </select>
          {errors.tipo && <span className="error-message">{errors.tipo}</span>}
        </div>
        
        <div className="form-group">
          <label>Marca *</label>
          <select
            value={formData.marca || ''}
            onChange={(e) => handleChange('marca', e.target.value)}
            className={errors.marca ? 'error' : ''}
          >
            <option value="">Selecione a marca</option>
            <option value="Mercedes-Benz">Mercedes-Benz</option>
            <option value="Volvo">Volvo</option>
            <option value="Scania">Scania</option>
            <option value="Iveco">Iveco</option>
            <option value="DAF">DAF</option>
            <option value="MAN">MAN</option>
            <option value="Ford">Ford</option>
            <option value="Chevrolet">Chevrolet</option>
            <option value="Volkswagen">Volkswagen</option>
            <option value="Outra">Outra</option>
          </select>
          {errors.marca && <span className="error-message">{errors.marca}</span>}
        </div>
        
        <div className="form-group">
          <label>Modelo *</label>
          <input
            type="text"
            value={formData.modelo || ''}
            onChange={(e) => handleChange('modelo', e.target.value)}
            placeholder="Ex: Actros, FH, R-Series"
            className={errors.modelo ? 'error' : ''}
          />
          {errors.modelo && <span className="error-message">{errors.modelo}</span>}
        </div>
        
        <div className="form-group">
          <label>Voltagem *</label>
          <select
            value={formData.voltagem || ''}
            onChange={(e) => handleChange('voltagem', e.target.value)}
            className={errors.voltagem ? 'error' : ''}
          >
            <option value="">Selecione a voltagem</option>
            <option value="12V">12V</option>
            <option value="24V">24V</option>
          </select>
          {errors.voltagem && <span className="error-message">{errors.voltagem}</span>}
        </div>
        
        <div className="form-group full-width">
          <label>Observações</label>
          <textarea
            value={formData.observacoes || ''}
            onChange={(e) => handleChange('observacoes', e.target.value)}
            placeholder="Informações adicionais sobre o caminhão..."
            rows="3"
          />
        </div>
      </div>
    </div>
  );
};

// Componente Resumo do Pedido
const ResumoPedido = ({ carrinho, clienteData, caminhaoData, pagamentoData, user }) => {
  const handlePDFGenerated = async (fileName) => {
    try {
      // Salvar relatório automaticamente no banco de dados
      await salvarRelatorio();
      alert(`PDF gerado com sucesso: ${fileName}\nRelatório salvo automaticamente!`);
    } catch (error) {
      console.error('Erro ao salvar relatório:', error);
      alert(`PDF gerado com sucesso: ${fileName}\nErro ao salvar relatório automaticamente.`);
    }
  };

  const salvarRelatorio = async () => {
    try {
      // 1. Criar cliente
      const cliente = await db.createCliente(clienteData);
      
      // 2. Criar caminhão
      const caminhao = await db.createCaminhao({
        ...caminhaoData,
        cliente_id: cliente.id
      });
      
      // 3. Gerar número do pedido
      const numeroPedido = `PED${Date.now()}`;
      
      // 4. Criar pedido
      const pedido = await db.createPedido({
        numero_pedido: numeroPedido,
        cliente_id: cliente.id,
        vendedor_id: user.id,
        caminhao_id: caminhao.id,
        status: 'proposta_gerada',
        valor_total: pagamentoData.valorFinal || carrinho.reduce((total, item) => total + item.preco, 0),
        observacoes: `Proposta gerada em ${new Date().toLocaleString('pt-BR')}. Local de instalação: ${pagamentoData.localInstalacao}. Tipo de instalação: ${pagamentoData.tipoInstalacao === 'cliente' ? 'Por conta do cliente' : 'Por conta da fábrica'}.`
      });
      
      // 5. Criar itens do pedido
      for (const item of carrinho) {
        let codigo_produto = null;
        if (item.tipo === 'equipamento') {
          // Pega todos opcionais selecionados
          const opcionaisSelecionados = carrinho
            .filter(i => i.tipo === 'opcional')
            .map(i => i.nome);
          codigo_produto = generateCodigoProduto(item.nome, opcionaisSelecionados);
        }
        await db.createPedidoItem({
          pedido_id: pedido.id,
          tipo: item.tipo,
          item_id: item.id,
          quantidade: 1,
          preco_unitario: item.preco,
          codigo_produto
        });
      }
      
      console.log('Relatório salvo com sucesso:', {
        pedidoId: pedido.id,
        numeroPedido,
        cliente: cliente.nome,
        vendedor: user.nome
      });
      
    } catch (error) {
      console.error('Erro ao salvar relatório:', error);
      throw error;
    }
  };

  const pedidoData = {
    carrinho,
    clienteData,
    caminhaoData,
    pagamentoData,
    vendedor: user?.nome || 'Não informado'
  };

  return (
    <div className="resumo-container">
      <div className="resumo-section">
        <h3>Itens Selecionados</h3>
        <div className="resumo-items">
          {carrinho.map((item, idx) => {
            let codigoProduto = null;
            if (item.tipo === 'equipamento') {
              const opcionaisSelecionados = carrinho.filter(i => i.tipo === 'opcional').map(i => i.nome);
              codigoProduto = generateCodigoProduto(item.nome, opcionaisSelecionados);
            }
            return (
              <div key={idx} className="resumo-item">
                <div className="item-info">
                  <div className="item-name">{item.nome}</div>
                  <div className="item-type">{item.tipo}</div>
                  {codigoProduto && (
                    <div className="item-codigo">Código: <b>{codigoProduto}</b></div>
                  )}
                </div>
                <div className="item-price">{formatCurrency(item.preco)}</div>
              </div>
            );
          })}
        </div>
        <div className="resumo-total">
          <span>Total: {formatCurrency(carrinho.reduce((total, item) => total + item.preco, 0))}</span>
        </div>
      </div>

      <div className="resumo-section">
        <h3>Dados do Cliente</h3>
        <div className="resumo-data">
          <div className="data-row">
            <span className="label">Nome:</span>
            <span className="value">{clienteData.nome || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Telefone:</span>
            <span className="value">{clienteData.telefone || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Email:</span>
            <span className="value">{clienteData.email || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">CPF/CNPJ:</span>
            <span className="value">{clienteData.documento || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Inscrição Estadual:</span>
            <span className="value">{clienteData.inscricao_estadual || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Endereço:</span>
            <span className="value">{clienteData.endereco || 'Não informado'}</span>
          </div>
          {clienteData.observacoes && (
            <div className="data-row">
              <span className="label">Observações:</span>
              <span className="value">{clienteData.observacoes}</span>
            </div>
          )}
        </div>
      </div>

      <div className="resumo-section">
        <h3>Estudo Veicular</h3>
        <div className="resumo-data">
          <div className="data-row">
            <span className="label">Tipo:</span>
            <span className="value">{caminhaoData.tipo || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Marca:</span>
            <span className="value">{caminhaoData.marca || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Modelo:</span>
            <span className="value">{caminhaoData.modelo || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Voltagem:</span>
            <span className="value">{caminhaoData.voltagem || 'Não informado'}</span>
          </div>
          {caminhaoData.observacoes && (
            <div className="data-row">
              <span className="label">Observações:</span>
              <span className="value">{caminhaoData.observacoes}</span>
            </div>
          )}
        </div>
      </div>

      <div className="resumo-section">
        <h3>Política de Pagamento</h3>
        <div className="resumo-data">
          <div className="data-row">
            <span className="label">Tipo de Pagamento:</span>
            <span className="value">
              {pagamentoData.tipoPagamento === 'revenda_gsi' && 'Revenda - Guindastes GSI'}
              {pagamentoData.tipoPagamento === 'cnpj_cpf_gse' && 'CNPJ/CPF - Guindastes GSE'}
              {pagamentoData.tipoPagamento === 'parcelamento_interno' && 'Parcelamento Interno - Revenda'}
              {pagamentoData.tipoPagamento === 'parcelamento_cnpj' && 'Parcelamento - CNPJ/CPF'}
              {!pagamentoData.tipoPagamento && 'Não informado'}
            </span>
          </div>
          <div className="data-row">
            <span className="label">Prazo de Pagamento:</span>
            <span className="value">
              {pagamentoData.prazoPagamento === 'a_vista' && 'À Vista'}
              {pagamentoData.prazoPagamento === '30_dias' && 'Até 30 dias (+3%)'}
              {pagamentoData.prazoPagamento === '60_dias' && 'Até 60 dias (+1%)'}
              {pagamentoData.prazoPagamento === '120_dias_interno' && 'Até 120 dias (sem acréscimo)'}
              {pagamentoData.prazoPagamento === '90_dias_cnpj' && 'Até 90 dias (sem acréscimo)'}
              {pagamentoData.prazoPagamento === 'mais_120_dias' && 'Após 120 dias (+2% ao mês)'}
              {pagamentoData.prazoPagamento === 'mais_90_dias' && 'Após 90 dias (+2% ao mês)'}
              {!pagamentoData.prazoPagamento && 'Não informado'}
            </span>
          </div>
          {pagamentoData.desconto > 0 && (
            <div className="data-row">
              <span className="label">Desconto:</span>
              <span className="value">{pagamentoData.desconto}%</span>
            </div>
          )}
          {pagamentoData.acrescimo > 0 && (
            <div className="data-row">
              <span className="label">Acréscimo:</span>
              <span className="value">{pagamentoData.acrescimo}%</span>
            </div>
          )}
          <div className="data-row">
            <span className="label">Valor Final:</span>
            <span className="value" style={{ fontWeight: 'bold', color: '#007bff' }}>
              {formatCurrency(pagamentoData.valorFinal || carrinho.reduce((total, item) => total + item.preco, 0))}
            </span>
          </div>
          <div className="data-row">
            <span className="label">Local de Instalação:</span>
            <span className="value">{pagamentoData.localInstalacao || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Tipo de Instalação:</span>
            <span className="value">
              {pagamentoData.tipoInstalacao === 'cliente' && 'Por conta do cliente'}
              {pagamentoData.tipoInstalacao === 'fabrica' && 'Por conta da fábrica'}
              {!pagamentoData.tipoInstalacao && 'Não informado'}
            </span>
          </div>
        </div>
      </div>

      <div className="resumo-section">
        <h3>Ações</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <PDFGenerator 
            pedidoData={pedidoData} 
            onGenerate={handlePDFGenerated}
          />
        </div>
      </div>
    </div>
  );
};

export default NovoPedido; 