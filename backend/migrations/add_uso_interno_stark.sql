-- Adicionar campo uso_interno_stark para permitir que Stark faça pedidos em nome de concessionárias
-- Este campo identifica usuários/concessionárias que podem fazer pedidos para outras concessionárias

ALTER TABLE concessionarias 
ADD COLUMN IF NOT EXISTS uso_interno_stark BOOLEAN DEFAULT FALSE;

-- Comentário explicativo
COMMENT ON COLUMN concessionarias.uso_interno_stark IS 'Indica se esta concessionária/usuário pode fazer pedidos em nome de outras concessionárias (uso interno da Stark)';
