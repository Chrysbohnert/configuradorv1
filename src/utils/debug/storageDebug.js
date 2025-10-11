/**
 * Funções de debug para Supabase Storage
 * Disponíveis apenas em desenvolvimento
 */

import { supabase } from '../../config/supabase';

export const debugStorage = {
  /**
   * Testa configuração do Supabase Storage
   */
  async testSupabaseStorage() {
    try {
      console.log('🔍 Testando configuração do Supabase Storage...');
      
      // Verificar autenticação
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔑 Sessão ativa:', session ? 'Sim' : 'Não');
      
      if (!session) {
        console.error('❌ Nenhuma sessão ativa! Faça login primeiro.');
        return;
      }
      
      // Listar buckets
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('❌ Erro ao listar buckets:', bucketsError);
        return;
      }
      
      console.log('📦 Buckets encontrados:', buckets.map(b => b.name));
      
      // Verificar bucket graficos-carga
      const graficosBucket = buckets.find(b => b.name === 'graficos-carga');
      if (graficosBucket) {
        console.log('✅ Bucket graficos-carga encontrado');
      } else {
        console.log('❌ Bucket graficos-carga não encontrado');
      }
      
      // Verificar bucket guindastes
      const guindastesBucket = buckets.find(b => b.name === 'guindastes');
      if (guindastesBucket) {
        console.log('✅ Bucket guindastes encontrado');
      } else {
        console.log('❌ Bucket guindastes não encontrado');
      }
      
      return buckets;
    } catch (error) {
      console.error('❌ Erro no teste:', error);
    }
  },

  /**
   * Testa upload de arquivo
   */
  async testUpload() {
    try {
      console.log('📤 Testando upload de arquivo...');
      
      // Criar arquivo de teste
      const testContent = 'Arquivo de teste';
      const testFile = new Blob([testContent], { type: 'text/plain' });
      const fileName = `test_${Date.now()}.txt`;
      
      const { data, error } = await supabase.storage
        .from('graficos-carga')
        .upload(fileName, testFile);
      
      if (error) {
        console.error('❌ Erro no upload:', error);
        return;
      }
      
      console.log('✅ Upload bem-sucedido:', data);
      
      // Limpar arquivo de teste
      await supabase.storage.from('graficos-carga').remove([fileName]);
      console.log('🧹 Arquivo de teste removido');
      
      return data;
    } catch (error) {
      console.error('❌ Erro no teste:', error);
    }
  }
};

// Expor no window apenas em DEV
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.testSupabaseStorage = debugStorage.testSupabaseStorage;
  window.testUpload = debugStorage.testUpload;
}

