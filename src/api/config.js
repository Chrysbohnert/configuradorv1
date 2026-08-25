/**
 * api/config.js
 * URL base da API — controlada por variável de ambiente.
 *
 * DEV  → usa VITE_API_URL se definida; senão usa caminho relativo /api
 *        encaminhado pelo proxy do Vite (padrão: http://localhost:3001).
 * PROD → usa VITE_API_URL ou fallback para a API de produção.
 */
export const API_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_API_URL || '')
  : (import.meta.env.VITE_API_URL || 'https://api-pedidos.starkindustrial.ind.br');
