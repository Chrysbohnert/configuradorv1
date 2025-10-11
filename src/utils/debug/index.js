/**
 * Arquivo central de debug - carregado apenas em desenvolvimento
 * Importa e expõe todas as funções de debug no window
 */

// Importar apenas em DEV
if (import.meta.env.DEV) {
  console.log('🔧 [DEBUG] Funções de debug carregadas');
  
  // Importar dinamicamente os módulos de debug
  import('./supabaseDebug.js').then(module => {
    // Expor funções no window para uso no console
    window.debugSupabase = module.debugSupabase;
    console.log('✅ [DEBUG] Supabase debug disponível: window.debugSupabase');
  });
  
  import('./authDebug.js').then(module => {
    window.debugAuth = module.debugAuth;
    console.log('✅ [DEBUG] Auth debug disponível: window.debugAuth');
  });
  
  import('./storageDebug.js').then(module => {
    window.debugStorage = module.debugStorage;
    console.log('✅ [DEBUG] Storage debug disponível: window.debugStorage');
  });
  
  import('./databaseDebug.js').then(module => {
    window.debugDatabase = module.debugDatabase;
    console.log('✅ [DEBUG] Database debug disponível: window.debugDatabase');
  });
}

export default {};

