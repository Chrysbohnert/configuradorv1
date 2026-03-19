-- Permissões para PostgREST acessar a tabela configuracoes_globais
-- (Corrige erro 404 no endpoint /rest/v1/configuracoes_globais)

-- Garantir que a tabela esteja no schema public
-- (Se você criou em outro schema, ajuste aqui)

-- Grants básicos para roles usadas pelo Supabase REST
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.configuracoes_globais TO anon, authenticated;

-- Se preferir, você pode restringir depois via RLS.
-- Por enquanto, manter simples para o MVP.

-- Opcional: garantir que RLS esteja desativado (default). Se estiver ativado, desativa.
ALTER TABLE public.configuracoes_globais DISABLE ROW LEVEL SECURITY;
