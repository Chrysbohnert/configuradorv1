import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import GuindasteLoading from '../components/GuindasteLoading';
import PDFGenerator from '../components/PDFGenerator';
import { db } from '../config/supabase';
import { formatCurrency } from '../utils/formatters';
import '../styles/NovoPedido.css';

const NovoPedido = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [carrinho, setCarrinho] = useState(() => {
    const savedCart = localStorage.getItem('carrinho');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [clienteData, setClienteData] = useState({});
  const [caminhaoData, setCaminhaoData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [guindastes, setGuindastes] = useState([]);
  const [opcionais, setOpcionais] = useState([]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/');
      return;
    }
    
    loadData();
  }, [navigate]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Carregar guindastes e opcionais do Supabase
      const [guindastesData, opcionaisData] = await Promise.all([
        db.getGuindastes(),
        db.getOpcionais()
      ]);
      
      setGuindastes(guindastesData);
      setOpcionais(opcionaisData);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados. Verifique a conexão com o banco.');
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { id: 1, title: 'Selecionar Guindaste', icon: '🏗️', description: 'Escolha o guindaste ideal' },
    { id: 2, title: 'Opcionais', icon: '⚙️', description: 'Adicione equipamentos extras' },
    { id: 3, title: 'Dados do Cliente', icon: '👤', description: 'Informações do cliente' },
    { id: 4, title: 'Caminhão', icon: '🚛', description: 'Configuração do veículo' },
    { id: 5, title: 'Finalizar', icon: '✅', description: 'Revisar e confirmar' }
  ];

  // Categorias de guindastes simplificadas
  const categories = [
    { id: 'todos', name: 'Todos' },
    { id: 'interno', name: 'Internos' },
    { id: 'externo', name: 'Externos' }
  ];

  // Funções do Carrinho
  const adicionarAoCarrinho = (item, tipo) => {
    const itemComTipo = { ...item, tipo };
    setCarrinho(prev => {
      const newCart = [...prev, itemComTipo];
      localStorage.setItem('carrinho', JSON.stringify(newCart));
      return newCart;
    });
  };

  const removerDoCarrinho = (item) => {
    setCarrinho(prev => {
      const newCart = prev.filter((carrinhoItem, index) => {
        return !(carrinhoItem.id === item.id && carrinhoItem.tipo === item.tipo);
      });
      localStorage.setItem('carrinho', JSON.stringify(newCart));
      return newCart;
    });
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

  const isInCart = (item, tipo) => {
    return carrinho.some(carrinhoItem => 
      carrinhoItem.id === item.id && carrinhoItem.tipo === tipo
    );
  };

  const getTotalCarrinho = () => {
    return carrinho.reduce((total, item) => total + item.preco, 0);
  };

  // Filtros
  const filteredGuindastes = guindastes.filter(guindaste => {
    const matchesSearch = guindaste.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         guindaste.modelo.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesCategory = true;
    if (selectedCategory !== 'todos') {
      matchesCategory = guindaste.tipo === selectedCategory;
    }
    return matchesSearch && matchesCategory;
  });

  const filteredOpcionais = opcionais.filter(opcional =>
    opcional.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Renderizar conteúdo do step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>Selecione o Guindaste Ideal</h2>
              <p>Escolha o equipamento que melhor atende às suas necessidades</p>
            </div>

            {/* Filtros */}
            <div className="filters-section">
              <div className="search-box">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
                <input
                  type="text"
                  placeholder="Buscar guindaste..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="category-filters">
                {categories.map(category => (
                  <button
                    key={category.id}
                    className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid de Guindastes */}
            <div className="guindastes-grid">
              {filteredGuindastes.map((guindaste) => (
                <GuindasteCard
                  key={guindaste.id}
                  guindaste={guindaste}
                  isInCart={isInCart(guindaste, 'guindaste')}
                  onAddToCart={() => adicionarAoCarrinho(guindaste, 'guindaste')}
                  onRemoveFromCart={() => removerDoCarrinho({...guindaste, tipo: 'guindaste'})}
                />
              ))}
            </div>

            {filteredGuindastes.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon"></div>
                <h3>Nenhum guindaste encontrado</h3>
                <p>Tente ajustar os filtros ou buscar por outro termo</p>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>Opcionais Disponíveis</h2>
              <p>Adicione equipamentos extras para otimizar o serviço</p>
            </div>

            <div className="search-box">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <input
                type="text"
                placeholder="Buscar opcionais..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="opcionais-grid">
              {filteredOpcionais.map((opcional) => (
                <OpcionalCard
                  key={opcional.id}
                  opcional={opcional}
                  isSelected={isInCart(opcional, 'opcional')}
                  onToggle={() => {
                    if (isInCart(opcional, 'opcional')) {
                      removerDoCarrinho({...opcional, tipo: 'opcional'});
                    } else {
                      adicionarAoCarrinho(opcional, 'opcional');
                    }
                  }}
                />
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>Dados do Cliente</h2>
              <p>Preencha as informações do cliente</p>
            </div>
            <ClienteForm formData={clienteData} setFormData={setClienteData} />
          </div>
        );

      case 4:
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>Configuração do Caminhão</h2>
              <p>Informações do veículo para o serviço</p>
            </div>
            <CaminhaoForm formData={caminhaoData} setFormData={setCaminhaoData} />
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
              onRemoverItem={removerItemPorIndex}
              onLimparCarrinho={limparCarrinho}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return carrinho.some(item => item.tipo === 'guindaste');
      case 2:
        return true; // Opcionais são opcionais
      case 3:
        return clienteData.nome && clienteData.telefone;
      case 4:
        return caminhaoData.placa && caminhaoData.modelo;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canGoNext() && currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    // Aqui você implementaria a lógica para finalizar o pedido
    alert('Pedido finalizado com sucesso!');
    navigate('/historico');
  };

  if (isLoading) {
    return <GuindasteLoading text="Carregando..." />;
  }

  if (!user) {
    return <GuindasteLoading text="Verificando usuário..." />;
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
          {steps.map((step, index) => (
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

          {/* Sidebar */}
          <div className="sidebar">
            <div className="cart-summary">
              <h3>Resumo do Pedido</h3>
              <div className="cart-items">
                {carrinho.map((item, index) => (
                  <div key={index} className="cart-item">
                    <div className="item-info">
                      <div className="item-name">{item.nome}</div>
                      <div className="item-type">{item.tipo}</div>
                    </div>
                    <div className="item-price">{formatCurrency(item.preco)}</div>
                    <button
                      onClick={() => removerItemPorIndex(index)}
                      className="remove-item"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              
              {carrinho.length > 0 && (
                <div className="cart-total">
                  <div className="total-label">Total</div>
                  <div className="total-value">{formatCurrency(getTotalCarrinho())}</div>
                </div>
              )}

              {carrinho.length === 0 && (
                <div className="empty-cart">
                  <div className="empty-icon">🛒</div>
                  <p>Carrinho vazio</p>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="step-navigation">
              {currentStep > 1 && (
                <button onClick={handlePrevious} className="nav-btn prev">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                  </svg>
                  Anterior
                </button>
              )}
              
              {currentStep < 5 ? (
                <button 
                  onClick={handleNext} 
                  className={`nav-btn next ${!canGoNext() ? 'disabled' : ''}`}
                  disabled={!canGoNext()}
                >
                  Próximo
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
                  </svg>
                </button>
              ) : (
                <button 
                  onClick={handleFinish} 
                  className="nav-btn finish"
                >
                  Finalizar Pedido
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente Card do Guindaste
const GuindasteCard = ({ guindaste, isInCart, onAddToCart, onRemoveFromCart }) => {
  const defaultImage = '/header-bg.jpg';
  return (
    <div className={`guindaste-card ${isInCart ? 'selected' : ''}`}>
      <div className="card-header">
        <div className="guindaste-image" style={{ width: '40%', height: '170px', marginBottom: 8 }}>
          <img
            src={guindaste.imagem_url || defaultImage}
            alt={guindaste.nome}
            className="guindaste-thumbnail"
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }}
            onError={e => { e.target.src = defaultImage; }}
          />
        </div>
        <div className="guindaste-icon"></div>
        <div className="guindaste-info">
          <h3>{guindaste.nome}</h3>
          <p className="modelo">{guindaste.modelo}</p>
          <span className="categoria">{guindaste.categoria}</span>
        </div>
        <div className="price">{formatCurrency(guindaste.preco)}</div>
      </div>
      
      <div className="card-body">
        <div className="specs">
          <div className="spec">
            <span className="spec-label">Capacidade:</span>
            <span className="spec-value">{guindaste.capacidade}</span>
          </div>
          <div className="spec">
            <span className="spec-label">Alcance:</span>
            <span className="spec-value">{guindaste.alcance}</span>
          </div>
          <div className="spec">
            <span className="spec-label">Altura:</span>
            <span className="spec-value">{guindaste.altura}</span>
          </div>
        </div>
        
        <div className="card-actions">
          {isInCart ? (
            <button onClick={onRemoveFromCart} className="btn-remove">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
              Remover
            </button>
          ) : (
            <button onClick={onAddToCart} className="btn-add">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Adicionar
            </button>
          )}
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

// Componente Form do Cliente
const ClienteForm = ({ formData, setFormData }) => {
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
          />
        </div>
        
        <div className="form-group">
          <label>Telefone *</label>
          <input
            type="tel"
            value={formData.telefone || ''}
            onChange={(e) => handleChange('telefone', e.target.value)}
            placeholder="(00) 00000-0000"
          />
        </div>
        
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={formData.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="email@exemplo.com"
          />
        </div>
        
        <div className="form-group">
          <label>CPF/CNPJ</label>
          <input
            type="text"
            value={formData.documento || ''}
            onChange={(e) => handleChange('documento', e.target.value)}
            placeholder="000.000.000-00"
          />
        </div>
        
        <div className="form-group full-width">
          <label>Endereço</label>
          <input
            type="text"
            value={formData.endereco || ''}
            onChange={(e) => handleChange('endereco', e.target.value)}
            placeholder="Rua, número, bairro, cidade"
          />
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
const CaminhaoForm = ({ formData, setFormData }) => {
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="form-container">
      <div className="form-grid">
        <div className="form-group">
          <label>Placa *</label>
          <input
            type="text"
            value={formData.placa || ''}
            onChange={(e) => handleChange('placa', e.target.value.toUpperCase())}
            placeholder="ABC-1234"
          />
        </div>
        
        <div className="form-group">
          <label>Modelo *</label>
          <input
            type="text"
            value={formData.modelo || ''}
            onChange={(e) => handleChange('modelo', e.target.value)}
            placeholder="Ex: Mercedes-Benz"
          />
        </div>
        
        <div className="form-group">
          <label>Ano</label>
          <input
            type="number"
            value={formData.ano || ''}
            onChange={(e) => handleChange('ano', e.target.value)}
            placeholder="2020"
          />
        </div>
        
        <div className="form-group">
          <label>Cor</label>
          <input
            type="text"
            value={formData.cor || ''}
            onChange={(e) => handleChange('cor', e.target.value)}
            placeholder="Branco"
          />
        </div>
        
        <div className="form-group full-width">
          <label>Observações do Veículo</label>
          <textarea
            value={formData.observacoes || ''}
            onChange={(e) => handleChange('observacoes', e.target.value)}
            placeholder="Condições especiais, restrições..."
            rows="3"
          />
        </div>
      </div>
    </div>
  );
};

// Componente Resumo do Pedido
const ResumoPedido = ({ carrinho, clienteData, caminhaoData, onRemoverItem, onLimparCarrinho }) => {
  const handlePDFGenerated = (fileName) => {
    alert(`PDF gerado com sucesso: ${fileName}`);
  };

  const pedidoData = {
    carrinho,
    clienteData,
    caminhaoData
  };

  return (
    <div className="resumo-container">
      <div className="resumo-section">
        <h3>Itens Selecionados</h3>
        <div className="resumo-items">
          {carrinho.map((item, index) => (
            <div key={index} className="resumo-item">
              <div className="item-info">
                <div className="item-name">{item.nome}</div>
                <div className="item-type">{item.tipo}</div>
              </div>
              <div className="item-price">{formatCurrency(item.preco)}</div>
            </div>
          ))}
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
        </div>
      </div>

      <div className="resumo-section">
        <h3>Dados do Caminhão</h3>
        <div className="resumo-data">
          <div className="data-row">
            <span className="label">Placa:</span>
            <span className="value">{caminhaoData.placa || 'Não informado'}</span>
          </div>
          <div className="data-row">
            <span className="label">Modelo:</span>
            <span className="value">{caminhaoData.modelo || 'Não informado'}</span>
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
          <button 
            onClick={() => {
              const message = encodeURIComponent(`Olá! Gostaria de discutir a proposta de guindaste. Total: ${formatCurrency(carrinho.reduce((total, item) => total + item.preco, 0))}`);
              window.open(`https://wa.me/55981721286?text=${message}`, '_blank');
            }}
            style={{
              background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px' }}>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
            </svg>
            Enviar WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};

export default NovoPedido; 