// Script para executar migração de senhas
// Execute no console do navegador após fazer login como admin

import { migratePasswords, createAdminUser, createVendedorUser } from './migratePasswords';
import { debugLogin, testPasswordHash, listAllUsers, checkMigrationNeeded } from './debugAuth';

// Função para executar no console do navegador
window.runPasswordMigration = async () => {
  try {
    console.log('🚀 Iniciando migração de senhas...');
    console.log('⚠️ Certifique-se de estar logado como admin!');
    
    const result = await migratePasswords();
    
    if (result.success) {
      console.log('✅ Migração concluída com sucesso!');
      console.log(`📊 ${result.migratedCount} senhas migradas`);
      alert('Migração de senhas concluída com sucesso!');
    } else {
      console.error('❌ Erro na migração:', result.error);
      alert('Erro na migração: ' + result.error);
    }
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
    alert('Erro inesperado: ' + error.message);
  }
};

// Função para criar usuário admin de teste
window.createTestAdmin = async () => {
  try {
    const admin = await createAdminUser(
      'admin@stark.com',
      'admin123',
      'Administrador'
    );
    console.log('✅ Admin criado:', admin);
    alert('Usuário admin criado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar admin:', error);
    alert('Erro ao criar admin: ' + error.message);
  }
};

// Função para criar vendedor de teste
window.createTestVendedor = async () => {
  try {
    const vendedor = await createVendedorUser(
      'vendedor@stark.com',
      'vendedor123',
      'Vendedor Teste',
      'sudeste'
    );
    console.log('✅ Vendedor criado:', vendedor);
    alert('Vendedor criado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar vendedor:', error);
    alert('Erro ao criar vendedor: ' + error.message);
  }
};

// Função para debug de login
window.debugLogin = async (email, senha) => {
  try {
    const result = await debugLogin(email, senha);
    console.log('🔍 Resultado do debug:', result);
    return result;
  } catch (error) {
    console.error('❌ Erro no debug:', error);
    return null;
  }
};

// Função para testar hash de senha
window.testPasswordHash = (senha) => {
  return testPasswordHash(senha);
};

// Função para listar todos os usuários
window.listAllUsers = async () => {
  try {
    const users = await listAllUsers();
    console.log('👥 Usuários listados:', users.length);
    return users;
  } catch (error) {
    console.error('❌ Erro ao listar usuários:', error);
    return [];
  }
};

// Função para verificar se precisa migrar
window.checkMigrationNeeded = async () => {
  try {
    const needsMigration = await checkMigrationNeeded();
    return needsMigration;
  } catch (error) {
    console.error('❌ Erro ao verificar migração:', error);
    return [];
  }
};

console.log('🔧 Scripts de migração e debug carregados!');
console.log('📋 Comandos disponíveis:');
console.log('  - runPasswordMigration() - Migrar senhas existentes');
console.log('  - createTestAdmin() - Criar admin de teste');
console.log('  - createTestVendedor() - Criar vendedor de teste');
console.log('  - debugLogin(email, senha) - Debug de login');
console.log('  - testPasswordHash(senha) - Testar hash de senha');
console.log('  - listAllUsers() - Listar todos os usuários');
console.log('  - checkMigrationNeeded() - Verificar se precisa migrar');
