// Centralizador de tratamento de erros

export const ErrorTypes = {
  NETWORK: 'NETWORK_ERROR',
  DATABASE: 'DATABASE_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  AUTH: 'AUTH_ERROR',
  PERMISSION: 'PERMISSION_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

export const ErrorMessages = {
  [ErrorTypes.NETWORK]: 'Erro de conexão. Verifique sua internet.',
  [ErrorTypes.DATABASE]: 'Erro no banco de dados. Tente novamente.',
  [ErrorTypes.VALIDATION]: 'Dados inválidos. Verifique os campos.',
  [ErrorTypes.AUTH]: 'Email ou senha incorretos.',
  [ErrorTypes.PERMISSION]: 'Você não tem permissão para esta ação.',
  [ErrorTypes.UNKNOWN]: 'Ocorreu um erro inesperado. Tente novamente.'
};

export const handleError = (error, context = '') => {
  console.error(`Erro em ${context}:`, error);
  
  // Determinar tipo de erro
  let errorType = ErrorTypes.UNKNOWN;
  
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    errorType = ErrorTypes.NETWORK;
  } else if (error.message?.includes('database') || error.message?.includes('supabase')) {
    errorType = ErrorTypes.DATABASE;
  } else if (error.message?.includes('validation') || error.message?.includes('invalid')) {
    errorType = ErrorTypes.VALIDATION;
  } else if (error.message?.includes('auth') || error.message?.includes('login')) {
    errorType = ErrorTypes.AUTH;
  } else if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
    errorType = ErrorTypes.PERMISSION;
  }
  
  return {
    type: errorType,
    message: ErrorMessages[errorType],
    originalError: error,
    context
  };
};

export const showError = (error, context = '') => {
  const handledError = handleError(error, context);
  alert(handledError.message);
  return handledError;
};
