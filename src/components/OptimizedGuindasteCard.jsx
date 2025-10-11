import React, { memo, useCallback, useState } from 'react';

// Ícones SVG simples (sem dependência externa)
const Edit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const Trash2 = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const DollarSign = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="1" x2="12" y2="23"></line>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
  </svg>
);

/**
 * Card de Guindaste Otimizado
 * 
 * Otimizações aplicadas:
 * - React.memo para evitar re-renders desnecessários
 * - useCallback para memoizar handlers
 * - Lazy loading nativo de imagens
 * - Placeholder visual durante carregamento
 * - Async decoding para não bloquear UI
 * 
 * @param {Object} props
 * @param {Object} props.guindaste - Dados do guindaste
 * @param {Function} props.onEdit - Callback para editar
 * @param {Function} props.onDelete - Callback para deletar
 * @param {Function} props.onPrecos - Callback para gerenciar preços
 */
const OptimizedGuindasteCard = memo(({ 
  guindaste, 
  onEdit, 
  onDelete, 
  onPrecos 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleEdit = useCallback((e) => {
    e.stopPropagation();
    onEdit(guindaste);
  }, [guindaste, onEdit]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    onDelete(guindaste.id);
  }, [guindaste.id, onDelete]);

  const handlePrecos = useCallback((e) => {
    e.stopPropagation();
    onPrecos(guindaste.id);
  }, [guindaste.id, onPrecos]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleImageError = useCallback((e) => {
    // Log removido para performance
    setImageError(true);
    setImageLoaded(true);
  }, []);

  // Debug removido para melhorar performance (evita 50+ useEffects rodando)

  return (
    <div className="guindaste-card">
      <div className="guindaste-header">
        <div className="guindaste-image">
          {guindaste.imagem_url && !imageError ? (
            <>
              {!imageLoaded && (
                <div className="guindaste-icon" style={{ opacity: 0.5 }}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
              )}
              <img 
                src={guindaste.imagem_url} 
                alt={guindaste.subgrupo}
                className="guindaste-thumbnail"
                loading="lazy"
                decoding="async"
                onLoad={handleImageLoad}
                onError={handleImageError}
                style={{ 
                  opacity: imageLoaded ? 1 : 0,
                  transition: 'opacity 0.3s ease-in-out'
                }}
              />
            </>
          ) : (
            <div className="guindaste-icon" style={{ display: 'flex' }}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
          )}
        </div>
        <div className="guindaste-info">
          <h3>{guindaste.subgrupo}</h3>
          <p>Modelo: {guindaste.modelo}</p>
        </div>
      </div>
      <div className="guindaste-actions">
        <button
          onClick={handleEdit}
          className="action-btn edit-btn"
          title="Editar guindaste"
        >
          <Edit size={14} />
          <span>Editar</span>
        </button>
        <button
          onClick={handleDelete}
          className="action-btn delete-btn"
          title="Remover guindaste"
        >
          <Trash2 size={14} />
          <span>Excluir</span>
        </button>
        <button
          onClick={handlePrecos}
          className="action-btn price-btn"
          title="Gerenciar preços por região"
        >
          <DollarSign size={14} />
          <span>Preços</span>
        </button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparação customizada para otimizar
  // Re-renderiza se o ID, updated_at OU imagem_url mudarem
  return (
    prevProps.guindaste.id === nextProps.guindaste.id &&
    prevProps.guindaste.updated_at === nextProps.guindaste.updated_at &&
    prevProps.guindaste.imagem_url === nextProps.guindaste.imagem_url &&
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.onPrecos === nextProps.onPrecos
  );
});

OptimizedGuindasteCard.displayName = 'OptimizedGuindasteCard';

export default OptimizedGuindasteCard;

