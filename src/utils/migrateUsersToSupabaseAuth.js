/**
 * 🔐 Script de Migração de Usuários para Supabase Auth
 * 
 * Este script migra usuários da tabela 'users' para o Supabase Auth
 * preservando tipos (admin/vendedor) no user_metadata
 */

import { supabase, db } from '../config/supabase';

/**
 * Verifica se um usuário já existe no Supabase Auth
 */
async function userExistsInAuth(email) {
  try {
    // Tentar fazer login para verificar se existe
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: 'test_temp_password_123' // Senha temporária
    });
    
    // Se não deu erro de senha incorreta, usuário existe
    if (error && error.message.includes('Invalid login credentials')) {
      return true; // Usuário existe, mas senha está errada
    }
    
    return data?.user ? true : false;
  } catch (error) {
    return false;
  }
}

/**
 * Cria um usuário no Supabase Auth
 */
async function createUserInAuth(user, tempPassword) {
  try {
    console.log(`🔄 Criando usuário ${user.email} no Supabase Auth...`);
    
    // Nota: Esta função requer acesso admin ou ser executada no backend
    // Por enquanto, vamos usar signUp que é público
    const { data, error } = await supabase.auth.signUp({
      email: user.email,
      password: tempPassword,
      options: {
        data: {
          nome: user.nome,
          tipo: user.tipo, // admin ou vendedor
          email: user.email
        },
        emailRedirectTo: window.location.origin
      }
    });
    
    if (error) {
      throw error;
    }
    
    console.log(`✅ Usuário ${user.email} criado com sucesso!`);
    console.log(`📧 Email de confirmação enviado para ${user.email}`);
    
    return {
      success: true,
      user: data.user,
      needsConfirmation: true
    };
  } catch (error) {
    console.error(`❌ Erro ao criar ${user.email}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Migra todos os usuários da tabela 'users' para Supabase Auth
 */
export async function migrateAllUsers(tempPassword = 'Temp@123456') {
  try {
    console.log('🚀 Iniciando migração de usuários para Supabase Auth...\n');
    
    // 1. Buscar todos os usuários do banco
    console.log('📋 Buscando usuários da tabela users...');
    const users = await db.getUsers();
    console.log(`✅ Encontrados ${users.length} usuários\n`);
    
    const results = {
      total: users.length,
      created: [],
      existing: [],
      failed: []
    };
    
    // 2. Processar cada usuário
    for (const user of users) {
      console.log(`\n👤 Processando: ${user.nome} (${user.email}) - Tipo: ${user.tipo}`);
      
      // Verificar se já existe
      const exists = await userExistsInAuth(user.email);
      
      if (exists) {
        console.log(`ℹ️  Usuário ${user.email} já existe no Supabase Auth`);
        results.existing.push(user.email);
        continue;
      }
      
      // Criar novo usuário
      const result = await createUserInAuth(user, tempPassword);
      
      if (result.success) {
        results.created.push({
          email: user.email,
          nome: user.nome,
          tipo: user.tipo
        });
      } else {
        results.failed.push({
          email: user.email,
          error: result.error
        });
      }
      
      // Delay para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 3. Relatório final
    console.log('\n\n📊 ===== RELATÓRIO DE MIGRAÇÃO =====\n');
    console.log(`Total de usuários: ${results.total}`);
    console.log(`✅ Criados: ${results.created.length}`);
    console.log(`ℹ️  Já existiam: ${results.existing.length}`);
    console.log(`❌ Falharam: ${results.failed.length}`);
    
    if (results.created.length > 0) {
      console.log('\n🆕 Usuários criados:');
      results.created.forEach(u => {
        console.log(`  - ${u.nome} (${u.email}) - ${u.tipo}`);
      });
      console.log(`\n⚠️  IMPORTANTE: Senha temporária para todos: ${tempPassword}`);
      console.log('📧 Os usuários receberão email de confirmação.');
      console.log('🔐 Peça para trocarem a senha no primeiro login!');
    }
    
    if (results.failed.length > 0) {
      console.log('\n❌ Falhas:');
      results.failed.forEach(f => {
        console.log(`  - ${f.email}: ${f.error}`);
      });
    }
    
    console.log('\n✅ Migração concluída!\n');
    
    return results;
    
  } catch (error) {
    console.error('❌ Erro fatal na migração:', error);
    throw error;
  }
}

/**
 * Migra um único usuário (útil para testes)
 */
export async function migrateSingleUser(email, tempPassword = 'Temp@123456') {
  try {
    console.log(`🔄 Migrando usuário individual: ${email}`);
    
    const users = await db.getUsers();
    const user = users.find(u => u.email === email);
    
    if (!user) {
      console.error(`❌ Usuário ${email} não encontrado na tabela users`);
      return { success: false, error: 'Usuário não encontrado' };
    }
    
    const exists = await userExistsInAuth(email);
    
    if (exists) {
      console.log(`ℹ️  Usuário ${email} já existe no Supabase Auth`);
      return { success: true, alreadyExists: true };
    }
    
    const result = await createUserInAuth(user, tempPassword);
    
    if (result.success) {
      console.log(`\n✅ Usuário ${email} migrado com sucesso!`);
      console.log(`🔐 Senha temporária: ${tempPassword}`);
      console.log(`📧 Email de confirmação enviado`);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Erro ao migrar usuário:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verifica status da migração
 */
export async function checkMigrationStatus() {
  try {
    console.log('🔍 Verificando status da migração...\n');
    
    const users = await db.getUsers();
    
    console.log(`📋 Usuários na tabela 'users': ${users.length}`);
    users.forEach(u => {
      console.log(`  - ${u.nome} (${u.email}) - ${u.tipo}`);
    });
    
    console.log('\n💡 Para migrar todos os usuários, execute:');
    console.log('   import { migrateAllUsers } from "./utils/migrateUsersToSupabaseAuth";');
    console.log('   await migrateAllUsers();');
    
    console.log('\n💡 Para migrar um usuário específico:');
    console.log('   import { migrateSingleUser } from "./utils/migrateUsersToSupabaseAuth";');
    console.log('   await migrateSingleUser("email@exemplo.com");');
    
  } catch (error) {
    console.error('❌ Erro ao verificar status:', error);
  }
}

// Exportar função global para console
if (typeof window !== 'undefined') {
  window.migrateUsers = migrateAllUsers;
  window.migrateSingleUser = migrateSingleUser;
  window.checkMigrationStatus = checkMigrationStatus;
}

