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
        
        if (precoGuindaste) {
          const produto = {
            id: guindaste.id,
            nome: guindaste.subgrupo,
            modelo: guindaste.modelo,
            codigo_produto: guindaste.codigo_referencia,
            grafico_carga_url: guindaste.grafico_carga_url,
            preco: precoGuindaste,
            tipo: 'guindaste'
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
      console.log('🔍 DEBUG COMPLETO - Busca de Preço:');
      console.log('  📦 Guindaste:', {
        id: guindaste.id,
        nome: guindaste.subgrupo,
        codigo: guindaste.codigo_referencia
      });
      console.log('  👤 Usuário:', {
        nome: user?.nome,
        regiao_original: user?.regiao,
        email: user?.email
      });
      console.log('  📋 Cliente tem IE:', clienteTemIE);
      
      let precoGuindaste = 0;
      try {
        const regiaoNormalizada = normalizarRegiao(user?.regiao, clienteTemIE);
        console.log('  🌎 Região normalizada:', regiaoNormalizada);
        console.log('  🔎 Buscando preço em precos_guindaste_regiao...');
        
        precoGuindaste = await db.getPrecoPorRegiao(guindaste.id, regiaoNormalizada);
        
        console.log('  💰 Preço retornado do banco:', precoGuindaste);
        
        if (!precoGuindaste || precoGuindaste === 0) {
          console.error('  ❌ PREÇO NÃO ENCONTRADO!');
          console.log('  ℹ️ Verifique se existe registro em precos_guindaste_regiao para:');
          console.log(`     - guindaste_id = ${guindaste.id}`);
          console.log(`     - regiao = '${regiaoNormalizada}'`);
          alert('Atenção: Este guindaste não possui preço definido para a sua região.');
        } else {
          console.log('  ✅ Preço encontrado com sucesso!');
        }
      } catch (error) {
        console.error('  ❌ ERRO ao buscar preço:', error);
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
        tipo: 'guindaste'
      };
      
      console.log('  📦 Produto adicionado ao carrinho:', produto);
      addToCart(produto);
      
      // Navegar para detalhes
      setTimeout(() => {
        navigate('/detalhes-guindaste', { 
          state: { 
            guindaste: { ...guindaste, preco: precoGuindaste },
            returnTo: '/novo-pedido',
            step: 2
          } 
        });
      }, 800);
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

export default NovoPedido;
