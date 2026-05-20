// Debug Supabase desativado durante migração para PostgreSQL
export const debugLogin = async () => {
  console.warn('debugLogin desativado: migração Supabase -> PostgreSQL');
  return null;
};

export const debugAuth = async () => {
  console.warn('debugAuth desativado: migração Supabase -> PostgreSQL');
  return null;
};