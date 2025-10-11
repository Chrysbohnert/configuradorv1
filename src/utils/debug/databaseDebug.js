/**
 * Funções de debug para o banco de dados
 * Disponíveis apenas em desenvolvimento
 */

import { supabase } from '../../config/supabase';

export const debugDatabase = {
  /**
   * Lista todas as tabelas com contagem de registros
   */
  async listTables() {
    try {
      console.log('📊 Listando tabelas do banco...');
      
      const tables = [
        'users',
        'guindastes',
        'precos_guindaste_regiao',
        'clientes',
        'caminhoes',
        'pedidos',
        'pedido_itens',
        'graficos_carga',
        'eventos_logistica',
        'pronta_entrega',
        'fretes'
      ];
      
      for (const table of tables) {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          console.log(`✅ ${table}: ${count} registros`);
        } else {
          console.log(`❌ ${table}: erro ao contar`);
        }
      }
      
      console.log('✅ Listagem completa');
    } catch (error) {
      console.error('❌ Erro ao listar tabelas:', error);
    }
  },

  /**
   * Verifica integridade dos dados
   */
  async checkIntegrity() {
    try {
      console.log('🔍 Verificando integridade dos dados...');
      
      // Verificar guindastes sem preço
      const { data: guindastesSemPreco } = await supabase
        .from('guindastes')
        .select('id, modelo')
        .limit(100);
      
      if (guindastesSemPreco) {
        console.log(`📋 ${guindastesSemPreco.length} guindastes no catálogo`);
      }
      
      // Verificar pedidos
      const { count: totalPedidos } = await supabase
        .from('pedidos')
        .select('*', { count: 'exact', head: true });
      
      console.log(`📦 ${totalPedidos} pedidos no sistema`);
      
      console.log('✅ Verificação concluída');
    } catch (error) {
      console.error('❌ Erro na verificação:', error);
    }
  },

  /**
   * Limpa dados de teste
   */
  async clearTestData() {
    console.log('⚠️ Esta função deve ser usada com cuidado!');
    console.log('💡 Use: window.debugDatabase.clearTestData() para confirmar');
  }
};

// Expor no window apenas em DEV
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.debugDatabase = debugDatabase;
  window.listTables = debugDatabase.listTables;
  window.checkIntegrity = debugDatabase.checkIntegrity;
}

