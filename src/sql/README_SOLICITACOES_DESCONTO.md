# 🔓 Sistema de Aprovação de Descontos

## 📋 Descrição

Sistema de aprovação de descontos em tempo real para vendedores que precisam aplicar descontos acima de 7%.

## 🚀 Como Executar o SQL

### 1. Acessar o Supabase

1. Acesse: https://supabase.com
2. Faça login no seu projeto
3. Vá em: **SQL Editor** (menu lateral esquerdo)

### 2. Executar o Script

1. Clique em **+ New Query**
2. Copie TODO o conteúdo do arquivo: `criar_tabela_solicitacoes_desconto.sql`
3. Cole no editor
4. Clique em **Run** (ou pressione `Ctrl + Enter`)

### 3. Verificar Sucesso

Você deve ver:
- ✅ Tabela `solicitacoes_desconto` criada
- ✅ Índices criados
- ✅ Trigger criado
- ✅ 5 Policies RLS criadas

## 📊 Estrutura da Tabela

```sql
solicitacoes_desconto
├── id (UUID)
├── pedido_id (UUID)
├── numero_proposta (TEXT)
├── vendedor_id (UUID) → users.id
├── vendedor_nome (TEXT)
├── vendedor_email (TEXT)
├── equipamento_descricao (TEXT)
├── valor_base (NUMERIC)
├── desconto_atual (NUMERIC) -- padrão: 7%
├── justificativa (TEXT)
├── desconto_aprovado (NUMERIC) -- 8-12%
├── observacao_gestor (TEXT)
├── status (TEXT) -- pendente | aprovado | negado | cancelado
├── aprovador_id (UUID) → users.id
├── aprovador_nome (TEXT)
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ)
└── respondido_at (TIMESTAMPTZ)
```

## 🔒 Segurança (RLS Policies)

### Vendedores:
- ✅ Podem ver apenas suas próprias solicitações
- ✅ Podem criar novas solicitações
- ✅ Podem cancelar solicitações pendentes

### Admins:
- ✅ Veem TODAS as solicitações
- ✅ Podem aprovar/negar qualquer solicitação
- ✅ Podem definir o % de desconto (8-12%)

## 🔄 Fluxo de Dados

```
1. VENDEDOR cria solicitação (status: pendente)
   ↓
2. REALTIME notifica ADMIN
   ↓
3. ADMIN aprova e define % (status: aprovado)
   ↓
4. REALTIME notifica VENDEDOR
   ↓
5. VENDEDOR aplica desconto automaticamente
```

## 🧪 Testar no Supabase

Após executar o SQL, você pode testar:

```sql
-- Ver todas as solicitações
SELECT * FROM solicitacoes_desconto;

-- Ver solicitações pendentes
SELECT * FROM solicitacoes_desconto WHERE status = 'pendente';

-- Ver histórico de um vendedor
SELECT * FROM solicitacoes_desconto 
WHERE vendedor_nome = 'João Silva'
ORDER BY created_at DESC;
```

## ⚠️ Importante

- Execute este SQL **ANTES** de usar o sistema de aprovação
- As policies RLS garantem segurança automática
- O trigger `updated_at` atualiza automaticamente
- Índices garantem performance mesmo com muitos registros

## 📞 Suporte

Se houver erro na execução:
1. Verifique se a tabela `users` existe
2. Verifique se o campo `users.tipo` existe
3. Copie o erro e me envie para análise
