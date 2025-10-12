import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/DetalhesGuindaste.css';
import UnifiedHeader from '../components/UnifiedHeader';

const DetalhesGuindaste = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { guindaste } = location.state || {};
  
  const [selectedImage, setSelectedImage] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [user, setUser] = useState(null);

  // Verificar usuário logado
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      console.log('✅ Usuário autenticado em DetalhesGuindaste');
      setUser(JSON.parse(userData));
    } else {
      console.error('❌ Nenhum usuário encontrado, redirecionando para login');
      navigate('/');
    }
  }, [navigate]);

  // Verificar se tem dados do guindaste
  useEffect(() => {
    if (!guindaste) {
      console.warn('⚠️ Nenhum guindaste selecionado, redirecionando...');
      navigate('/novo-pedido', { replace: true });
    }
  }, [guindaste, navigate]);

  if (!guindaste) {
    return null;
  }

  const handleContinuar = () => {
    navigate('/novo-pedido', { 
      state: { 
        step: 2,
        guindasteSelecionado: guindaste 
      } 
    });
  };

  const handleVoltar = () => {
    const returnTo = location.state?.returnTo || '/novo-pedido';
    const step = location.state?.step || 1;
    
    navigate(returnTo, { 
      state: { 
        step: step,
        guindasteSelecionado: guindaste 
      } 
    });
  };

  const openImageModal = (index) => {
    setSelectedImage(index);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
  };

  const nextImage = () => {
    const totalImages = [guindaste.imagem_url, ...(guindaste.imagens_adicionais || [])].filter(Boolean).length;
    setSelectedImage((prev) => (prev + 1) % totalImages);
  };

  const prevImage = () => {
    const totalImages = [guindaste.imagem_url, ...(guindaste.imagens_adicionais || [])].filter(Boolean).length;
    setSelectedImage((prev) => (prev - 1 + totalImages) % totalImages);
  };

  const allImages = [guindaste.imagem_url, ...(guindaste.imagens_adicionais || [])].filter(Boolean);

  return (
    <div className="detalhes-guindaste-container">
      <UnifiedHeader 
        showBackButton={true}
        onBackClick={handleVoltar}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title="Detalhes do Equipamento"
        subtitle={guindaste?.subgrupo}
      />
      <div className="detalhes-content">
        {/* Header substituído por UnifiedHeader */}

        {/* Informações do Guindaste */}
        <div className="guindaste-info-section">
          <h2>{guindaste.subgrupo}</h2>
          <div className="guindaste-meta">
            <span className="modelo">Modelo: {guindaste.modelo}</span>
            <span className="peso">Configuração de Lanças: {guindaste.peso_kg || 'N/A'}</span>
            <span className="configuracao">{guindaste.configuração}</span>
          </div>
        </div>

        {/* O que NÃO está incluído */}
        {guindaste.nao_incluido && (
          <div className="nao-incluido-section">
            <div className="nao-incluido-content">
              <span className="nao-incluido-icon">⚠️</span>
              <p><strong>Não está incluído:</strong> {guindaste.nao_incluido}</p>
            </div>
          </div>
        )}

        {/* Foto Principal */}
        <div className="foto-principal-section">
          <h3>Foto Principal</h3>
          <div className="foto-principal">
            {guindaste.imagem_url ? (
              <img
                src={guindaste.imagem_url}
                alt={guindaste.subgrupo}
                onClick={() => openImageModal(0)}
                className="foto-principal-img"
              />
            ) : (
              <div className="sem-foto">
                <span>📷</span>
                <p>Nenhuma foto disponível</p>
              </div>
            )}
          </div>
        </div>

        {/* Galeria de Fotos Adicionais */}
        {guindaste.imagens_adicionais && guindaste.imagens_adicionais.length > 0 && (
          <div className="galeria-section">
            <h3>Galeria de Fotos</h3>
            <div className="galeria-grid">
              {guindaste.imagens_adicionais.map((imagem, index) => (
                <div key={index} className="galeria-item">
                  <img
                    src={imagem}
                    alt={`${guindaste.subgrupo} - Foto ${index + 2}`}
                    onClick={() => openImageModal(index + 1)}
                    className="galeria-img"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Descrição Técnica */}
        <div className="descricao-section">
          <h3>Descrição Técnica</h3>
          <div className="descricao-content">
            {guindaste.descricao ? (
              <p>{guindaste.descricao}</p>
            ) : (
              <p className="sem-descricao">
                <span>📝</span>
                Nenhuma descrição técnica cadastrada para este equipamento.
              </p>
            )}
          </div>
        </div>

        {/* Botão Continuar */}
        <div className="acoes-section">
          <button onClick={handleContinuar} className="continuar-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
            </svg>
            Continuar para Política de Pagamento
          </button>
        </div>
      </div>

      {/* Modal de Imagem */}
      {showImageModal && (
        <div className="image-modal-overlay" onClick={closeImageModal}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button onClick={closeImageModal} className="close-modal-btn">×</button>
            
            <div className="modal-image-container">
              <button onClick={prevImage} className="nav-btn prev-btn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
              </button>
              
              <img
                src={allImages[selectedImage]}
                alt={`${guindaste.subgrupo} - Foto ${selectedImage + 1}`}
                className="modal-image"
              />
              
              <button onClick={nextImage} className="nav-btn next-btn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                </svg>
              </button>
            </div>
            
            <div className="modal-indicators">
              {allImages.map((_, index) => (
                <span
                  key={index}
                  className={`indicator ${index === selectedImage ? 'active' : ''}`}
                  onClick={() => setSelectedImage(index)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetalhesGuindaste;
