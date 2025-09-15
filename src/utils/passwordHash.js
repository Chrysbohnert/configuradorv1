// Utilitário para hash de senhas
import CryptoJS from 'crypto-js';

const SALT = 'stark_orcamento_2024';

// Gerar hash da senha
export const hashPassword = (password) => {
  return CryptoJS.SHA256(password).toString();
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
