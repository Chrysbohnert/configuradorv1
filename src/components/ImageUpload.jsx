import React, { useState, useEffect } from 'react';
import '../styles/ImageUpload.css';
import { supabase } from '../config/supabase'; // Importar o cliente Supabase
import { v4 as uuidv4 } from 'uuid'; // Para gerar nomes de arquivo únicos

const ImageUpload = ({ onImageUpload, currentImageUrl, label = "Upload de Imagem" }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImageUrl);

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

      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 5MB.');
        return;
      }

      // Gerar um nome de arquivo único
      const fileExtension = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const filePath = `guindastes/${fileName}`; // Pasta 'guindastes' dentro do bucket

      // Converter imagem para base64 como alternativa ao Storage
      const reader = new FileReader();
      
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64Data = await base64Promise;
      
      console.log('✅ Imagem convertida para base64');
      setPreview(base64Data);
      onImageUpload(base64Data); // Passa a imagem em base64 para o componente pai

      return; // Sair da função após conversão bem-sucedida

      // Código do Supabase Storage (mantido como backup)
      /*
      const { error: uploadError } = await supabase.storage
        .from('guindastes') // Nome do seu bucket no Supabase Storage
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false, // Não sobrescrever se o arquivo já existir
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obter a URL pública da imagem
      const { data: publicUrlData } = supabase.storage
        .from('guindastes')
        .getPublicUrl(filePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error('Não foi possível obter a URL pública da imagem.');
      }

      console.log('✅ Imagem enviada para Supabase Storage:', publicUrlData.publicUrl);
      setPreview(publicUrlData.publicUrl);
      onImageUpload(publicUrlData.publicUrl); // Passa a URL pública para o componente pai
      */

    } catch (error) {
      console.error('❌ Erro no upload:', error);
      alert(`Erro ao enviar imagem: ${error.message}. Tente novamente.`);
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