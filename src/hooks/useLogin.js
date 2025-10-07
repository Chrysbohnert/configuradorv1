import { useReducer, useCallback } from 'react';
import { loginReducer, initialState, loginActionCreators } from '../reducers/loginReducer';

/**
 * Hook personalizado para gerenciar estados do Login
 * @returns {Object} Estado e funções de controle
 */
export const useLogin = () => {
  const [state, dispatch] = useReducer(loginReducer, initialState);

  // Funções de loading
  const setLoading = useCallback((loading) => {
    dispatch(loginActionCreators.setLoading(loading));
  }, []);

  const setError = useCallback((error) => {
    dispatch(loginActionCreators.setError(error));
  }, []);

  const clearError = useCallback(() => {
    dispatch(loginActionCreators.clearError());
  }, []);

  // Funções do formulário
  const setFormData = useCallback((data) => {
    dispatch(loginActionCreators.setFormData(data));
  }, []);

  const updateFormField = useCallback((field, value) => {
    dispatch(loginActionCreators.updateFormField(field, value));
  }, []);

  const resetForm = useCallback(() => {
    dispatch(loginActionCreators.resetForm());
  }, []);

  // Funções de validação
  const setValidationErrors = useCallback((errors) => {
    dispatch(loginActionCreators.setValidationErrors(errors));
  }, []);

  const clearValidationErrors = useCallback(() => {
    dispatch(loginActionCreators.clearValidationErrors());
  }, []);

  const updateValidationError = useCallback((field, value) => {
    dispatch(loginActionCreators.updateValidationError(field, value));
  }, []);

  // Funções de autenticação
  const setUser = useCallback((user) => {
    dispatch(loginActionCreators.setUser(user));
  }, []);

  const setAuthenticated = useCallback((authenticated) => {
    dispatch(loginActionCreators.setAuthenticated(authenticated));
  }, []);

  const logout = useCallback(() => {
    dispatch(loginActionCreators.logout());
  }, []);

  // Funções de rate limiting
  const setRateLimit = useCallback((rateLimit) => {
    dispatch(loginActionCreators.setRateLimit(rateLimit));
  }, []);

  const updateRateLimit = useCallback((updates) => {
    dispatch(loginActionCreators.updateRateLimit(updates));
  }, []);

  // Funções de reset
  const resetAll = useCallback(() => {
    dispatch(loginActionCreators.resetAll());
  }, []);

  // Funções auxiliares
  const validateForm = useCallback(() => {
    const errors = {};
    
    if (!state.formData.email) {
      errors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(state.formData.email)) {
      errors.email = 'Email inválido';
    }
    
    if (!state.formData.senha) {
      errors.senha = 'Senha é obrigatória';
    } else if (state.formData.senha.length < 6) {
      errors.senha = 'Senha deve ter pelo menos 6 caracteres';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [state.formData, setValidationErrors]);

  const isFormValid = useCallback(() => {
    return state.formData.email && 
           state.formData.senha && 
           Object.keys(state.validationErrors).length === 0;
  }, [state.formData, state.validationErrors]);

  const canSubmit = useCallback(() => {
    return isFormValid() && 
           !state.isLoading && 
           !state.rateLimit.isBlocked;
  }, [isFormValid, state.isLoading, state.rateLimit.isBlocked]);

  return {
    // Estado
    state,
    
    // Loading
    setLoading,
    setError,
    clearError,
    
    // Formulário
    setFormData,
    updateFormField,
    resetForm,
    
    // Validação
    setValidationErrors,
    clearValidationErrors,
    updateValidationError,
    
    // Autenticação
    setUser,
    setAuthenticated,
    logout,
    
    // Rate limiting
    setRateLimit,
    updateRateLimit,
    
    // Reset
    resetAll,
    
    // Auxiliares
    validateForm,
    isFormValid,
    canSubmit
  };
};
