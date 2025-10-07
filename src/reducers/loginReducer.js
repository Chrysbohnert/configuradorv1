/**
 * Reducer para gerenciar estados complexos do Login
 * @module reducers/loginReducer
 */

// Tipos de ações
export const LOGIN_ACTIONS = {
  // Estados de loading
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  
  // Dados do formulário
  SET_FORM_DATA: 'SET_FORM_DATA',
  UPDATE_FORM_FIELD: 'UPDATE_FORM_FIELD',
  RESET_FORM: 'RESET_FORM',
  
  // Validação
  SET_VALIDATION_ERRORS: 'SET_VALIDATION_ERRORS',
  CLEAR_VALIDATION_ERRORS: 'CLEAR_VALIDATION_ERRORS',
  UPDATE_VALIDATION_ERROR: 'UPDATE_VALIDATION_ERROR',
  
  // Autenticação
  SET_USER: 'SET_USER',
  SET_AUTHENTICATED: 'SET_AUTHENTICATED',
  LOGOUT: 'LOGOUT',
  
  // Rate limiting
  SET_RATE_LIMIT: 'SET_RATE_LIMIT',
  UPDATE_RATE_LIMIT: 'UPDATE_RATE_LIMIT',
  
  // Reset
  RESET_ALL: 'RESET_ALL'
};

// Estado inicial
export const initialState = {
  // Estados de loading
  isLoading: false,
  error: '',
  
  // Dados do formulário
  formData: {
    email: '',
    senha: ''
  },
  
  // Validação
  validationErrors: {},
  
  // Autenticação
  user: null,
  isAuthenticated: false,
  
  // Rate limiting
  rateLimit: {
    attempts: 0,
    lastAttempt: null,
    isBlocked: false,
    blockUntil: null
  }
};

// Reducer principal
export const loginReducer = (state, action) => {
  switch (action.type) {
    // Estados de loading
    case LOGIN_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
    
    case LOGIN_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
    
    case LOGIN_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: ''
      };
    
    // Dados do formulário
    case LOGIN_ACTIONS.SET_FORM_DATA:
      return {
        ...state,
        formData: action.payload
      };
    
    case LOGIN_ACTIONS.UPDATE_FORM_FIELD:
      return {
        ...state,
        formData: {
          ...state.formData,
          [action.payload.field]: action.payload.value
        }
      };
    
    case LOGIN_ACTIONS.RESET_FORM:
      return {
        ...state,
        formData: {
          email: '',
          senha: ''
        },
        validationErrors: {},
        error: ''
      };
    
    // Validação
    case LOGIN_ACTIONS.SET_VALIDATION_ERRORS:
      return {
        ...state,
        validationErrors: action.payload
      };
    
    case LOGIN_ACTIONS.CLEAR_VALIDATION_ERRORS:
      return {
        ...state,
        validationErrors: {}
      };
    
    case LOGIN_ACTIONS.UPDATE_VALIDATION_ERROR:
      const newErrors = { ...state.validationErrors };
      if (action.payload.value) {
        newErrors[action.payload.field] = action.payload.value;
      } else {
        delete newErrors[action.payload.field];
      }
      return {
        ...state,
        validationErrors: newErrors
      };
    
    // Autenticação
    case LOGIN_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload
      };
    
    case LOGIN_ACTIONS.SET_AUTHENTICATED:
      return {
        ...state,
        isAuthenticated: action.payload
      };
    
    case LOGIN_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        formData: {
          email: '',
          senha: ''
        },
        validationErrors: {},
        error: ''
      };
    
    // Rate limiting
    case LOGIN_ACTIONS.SET_RATE_LIMIT:
      return {
        ...state,
        rateLimit: action.payload
      };
    
    case LOGIN_ACTIONS.UPDATE_RATE_LIMIT:
      return {
        ...state,
        rateLimit: {
          ...state.rateLimit,
          ...action.payload
        }
      };
    
    // Reset
    case LOGIN_ACTIONS.RESET_ALL:
      return initialState;
    
    default:
      return state;
  }
};

// Action creators (funções auxiliares)
export const loginActionCreators = {
  // Estados de loading
  setLoading: (loading) => ({
    type: LOGIN_ACTIONS.SET_LOADING,
    payload: loading
  }),
  
  setError: (error) => ({
    type: LOGIN_ACTIONS.SET_ERROR,
    payload: error
  }),
  
  clearError: () => ({
    type: LOGIN_ACTIONS.CLEAR_ERROR
  }),
  
  // Dados do formulário
  setFormData: (data) => ({
    type: LOGIN_ACTIONS.SET_FORM_DATA,
    payload: data
  }),
  
  updateFormField: (field, value) => ({
    type: LOGIN_ACTIONS.UPDATE_FORM_FIELD,
    payload: { field, value }
  }),
  
  resetForm: () => ({
    type: LOGIN_ACTIONS.RESET_FORM
  }),
  
  // Validação
  setValidationErrors: (errors) => ({
    type: LOGIN_ACTIONS.SET_VALIDATION_ERRORS,
    payload: errors
  }),
  
  clearValidationErrors: () => ({
    type: LOGIN_ACTIONS.CLEAR_VALIDATION_ERRORS
  }),
  
  updateValidationError: (field, value) => ({
    type: LOGIN_ACTIONS.UPDATE_VALIDATION_ERROR,
    payload: { field, value }
  }),
  
  // Autenticação
  setUser: (user) => ({
    type: LOGIN_ACTIONS.SET_USER,
    payload: user
  }),
  
  setAuthenticated: (authenticated) => ({
    type: LOGIN_ACTIONS.SET_AUTHENTICATED,
    payload: authenticated
  }),
  
  logout: () => ({
    type: LOGIN_ACTIONS.LOGOUT
  }),
  
  // Rate limiting
  setRateLimit: (rateLimit) => ({
    type: LOGIN_ACTIONS.SET_RATE_LIMIT,
    payload: rateLimit
  }),
  
  updateRateLimit: (updates) => ({
    type: LOGIN_ACTIONS.UPDATE_RATE_LIMIT,
    payload: updates
  }),
  
  // Reset
  resetAll: () => ({
    type: LOGIN_ACTIONS.RESET_ALL
  })
};
