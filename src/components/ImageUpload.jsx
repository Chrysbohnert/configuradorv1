import React, { useState } from 'react';
import '../styles/ImageUpload.css';

const ImageUpload = ({ onImageUpload, currentImageUrl, label = "Upload de Imagem" }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImageUrl);

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

      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 5MB.');
        return;
      }

      // Usar apenas base64 por enquanto (mais confiável)
      console.log('Convertendo imagem para base64...');
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = e.target.result;
        console.log('Base64 gerado com sucesso');
        setPreview(base64Data);
        onImageUpload(base64Data);
      };
      reader.onerror = (e) => {
        console.error('Erro ao ler arquivo:', e);
        alert('Erro ao processar imagem. Tente novamente.');
      };
      reader.readAsDataURL(file);

    } catch (error) {
      console.error('❌ Erro no upload:', error);
      alert('Erro ao enviar imagem. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setPreview(null);
    onImageUpload(null);
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
            accept="image/*"
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

      {/* Informações */}
      <div className="upload-info">
        <div className="info-item">
          <span className="info-icon">📁</span>
          <span>Formatos: JPG, PNG, GIF</span>
        </div>
        <div className="info-item">
          <span className="info-icon">📏</span>
          <span>Máximo: 5MB</span>
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