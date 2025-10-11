// ⚡ IMPORTANTE: Campos medidaA, medidaB, medidaC, medidaD removidos - não existem no banco
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import PaymentPolicy from '../features/payment/PaymentPolicy';
import { normalizarRegiao } from '../utils/regiaoHelper';
import { db } from '../config/supabase';
import { useCarrinho } from '../hooks/useCarrinho';
import { usePagamento } from '../hooks/usePagamento';
import { useGuindastes } from '../hooks/useGuindastes';

// Componentes extraídos
import Step1GuindasteSelector from '../components/NovoPedido/Step1GuindasteSelector';
import ClienteFormDetalhado from '../components/NovoPedido/ClienteFormDetalhado';
import CaminhaoFormDetalhado from '../components/NovoPedido/CaminhaoFormDetalhado';
import ResumoPedido from '../components/NovoPedido/ResumoPedido';

import '../styles/NovoPedido.css';

const NovoPedido = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  
  // Estados locais
  const [clienteData, setClienteData] = useState({});
  const [caminhaoData, setCaminhaoData] = useState({});
  const [clienteTemIE, setClienteTemIE] = useState(true);
  const [user, setUser] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const salvarRelatorioRef = React.useRef(null);
  
  // Hooks customizados
  const {
    carrinho,
    addItem: addToCart,
    removeItem: removeFromCart,
    updateAllPrices,
    clearCart,
    getTotal: getTotalCarrinho,
    getTotalGuindastes,
  } = useCarrinho();
  
  const {
    guindastes,
    guindastesSelecionados,
    selectedCapacidade,
    selectedModelo,
    isLoading,
    handleSelecionarCapacidade,
    handleSelecionarModelo,
    handleSelecionarGuindaste: handleSelecionarGuindasteHook,
    setGuindastesSelecionados,
    capacidades,
    modelosDisponiveis,
    guindastesDisponiveis
  } = useGuindastes(user);
  
  const totalBase = getTotalCarrinho();
  const quantidadeGuindastes = getTotalGuindastes();
  const {
    pagamento: pagamentoData,
    setPagamento: setPagamentoData,
  } = usePagamento(totalBase, quantidadeGuindastes);

  // Carregar usuário
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/');
    }
  }, [navigate]);

  // Processar guindaste selecionado vindo de outra página
  useEffect(() => {
    const processarGuindasteSelecionado = async () => {
      if (location.state?.guindasteSelecionado) {
        const guindaste = location.state.guindasteSelecionado;
        setGuindastesSelecionados([guindaste]);
        
        // Buscar preço
        let precoGuindaste = guindaste.preco || 0;
        if (!precoGuindaste && user?.regiao) {
          try {
            const regiaoNormalizada = normalizarRegiao(user.regiao, clienteTemIE);
            precoGuindaste = await db.getPrecoPorRegiao(guindaste.id, regiaoNormalizada);
          } catch (error) {
            console.error('Erro ao buscar preço:', error);
          }
        }
        
        // Adicionar ao carrinho com FINAME e NCM
        if (precoGuindaste) {
          const produto = {
            id: guindaste.id,
            nome: guindaste.subgrupo,
            modelo: guindaste.modelo,
            codigo_produto: guindaste.codigo_referencia,
            grafico_carga_url: guindaste.grafico_carga_url,
            preco: precoGuindaste,
            tipo: 'guindaste',
            finame: guindaste.finame || '',
            ncm: guindaste.ncm || ''
          };
          addToCart(produto);
        }
        
        // Navegar para step indicado
        if (location.state.step) {
          setCurrentStep(location.state.step);
        }
      }
    };
    
    if (user) {
      processarGuindasteSelecionado();
    }
  }, [location.state, user, clienteTemIE]);

  // Atualizar preços quando clienteTemIE ou user mudar
  useEffect(() => {
    if (user && carrinho.length > 0) {
      console.log('🛒 Carrinho atual:', carrinho);
      console.log('💰 Total atual:', getTotalCarrinho());
      
      const atualizarPrecos = async () => {
        const updates = [];
        
        for (const item of carrinho) {
          if (item.tipo === 'guindaste') {
            try {
              const regiaoNormalizada = normalizarRegiao(user.regiao, clienteTemIE);
              const novoPreco = await db.getPrecoPorRegiao(item.id, regiaoNormalizada);
              
              console.log(`📊 Preço para ${item.nome}:`, {
                precoAtual: item.preco,
                novoPreco,
                regiao: regiaoNormalizada
              });
              
              if (novoPreco && novoPreco !== item.preco) {
                updates.push({ id: item.id, preco: novoPreco, tipo: 'guindaste' });
              }
            } catch (error) {
              console.error('Erro ao atualizar preço:', error);
            }
          }
        }
        
        if (updates.length > 0) {
          console.log('🔄 Atualizando preços:', updates);
          updateAllPrices(updates);
        }
      };
      
      atualizarPrecos();
    }
  }, [clienteTemIE, user]); // Removido carrinho, getTotalCarrinho e updateAllPrices para evitar loop

  // Steps configuration
  const steps = [
    { id: 1, title: 'Selecionar Guindaste', icon: '🏗️', description: 'Escolha o guindaste ideal' },
    { id: 2, title: 'Pagamento', icon: '💳', description: 'Política de pagamento' },
    { id: 3, title: 'Dados do Cliente', icon: '👤', description: 'Informações do cliente' },
    { id: 4, title: 'Estudo Veicular', icon: '🚛', description: 'Configuração do veículo' },
    { id: 5, title: 'Finalizar', icon: '✅', description: 'Revisar e confirmar' }
  ];

  // Handlers para seleção de guindaste (com efeitos visuais)
  const handleSelecionarCapacidadeLocal = (capacidade) => {
    handleSelecionarCapacidade(capacidade);
    
    const card = document.querySelector(`[data-capacidade="${capacidade}"]`);
    if (card) {
      card.classList.add('pulse-effect');
      setTimeout(() => card.classList.remove('pulse-effect'), 600);
    }
    
    setTimeout(() => {
      const modeloSection = document.querySelector('.cascata-step:nth-of-type(2)');
      if (modeloSection) {
        modeloSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  };

  const handleSelecionarModeloLocal = (modelo) => {
    handleSelecionarModelo(modelo);
    
    const card = document.querySelector(`[data-modelo="${modelo}"]`);
    if (card) {
      card.classList.add('pulse-effect');
      setTimeout(() => card.classList.remove('pulse-effect'), 600);
    }
    
    setTimeout(() => {
      const guindasteSection = document.querySelector('.cascata-step:nth-of-type(3)');
      if (guindasteSection) {
        guindasteSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  };

  const handleSelecionarGuindaste = async (guindaste) => {
    const jaSelecionado = guindastesSelecionados.find(g => g.id === guindaste.id);
    
    if (jaSelecionado) {
      setGuindastesSelecionados(prev => prev.filter(g => g.id !== guindaste.id));
      removeFromCart(guindaste.id, 'guindaste');
    } else {
      let precoGuindaste = 0;
      try {
        const regiaoNormalizada = normalizarRegiao(user?.regiao, clienteTemIE);
        precoGuindaste = await db.getPrecoPorRegiao(guindaste.id, regiaoNormalizada);
        
        if (!precoGuindaste || precoGuindaste === 0) {
          alert('Atenção: Este guindaste não possui preço definido para a sua região.');
        }
      } catch (error) {
        console.error('Erro ao buscar preço:', error);
        alert('Erro ao buscar preço. Verifique com o administrador.');
      }
      
      setGuindastesSelecionados(prev => [...prev, guindaste]);
      
      const produto = {
        id: guindaste.id,
        nome: guindaste.subgrupo,
        modelo: guindaste.modelo,
        codigo_produto: guindaste.codigo_referencia,
        grafico_carga_url: guindaste.grafico_carga_url,
        preco: precoGuindaste,
        tipo: 'guindaste',
        finame: guindaste.finame || '',
        ncm: guindaste.ncm || ''
      };
      
      addToCart(produto);
      
      console.log('✅ Guindaste adicionado ao carrinho:', produto.nome);
      
      // Navegar para a página de detalhes do guindaste
      navigate(`/detalhes-guindaste/${guindaste.id}`, {
        state: { 
          from: '/novo-pedido',
          guindaste: guindaste,
          precoGuindaste: precoGuindaste
        }
      });
    }
  };

  // Validação de steps
  const validateStep = (step) => {
    const errors = {};
    
    switch (step) {
      case 1:
        if (guindastesSelecionados.length === 0) {
          errors.guindaste = 'Selecione pelo menos um guindaste';
        }
        break;
      case 2:
        if (!pagamentoData.tipoPagamento) errors.tipoPagamento = 'Selecione o tipo de pagamento';
        if (!pagamentoData.prazoPagamento) errors.prazoPagamento = 'Selecione o prazo de pagamento';
        if (!pagamentoData.tipoFrete) errors.tipoFrete = 'Selecione o tipo de frete';
        
        if (pagamentoData.tipoPagamento === 'cliente') {
          if (!pagamentoData.localInstalacao) errors.localInstalacao = 'Informe o local de instalação';
          if (!pagamentoData.tipoInstalacao) errors.tipoInstalacao = 'Selecione o tipo de instalação';
          if (!pagamentoData.participacaoRevenda) errors.participacaoRevenda = 'Selecione se há participação de revenda';
          if (pagamentoData.participacaoRevenda && !pagamentoData.revendaTemIE) {
            errors.revendaTemIE = 'Selecione se possui Inscrição Estadual';
          }
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
        if (pagamentoData.tipoPagamento === 'revenda') {
          return pagamentoData.tipoPagamento && pagamentoData.prazoPagamento && pagamentoData.tipoFrete;
        }
        return pagamentoData.tipoPagamento && 
               pagamentoData.prazoPagamento && 
               pagamentoData.localInstalacao && 
               pagamentoData.tipoInstalacao &&
               pagamentoData.tipoFrete &&
               pagamentoData.participacaoRevenda &&
               pagamentoData.revendaTemIE;
      case 3:
        return clienteData.nome && clienteData.telefone && clienteData.email && 
               clienteData.documento && clienteData.inscricao_estadual && clienteData.endereco;
      case 4:
        return caminhaoData.tipo && caminhaoData.marca && caminhaoData.modelo && caminhaoData.voltagem;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep) && currentStep < 5) {
      setCurrentStep(currentStep + 1);
      setValidationErrors({});
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    alert('Pedido finalizado! Revise o resumo e gere o PDF.');
    // Lógica de salvamento está no ResumoPedido
  };

  // Renderizar conteúdo do step atual
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1GuindasteSelector
            capacidades={capacidades}
            selectedCapacidade={selectedCapacidade}
            selectedModelo={selectedModelo}
            modelosDisponiveis={modelosDisponiveis}
            guindastesDisponiveis={guindastesDisponiveis}
            guindastesSelecionados={guindastesSelecionados}
            onSelecionarCapacidade={handleSelecionarCapacidadeLocal}
            onSelecionarModelo={handleSelecionarModeloLocal}
            onSelecionarGuindaste={handleSelecionarGuindaste}
            validationErrors={validationErrors}
          />
        );
      
      case 2:
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>Política de Pagamento</h2>
              <p>Selecione a forma de pagamento e visualize os descontos</p>
            </div>
            <PaymentPolicy 
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
            <ClienteFormDetalhado 
              formData={clienteData} 
              setFormData={setClienteData} 
              errors={validationErrors} 
            />
          </div>
        );
      
      case 4:
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>Estudo Veicular</h2>
              <p>Informações do veículo para o serviço</p>
            </div>
            <CaminhaoFormDetalhado 
              formData={caminhaoData} 
              setFormData={setCaminhaoData} 
              errors={validationErrors} 
            />
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
              onSalvarRelatorioRef={salvarRelatorioRef}
            />
          </div>
        );
      
      default:
        return null;
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

          {/* Navigation Buttons */}
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
                  <label>Medida A (mm)</label>
                  <input
                    type="text"
                    value={formData.medidaA || ''}
                    onChange={(e) => handleChange('medidaA', e.target.value)}
                    placeholder="Ex: 150"
                  />
                </div>
                
                <div className="form-group">
                  <label>Medida B (mm)</label>
                  <input
                    type="text"
                    value={formData.medidaB || ''}
                    onChange={(e) => handleChange('medidaB', e.target.value)}
                    placeholder="Ex: 200"
                  />
                </div>
                
                <div className="form-group">
                  <label>Medida C (mm)</label>
                  <input
                    type="text"
                    value={formData.medidaC || ''}
                    onChange={(e) => handleChange('medidaC', e.target.value)}
                    placeholder="Ex: 350"
                  />
                </div>
                
                <div className="form-group">
                  <label>Medida D (mm)</label>
                  <input
                    type="text"
                    value={formData.medidaD || ''}
                    onChange={(e) => handleChange('medidaD', e.target.value)}
                    placeholder="Ex: 400"
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

export default NovoPedido;

