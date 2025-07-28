import React, { useState } from 'react';
import { supabase } from '../config/supabase';

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

      // Criar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `guindastes/${fileName}`;

      // Tentar upload com fallback para base64
      try {
        console.log('Tentando upload para Supabase Storage...');
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('guindastes-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.log('Erro no Supabase Storage, usando base64...');
          throw uploadError;
        }

        // Obter URL pública
        const { data: { publicUrl } } = supabase.storage
          .from('guindastes-images')
          .getPublicUrl(filePath);

        console.log('✅ Upload realizado com sucesso:', publicUrl);
        setPreview(publicUrl);
        onImageUpload(publicUrl);

      } catch (storageError) {
        console.log('Usando base64 como fallback...');
        
        // Usar base64 como fallback
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64Data = e.target.result;
          setPreview(base64Data);
          onImageUpload(base64Data);
        };
        reader.readAsDataURL(file);
      }

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
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      
      {/* Preview da imagem */}
      {preview && (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
          />
          <button
            type="button"
            onClick={removeImage}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
          >
            ×
          </button>
        </div>
      )}

      {/* Upload */}
      <div className="flex items-center space-x-4">
        <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          {uploading ? 'Enviando...' : 'Escolher Imagem'}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
        
        {uploading && (
          <div className="text-sm text-gray-500">
            ⏳ Enviando imagem...
          </div>
        )}
      </div>

      {/* Informações */}
      <div className="text-xs text-gray-500">
        <p>• Formatos aceitos: JPG, PNG, GIF</p>
        <p>• Tamanho máximo: 5MB</p>
        <p>• Dimensão recomendada: 400x400px</p>
      </div>
    </div>
  );
};

export default ImageUpload; 