/**
 * Utilitários de máscara e formatação de campos
 */

/**
 * Remove todos os caracteres não numéricos
 * @param {string} value - Valor a ser processado
 * @returns {string} Apenas dígitos
 */
export const onlyDigits = (value) => (value || '').replace(/\D/g, '');

/**
 * Aplica máscara de CEP (00000-000)
 * @param {string} value - Valor do CEP
 * @returns {string} CEP formatado
 */
export const maskCEP = (value) => {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return digits;
};

/**
 * Aplica máscara de telefone ((00) 00000-0000 ou (00) 0000-0000)
 * @param {string} value - Valor do telefone
 * @returns {string} Telefone formatado
 */
export const maskPhone = (value) => {
  const digits = onlyDigits(value).slice(0, 11);
  const ddd = digits.slice(0, 2);
  const isMobile = digits.length > 10; // 11 dígitos = celular
  const partA = isMobile ? digits.slice(2, 7) : digits.slice(2, 6);
  const partB = isMobile ? digits.slice(7, 11) : digits.slice(6, 10);
  
  let out = '';
  if (ddd) out += `(${ddd}`;
  if (ddd.length === 2) out += ') ';
  out += partA;
  if (partB) out += `-${partB}`;
  
  return out;
};

/**
 * Compõe endereço completo a partir de partes
 * @param {Object} data - Dados do endereço
 * @param {string} data.logradouro - Rua/Avenida
 * @param {string} data.numero - Número
 * @param {string} data.bairro - Bairro
 * @param {string} data.cidade - Cidade
 * @param {string} data.uf - Estado
 * @param {string} data.cep - CEP
 * @returns {string} Endereço completo formatado
 */
export const composeEndereco = (data) => {
  const parts = [];
  if (data.logradouro) parts.push(data.logradouro);
  if (data.numero) parts.push(`, ${data.numero}`);
  if (data.bairro) parts.push(` - ${data.bairro}`);
  if (data.cidade || data.uf) {
    parts.push(` - ${data.cidade || ''}${data.uf ? (data.cidade ? '/' : '') + data.uf : ''}`);
  }
  if (data.cep) parts.push(` - CEP: ${data.cep}`);
  return parts.join('');
};

/**
 * Aplica máscara de CPF (000.000.000-00)
 * @param {string} value - Valor do CPF
 * @returns {string} CPF formatado
 */
export const maskCPF = (value) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

/**
 * Aplica máscara de CNPJ (00.000.000/0000-00)
 * @param {string} value - Valor do CNPJ
 * @returns {string} CNPJ formatado
 */
export const maskCNPJ = (value) => {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

