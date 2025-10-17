import React, { useState, useEffect, useRef } from 'react';
import { db } from '../config/supabase';
import '../styles/LazyGuindasteImage.css';

/**
 * Componente otimizado para carregar imagens de guindastes sob demanda
 * Isso evita carregar todas as imagens base64 de uma vez, melhorando performance
 */
const LazyGuindasteImage = ({ guindasteId, subgrupo, className = '', alt = '' }) => {
  const [imageSrc, setImageSrc] = useState('/header-bg.jpg');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
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

    const loadImage = async () => {
      try {
        setIsLoading(true);
        const imageUrl = await db.getGuindasteImagem(guindasteId);
        
        if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') {
          setImageSrc(imageUrl);
          setHasError(false);
        } else {
          // Sem imagem disponível
          setImageSrc('/header-bg.jpg');
          setHasError(true);
        }
      } catch (error) {
        console.error(`❌ Erro ao carregar imagem do guindaste ${guindasteId}:`, error);
        setImageSrc('/header-bg.jpg');
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [isInView, guindasteId]);

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
          setImageSrc('/header-bg.jpg');
          setHasError(true);
          setIsLoading(false);
        }}
      />
      
      {/* Indicador de carregamento */}
      {isLoading && isInView && (
        <div className="loading-spinner" />
      )}
      
      {/* Badge para imagens sem foto */}
      {hasError && !isLoading && imageSrc === '/header-bg.jpg' && (
        <div className="no-image-badge">
          Sem Foto
        </div>
      )}
    </div>
  );
};

export default LazyGuindasteImage;
