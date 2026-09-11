import React, { useState, useEffect } from 'react';
import '../styles/ImageUpload.css';
import { supabase } from '../config/supabase'; // Importar o cliente Supabase

const ImageUpload = ({
  onImageUpload,
  currentImageUrl,
  label = "Upload de Imagem",
  disableUpload = false,
  accept = "image/*",
  formatsText = "JPG, PNG, GIF",
  bucket = "guindastes",
  filePrefix = "guindaste_",
  maxSize = 5 * 1024 * 1024,
  uploadEndpoint = null,
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImageUrl);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [manualUrl, setManualUrl] = useState('');

  // Sincronizar preview com currentImageUrl
  useEffect(() => {
    setPreview(currentImageUrl);
  }, [currentImageUrl]);

  const handleImageUpload = async (event) => {
    try {
      setUploading(true);
      
      const file = event.target.files[0];
      if (!file) return;

      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas arquivos de imagem.');
        return;
      }

      // Validar tamanho
      if (file.size > maxSize) {
        alert(`A imagem deve ter no máximo ${Math.round(maxSize / 1024 / 1024)}MB.`);
        return;
      }

      // Preview local imediato (base64 apenas para exibição enquanto o upload roda)
      const reader = new FileReader();
      const base64Preview = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setPreview(base64Preview);

      // Quando upload para backend está desativado, usar base64 diretamente
      if (disableUpload) {
        setPreview(base64Preview);
        onImageUpload(base64Preview);
        setUploading(false);
        return;
      }

      let publicUrl;

      if (uploadEndpoint) {
        // Upload para o backend via endpoint configurado
        const formData = new FormData();
        formData.append('arquivo', file);

        const token = localStorage.getItem('authToken');
        const response = await fetch(uploadEndpoint, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        });

        const json = await response.json();
        if (!response.ok || !json.success || !json.data?.url) {
          throw new Error(json.error || 'Falha no upload da imagem');
        }
        publicUrl = json.data.url;
      } else {
        // Upload para Supabase Storage (fallback legado)
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const uniqueId = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2);
        const fileName = `${filePrefix}${uniqueId}.${fileExtension}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        if (!publicUrlData?.publicUrl) {
          throw new Error('Não foi possível obter a URL pública da imagem.');
        }
        publicUrl = publicUrlData.publicUrl;
      }

      setPreview(publicUrl);
      onImageUpload(publicUrl);

    } catch (error) {
      console.error('❌ Erro no upload:', error);
      setShowUrlInput(true);
      alert('Falha no upload automático. Você pode colar a URL da imagem abaixo.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setPreview(null);
    setShowUrlInput(false);
    setManualUrl('');
    onImageUpload(null);
  };

  const handleUseManualUrl = () => {
    const url = manualUrl.trim();
    if (!url) return;
    setPreview(url);
    setShowUrlInput(false);
    setManualUrl('');
    onImageUpload(url);
  };

  return (
    <div className="image-upload-container">
      <label className="image-upload-label">
        {label}
      </label>
      
      {/* Preview da imagem */}
      {preview && (
        <div className="image-preview-container">
          <div className="image-preview-wrapper">
            <img
              src={preview}
              alt="Preview"
              className="image-preview"
            />
            <button
              type="button"
              onClick={removeImage}
              className="remove-image-btn"
              title="Remover imagem"
            >
              <span>×</span>
            </button>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div className="upload-area">
        <div className="upload-content">
          <div className="upload-icon">📷</div>
          <div className="upload-text">
            <span className="upload-title">Escolher Imagem</span>
            <span className="upload-subtitle">Clique para selecionar um arquivo</span>
          </div>
          <input
            type="file"
            accept={accept}
            onChange={handleImageUpload}
            className="upload-input"
            disabled={uploading}
          />
        </div>
        
        {uploading && (
          <div className="upload-loading">
            <div className="loading-spinner"></div>
            <span>Enviando imagem...</span>
          </div>
        )}
      </div>

      {/* Fallback: URL manual */}
      {showUrlInput && (
        <div className="url-fallback" style={{ marginTop: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <label style={{ fontSize: '13px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
            URL da Imagem (fallback)
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://..."
              style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleUseManualUrl(); }}
            />
            <button
              type="button"
              onClick={handleUseManualUrl}
              style={{ padding: '8px 14px', background: '#111827', color: '#fff', borderRadius: '6px', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
            >
              Usar URL
            </button>
          </div>
          <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
            O preview local já está visível acima.
          </span>
        </div>
      )}

      {/* Informações */}
      <div className="upload-info">
        <div className="info-item">
          <span className="info-icon">📁</span>
          <span>Formatos: {formatsText}</span>
        </div>
        <div className="info-item">
          <span className="info-icon">📏</span>
          <span>Máximo: {Math.round(maxSize / 1024 / 1024)}MB</span>
        </div>
        <div className="info-item">
          <span className="info-icon">🖼️</span>
          <span>Recomendado: 400x400px</span>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;
