import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../../styles/DetalhesGuindaste.css';
import UnifiedHeader from '../../components/UnifiedHeader';
import { db } from '../../config/supabase';
import { formatCurrency } from '../../utils/formatters';
import { normalizarRegiao } from '../../utils/regiaoHelper';
import { useGuindasteConfigurador } from '../../hooks/useGuindasteConfigurador';
import { getOpcionalImagesFromVariant } from '../../config/opcionalImages';

const DetalhesGuindaste = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};

  // Modo legado: recebeu guindaste já configurado
  const legacyGuindaste = state.guindaste || null;

  // Novo modo: modelo base + variantes para configurar
  const { baseModel, variants, regiaoClienteSelecionada, returnTo, step, isModoConcessionaria } = state;

  const [user, setUser] = useState(null);
  const [detalhesCompletos, setDetalhesCompletos] = useState(null);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);

  const isLegacyMode = !!legacyGuindaste;
  const hasModelData = !!baseModel && Array.isArray(variants) && variants.length > 0;

  // Verificar usuário logado
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      console.error('❌ Nenhum usuário encontrado, redirecionando para login');
      navigate('/');
    }
  }, [navigate]);

  // Verificar se tem dados do guindaste
  useEffect(() => {
    if (!isLegacyMode && !hasModelData) {
      console.warn('⚠️ Nenhum guindaste selecionado, redirecionando...');
      navigate(state?.returnTo || '/novo-pedido', { replace: true });
    }
  }, [isLegacyMode, hasModelData, navigate, state?.returnTo]);

  const fetchPreco = async (guindasteId) => {
    if (!guindasteId || !regiaoClienteSelecionada) return 0;
    try {
      if (isModoConcessionaria) {
        return await db.getPrecoCompraPorRegiao(guindasteId, regiaoClienteSelecionada);
      }
      const regiaoNorm = normalizarRegiao(regiaoClienteSelecionada);
      if (regiaoNorm === 'comercio-exterior') {
        return await db.getPrecoPorRegiao(guindasteId, 'comercio-exterior');
      }
      return await db.getPrecoPorRegiao(guindasteId, regiaoNorm);
    } catch (error) {
      console.error('[DetalhesGuindaste] Erro ao buscar preço:', error);
      return 0;
    }
  };

  const fetchImagem = async (guindasteId) => {
    if (!guindasteId) return null;
    try {
      return await db.getGuindasteImagem(guindasteId);
    } catch (error) {
      console.error('[DetalhesGuindaste] Erro ao buscar imagem:', error);
      return null;
    }
  };

  const handleConfirmarConfiguracao = (guindasteConfigurado) => {
    const destino = returnTo || '/novo-pedido';
    const guindasteFinal = {
      ...(detalhesCompletos || guindasteConfigurado),
      preco: guindasteConfigurado.preco,
    };
    navigate(destino, {
      state: {
        step: step || 2,
        guindasteSelecionado: guindasteFinal,
        regiaoClienteSelecionada,
      },
    });
  };

  const {
    SERIE_LABELS,
    sortedVariants,
    selectedGuindaste,
    selectedGroup,
    precoExibido,
    loadingPreco,
    previewImageUrl,
    handleVariantSelect,
    variantLabel,
    isValidImageUrl,
  } = useGuindasteConfigurador({
    guindastes: variants || [],
    getPreco: fetchPreco,
    getImagem: fetchImagem,
    precoContextKey: regiaoClienteSelecionada || '',
    initialBaseModel: baseModel || null,
    onConfirm: handleConfirmarConfiguracao,
  });

  // Carregar detalhes completos quando a variante selecionada mudar
  useEffect(() => {
    if (isLegacyMode) {
      setDetalhesCompletos(legacyGuindaste);
      return;
    }
    if (!selectedGuindaste?.id) {
      setDetalhesCompletos(null);
      return;
    }
    let cancelled = false;
    const carregar = async () => {
      setLoadingDetalhes(true);
      try {
        const completo = await db.getGuindasteCompleto(selectedGuindaste.id);
        if (!cancelled) setDetalhesCompletos(completo);
      } catch (error) {
        console.error('[DetalhesGuindaste] Erro ao carregar detalhes completos:', error);
        if (!cancelled) setDetalhesCompletos(null);
      } finally {
        if (!cancelled) setLoadingDetalhes(false);
      }
    };
    carregar();
    return () => { cancelled = true; };
  }, [selectedGuindaste?.id, isLegacyMode, legacyGuindaste]);

  const guindaste = useMemo(() => {
    if (isLegacyMode) return legacyGuindaste;
    return detalhesCompletos || selectedGuindaste || null;
  }, [isLegacyMode, legacyGuindaste, detalhesCompletos, selectedGuindaste]);

  const tituloPagina = guindaste?.subgrupo || baseModel || 'Detalhes do Equipamento';
  const imagensAdicionais = Array.isArray(guindaste?.imagens_adicionais)
    ? guindaste.imagens_adicionais
    : typeof guindaste?.imagens_adicionais === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(guindaste.imagens_adicionais || '[]');
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : [];

  const allImages = [guindaste?.imagem_url, ...imagensAdicionais].filter(Boolean);

  const openImageModal = (index) => {
    setSelectedImage(index);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
  };

  const nextImage = () => {
    const totalImages = allImages.length;
    if (!totalImages) return;
    setSelectedImage((prev) => (prev + 1) % totalImages);
  };

  const prevImage = () => {
    const totalImages = allImages.length;
    if (!totalImages) return;
    setSelectedImage((prev) => (prev - 1 + totalImages) % totalImages);
  };

  const handleVoltar = () => {
    const destino = returnTo || '/novo-pedido';
    navigate(destino, {
      state: {
        step: 1,
        guindasteSelecionado: isLegacyMode ? legacyGuindaste : null,
        regiaoClienteSelecionada,
      },
    });
  };

  const precoValido = precoExibido != null && precoExibido > 0;
  const podeConfirmar = isLegacyMode
    ? true
    : !!selectedGuindaste?.id && !loadingPreco && !loadingDetalhes && precoValido && !!detalhesCompletos;

  const imagemPrincipal = isValidImageUrl(previewImageUrl) ? previewImageUrl : guindaste?.imagem_url;

  const renderFotoDestaque = () => (
    <div className="foto-destaque">
      {isValidImageUrl(imagemPrincipal) ? (
        <img
          src={imagemPrincipal}
          alt={guindaste?.subgrupo || baseModel}
          onClick={() => openImageModal(0)}
        />
      ) : (
        <div className="sem-foto">
          <span role="img" aria-label="sem foto">📷</span>
          <p>Nenhuma foto disponível</p>
        </div>
      )}
    </div>
  );

  const renderGaleriaMiniaturas = () => {
    if (!imagensAdicionais.length) return null;
    return (
      <div className="galeria-miniaturas">
        {isValidImageUrl(guindaste?.imagem_url) && (
          <button
            type="button"
            className={`galeria-miniatura ${selectedImage === 0 ? 'active' : ''}`}
            onClick={() => openImageModal(0)}
          >
            <img src={guindaste.imagem_url} alt="Foto principal" />
          </button>
        )}
        {imagensAdicionais.map((imagem, index) => (
          <button
            key={index}
            type="button"
            className={`galeria-miniatura ${selectedImage === index + 1 ? 'active' : ''}`}
            onClick={() => openImageModal(index + 1)}
          >
            <img src={imagem} alt={`Foto adicional ${index + 2}`} />
          </button>
        ))}
      </div>
    );
  };

  const renderOpcionaisIlustracao = () => {
    const images = getOpcionalImagesFromVariant(selectedGuindaste?._optStr);
    if (!images.length) return null;
    return (
      <div className="opcionais-ilustracao">
        <span className="opcionais-ilustracao-label">Opcionais selecionados</span>
        <div className="opcionais-ilustracao-grid">
          {images.map((src, idx) => (
            <div key={idx} className="opcional-ilustracao-item">
              <img src={src} alt="" className="opcional-ilustracao-img" />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderVariantes = () => {
    if (!selectedGroup) return null;
    return (
      <div className="configurador-painel">
        <div>
          <h3 className="painel-titulo">Configurações disponíveis</h3>
          <p className="painel-subtitulo">
            Selecione a configuração de lanças e opcionais compatíveis.
          </p>
        </div>

        <div className="variantes-lista">
          {sortedVariants.map(v => {
            const isActive = selectedGuindaste && String(selectedGuindaste.id) === String(v.id);
            return (
              <button
                key={v.id}
                type="button"
                className={`variante-item ${isActive ? 'active' : ''}`}
                onClick={() => handleVariantSelect(v)}
              >
                <div className="variante-radio">
                  <div className="variante-radio-inner" />
                </div>
                <div className="variante-info">
                  <div className="variante-nome">{variantLabel(v._optStr)}</div>
                  <div className="variante-codigo">{v.codigo_referencia || 'Código não informado'}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="preco-box">
          <div className="preco-label">Valor do equipamento</div>
          <div className="preco-valor">
            {loadingPreco
              ? 'Carregando preço...'
              : precoExibido != null && precoExibido > 0
                ? formatCurrency(precoExibido)
                : precoExibido === 0
                  ? 'Preço indisponível para esta região'
                  : '—'}
          </div>
        </div>

        {/* Indicador de estoque */}
        {selectedGuindaste && !loadingDetalhes && guindaste && (
          <div className={`estoque-indicador ${(guindaste.quantidade_disponivel || 0) > 0 ? 'disponivel' : 'indisponivel'}`}>
            {(guindaste.quantidade_disponivel || 0) > 0
              ? `Estoque disponível: ${guindaste.quantidade_disponivel} unidade(s)`
              : 'Sem estoque \u2014 Prazo de fabricação: 45 dias'}
          </div>
        )}

        {selectedGuindaste && loadingDetalhes && (
          <div className="carregando-detalhes">Carregando detalhes técnicos...</div>
        )}
      </div>
    );
  };

  const renderResumoTecnico = () => {
    if (!guindaste) return null;

    const specs = [
      { label: 'Código', value: guindaste.codigo_referencia },
      { label: 'Modelo', value: guindaste.modelo },
      { label: 'Configuração de Lanças', value: guindaste.peso_kg },
      { label: 'Configuração', value: guindaste.configuracao },
      { label: 'NCM', value: guindaste.ncm },
      { label: 'FINAME', value: guindaste.finame },
      { label: 'Protótipo', value: guindaste.is_prototipo ? (guindaste.prototipo_label || 'Sim') : 'Não' },
    ].filter(s => s.value != null && String(s.value).trim() !== '');

    const qtdDisponivel = guindaste.quantidade_disponivel || 0;

    return (
      <div className="resumo-tecnico-section">
        <h3>Resumo Técnico</h3>
        <div className="resumo-grid">
          {specs.map((s, idx) => (
            <div key={idx} className="resumo-item">
              <div className="resumo-label">{s.label}</div>
              <div className="resumo-value">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Indicador de estoque (legado/fallback) */}
        {isLegacyMode && (
          <div className={`estoque-indicador ${qtdDisponivel > 0 ? 'disponivel' : 'indisponivel'}`}>
            {qtdDisponivel > 0
              ? `Estoque disponível: ${qtdDisponivel} unidade(s)`
              : 'Sem estoque \u2014 Prazo de fabricação: 45 dias'}
          </div>
        )}

        {guindaste.descricao && (
          <div className="descricao-tecnica">
            <h4>Descrição</h4>
            <p>{guindaste.descricao}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="detalhes-guindaste-container">
      <UnifiedHeader
        showBackButton={true}
        onBackClick={handleVoltar}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title="Detalhes do Equipamento"
        subtitle={tituloPagina}
      />
      <div className="detalhes-content">
        {/* Cabeçalho com nome do equipamento */}
        <div className="guindaste-info-section">
          <h2>{guindaste?.subgrupo || baseModel || 'Configurar Equipamento'}</h2>
        </div>

        {/* Área principal do configurador */}
        {!isLegacyMode && selectedGroup && (
          <div className="configurador-section">
            <div className="configurador-grid">
              <div className="configurador-imagem">
                {renderFotoDestaque()}
                {renderOpcionaisIlustracao()}
                {renderGaleriaMiniaturas()}
              </div>
              {renderVariantes()}
            </div>
          </div>
        )}

        {/* Visualização legado: foto em destaque */}
        {isLegacyMode && guindaste && (
          <div className="configurador-section legado">
            <div className="configurador-grid single-column">
              <div className="configurador-imagem">
                {renderFotoDestaque()}
                {renderOpcionaisIlustracao()}
                {renderGaleriaMiniaturas()}
              </div>
            </div>
          </div>
        )}

        {/* Resumo técnico */}
        {renderResumoTecnico()}

        {/* O que NÃO está incluído */}
        {guindaste?.nao_incluido && (
          <div className="nao-incluido-section">
            <div className="nao-incluido-content">
              <span className="nao-incluido-icon">⚠️</span>
              <p><strong>Não está incluído:</strong> {guindaste.nao_incluido}</p>
            </div>
          </div>
        )}

        {/* Botões de ação */}
        <div className="acoes-section">
          <button
            type="button"
            className="voltar-configuracao-btn"
            onClick={handleVoltar}
          >
            Voltar
          </button>
          {isLegacyMode ? (
            <button
              type="button"
              className="confirmar-configuracao-btn"
              onClick={() => handleConfirmarConfiguracao(legacyGuindaste)}
            >
              Confirmar Configuração
            </button>
          ) : (
            <button
              type="button"
              className="confirmar-configuracao-btn"
              disabled={!podeConfirmar}
              onClick={() => {
                const precoFinal = precoExibido ?? selectedGuindaste?.preco;
                if (!selectedGuindaste?.id || !precoFinal || precoFinal <= 0) return;
                handleConfirmarConfiguracao({ ...selectedGuindaste, preco: precoFinal });
              }}
            >
              Confirmar Configuração
            </button>
          )}
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
                alt={`${guindaste?.subgrupo || baseModel} - Foto ${selectedImage + 1}`}
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
