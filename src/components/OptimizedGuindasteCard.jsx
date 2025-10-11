import React, { memo, useCallback, useState } from 'react';
import { Edit, Trash2, DollarSign } from 'lucide-react';

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

