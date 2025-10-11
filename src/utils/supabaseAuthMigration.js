// Utilitário para migrar usuários existentes para Supabase Auth
import { supabase, db } from '../config/supabase';

/**
 * Migra usuários existentes da tabela 'users' para o Supabase Auth
 * Mantém a sincronização entre Auth e dados locais
 */
export const migrateUsersToSupabaseAuth = async () => {
  try {
    console.log('🔄 Iniciando migração de usuários para Supabase Auth...');
    
    // 1. Buscar todos os usuários da tabela local
    const localUsers = await db.getUsers();
    console.log(`📊 Encontrados ${localUsers.length} usuários na tabela local`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    const errors = [];
    
    for (const user of localUsers) {
      try {
        console.log(`👤 Processando usuário: ${user.nome} (${user.email})`);
        
        // 2. Verificar se já existe no Supabase Auth
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === user.email);
        
        if (existingUser) {
          console.log(`⏭️ Usuário já existe no Supabase Auth: ${user.email}`);
          
          // Atualizar ID na tabela local se necessário
          if (user.id !== existingUser.id) {
            await db.updateUser(user.id, { supabase_auth_id: existingUser.id });
            console.log(`🔄 ID do Supabase Auth salvo: ${existingUser.id}`);
          }
          
          skippedCount++;
          continue;
        }
        
        // 3. Criar usuário no Supabase Auth
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: generateTemporaryPassword(), // Senha temporária
          email_confirm: true, // Confirmar email automaticamente
          user_metadata: {
            nome: user.nome,
            tipo: user.tipo,
            regiao: user.regiao || 'sudeste',
            migrated_from_local: true,
            original_id: user.id
          }
        });
        
        if (authError) {
          console.error(`❌ Erro ao criar usuário no Auth: ${user.email}`, authError);
          errors.push({ user: user.email, error: authError.message });
          continue;
        }
        
        // 4. Atualizar tabela local com ID do Supabase Auth
        await db.updateUser(user.id, { 
          supabase_auth_id: authUser.user.id,
          migrated_to_auth: true,
          migrated_at: new Date().toISOString()
        });
        
        console.log(`✅ Usuário migrado com sucesso: ${user.email}`);
        migratedCount++;
        
      } catch (userError) {
        console.error(`❌ Erro ao processar usuário ${user.email}:`, userError);
        errors.push({ user: user.email, error: userError.message });
      }
    }
    
    console.log(`🎉 Migração concluída!`);
    console.log(`✅ Migrados: ${migratedCount}`);
    console.log(`⏭️ Já existiam: ${skippedCount}`);
    console.log(`❌ Erros: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('📋 Detalhes dos erros:');
      errors.forEach(err => console.log(`  - ${err.user}: ${err.error}`));
    }
    
    return {
      success: true,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errors
    };
    
  } catch (error) {
    console.error('❌ Erro geral na migração:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Cria um novo usuário tanto no Supabase Auth quanto na tabela local
 */
export const createUserWithAuth = async (userData) => {
  try {
    console.log(`👤 Criando usuário completo: ${userData.email}`);
    
    // 1. Criar no Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.senha, // Senha original
      email_confirm: true,
      user_metadata: {
        nome: userData.nome,
        tipo: userData.tipo,
        regiao: userData.regiao || 'sudeste'
      }
    });
    
    if (authError) {
      throw new Error(`Erro no Supabase Auth: ${authError.message}`);
    }
    
    // 2. Criar na tabela local (com senha hasheada)
    const localUserData = {
      ...userData,
      supabase_auth_id: authUser.user.id,
      created_with_auth: true
    };
    
    const localUser = await db.createUser(localUserData);
    
    console.log(`✅ Usuário criado com sucesso: ${userData.email}`);
    
    return {
      authUser: authUser.user,
      localUser: localUser
    };
    
  } catch (error) {
    console.error(`❌ Erro ao criar usuário: ${userData.email}`, error);
    throw error;
  }
};

/**
 * Sincroniza dados entre Supabase Auth e tabela local
 */
export const syncUserData = async (authUserId) => {
  try {
    // Buscar dados do Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(authUserId);
    if (authError) throw authError;
    
    // Buscar dados locais
    const localUsers = await db.getUsers();
    const localUser = localUsers.find(u => u.supabase_auth_id === authUserId);
    
    if (!localUser) {
      throw new Error('Usuário não encontrado na tabela local');
    }
    
    // Retornar dados combinados
    return {
      id: authUser.user.id,
      nome: authUser.user.user_metadata?.nome || localUser.nome,
      email: authUser.user.email,
      tipo: authUser.user.user_metadata?.tipo || localUser.tipo,
      regiao: authUser.user.user_metadata?.regiao || localUser.regiao,
      localData: localUser
    };
    
  } catch (error) {
    console.error('❌ Erro ao sincronizar dados:', error);
    throw error;
  }
};

/**
 * Gera senha temporária para migração
 */
function generateTemporaryPassword() {
  return Math.random().toString(36).slice(-12) + 'Temp123!';
}

/**
 * Função para resetar senha de usuário migrado
 */
export const resetMigratedUserPassword = async (email) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    
    if (error) throw error;
    
    console.log(`📧 Email de reset enviado para: ${email}`);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Erro ao enviar reset:', error);
    return { success: false, error: error.message };
  }
};