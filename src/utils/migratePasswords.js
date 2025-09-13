// Script para migrar senhas existentes para hash
// Execute este script uma vez para migrar todas as senhas do banco

import { hashPassword } from './passwordHash';
import { db } from '../config/supabase';

export const migratePasswords = async () => {
  try {
    console.log('🔄 Iniciando migração de senhas...');
    
    // Buscar todos os usuários
    const users = await db.getUsers();
    console.log(`📊 Encontrados ${users.length} usuários para migrar`);
    
    let migratedCount = 0;
    
    for (const user of users) {
      // Verificar se a senha já está em hash (não contém caracteres especiais comuns em senhas)
      const isAlreadyHashed = user.senha && user.senha.length === 64 && /^[a-f0-9]+$/i.test(user.senha);
      
      if (!isAlreadyHashed && user.senha) {
        console.log(`🔐 Migrando senha do usuário: ${user.nome} (${user.email})`);
        
        // Gerar hash da senha atual
        const hashedPassword = hashPassword(user.senha);
        
        // Atualizar no banco
        await db.updateUser(user.id, {
          senha: hashedPassword
        });
        
        migratedCount++;
        console.log(`✅ Senha migrada para: ${user.nome}`);
      } else {
        console.log(`⏭️ Senha já migrada ou vazia: ${user.nome}`);
      }
    }
    
    console.log(`🎉 Migração concluída! ${migratedCount} senhas migradas com sucesso.`);
    return { success: true, migratedCount };
    
  } catch (error) {
    console.error('❌ Erro na migração de senhas:', error);
    return { success: false, error: error.message };
  }
};

// Função para criar usuário admin com senha em hash
export const createAdminUser = async (email, senha, nome = 'Administrador') => {
  try {
    const hashedPassword = hashPassword(senha);
    
    const adminUser = {
      nome,
      email,
      senha: hashedPassword,
      tipo: 'admin',
      ativo: true
    };
    
    const user = await db.createUser(adminUser);
    console.log('✅ Usuário admin criado com sucesso:', user);
    return user;
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error);
    throw error;
  }
};

// Função para criar vendedor com senha em hash
export const createVendedorUser = async (email, senha, nome, regiao = 'sudeste') => {
  try {
    const hashedPassword = hashPassword(senha);
    
    const vendedorUser = {
      nome,
      email,
      senha: hashedPassword,
      tipo: 'vendedor',
      regiao,
      ativo: true
    };
    
    const user = await db.createUser(vendedorUser);
    console.log('✅ Vendedor criado com sucesso:', user);
    return user;
    
  } catch (error) {
    console.error('❌ Erro ao criar vendedor:', error);
    throw error;
  }
};
