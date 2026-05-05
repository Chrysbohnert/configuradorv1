-- Adicionar colunas de instalação e bloqueio de desconto na tabela guindastes
-- Execute no Supabase SQL Editor caso as colunas ainda não existam

ALTER TABLE guindastes
  ADD COLUMN IF NOT EXISTS valor_instalacao_cliente numeric(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS valor_instalacao_incluso  numeric(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bloquear_desconto         boolean       DEFAULT false NOT NULL;
