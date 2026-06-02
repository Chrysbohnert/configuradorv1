-- Adicionar coluna tipo_solicitante à tabela solicitacoes_desconto
-- Execute este SQL no banco de dados PostgreSQL se a coluna ainda não existir

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'solicitacoes_desconto'
          AND column_name = 'tipo_solicitante'
    ) THEN
        ALTER TABLE public.solicitacoes_desconto
        ADD COLUMN tipo_solicitante VARCHAR(30) DEFAULT 'vendedor';
    END IF;
END $$;
