/**
 * api/config.js
 * URL base da API — controlada por variável de ambiente.
 *
 * DEV  → VITE_API_URL=http://192.168.100.124:3001  (backend local)
 * PROD → VITE_API_URL=https://api-pedidos.starkindustrial.ind.br (ou vazio = fallback)
 */
export const API_URL =
  import.meta.env.VITE_API_URL || 'https://api-pedidos.starkindustrial.ind.br';
