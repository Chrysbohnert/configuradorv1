// Formatadores para o sistema

// Formatar moeda brasileira
export const formatCurrency = (value) => {
  if (!value && value !== 0) return 'R$ 0,00';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// Formatar CPF
export const formatCPF = (cpf) => {
  if (!cpf) return '';
  
  const cleaned = cpf.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{3})(\d{2})$/);
  
  if (match) {
    return `${match[1]}.${match[2]}.${match[3]}-${match[4]}`;
  }
  
  return cpf;
};

// Formatar CNPJ
export const formatCNPJ = (cnpj) => {
  if (!cnpj) return '';
  
  const cleaned = cnpj.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/);
  
  if (match) {
    return `${match[1]}.${match[2]}.${match[3]}/${match[4]}-${match[5]}`;
  }
  
  return cnpj;
};

// Formatar telefone
export const formatPhone = (phone) => {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{2})(\d{4,5})(\d{4})$/);
  
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  
  return phone;
};

// Formatar data
export const formatDate = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleDateString('pt-BR');
};

// Formatar data e hora
export const formatDateTime = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleString('pt-BR');
};

// Formatar nome (primeira letra maiúscula)
export const formatName = (name) => {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Formatar placa de veículo
export const formatPlate = (plate) => {
  if (!plate) return '';
  
  const cleaned = plate.replace(/\W/g, '').toUpperCase();
  const match = cleaned.match(/^([A-Z]{3})(\d{4})$/) || cleaned.match(/^([A-Z]{3})(\d{1})([A-Z]{1})(\d{2})$/);
  
  if (match) {
    return match.slice(1).join('-');
  }
  
  return plate.toUpperCase();
}; 

import { generateCodigoProduto as generateCodigoProdutoFromConfig, getDescricaoProduto as getDescricaoProdutoFromConfig, validarCombinacaoOpcionais as validarCombinacaoOpcionaisFromConfig } from '../config/codigosGuindaste';

/**
 * Gera o código único do produto (modelo + opcionais), considerando combinações especiais.
 * @param {string} modelo - Nome do modelo do guindaste (ex: 'GSE 10.8C')
 * @param {Array<string>} opcionais - Lista de opcionais selecionados (ex: ['CR', 'EH'])
 * @returns {string|null} Código único do produto ou null se não encontrado
 */
export function generateCodigoProduto(modelo, opcionais = []) {
  return generateCodigoProdutoFromConfig(modelo, opcionais);
}

/**
 * Obtém a descrição completa do produto
 * @param {string} modelo - Nome do modelo do guindaste
 * @param {Array<string>} opcionais - Lista de opcionais selecionados
 * @returns {string} Descrição completa do produto
 */
export function getDescricaoProduto(modelo, opcionais = []) {
  return getDescricaoProdutoFromConfig(modelo, opcionais);
}

/**
 * Valida se a combinação de opcionais é válida
 * @param {Array<string>} opcionais - Lista de opcionais selecionados
 * @returns {boolean} True se a combinação é válida
 */
export function validarCombinacaoOpcionais(opcionais) {
  return validarCombinacaoOpcionaisFromConfig(opcionais);
} 