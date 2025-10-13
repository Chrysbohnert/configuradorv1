import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import PDFGenerator from '../components/PDFGenerator';
import PaymentPolicy from '../features/payment/PaymentPolicy';

import { db } from '../config/supabase';
import { normalizarRegiao } from '../utils/regiaoHelper';
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
  const [clienteTemIE, setClienteTemIE] = useState(true);

  // Determinar IE: para vendedor do RS usa clienteTemIE; demais regiões mantém preço padrão
  const determinarClienteTemIE = () => {
    // Para RS: sempre usa o estado clienteTemIE quando estiver na etapa 2+
    if (currentStep >= 2 && user?.regiao === 'rio grande do sul') {
      return !!clienteTemIE;
    }
    return true;
  };

  // Função para recalcular preços quando o contexto muda
  const recalcularPrecosCarrinho = async () => {
    if (carrinho.length === 0 || !user?.regiao) {
      return;
    }

    const temIE = determinarClienteTemIE();
    const regiaoVendedor = normalizarRegiao(user.regiao, temIE);

    const carrinhoAtualizado = [];
    let precisaAtualizar = false;

    for (const item of carrinho) {
      if (item.tipo === 'guindaste') {
        try {
          const novoPreco = await db.getPrecoPorRegiao(item.id, regiaoVendedor);

          if (novoPreco !== item.preco) {
            precisaAtualizar = true;
          }

          carrinhoAtualizado.push({
            ...item,
            preco: novoPreco || item.preco || 0
          });
        } catch (error) {
          carrinhoAtualizado.push(item);
        }
      } else {
        carrinhoAtualizado.push(item);
      }
    }

    // Só atualiza se realmente houver mudança nos preços
    if (precisaAtualizar) {
      setCarrinho(carrinhoAtualizado);
      localStorage.setItem('carrinho', JSON.stringify(carrinhoAtualizado));
    }
  };

  // Recalcular preços quando contexto mudar (SEM monitorar carrinho para evitar loop)
  useEffect(() => {
    if (carrinho.length > 0 && user?.regiao) {
      recalcularPrecosCarrinho();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagamentoData.tipoPagamento, pagamentoData.participacaoRevenda, pagamentoData.revendaTemIE, clienteTemIE, currentStep]);

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [guindastes, setGuindastes] = useState([]);
  const [guindastesSelecionados, setGuindastesSelecionados] = useState([]);
  const [selectedCapacidade, setSelectedCapacidade] = useState(null);
  const [selectedModelo, setSelectedModelo] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // ← MOVIDO: Definir funções antes dos useEffects
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
    const processarGuindasteSelecionado = async () => {
      if (location.state?.guindasteSelecionado) {
        const guindaste = location.state.guindasteSelecionado;
        setGuindastesSelecionados([guindaste]);

        // Buscar preço inicial (será recalculado quando contexto for definido)
        let precoGuindaste = guindaste.preco || 0;
        if (!precoGuindaste && user?.regiao) {
          try {
            const regiaoInicial = user.regiao === 'rio grande do sul' ? 'rs-com-ie' : 'sul-sudeste';
            console.log(`🌍 Buscando preço inicial: ${regiaoInicial}`);
            precoGuindaste = await db.getPrecoPorRegiao(guindaste.id, regiaoInicial);
          } catch (error) {
            console.error('Erro ao buscar preço do guindaste:', error);
          }
        }

        // Adicionar ao carrinho se não estiver
        const produto = {
          id: guindaste.id,
          nome: guindaste.subgrupo,
          modelo: guindaste.modelo,
          codigo_produto: guindaste.codigo_referencia,
          grafico_carga_url: guindaste.grafico_carga_url,
          configuracao_lancas: guindaste.peso_kg,
          preco: precoGuindaste,
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
    };

    if (user) {
      processarGuindasteSelecionado();
    }
  }, [location.state, navigate, user]);


  // Efeito para resetar pagamento quando voltar para Step 1 OU quando equipamento mudar
  useEffect(() => {
    // Reseta se voltar para Step 1
    if (currentStep === 1 && pagamentoData.tipoPagamento) {
      console.log('🔄 Voltou para Step 1, resetando dados de pagamento');
      setPagamentoDataOriginal({
        tipoPagamento: '',
        prazoPagamento: '',
        desconto: 0,
        acrescimo: 0,
        valorFinal: 0,
        localInstalacao: '',
        tipoInstalacao: ''
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);


  const loadData = async () => {
    try {
      setIsLoading(true);

      // Carregar guindastes (versão leve)
      const { data } = await db.getGuindastesLite({ page: 1, pageSize: 100 });
      setGuindastes(data);

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

  // Capacidades hardcoded para carregamento instantâneo
  const getCapacidadesUnicas = () => {
    // Capacidades baseadas nos dados reais do sistema
    return ['6.5', '8.0', '10.8', '12.8', '13.0', '15.0', '15.8'];
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



  // Obter dados para a interface em cascata
  const capacidades = getCapacidadesUnicas();
  const modelosDisponiveis = selectedCapacidade ? getModelosPorCapacidade(selectedCapacidade) : [];
  const guindastesDisponiveis = selectedModelo ? getGuindastesPorModelo(selectedModelo) : [];

  // ← SIMPLIFICADO: Função básica para selecionar guindaste
  const handleSelecionarGuindaste = async (guindaste) => {
    console.log('🔄 Selecionando guindaste:', guindaste.id, guindaste.subgrupo);

    try {
      // Buscar preço inicial (será recalculado quando contexto for definido)
      const regiaoInicial = user?.regiao === 'rio grande do sul' ? 'rs-com-ie' : 'sul-sudeste';
      const precoGuindaste = await db.getPrecoPorRegiao(guindaste.id, regiaoInicial);

      console.log(`💰 Preço inicial: R$ ${precoGuindaste} (${regiaoInicial}) para ${guindaste.subgrupo}`);

      if (!precoGuindaste || precoGuindaste === 0) {
        alert('Este equipamento não possui preço definido para sua região.');
        return;
      }

      // Criar produto com preço correto
      const produto = {
        id: guindaste.id,
        nome: guindaste.subgrupo,
        modelo: guindaste.modelo,
        codigo_produto: guindaste.codigo_referencia,
        grafico_carga_url: guindaste.grafico_carga_url,
        configuracao_lancas: guindaste.peso_kg,
        preco: precoGuindaste,
        tipo: 'guindaste'
      };

      // Adicionar ao carrinho (isso substitui qualquer guindaste anterior)
      adicionarAoCarrinho(produto, 'guindaste');

      // Navegar para detalhes
      navigate('/detalhes-guindaste', {
        state: {
          guindaste: { ...guindaste, preco: precoGuindaste },
          returnTo: '/novo-pedido',
          step: 2
        }
      });
    } catch (error) {
      console.error('❌ Erro ao buscar preço:', error);
      alert('Erro ao buscar preço do equipamento.');
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

      // ← NOVO: Se removeu o equipamento atual, limpar rastreamento
      const removedItem = prev[index];
      if (removedItem && removedItem.tipo === 'guindaste') {
        console.log('🔄 Equipamento removido do carrinho:', removedItem.id);
      }

      return newCart;
    });
  };

  const limparCarrinho = () => {
    setCarrinho([]);
    localStorage.removeItem('carrinho');
    console.log('🔄 Carrinho limpo completamente');
  };



  const getTotalCarrinho = () => {
    const total = carrinho.reduce((acc, item) => {
      const preco = parseFloat(item.preco) || 0;
      return acc + preco;
    }, 0);
    return total;
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
                      className={`capacidade-card no-photo ${selectedCapacidade === capacidade ? 'selected' : ''}`}
                      onClick={() => handleSelecionarCapacidade(capacidade)}
                      data-capacidade={capacidade}
                    >
                      <div className="capacidade-icon">
                        <div className="capacidade-fallback" aria-hidden="true">🏗️</div>
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
            
            <PaymentPolicy
              key={`payment-${carrinho.find(item => item.tipo === 'guindaste')?.id || 'none'}`}
              precoBase={getTotalCarrinho()}
              onPaymentComputed={setPagamentoData}
              errors={validationErrors}
              user={user}
              clienteTemIE={clienteTemIE}
              onClienteIEChange={setClienteTemIE}
              carrinho={carrinho}
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
              guindastes={guindastes}
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
        // Local de instalação e tipo de instalação são obrigatórios apenas para cliente
        if (pagamentoData.tipoPagamento === 'cliente') {
          if (!pagamentoData.localInstalacao) {
            errors.localInstalacao = 'Informe o local de instalação';
          }
          if (!pagamentoData.tipoInstalacao) {
            errors.tipoInstalacao = 'Selecione o tipo de instalação';
          }
          // Participação de revenda é obrigatória para cliente
          if (!pagamentoData.participacaoRevenda) {
            errors.participacaoRevenda = 'Selecione se há participação de revenda';
          }
          // Se respondeu participação, IE é obrigatória
          if (pagamentoData.participacaoRevenda && !pagamentoData.revendaTemIE) {
            errors.revendaTemIE = 'Selecione se possui Inscrição Estadual';
          }
        }
        if (!pagamentoData.tipoFrete) {
          errors.tipoFrete = 'Selecione o tipo de frete';
        }
        break;
      case 3:
        if (!clienteData.nome) errors.nome = 'Nome é obrigatório';
        if (!clienteData.telefone) errors.telefone = 'Telefone é obrigatório';
        if (!clienteData.email) errors.email = 'Email é obrigatório';
        if (!clienteData.documento) errors.documento = 'CPF/CNPJ é obrigatório';
        // Inscrição Estadual só é obrigatória se não for marcado como "ISENTO"
        if (!clienteData.inscricao_estadual || (clienteData.inscricao_estadual !== 'ISENTO' && clienteData.inscricao_estadual.trim() === '')) {
          errors.inscricao_estadual = 'Inscrição Estadual é obrigatória';
        }
        if (!clienteData.endereco) errors.endereco = 'Endereço é obrigatório';
        break;
      case 4:
        if (!caminhaoData.tipo) errors.tipo = 'Tipo do veículo é obrigatório';
        if (!caminhaoData.marca) errors.marca = 'Marca é obrigatória';
        if (!caminhaoData.modelo) errors.modelo = 'Modelo é obrigatório';
        if (!caminhaoData.voltagem) errors.voltagem = 'Voltagem é obrigatória';
        // Ano é opcional; se informado, validar intervalo
        if (caminhaoData.ano && (parseInt(caminhaoData.ano) < 1960 || parseInt(caminhaoData.ano) > new Date().getFullYear())) {
          errors.ano = 'Ano inválido';
        }
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
        // Para revenda, apenas tipoPagamento, prazoPagamento e tipoFrete são obrigatórios
        if (pagamentoData.tipoPagamento === 'revenda') {
          return pagamentoData.tipoPagamento && 
                 pagamentoData.prazoPagamento && 
                 pagamentoData.tipoFrete;
        }
        // Para cliente, todos os campos são obrigatórios, incluindo participação e IE
        return pagamentoData.tipoPagamento && 
               pagamentoData.prazoPagamento && 
               pagamentoData.localInstalacao && 
               pagamentoData.tipoInstalacao &&
               pagamentoData.tipoFrete &&
               pagamentoData.participacaoRevenda &&
               pagamentoData.revendaTemIE;
      case 3:
        return clienteData.nome && 
               clienteData.telefone && 
               clienteData.email && 
               clienteData.documento && 
               clienteData.inscricao_estadual && // Pode ser "ISENTO" ou um número
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
      // O reset do pagamentoData é feito pelo useEffect que monitora currentStep
    }
  };



  const handleFinish = async () => {
    try {
      // Salvar relatório no banco de dados
      await salvarRelatorio();
      
      // Limpar carrinho e navegar para histórico
      limparCarrinho();
      navigate('/historico');
      
      alert('Pedido finalizado e salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao finalizar pedido:', error);
      alert('Erro ao salvar pedido. Tente novamente.');
    }
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
        extraButtons={[
          import.meta.env.DEV && (
            <>
              <button
                key="debug-prices"
                onClick={async () => {
                  console.log('🔍 === DEBUG COMPLETO DE PREÇOS ===');
                  console.log('👤 Usuário:', user?.nome, 'Região:', user?.regiao);

                  // Verificar preços de todas as regiões para os primeiros equipamentos
                  const regioesParaTestar = ['rs-com-ie', 'rs-sem-ie', 'sul-sudeste'];
                  const equipamentosParaTestar = guindastes.slice(0, 3);

                  for (const equipamento of equipamentosParaTestar) {
                    console.log(`\n🏗️ ${equipamento.subgrupo} (ID: ${equipamento.id}):`);

                    for (const regiao of regioesParaTestar) {
                      try {
                        const preco = await db.getPrecoPorRegiao(equipamento.id, regiao);
                        console.log(`  ${regiao}: R$ ${preco}`);
                      } catch (error) {
                        console.error(`  ❌ Erro em ${regiao}:`, error.message);
                      }
                    }
                  }

                  // Testar lógica atual
                  const temIE = determinarClienteTemIE();
                  const regiaoAtual = normalizarRegiao(user?.regiao || 'sul-sudeste', temIE);
                  console.log(`\n🎯 Lógica atual:`);
                  console.log(`  Cliente tem IE: ${temIE}`);
                  console.log(`  Região selecionada: ${regiaoAtual}`);
                  console.log(`  Carrinho atual:`, carrinho.map(i => ({ nome: i.nome, preco: i.preco })));
                }}
                style={{
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  marginRight: '5px'
                }}
                title="Debug completo de preços"
              >
                🔍 DEBUG PREÇOS
              </button>
              <button
                key="test-context"
                onClick={() => {
                  console.log('🧪 === TESTE DE CONTEXTO ===');
                  console.log('📊 Estado atual do pagamentoData:', pagamentoData);
                  console.log('🎯 Testando determinarClienteTemIE():', determinarClienteTemIE());

                  // Simular mudança de contexto
                  setPagamentoData({
                    ...pagamentoData,
                    tipoPagamento: 'cliente',
                    participacaoRevenda: 'sim',
                    revendaTemIE: 'nao'
                  });
                  console.log('✅ Simulado contexto: cliente + rodoviário');
                }}
                style={{
                  background: '#ffc107',
                  color: 'black',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                title="Testar mudança de contexto"
              >
                🧪 TESTE CONTEXTO
              </button>
            </>
          )
        ]}
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

// Função para extrair configurações do título do guindaste com ícones
const extrairConfiguracoes = (subgrupo) => {
  const configuracoes = [];
  
  // Extrair configurações do título (mais específico para evitar falsos positivos)
  if (subgrupo.includes(' CR') || subgrupo.includes('CR ') || subgrupo.includes('CR/')) {
    configuracoes.push({ icon: '🕹️', text: 'CR - Controle Remoto' });
  }
  if (subgrupo.includes(' EH') || subgrupo.includes('EH ') || subgrupo.includes('/EH')) {
    configuracoes.push({ icon: '⚙️', text: 'EH - Extensiva Hidráulica' });
  }
  if (subgrupo.includes(' ECL') || subgrupo.includes('ECL ') || subgrupo.includes('/ECL')) {
    configuracoes.push({ icon: '⊓', text: 'ECL - Extensiva Cilindro Lateral' });
  }
  if (subgrupo.includes(' ECS') || subgrupo.includes('ECS ') || subgrupo.includes('/ECS')) {
    configuracoes.push({ icon: '⊓', text: 'ECS - Extensiva Cilindro Superior' });
  }
  if (subgrupo.includes(' P') || subgrupo.includes('P ') || subgrupo.includes('/P')) {
    configuracoes.push({ icon: '🔨', text: 'P - Preparação p/ Perfuratriz' });
  }
  if (subgrupo.includes(' GR') || subgrupo.includes('GR ') || subgrupo.includes('/GR')) {
    configuracoes.push({ icon: '🦾', text: 'GR - Preparação p/ Garra e Rotator' });
  }
  if (subgrupo.includes('Caminhão 3/4')) {
    configuracoes.push({ icon: '🚛', text: 'Caminhão 3/4' });
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
          <h3>
            {guindaste.subgrupo}
            {configuracoes.length > 0 && (
              <span style={{ marginLeft: '10px', display: 'inline-flex', gap: '8px' }}>
                {configuracoes.map((config, idx) => (
                  <span 
                    key={idx} 
                    title={config.text}
                    style={{ 
                      fontSize: '24px',
                      filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
                    }}
                  >
                    {config.icon}
                  </span>
                ))}
              </span>
            )}
          </h3>
          <span className="categoria">{guindaste.Grupo}</span>
        </div>
        <div className="price">Código: {guindaste.codigo_referencia}</div>
      </div>
      
      <div className="card-body">
        <div className="specs">
          <div className="spec">
            <span className="spec-label">Configuração de Lanças:</span>
            <span className="spec-value">{guindaste.peso_kg || 'N/A'}</span>
          </div>
          <div className="spec">
            <span className="spec-label">Opcionais:</span>
            <span className="spec-value">
              {configuracoes.length > 0 ? (
                <div className="configuracoes-lista">
                  {configuracoes.map((config, idx) => (
                    <div key={idx} className="config-item">
                      <span className="config-icon" style={{ fontSize: '22px', marginRight: '8px' }}>
                        {config.icon}
                      </span>
                      <span>{config.text}</span>
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

// Componente Política de Pagamento foi movido para src/features/payment/PaymentPolicy.jsx

// Componente Form do Cliente
const ClienteForm = ({ formData, setFormData, errors = {} }) => {
  const onlyDigits = (value) => (value || '').replace(/\D/g, '');
  const maskCEP = (value) => {
    const digits = onlyDigits(value).slice(0, 8);
    if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return digits;
  };
  const maskPhone = (value) => {
    const digits = onlyDigits(value).slice(0, 11);
    const ddd = digits.slice(0, 2);
    const isMobile = digits.length > 10; // 11 dígitos
    const partA = isMobile ? digits.slice(2, 7) : digits.slice(2, 6);
    const partB = isMobile ? digits.slice(7, 11) : digits.slice(6, 10);
    let out = '';
    if (ddd) out += `(${ddd}`;
    if (ddd.length === 2) out += ') ';
    out += partA;
    if (partB) out += `-${partB}`;
    return out;
  };
  const composeEndereco = (data) => {
    const parts = [];
    if (data.logradouro) parts.push(data.logradouro);
    if (data.numero) parts.push(`, ${data.numero}`);
    if (data.bairro) parts.push(` - ${data.bairro}`);
    if (data.cidade || data.uf) parts.push(` - ${data.cidade || ''}${data.uf ? (data.cidade ? '/' : '') + data.uf : ''}`);
    if (data.cep) parts.push(` - CEP: ${data.cep}`);
    return parts.join('');
  };
  const [cidadesUF, setCidadesUF] = React.useState([]);
  const [loadingCidades, setLoadingCidades] = React.useState(false);
  const [manualEndereco, setManualEndereco] = React.useState(false);
  const [isentoIE, setIsentoIE] = React.useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => {
      let maskedValue = value;
      if (field === 'telefone') maskedValue = maskPhone(value);
      if (field === 'cep') maskedValue = maskCEP(value);
      const next = { ...prev, [field]: maskedValue };
      // Consistência: ao mudar UF/Cidade manualmente, limpar CEP; ao mudar UF, limpar Cidade
      if (field === 'uf') {
        next.cidade = '';
        if (!manualEndereco && next.cep) next.cep = '';
      }
      if (field === 'cidade') {
        if (!manualEndereco && next.cep) next.cep = '';
      }
      // Se o campo alterado é parte do endereço detalhado, atualizar 'endereco' composto
      if ([
        'logradouro', 'numero', 'bairro', 'cidade', 'uf', 'cep'
      ].includes(field)) {
        next.endereco = composeEndereco(next);
      }
      return next;
    });
  };

  React.useEffect(() => {
    if (manualEndereco) return; // não sobrescrever quando edição manual estiver ativa
    const raw = onlyDigits(formData.cep || '');
    if (raw.length !== 8) return;
    let cancelled = false;
    const fetchCEP = async () => {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
        const data = await response.json();
        if (cancelled || !data || data.erro) return;
        setFormData(prev => {
          const next = {
            ...prev,
            cep: maskCEP(raw),
            // CEP é a fonte da verdade para UF e Cidade
            uf: data.uf || '',
            cidade: data.localidade || '',
            // Logradouro e bairro: preencher apenas se ainda não informados
            logradouro: prev.logradouro || data.logradouro || '',
            bairro: prev.bairro || data.bairro || '',
          };
          next.endereco = composeEndereco(next);
          return next;
        });
      } catch (_) {
        // silencioso
      }
    };
    fetchCEP();
    return () => { cancelled = true; };
  }, [formData.cep, setFormData, manualEndereco]);

  // Carregar cidades quando UF mudar
  React.useEffect(() => {
    const uf = (formData.uf || '').trim();
    if (!uf) {
      setCidadesUF([]);
      return;
    }
    let cancelled = false;
    const loadCidades = async () => {
      try {
        setLoadingCidades(true);
        const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
        const arr = await res.json();
        if (cancelled || !Array.isArray(arr)) return;
        const nomes = arr.map(c => c.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        setCidadesUF(nomes);
      } catch (_) {
        setCidadesUF([]);
      } finally {
        if (!cancelled) setLoadingCidades(false);
      }
    };
    loadCidades();
    return () => { cancelled = true; };
  }, [formData.uf]);

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
          <label>Inscrição Estadual {!isentoIE && '*'}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <input
              type="checkbox"
              id="isentoIE"
              checked={isentoIE}
              onChange={(e) => {
                setIsentoIE(e.target.checked);
                if (e.target.checked) {
                  handleChange('inscricao_estadual', 'ISENTO');
                } else {
                  handleChange('inscricao_estadual', '');
                }
              }}
              style={{ width: 'auto', margin: '0' }}
            />
            <label htmlFor="isentoIE" style={{ margin: '0', fontWeight: 'normal' }}>
              Isento de Inscrição Estadual
            </label>
          </div>
          <input
            type="text"
            value={formData.inscricao_estadual || ''}
            onChange={(e) => handleChange('inscricao_estadual', e.target.value)}
            placeholder={isentoIE ? "ISENTO" : "00000000000000"}
            className={errors.inscricao_estadual ? 'error' : ''}
            disabled={isentoIE}
            style={isentoIE ? { backgroundColor: '#f0f0f0', cursor: 'not-allowed' } : {}}
          />
          {errors.inscricao_estadual && <span className="error-message">{errors.inscricao_estadual}</span>}
        </div>
        
        {/* Endereço - fluxo em cascata: CEP → UF → Cidade → Rua/Número/Bairro */}
        <div className="form-group full-width">
          <label>Endereço *</label>
          <div className="form-grid">
            <div className="form-group">
              <label>CEP</label>
              <input
                type="text"
                value={formData.cep || ''}
                onChange={(e) => handleChange('cep', e.target.value)}
                placeholder="00000-000"
              />
              {onlyDigits(formData.cep || '').length === 8 && !manualEndereco && (
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setManualEndereco(true)}
                  style={{ marginTop: '6px' }}
                >
                  Editar manualmente UF/Cidade
                </button>
              )}
              {onlyDigits(formData.cep || '').length === 8 && manualEndereco && (
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setManualEndereco(false)}
                  style={{ marginTop: '6px' }}
                >
                  Voltar ao modo CEP
                </button>
              )}
            </div>
            <div className="form-group">
              <label>UF</label>
              <select
                value={formData.uf || ''}
                onChange={(e) => handleChange('uf', e.target.value)}
                disabled={onlyDigits(formData.cep || '').length === 8 && !manualEndereco}
              >
                <option value="">Selecione UF</option>
                {['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Cidade</label>
              <select
                value={formData.cidade || ''}
                onChange={(e) => handleChange('cidade', e.target.value)}
                disabled={!formData.uf || loadingCidades || (onlyDigits(formData.cep || '').length === 8 && !manualEndereco)}
              >
                <option value="">{loadingCidades ? 'Carregando...' : (formData.uf ? 'Selecione a cidade' : 'Selecione UF primeiro')}</option>
                {cidadesUF.map((nome) => (
                  <option key={nome} value={nome}>{nome}</option>
                ))}
              </select>
            </div>
            {formData.uf && formData.cidade && (
              <>
                <div className="form-group">
                  <label>Rua/Avenida</label>
                  <input
                    type="text"
                    value={formData.logradouro || ''}
                    onChange={(e) => handleChange('logradouro', e.target.value)}
                    placeholder="Logradouro"
                  />
                </div>
                <div className="form-group">
                  <label>Número</label>
                  <input
                    type="text"
                    value={formData.numero || ''}
                    onChange={(e) => handleChange('numero', e.target.value)}
                    placeholder="Número"
                  />
                </div>
                <div className="form-group">
                  <label>Bairro</label>
                  <input
                    type="text"
                    value={formData.bairro || ''}
                    onChange={(e) => handleChange('bairro', e.target.value)}
                    placeholder="Bairro"
                  />
                </div>
              </>
            )}
          </div>
          {/* Campo composto (somente leitura) */}
          <input
            type="text"
            value={formData.endereco || ''}
            readOnly
            placeholder="Endereço completo (gerado automaticamente)"
            className={errors.endereco ? 'error' : ''}
            style={{ marginTop: '8px' }}
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
  const years = (() => {
    const current = new Date().getFullYear();
    const start = 1960;
    const list = [];
    for (let y = current; y >= start; y--) list.push(y);
    return list;
  })();

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
          <label>Ano</label>
          <select
            value={formData.ano || ''}
            onChange={(e) => handleChange('ano', e.target.value)}
          >
            <option value="">Selecione o ano</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
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
        {errors.ano && (
          <div className="form-group full-width">
            <span className="error-message">{errors.ano}</span>
          </div>
        )}
        
        <div className="form-group full-width">
          <label>Observações</label>
          <textarea
            value={formData.observacoes || ''}
            onChange={(e) => handleChange('observacoes', e.target.value)}
            placeholder="Informações adicionais sobre o caminhão..."
            rows="3"
          />
        </div>

        {/* Seção de Estudo Veicular com Imagem e Medidas */}
        <div className="form-group full-width" style={{ marginTop: '30px' }}>
          <h3 style={{ color: '#495057', fontSize: '20px', marginBottom: '15px', borderBottom: '2px solid #dee2e6', paddingBottom: '10px' }}>
            Estudo Veicular - Medidas
          </h3>
          
          <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Imagem do Estudo Veicular */}
            <div style={{ flex: '1', minWidth: '300px', textAlign: 'center' }}>
              <img 
                src="/estudoveicular.png" 
                alt="Estudo Veicular" 
                style={{ 
                  width: '100%', 
                  maxWidth: '500px', 
                  height: 'auto', 
                  border: '2px solid #dee2e6',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div style={{ display: 'none', padding: '20px', background: '#f8f9fa', border: '2px dashed #dee2e6', borderRadius: '8px' }}>
                <p style={{ color: '#6c757d', margin: '0' }}>Imagem não disponível</p>
              </div>
            </div>

            {/* Campos de Medidas */}
            <div style={{ flex: '1', minWidth: '300px' }}>
              <p style={{ marginBottom: '15px', color: '#6c757d', fontSize: '14px' }}>
                Preencha as medidas conforme indicado na imagem, Caminhão 1 Guindaste GSI Interno, caminhão 2 GUindaste GSE Externo:
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Medida A (cm)</label>
                  <input
                    type="text"
                    value={formData.medidaA || ''}
                    onChange={(e) => handleChange('medidaA', e.target.value)}
                    placeholder="Ex: 70"
                  />
                </div>
                
                <div className="form-group">
                  <label>Medida B (cm)</label>
                  <input
                    type="text"
                    value={formData.medidaB || ''}
                    onChange={(e) => handleChange('medidaB', e.target.value)}
                    placeholder="Ex: 63"
                  />
                </div>
                
                <div className="form-group">
                  <label>Medida C (cm)</label>
                  <input
                    type="text"
                    value={formData.medidaC || ''}
                    onChange={(e) => handleChange('medidaC', e.target.value)}
                    placeholder="Ex: 35"
                  />
                </div>
                
                <div className="form-group">
                  <label>Medida D (cm)</label>
                  <input
                    type="text"
                    value={formData.medidaD || ''}
                    onChange={(e) => handleChange('medidaD', e.target.value)}
                    placeholder="Ex: 40"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente Resumo do Pedido
const ResumoPedido = ({ carrinho, clienteData, caminhaoData, pagamentoData, user, guindastes }) => {
  const [pedidoSalvoId, setPedidoSalvoId] = React.useState(null);

  const handlePDFGenerated = async (fileName) => {
    try {
      // Critérios mínimos para salvar automaticamente sem interromper a experiência
      const camposClienteOK = Boolean(clienteData?.nome && clienteData?.telefone && clienteData?.email && clienteData?.documento && clienteData?.inscricao_estadual && clienteData?.endereco);
      const camposCaminhaoOK = Boolean(caminhaoData?.tipo && caminhaoData?.marca && caminhaoData?.modelo && caminhaoData?.voltagem);
      const usuarioOK = Boolean(user?.id);

      if (camposClienteOK && camposCaminhaoOK && usuarioOK) {
        // Salvar relatório automaticamente no banco de dados (apenas uma vez)
        if (!pedidoSalvoId) {
          const pedido = await salvarRelatorio();
          setPedidoSalvoId(pedido?.id || null);
        }
        alert(`PDF gerado com sucesso: ${fileName}\nRelatório salvo automaticamente!`);
      } else {
        alert(`PDF gerado com sucesso: ${fileName}\nObservação: Relatório não foi salvo automaticamente porque ainda faltam dados obrigatórios (Cliente e/ou Caminhão). Ao clicar em Finalizar, ele será salvo.`);
      }
    } catch (error) {
      console.error('Erro ao salvar relatório:', error);
      const msg = (error && error.message) ? `\nMotivo: ${error.message}` : '';
      alert(`PDF gerado com sucesso: ${fileName}\nErro ao salvar relatório automaticamente.${msg}`);
    }
  };

  const salvarRelatorio = async () => {
    try {
      console.log('🔄 Iniciando salvamento do relatório...');
      console.log('📋 Dados do cliente:', clienteData);
      console.log('🚛 Dados do caminhão:', caminhaoData);
      console.log('💳 Dados de pagamento:', pagamentoData);
      console.log('🛒 Carrinho:', carrinho);
      console.log('👤 Usuário:', user);
      
      // 1. Criar cliente
      console.log('1️⃣ Criando cliente...');
      
      // Montar endereço completo a partir dos campos separados
      const enderecoCompleto = (() => {
        const c = clienteData;
        const ruaNumero = [c.logradouro || '', c.numero ? `, ${c.numero}` : ''].join('');
        const bairro = c.bairro ? ` - ${c.bairro}` : '';
        const cidadeUf = (c.cidade || c.uf) ? ` - ${(c.cidade || '')}${c.uf ? `${c.cidade ? '/' : ''}${c.uf}` : ''}` : '';
        const cep = c.cep ? ` - CEP: ${c.cep}` : '';
        return `${ruaNumero}${bairro}${cidadeUf}${cep}`.trim() || c.endereco || 'Não informado';
      })();
      
      // Filtrar apenas campos que existem na tabela clientes
      const clienteDataToSave = {
        nome: clienteData.nome,
        telefone: clienteData.telefone,
        email: clienteData.email,
        documento: clienteData.documento,
        inscricao_estadual: clienteData.inscricao_estadual || clienteData.inscricaoEstadual,
        endereco: enderecoCompleto,
        observacoes: clienteData.observacoes || null
      };
      
      console.log('📋 Dados do cliente para salvar:', clienteDataToSave);
      const cliente = await db.createCliente(clienteDataToSave);
      console.log('✅ Cliente criado:', cliente);
      
      // 2. Criar caminhão
      console.log('2️⃣ Criando caminhão...');
      
      // Verificar se todos os campos obrigatórios estão preenchidos
      const camposObrigatorios = ['tipo', 'marca', 'modelo', 'voltagem'];
      const camposFaltando = camposObrigatorios.filter(campo => !caminhaoData[campo]);
      
      if (camposFaltando.length > 0) {
        throw new Error(`Campos obrigatórios do caminhão não preenchidos: ${camposFaltando.join(', ')}`);
      }
      
      // Remover campos que não existem na tabela caminhoes
      const { medidaA, medidaB, medidaC, medidaD, ...caminhaoDataLimpo } = caminhaoData;
      
      const caminhaoDataToSave = {
        ...caminhaoDataLimpo,
        cliente_id: cliente.id,
        // Garantir que campos opcionais tenham valores padrão
        observacoes: caminhaoDataLimpo.observacoes || null,
        // Campo placa é obrigatório no banco mas não usado no formulário
        placa: 'N/A'
      };
      
      console.log('📋 Dados do caminhão para salvar:', caminhaoDataToSave);
      
      const caminhao = await db.createCaminhao(caminhaoDataToSave);
      console.log('✅ Caminhão criado:', caminhao);
      
      // 3. Gerar número do pedido
      const numeroPedido = `PED${Date.now()}`;
      console.log('3️⃣ Número do pedido gerado:', numeroPedido);
      
      // 4. Criar pedido
      console.log('4️⃣ Criando pedido...');
      const pedidoDataToSave = {
        numero_pedido: numeroPedido,
        cliente_id: cliente.id,
        vendedor_id: user.id,
        caminhao_id: caminhao.id,
        status: 'em_andamento', // Status válido confirmado no banco
        valor_total: pagamentoData.valorFinal || carrinho.reduce((total, item) => total + item.preco, 0),
        observacoes: `Proposta gerada em ${new Date().toLocaleString('pt-BR')}. Local de instalação: ${pagamentoData.localInstalacao}. Tipo de instalação: ${pagamentoData.tipoInstalacao === 'cliente' ? 'Por conta do cliente' : 'Por conta da fábrica'}.`
      };
      console.log('📋 Dados do pedido para salvar:', pedidoDataToSave);
      
      const pedido = await db.createPedido(pedidoDataToSave);
      console.log('✅ Pedido criado:', pedido);
      
      // 5. Criar itens do pedido
      console.log('5️⃣ Criando itens do pedido...');
      for (const item of carrinho) {
        console.log(`   Processando item: ${item.nome} (${item.tipo})`);
        let codigo_produto = null;
        if (item.tipo === 'equipamento') {
          // Pega todos opcionais selecionados
          const opcionaisSelecionados = carrinho
            .filter(i => i.tipo === 'opcional')
            .map(i => i.nome);
          codigo_produto = generateCodigoProduto(item.nome, opcionaisSelecionados);
        }
        
        // Construir dados do item
        // Não incluir item_id se for UUID (string) - apenas se for número
        const itemDataToSave = {
          pedido_id: pedido.id,
          tipo: item.tipo,
          quantidade: 1,
          preco_unitario: item.preco,
          codigo_produto
        };
        
        // Adicionar item_id apenas se for número inteiro
        if (item.id && typeof item.id === 'number') {
          itemDataToSave.item_id = item.id;
        } else if (item.id && typeof item.id === 'string') {
          const parsedId = parseInt(item.id);
          if (!isNaN(parsedId)) {
            itemDataToSave.item_id = parsedId;
          }
        }
        
        console.log(`   📋 Dados do item para salvar:`, itemDataToSave);
        
        try {
          await db.createPedidoItem(itemDataToSave);
        } catch (itemError) {
          console.error(`   ❌ Erro ao criar item ${item.nome}:`, itemError);
          throw itemError;
        }
      }
      
      console.log('🎉 Relatório salvo com sucesso:', {
        pedidoId: pedido.id,
        numeroPedido,
        cliente: cliente.nome,
        vendedor: user.nome
      });
      return pedido;
    } catch (error) {
      console.error('❌ Erro ao salvar relatório:', error);
      console.error('📋 Detalhes do erro:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack
      });
      console.error('🔍 Erro completo:', JSON.stringify(error, null, 2));
      throw error;
    }
  };

  // Buscar dados completos dos guindastes do carrinho
  const guindastesCompletos = carrinho
    .filter(item => item.tipo === 'guindaste')
    .map(item => {
      // Buscar guindaste completo da lista carregada
      const guindasteCompleto = guindastes.find(g => g.id === item.id);
      return {
        nome: item.nome,
        modelo: item.modelo || guindasteCompleto?.modelo,
        codigo_produto: item.codigo_produto,
        descricao: guindasteCompleto?.descricao || '',
        nao_incluido: guindasteCompleto?.nao_incluido || ''
      };
    });

  const pedidoData = {
    carrinho,
    clienteData,
    caminhaoData,
    pagamentoData,
    vendedor: user?.nome || 'Não informado',
    guindastes: guindastesCompletos
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
                  {item.configuracao_lancas && item.tipo === 'guindaste' && (
                    <div className="item-configuracao">Configuração de Lanças: <b>{item.configuracao_lancas}</b></div>
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
          {clienteData.bairro && (
            <div className="data-row">
              <span className="label">Bairro:</span>
              <span className="value">{clienteData.bairro}</span>
            </div>
          )}
          {(clienteData.cidade || clienteData.uf || clienteData.cep) && (
            <div className="data-row">
              <span className="label">Cidade/UF/CEP:</span>
              <span className="value">{`${clienteData.cidade || '—'}/${clienteData.uf || '—'}${clienteData.cep ? ' - ' + clienteData.cep : ''}`}</span>
            </div>
          )}
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
          
          {/* Mostrar medidas do estudo veicular se alguma foi preenchida */}
          {(caminhaoData.medidaA || caminhaoData.medidaB || caminhaoData.medidaC || caminhaoData.medidaD) && (
            <>
              <div className="data-row" style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #dee2e6' }}>
                <span className="label" style={{ fontWeight: 'bold' }}>Medidas do Veículo:</span>
                <span className="value"></span>
              </div>
              {caminhaoData.medidaA && (
                <div className="data-row">
                  <span className="label">Medida A:</span>
                  <span className="value">{caminhaoData.medidaA} mm</span>
                </div>
              )}
              {caminhaoData.medidaB && (
                <div className="data-row">
                  <span className="label">Medida B:</span>
                  <span className="value">{caminhaoData.medidaB} mm</span>
                </div>
              )}
              {caminhaoData.medidaC && (
                <div className="data-row">
                  <span className="label">Medida C:</span>
                  <span className="value">{caminhaoData.medidaC} mm</span>
                </div>
              )}
              {caminhaoData.medidaD && (
                <div className="data-row">
                  <span className="label">Medida D:</span>
                  <span className="value">{caminhaoData.medidaD} mm</span>
                </div>
              )}
            </>
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
          {/* Mostrar campos adicionais para cliente */}
          {pagamentoData.tipoCliente === 'cliente' && pagamentoData.percentualEntrada > 0 && (
            <>
              <div className="data-row" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #dee2e6' }}>
                <span className="label">Entrada Total ({pagamentoData.percentualEntrada}%):</span>
                <span className="value" style={{ fontWeight: 'bold' }}>
                  {formatCurrency(pagamentoData.entradaTotal || 0)}
                </span>
              </div>
              {pagamentoData.valorSinal > 0 && (
                <>
                  <div className="data-row" style={{ fontSize: '0.95em', color: '#28a745' }}>
                    <span className="label">↳ Sinal (já pago):</span>
                    <span className="value">- {formatCurrency(pagamentoData.valorSinal)}</span>
                  </div>
                  <div className="data-row" style={{ fontSize: '0.95em' }}>
                    <span className="label">↳ Falta pagar de entrada:</span>
                    <span className="value" style={{ fontWeight: 'bold' }}>
                      {formatCurrency(pagamentoData.faltaEntrada || 0)}
                    </span>
                  </div>
                  
                  {/* Exibir forma de pagamento da entrada se preenchida */}
                  {pagamentoData.formaEntrada && (
                    <div className="data-row" style={{ fontSize: '0.9em', marginLeft: '10px', marginTop: '5px', fontStyle: 'italic', color: '#555' }}>
                      <span className="label">Forma de pagamento:</span>
                      <span className="value">{pagamentoData.formaEntrada}</span>
                    </div>
                  )}
                </>
              )}
              <div className="data-row" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '2px solid #007bff' }}>
                <span className="label" style={{ fontWeight: 'bold', fontSize: '1.1em' }}>Saldo a Pagar (após entrada):</span>
                <span className="value" style={{ fontWeight: 'bold', color: '#007bff', fontSize: '1.1em' }}>
                  {formatCurrency(pagamentoData.saldoAPagar || pagamentoData.valorFinal || 0)}
                </span>
              </div>
            </>
          )}
          {/* Campos de Instalação apenas para cliente */}
          {pagamentoData.tipoCliente === 'cliente' && (
            <>
              <div className="data-row">
                <span className="label">Pagamento Instalação por Conta de:</span>
                <span className="value">
                  {pagamentoData.pagamentoInstalacaoPorConta === 'cliente' && 'Cliente'}
                  {pagamentoData.pagamentoInstalacaoPorConta === 'fabrica' && 'Fábrica'}
                  {!pagamentoData.pagamentoInstalacaoPorConta && 'Não informado'}
                </span>
              </div>
              <div className="data-row">
                <span className="label">Local de Instalação:</span>
                <span className="value">{pagamentoData.localInstalacao || 'Não informado'}</span>
              </div>
              
              {/* Informações sobre Participação de Revenda */}
              {pagamentoData.participacaoRevenda && (
                <>
                  <div className="data-row" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #dee2e6' }}>
                    <span className="label">Participação de Revenda:</span>
                    <span className="value" style={{ fontWeight: 'bold', color: pagamentoData.participacaoRevenda === 'sim' ? '#28a745' : '#dc3545' }}>
                      {pagamentoData.participacaoRevenda === 'sim' ? 'Sim' : 'Não'}
                    </span>
                  </div>
                  
                  {pagamentoData.participacaoRevenda === 'sim' && pagamentoData.revendaTemIE && (
                    <>
                      <div className="data-row" style={{ fontSize: '0.95em', marginLeft: '10px' }}>
                        <span className="label">↳ Revenda possui IE:</span>
                        <span className="value" style={{ color: pagamentoData.revendaTemIE === 'sim' ? '#007bff' : '#ffc107' }}>
                          {pagamentoData.revendaTemIE === 'sim' ? 'Sim (Com IE)' : 'Não (Sem IE)'}
                        </span>
                      </div>
                      
                      {pagamentoData.revendaTemIE === 'sim' && pagamentoData.descontoRevendaIE > 0 && (
                        <div className="data-row" style={{ fontSize: '0.95em', marginLeft: '20px', color: '#28a745' }}>
                          <span className="label">↳ Desconto do Vendedor:</span>
                          <span className="value" style={{ fontWeight: 'bold' }}>
                            {pagamentoData.descontoRevendaIE}%
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
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