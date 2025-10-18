import React, { useState, useEffect, useRef } from 'react';
import { db } from '../config/supabase';
import '../styles/LazyGuindasteImage.css';

// Cache global para imagens
const imageCache = new Map();

/**
 * Componente otimizado para carregar imagens de guindastes sob demanda
 * Isso evita carregar todas as imagens base64 de uma vez, melhorando performance
 */
const LazyGuindasteImage = ({ guindasteId, subgrupo, className = '', alt = '' }) => {
  const [imageSrc, setImageSrc] = useState('/guindaste-default.svg');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasNoImage, setHasNoImage] = useState(false);
  const [currentGuindasteId, setCurrentGuindasteId] = useState(null);
  const imgRef = useRef(null);

  // Intersection Observer para lazy loading
  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, []);

  // Carregar imagem quando estiver em view
  useEffect(() => {
    if (!isInView || !guindasteId) return;
    
    // Evitar recarregar se for o mesmo guindaste
    if (currentGuindasteId === guindasteId) return;

    const loadImage = async () => {
      try {
        // Verificar cache primeiro
        if (imageCache.has(guindasteId)) {
          const cachedData = imageCache.get(guindasteId);
          setImageSrc(cachedData.imageSrc);
          setHasError(cachedData.hasError);
          setHasNoImage(cachedData.hasNoImage);
          setCurrentGuindasteId(guindasteId);
          setIsLoading(false);
          return;
        }
        
        // Só mostrar loading se for um guindaste diferente
        if (currentGuindasteId !== guindasteId) {
          setIsLoading(true);
        }
        
        const imageUrl = await db.getGuindasteImagem(guindasteId);
        
        let newImageSrc, newHasError, newHasNoImage;
        
        if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '' && 
            imageUrl !== 'null' && imageUrl !== 'undefined' && imageUrl.length > 10) {
          newImageSrc = imageUrl;
          newHasError = false;
          newHasNoImage = false;
        } else {
          // Sem imagem disponível - usar imagem padrão
          newImageSrc = '/guindaste-default.svg';
          newHasError = false;
          newHasNoImage = true;
        }
        
        // Salvar no cache
        imageCache.set(guindasteId, {
          imageSrc: newImageSrc,
          hasError: newHasError,
          hasNoImage: newHasNoImage
        });
        
        setImageSrc(newImageSrc);
        setHasError(newHasError);
        setHasNoImage(newHasNoImage);
        setCurrentGuindasteId(guindasteId);
      } catch (error) {
        console.error(`❌ Erro ao carregar imagem do guindaste ${guindasteId}:`, error);
        const errorData = {
          imageSrc: '/guindaste-default.svg',
          hasError: true,
          hasNoImage: true
        };
        
        // Salvar erro no cache também
        imageCache.set(guindasteId, errorData);
        
        setImageSrc(errorData.imageSrc);
        setHasError(errorData.hasError);
        setHasNoImage(errorData.hasNoImage);
        setCurrentGuindasteId(guindasteId);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [isInView, guindasteId, currentGuindasteId]);

  return (
    <div 
      ref={imgRef}
      className="guindaste-image-container"
    >
      <img
        src={imageSrc}
        alt={alt || subgrupo}
        className={`guindaste-image ${className}`}
        style={{
          opacity: isLoading ? 0.5 : 1,
        }}
        onLoad={() => {
          setIsLoading(false);
        }}
        onError={() => {
          setImageSrc('/guindaste-default.svg');
          setHasError(true);
          setHasNoImage(true);
          setIsLoading(false);
        }}
      />
      
      {/* Loading Skeleton Profissional */}
      {isLoading && isInView && (
        <div className="loading-skeleton">
          <div className="skeleton-content">
            {/* Ícone de guindaste animado */}
            <div className="skeleton-crane">
              <div className="skeleton-base"></div>
              <div className="skeleton-tower"></div>
              <div className="skeleton-arm"></div>
              <div className="skeleton-hook"></div>
            </div>
            
            {/* Texto de loading */}
            <div className="skeleton-text">
              <div className="skeleton-line skeleton-title"></div>
              <div className="skeleton-line skeleton-subtitle"></div>
            </div>
            
            {/* Indicador de progresso */}
            <div className="skeleton-progress">
              <div className="skeleton-progress-bar"></div>
            </div>
          </div>
          <div className="loading-pulse"></div>
        </div>
      )}
      
      {/* Badge para imagens sem foto */}
      {hasNoImage && !isLoading && (
        <div className="no-image-badge">
          Sem Foto
        </div>
      )}
    </div>
  );
};

export default LazyGuindasteImage;
