// Utilitário para debug de autenticação
import { db } from '../config/supabase';
import { verifyPassword, hashPassword } from './passwordHash';

export const debugLogin = async (email, senha) => {
  console.log('🔍 DEBUG: Iniciando verificação de login...');
  console.log('📧 Email:', email);
  console.log('🔐 Senha:', senha ? '***' : 'vazia');
  
  try {
    // 1. Buscar usuário no banco
    console.log('📊 Buscando usuários no banco...');
    const users = await db.getUsers();
    console.log('👥 Total de usuários encontrados:', users.length);
    
    const user = users.find(u => u.email === email);
    console.log('👤 Usuário encontrado:', user ? 'Sim' : 'Não');
    
    if (user) {
      console.log('📋 Dados do usuário:');
      console.log('  - ID:', user.id);
      console.log('  - Nome:', user.nome);
      console.log('  - Email:', user.email);
      console.log('  - Tipo:', user.tipo);
      console.log('  - Senha (hash):', user.senha ? `${user.senha.substring(0, 10)}...` : 'vazia');
      console.log('  - Tamanho da senha:', user.senha ? user.senha.length : 0);
      console.log('  - É hash?', user.senha && user.senha.length === 64 && /^[a-f0-9]+$/i.test(user.senha));
      
      // 2. Verificar senha
      if (user.senha) {
        console.log('🔐 Verificando senha...');
        const isValidPassword = verifyPassword(senha, user.senha);
        console.log('✅ Senha válida:', isValidPassword);
        
        if (!isValidPassword) {
          console.log('❌ Senha incorreta!');
          console.log('💡 Dica: Execute a migração de senhas se ainda não foi feita');
        }
        
        return {
          user: user,
          isValidPassword: isValidPassword,
          isHashed: user.senha && user.senha.length === 64 && /^[a-f0-9]+$/i.test(user.senha)
        };
      } else {
        console.log('❌ Usuário sem senha!');
        return { user: user, isValidPassword: false, isHashed: false };
      }
    } else {
      console.log('❌ Usuário não encontrado no banco!');
      return { user: null, isValidPassword: false, isHashed: false };
    }
    
  } catch (error) {
    console.error('❌ Erro no debug:', error);
    return { user: null, isValidPassword: false, isHashed: false, error: error.message };
  }
};

// Função para testar hash de senha
export const testPasswordHash = (senha) => {
  console.log('🧪 Testando hash de senha...');
  console.log('🔐 Senha original:', senha);
  
  const hashed = hashPassword(senha);
  
  console.log('🔒 Senha hasheada:', hashed);
  console.log('📏 Tamanho do hash:', hashed.length);
  console.log('🔍 É hexadecimal?', /^[a-f0-9]+$/i.test(hashed));
  
  const isValid = verifyPassword(senha, hashed);
  console.log('✅ Verificação:', isValid);
  
  return { hashed, isValid };
};

// Função para listar todos os usuários
export const listAllUsers = async () => {
  try {
    console.log('📊 Listando todos os usuários...');
    const users = await db.getUsers();
    
    users.forEach((user, index) => {
      console.log(`👤 Usuário ${index + 1}:`);
      console.log('  - ID:', user.id);
      console.log('  - Nome:', user.nome);
      console.log('  - Email:', user.email);
      console.log('  - Tipo:', user.tipo);
      console.log('  - Senha (hash):', user.senha ? `${user.senha.substring(0, 10)}...` : 'vazia');
      console.log('  - Tamanho:', user.senha ? user.senha.length : 0);
      console.log('  - É hash?', user.senha && user.senha.length === 64 && /^[a-f0-9]+$/i.test(user.senha));
      console.log('---');
    });
    
    return users;
  } catch (error) {
    console.error('❌ Erro ao listar usuários:', error);
    return [];
  }
};

// Função para verificar se precisa migrar senhas
export const checkMigrationNeeded = async () => {
  try {
    console.log('🔍 Verificando se migração é necessária...');
    const users = await db.getUsers();
    
    const needsMigration = users.filter(user => 
      user.senha && !(user.senha.length === 64 && /^[a-f0-9]+$/i.test(user.senha))
    );
    
    console.log('📊 Usuários que precisam de migração:', needsMigration.length);
    
    if (needsMigration.length > 0) {
      console.log('⚠️ MIGRAÇÃO NECESSÁRIA!');
      console.log('👥 Usuários que precisam ser migrados:');
      needsMigration.forEach(user => {
        console.log(`  - ${user.nome} (${user.email})`);
      });
      console.log('💡 Execute: runPasswordMigration()');
    } else {
      console.log('✅ Todas as senhas já estão migradas!');
    }
    
    return needsMigration;
  } catch (error) {
    console.error('❌ Erro ao verificar migração:', error);
    return [];
  }
};
