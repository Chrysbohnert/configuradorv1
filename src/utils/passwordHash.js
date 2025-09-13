// Utilitário para hash de senhas
import CryptoJS from 'crypto-js';

const SALT = 'stark_orcamento_2024';

// Gerar hash da senha
export const hashPassword = (password) => {
  return CryptoJS.PBKDF2(password, SALT, {
    keySize: 256/32,
    iterations: 10000
  }).toString();
};

// Verificar senha
export const verifyPassword = (password, hashedPassword) => {
  const hash = hashPassword(password);
  return hash === hashedPassword;
};

// Gerar senha aleatória
export const generateRandomPassword = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};
