// =====================================================
// CONSTANTES DO SISTEMA - STARK ORÇAMENTO
// =====================================================

// Tipos de usuário
export const USER_TYPES = {
  ADMIN: 'admin',
  VENDEDOR: 'vendedor'
};

// Status de pedidos
export const ORDER_STATUS = {
  EM_ANDAMENTO: 'em_andamento',
  FINALIZADO: 'finalizado',
  CANCELADO: 'cancelado'
};

// Tipos de guindastes
export const CRANE_TYPES = {
  HIDRAULICO: 'hidraulico',
  TELESCOPICO: 'telescopico',
  TORRE: 'torre'
};

// Categorias de opcionais
export const OPTIONAL_CATEGORIES = {
  ACESSORIO: 'acessorio',
  ILUMINACAO: 'iluminacao',
  CONTROLE: 'controle',
  SEGURANCA: 'seguranca'
};

// Regiões disponíveis
export const REGIONS = [
  { id: 'norte', nome: 'Norte' },
  { id: 'nordeste', nome: 'Nordeste' },
  { id: 'sudeste', nome: 'Sudeste' },
  { id: 'sul', nome: 'Sul' },
  { id: 'centro-oeste', nome: 'Centro-Oeste' }
];

// Categorias de guindastes para filtro
export const CRANE_CATEGORIES = [
  { id: 'todos', name: 'Todos' },
  { id: 'interno', name: 'Internos' },
  { id: 'externo', name: 'Externos' }
];

// Configurações de paginação
export const PAGINATION = {
  ITEMS_PER_PAGE: 10,
  MAX_PAGES: 5
};

// Configurações de upload
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ACCEPTED_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  RECOMMENDED_DIMENSIONS: { width: 400, height: 400 }
};

// Configurações de WhatsApp
export const WHATSAPP_CONFIG = {
  PHONE: '5511999999999',
  MESSAGE_TEMPLATE: 'Olá! Gostaria de discutir a proposta de guindaste.'
};

// Configurações de PDF
export const PDF_CONFIG = {
  COMPANY_NAME: 'STARK Orçamento',
  COMPANY_ADDRESS: 'Rua das Flores, 123 - Centro - Porto Alegre/RS',
  COMPANY_PHONE: '(55) 98172-1286',
  COMPANY_EMAIL: 'chrystianbohnert10@gmail.com',
  COMPANY_CNPJ: '12.345.678/0001-90',
  COMPANY_LOGO: '/cabecalho.png'
};

// Valores padrão
export const DEFAULT_VALUES = {
  VENDEDOR_PASSWORD: 'vendedor123',
  VENDEDOR_COMMISSION: 5.0,
  ADMIN_COMMISSION: 0.0
};

// Mensagens de erro
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet.',
  DATABASE_ERROR: 'Erro no banco de dados. Tente novamente.',
  UPLOAD_ERROR: 'Erro ao enviar arquivo. Tente novamente.',
  VALIDATION_ERROR: 'Dados inválidos. Verifique os campos.',
  AUTH_ERROR: 'Email ou senha incorretos.',
  PERMISSION_ERROR: 'Você não tem permissão para esta ação.'
};

// Mensagens de sucesso
export const SUCCESS_MESSAGES = {
  SAVE_SUCCESS: 'Dados salvos com sucesso!',
  DELETE_SUCCESS: 'Item removido com sucesso!',
  UPLOAD_SUCCESS: 'Arquivo enviado com sucesso!',
  ORDER_CREATED: 'Pedido criado com sucesso!'
}; 