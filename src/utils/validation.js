// Validações para o sistema

// Validar email
export const validateEmail = (email) => {
  if (!email) return 'Email é obrigatório';
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Email inválido';
  }
  
  return null;
};

// Validar CPF
export const validateCPF = (cpf) => {
  if (!cpf) return 'CPF é obrigatório';
  
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) {
    return 'CPF deve ter 11 dígitos';
  }
  
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleaned)) {
    return 'CPF inválido';
  }
  
  // Validar dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned[9])) {
    return 'CPF inválido';
  }
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned[10])) {
    return 'CPF inválido';
  }
  
  return null;
};

// Validar CNPJ
export const validateCNPJ = (cnpj) => {
  if (!cnpj) return 'CNPJ é obrigatório';
  
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) {
    return 'CNPJ deve ter 14 dígitos';
  }
  
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleaned)) {
    return 'CNPJ inválido';
  }
  
  // Validar dígitos verificadores
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i]) * weights1[i];
  }
  let remainder = sum % 11;
  let digit1 = remainder < 2 ? 0 : 11 - remainder;
  
  if (digit1 !== parseInt(cleaned[12])) {
    return 'CNPJ inválido';
  }
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned[i]) * weights2[i];
  }
  remainder = sum % 11;
  let digit2 = remainder < 2 ? 0 : 11 - remainder;
  
  if (digit2 !== parseInt(cleaned[13])) {
    return 'CNPJ inválido';
  }
  
  return null;
};

// Validar telefone
export const validatePhone = (phone) => {
  if (!phone) return 'Telefone é obrigatório';
  
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 10 || cleaned.length > 11) {
    return 'Telefone deve ter 10 ou 11 dígitos';
  }
  
  return null;
};

// Validar nome
export const validateName = (name) => {
  if (!name) return 'Nome é obrigatório';
  
  if (name.length < 2) {
    return 'Nome deve ter pelo menos 2 caracteres';
  }
  
  if (name.length > 100) {
    return 'Nome deve ter no máximo 100 caracteres';
  }
  
  return null;
};

// Validar preço
export const validatePrice = (price) => {
  if (!price && price !== 0) return 'Preço é obrigatório';
  
  const numPrice = parseFloat(price);
  if (isNaN(numPrice) || numPrice < 0) {
    return 'Preço deve ser um valor positivo';
  }
  
  return null;
};

// Validar placa de veículo
export const validatePlate = (plate) => {
  if (!plate) return 'Placa é obrigatória';
  
  const cleaned = plate.replace(/\W/g, '').toUpperCase();
  
  // Formato antigo: ABC-1234
  const oldFormat = /^[A-Z]{3}\d{4}$/;
  // Formato Mercosul: ABC1D23
  const newFormat = /^[A-Z]{3}\d[A-Z]\d{2}$/;
  
  if (!oldFormat.test(cleaned) && !newFormat.test(cleaned)) {
    return 'Formato de placa inválido';
  }
  
  return null;
};

// Validar senha
export const validatePassword = (password) => {
  if (!password) return 'Senha é obrigatória';
  
  if (password.length < 6) {
    return 'Senha deve ter pelo menos 6 caracteres';
  }
  
  return null;
};

// Validar campos obrigatórios
export const validateRequired = (value, fieldName) => {
  if (!value && value !== 0) {
    return `${fieldName} é obrigatório`;
  }
  
  return null;
};

// Validar arquivo de imagem
export const validateImageFile = (file) => {
  if (!file) return 'Arquivo é obrigatório';
  
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return 'Formato de arquivo não suportado. Use JPG, PNG ou GIF';
  }
  
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return 'Arquivo muito grande. Máximo 5MB';
  }
  
  return null;
}; 