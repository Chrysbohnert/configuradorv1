import { z } from 'zod';

// Regex patterns
const PHONE_REGEX = /^\(\d{2}\) \d{4,5}-\d{4}$/;
const CPF_REGEX = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
const CNPJ_REGEX = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
const CEP_REGEX = /^\d{5}-\d{3}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Schema de validação para Cliente
export const clienteSchema = z.object({
  nome: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  
  telefone: z.string()
    .regex(PHONE_REGEX, 'Telefone inválido. Use o formato (XX) XXXXX-XXXX'),
  
  email: z.string()
    .regex(EMAIL_REGEX, 'Email inválido')
    .max(100, 'Email deve ter no máximo 100 caracteres'),
  
  documento: z.string()
    .refine(
      (val) => CPF_REGEX.test(val) || CNPJ_REGEX.test(val),
      'CPF ou CNPJ inválido'
    ),
  
  inscricao_estadual: z.string()
    .optional()
    .nullable(),
  
  endereco: z.string()
    .min(5, 'Endereço deve ter no mínimo 5 caracteres')
    .max(200, 'Endereço deve ter no máximo 200 caracteres'),
  
  cidade: z.string()
    .min(2, 'Cidade deve ter no mínimo 2 caracteres')
    .max(100, 'Cidade deve ter no máximo 100 caracteres'),
  
  uf: z.string()
    .length(2, 'UF deve ter 2 caracteres')
    .toUpperCase(),
  
  cep: z.string()
    .regex(CEP_REGEX, 'CEP inválido. Use o formato XXXXX-XXX'),
  
  observacoes: z.string()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional()
    .nullable()
});

// Schema de validação para Caminhão
export const caminhaoSchema = z.object({
  tipo: z.string()
    .min(2, 'Tipo de veículo é obrigatório')
    .max(50, 'Tipo deve ter no máximo 50 caracteres'),
  
  marca: z.string()
    .min(2, 'Marca é obrigatória')
    .max(50, 'Marca deve ter no máximo 50 caracteres'),
  
  modelo: z.string()
    .min(2, 'Modelo é obrigatório')
    .max(50, 'Modelo deve ter no máximo 50 caracteres'),
  
  voltagem: z.string()
    .min(2, 'Voltagem é obrigatória')
    .max(20, 'Voltagem deve ter no máximo 20 caracteres'),
  
  ano: z.number()
    .int('Ano deve ser um número inteiro')
    .min(1990, 'Ano deve ser maior ou igual a 1990')
    .max(new Date().getFullYear() + 1, 'Ano inválido')
    .optional()
    .nullable(),
  
  observacoes: z.string()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional()
    .nullable()
});

// Schema de validação para Usuário
export const userSchema = z.object({
  nome: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  
  email: z.string()
    .regex(EMAIL_REGEX, 'Email inválido')
    .max(100, 'Email deve ter no máximo 100 caracteres'),
  
  telefone: z.string()
    .regex(PHONE_REGEX, 'Telefone inválido. Use o formato (XX) XXXXX-XXXX'),
  
  cpf: z.string()
    .regex(CPF_REGEX, 'CPF inválido. Use o formato XXX.XXX.XXX-XX'),
  
  tipo: z.enum(['admin', 'vendedor', 'admin_concessionaria', 'vendedor_concessionaria'], {
    errorMap: () => ({ message: 'Tipo inválido' })
  }),
  
  comissao: z.number()
    .min(0, 'Comissão deve ser maior ou igual a 0')
    .max(100, 'Comissão deve ser menor ou igual a 100')
    .optional()
    .nullable(),
  
  regiao: z.string()
    .min(2, 'Região é obrigatória')
    .max(50, 'Região deve ter no máximo 50 caracteres')
    .optional()
    .nullable(),
  
  senha: z.string()
    .min(6, 'Senha deve ter no mínimo 6 caracteres')
    .max(100, 'Senha deve ter no máximo 100 caracteres')
    .optional() // Opcional para updates
});

// Schema de validação para Login
export const loginSchema = z.object({
  email: z.string()
    .regex(EMAIL_REGEX, 'Email inválido'),
  
  senha: z.string()
    .min(1, 'Senha é obrigatória')
});

// Schema de validação para Guindaste
export const guindasteSchema = z.object({
  subgrupo: z.string()
    .min(2, 'Subgrupo é obrigatório')
    .max(100, 'Subgrupo deve ter no máximo 100 caracteres'),
  
  modelo: z.string()
    .min(2, 'Modelo é obrigatório')
    .max(100, 'Modelo deve ter no máximo 100 caracteres'),
  
  peso_kg: z.string()
    .min(1, 'Peso é obrigatório')
    .max(50, 'Peso deve ter no máximo 50 caracteres'),
  
  configuração: z.string()
    .max(100, 'Configuração deve ter no máximo 100 caracteres')
    .optional()
    .nullable(),
  
  tem_contr: z.enum(['Sim', 'Não'], {
    errorMap: () => ({ message: 'Tem CONTR deve ser Sim ou Não' })
  }).default('Não'),
  
  imagem_url: z.string()
    .url('URL da imagem inválida')
    .optional()
    .nullable(),
  
  descricao: z.string()
    .max(2000, 'Descrição deve ter no máximo 2000 caracteres')
    .optional()
    .nullable(),
  
  nao_incluido: z.string()
    .max(2000, 'Não incluído deve ter no máximo 2000 caracteres')
    .optional()
    .nullable(),
  
  codigo_referencia: z.string()
    .max(50, 'Código de referência deve ter no máximo 50 caracteres')
    .optional()
    .nullable(),
  
  finame: z.string()
    .max(50, 'FINAME deve ter no máximo 50 caracteres')
    .optional()
    .nullable(),
  
  ncm: z.string()
    .max(20, 'NCM deve ter no máximo 20 caracteres')
    .optional()
    .nullable(),
  
  imagens_adicionais: z.array(z.string().url('URL inválida'))
    .optional()
    .default([])
});

// Schema de validação para Preços por Região
export const precoRegiaoSchema = z.object({
  regiao: z.enum([
    'norte-nordeste',
    'centro-oeste',
    'sul-sudeste',
    'rs-com-ie',
    'rs-sem-ie'
  ], {
    errorMap: () => ({ message: 'Região inválida' })
  }),
  
  preco: z.number()
    .positive('Preço deve ser maior que zero')
    .max(999999999.99, 'Preço muito alto')
});

// Função helper para validar dados
export const validateData = (schema, data) => {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData, errors: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        formattedErrors[path] = err.message;
      });
      return { success: false, data: null, errors: formattedErrors };
    }
    return { success: false, data: null, errors: { general: 'Erro de validação' } };
  }
};

// Função helper para validar dados parciais (útil para updates)
export const validatePartialData = (schema, data) => {
  try {
    const partialSchema = schema.partial();
    const validatedData = partialSchema.parse(data);
    return { success: true, data: validatedData, errors: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        formattedErrors[path] = err.message;
      });
      return { success: false, data: null, errors: formattedErrors };
    }
    return { success: false, data: null, errors: { general: 'Erro de validação' } };
  }
};
