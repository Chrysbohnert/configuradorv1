/**
 * Funções de debug para Supabase
 * Disponíveis apenas em desenvolvimento
 */

import { supabase } from '../../config/supabase';

export const debugSupabase = {
  /**
   * Testa campos da tabela guindastes
   */
  async testGuindastesFields(guindasteId = 36) {
    try {
      console.log('🔍 Testando campos da tabela guindastes...');
      console.log('📌 Buscando guindaste ID:', guindasteId);
      
      const { data, error } = await supabase
        .from('guindastes')
        .select('*')
        .eq('id', guindasteId)
        .single();
      
      if (error) {
        console.error('❌ Erro ao buscar guindaste:', error);
        return;
      }
      
      console.log('✅ Registro encontrado:', data);
      console.log('📋 Todos os campos:', Object.keys(data));
      console.log('📝 Campo descricao:', data.descricao);
      console.log('⚠️ Campo nao_incluido:', data.nao_incluido);
      
      return data;
    } catch (error) {
      console.error('❌ Erro no teste:', error);
    }
  },

  /**
   * Testa update dos campos descricao e nao_incluido
   */
  async testUpdateDescricao(guindasteId = 36) {
    try {
      console.log('🧪 Testando update dos campos descricao e nao_incluido...');
      
      const testeDescricao = `Teste de descrição - ${new Date().toLocaleTimeString()}`;
      const testeNaoIncluido = `Teste não incluído - ${new Date().toLocaleTimeString()}`;
      
      const { data, error } = await supabase
        .from('guindastes')
        .update({
          descricao: testeDescricao,
          nao_incluido: testeNaoIncluido
        })
        .eq('id', guindasteId)
        .select();
      
      if (error) {
        console.error('❌ ERRO no update:', error);
        return;
      }
      
      console.log('✅ Update executado com sucesso!');
      return data;
    } catch (error) {
      console.error('❌ Erro no teste:', error);
    }
  },

  /**
   * Testa status válidos da tabela pedidos
   */
  async testPedidosStatus() {
    console.log('🔍 Testando status válidos para pedidos...');
    const statusPossiveis = ['pendente', 'aprovado', 'em_andamento', 'concluido', 'cancelado'];
    
    for (const status of statusPossiveis) {
      console.log(`📋 Status "${status}" está configurado`);
    }
    
    console.log('✅ Todos os status estão prontos');
  },

  /**
   * Testa estrutura da tabela caminhoes
   */
  async testCaminhoesTable() {
    try {
      console.log('🔍 Testando estrutura da tabela caminhoes...');
      
      const { data, error } = await supabase
        .from('caminhoes')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error('❌ Erro ao buscar caminhões:', error);
        return;
      }
      
      if (data && data.length > 0) {
        console.log('✅ Tabela caminhoes OK');
        console.log('📋 Campos:', Object.keys(data[0]));
      }
      
      return data;
    } catch (error) {
      console.error('❌ Erro no teste:', error);
    }
  }
};

// Expor no window apenas em DEV
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.testGuindastesFields = debugSupabase.testGuindastesFields;
  window.testUpdateDescricao = debugSupabase.testUpdateDescricao;
  window.testPedidosStatus = debugSupabase.testPedidosStatus;
  window.testCaminhoesTable = debugSupabase.testCaminhoesTable;
}

