# 📁 Scripts SQL - Configurador de Guindastes

Este diretório contém todos os scripts SQL necessários para criar e gerenciar o banco de dados do sistema.

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Scripts Disponíveis](#scripts-disponíveis)
3. [Como Usar](#como-usar)
4. [Estrutura do Banco](#estrutura-do-banco)
5. [Regiões e Preços](#regiões-e-preços)
6. [Dicas e Boas Práticas](#dicas-e-boas-práticas)
7. [Arquivos Disponíveis](#arquivos-disponíveis)

---

## 🎯 Visão Geral

O sistema utiliza **PostgreSQL** via **Supabase** como banco de dados. Os scripts estão organizados para facilitar:

- ✅ Criação inicial do banco do zero
- ✅ Inserção de dados de exemplo
- ✅ Manutenção e administração
- ✅ Geração de relatórios

---

## 📄 Scripts Disponíveis

### 1. `create_all_tables.sql`
**Descrição:** Script completo para criar todas as tabelas do zero.

**Inclui:**
- 11 tabelas principais
- Foreign keys e constraints
- Índices para otimização
- Triggers para `updated_at`
- Views úteis
- Dados iniciais de fretes

**Quando usar:** Primeira instalação ou recriação completa do banco.

---

### 2. `insert_initial_data.sql`
**Descrição:** Insere dados iniciais para começar a usar o sistema.

**Inclui:**
- Usuário administrador padrão
- 4 vendedores de exemplo (uma para cada região)
- 5 guindastes de exemplo
- Preços por região para os guindastes
- Cliente e caminhão de exemplo
- Eventos de logística
- Itens de pronta entrega

**Credenciais padrão:**
- **Admin:** admin@guindastes.com / admin123
- **Vendedor:** joao.silva@guindastes.com / vendedor123

⚠️ **IMPORTANTE:** Altere as senhas após o primeiro login!

---

### 3. `maintenance_queries.sql`
**Descrição:** Coleção de queries úteis para administração diária.

**Inclui queries para:**
- Gerenciamento de usuários
- Gerenciamento de guindastes e preços
- Relatórios de vendas
- Análises de clientes
- Estatísticas de performance
- Backup e exportação
- Verificação de integridade

---

### 4. `create_fretes_table.sql`
**Descrição:** Script específico para criar apenas a tabela de fretes.

**Útil quando:** Precisa recriar ou adicionar a tabela de fretes sem mexer nas outras.

---

## 🚀 Como Usar

### Instalação Inicial (Banco Novo)

Se você está criando o banco de dados do zero:

1. **Acesse o Supabase SQL Editor**
   - Vá para o painel do Supabase
   - Clique em "SQL Editor"

2. **Execute o script de criação de tabelas**
   ```sql
   -- Copie e cole o conteúdo de create_all_tables.sql
   -- Execute o script completo
   ```

3. **Execute o script de dados iniciais**
   ```sql
   -- Copie e cole o conteúdo de insert_initial_data.sql
   -- Execute o script completo
   ```

4. **Configure os buckets de storage**
   - Vá para "Storage" no Supabase
   - Crie dois buckets:
     - `guindastes` (público: true, 50MB max)
     - `graficos-carga` (público: false, com RLS)

5. **Faça o primeiro login**
   - Use: admin@guindastes.com / admin123
   - Altere a senha imediatamente

---

### Adicionando Dados

**Criar novo vendedor:**
```sql
INSERT INTO users (nome, email, telefone, tipo, comissao, regiao, senha, ativo) 
VALUES (
  'Nome do Vendedor',
  'email@exemplo.com',
  '(51) 99999-9999',
  'vendedor',
  5.00,
  'sul-sudeste',
  '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', -- vendedor123
  true
);
```

**Criar novo guindaste:**
```sql
INSERT INTO guindastes (subgrupo, modelo, peso_kg, configuracao, tem_contr, codigo_referencia)
VALUES (
  'Articulado',
  'GSI 4500',
  850.00,
  'CR, EH, ECL, ECS, P, GR',
  true,
  'GSI-4500'
);
```

**Configurar preços do guindaste em todas as regiões:**
```sql
-- Substitua 999 pelo ID do guindaste recém-criado
INSERT INTO precos_guindaste_regiao (guindaste_id, regiao, preco) VALUES
(999, 'norte-nordeste', 95000.00),
(999, 'sul-sudeste', 85000.00),
(999, 'centro-oeste', 90000.00),
(999, 'rs-com-ie', 82000.00),
(999, 'rs-sem-ie', 85000.00);
```

---

### Consultas Úteis

Todas as consultas de manutenção estão documentadas em `maintenance_queries.sql`. Exemplos:

**Ver vendas do mês:**
```sql
SELECT 
  v.nome AS vendedor,
  COUNT(p.id) AS pedidos,
  SUM(p.valor_total) AS faturamento
FROM pedidos p
INNER JOIN users v ON p.vendedor_id = v.id
WHERE p.created_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY v.nome
ORDER BY faturamento DESC;
```

**Verificar estoque de pronta entrega:**
```sql
SELECT 
  g.modelo,
  pe.quantidade,
  pe.localizacao
FROM pronta_entrega pe
INNER JOIN guindastes g ON pe.guindaste_id = g.id
WHERE pe.status = 'disponivel';
```

---

## 🗂️ Estrutura do Banco

### Tabelas Principais

| Tabela | Descrição | Chave Estrangeira |
|--------|-----------|-------------------|
| `users` | Usuários do sistema (admin/vendedor) | - |
| `guindastes` | Catálogo de guindastes | - |
| `precos_guindaste_regiao` | Preços por região | → guindastes |
| `clientes` | Cadastro de clientes | - |
| `caminhoes` | Caminhões dos clientes | → clientes |
| `pedidos` | Pedidos/orçamentos | → clientes, users, caminhoes |
| `pedido_itens` | Itens do pedido | → pedidos |
| `graficos_carga` | Gráficos técnicos (PDFs) | - |
| `eventos_logistica` | Calendário de logística | - |
| `pronta_entrega` | Estoque disponível | → guindastes |
| `fretes` | Valores de frete | - |

### Diagrama de Relacionamentos

```
users (vendedores/admins)
  ↓
pedidos ← clientes
  ↓          ↓
pedido_itens caminhoes
  ↓
guindastes → precos_guindaste_regiao
  ↓
pronta_entrega
```

---

## 🌎 Regiões e Preços

O sistema trabalha com **5 regiões de preço**:

| Região | Código | Descrição |
|--------|--------|-----------|
| Norte/Nordeste | `norte-nordeste` | Preços agrupados para N/NE |
| Sul/Sudeste | `sul-sudeste` | Preços agrupados para S/SE |
| Centro-Oeste | `centro-oeste` | Preços para CO |
| RS com IE | `rs-com-ie` | Rio Grande do Sul com Inscrição Estadual |
| RS sem IE | `rs-sem-ie` | Rio Grande do Sul sem Inscrição Estadual |

### Como Funcionam os Preços

1. **Vendedor faz login** → Sistema identifica a região dele
2. **Vendedor seleciona guindaste** → Sistema busca preço da região
3. **Para vendedores do RS** → Sistema pergunta se cliente tem IE
4. **Sistema aplica o preço correto** → Conforme região e IE

### Exemplo de Configuração de Preços

```sql
-- Guindaste GSI 2500
-- Preço base: R$ 50.000,00

INSERT INTO precos_guindaste_regiao (guindaste_id, regiao, preco) VALUES
(1, 'norte-nordeste', 57500.00),  -- +15% (logística cara)
(1, 'sul-sudeste', 50000.00),     -- Base
(1, 'centro-oeste', 54000.00),    -- +8%
(1, 'rs-com-ie', 47500.00),       -- -5% (incentivo IE)
(1, 'rs-sem-ie', 50000.00);       -- Base
```

---

## 💡 Dicas e Boas Práticas

### Senhas

As senhas são armazenadas com **hash SHA-256**. Use ferramentas online ou este código JavaScript para gerar hashes:

```javascript
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Exemplo de uso:
// hashPassword('minhaSenha123').then(console.log);
```

### Backup Regular

Faça backup regularmente do banco de dados:

**Via Supabase Dashboard:**
1. Vá em "Database" → "Backups"
2. Configure backups automáticos diários

**Via comando (se tiver acesso direto):**
```bash
pg_dump -h SEU_HOST -U postgres -d postgres > backup_$(date +%Y%m%d).sql
```

### Performance

- **Analyze** regularmente: `ANALYZE;`
- **Reindex** mensalmente em horário de baixo uso
- Monitore queries lentas via `pg_stat_statements`
- Mantenha índices atualizados

### Segurança

1. **Altere senhas padrão imediatamente**
2. **Configure Row Level Security (RLS)** no Supabase
3. **Use HTTPS** sempre
4. **Limite acesso ao SQL Editor** (só admins)
5. **Monitore logs de acesso**

### Manutenção

Execute periodicamente:

```sql
-- Atualizar estatísticas (semanal)
ANALYZE;

-- Verificar integridade (mensal)
-- Ver query em maintenance_queries.sql seção 11

-- Limpar dados antigos (trimestral)
-- Ver queries em maintenance_queries.sql seção 9
```

---

## 🆘 Solução de Problemas

### Erro: "relation already exists"

**Problema:** Tabela já existe no banco.

**Solução:**
```sql
-- Opção 1: Dropar a tabela específica
DROP TABLE nome_da_tabela CASCADE;

-- Opção 2: Recriar banco completamente (CUIDADO!)
-- Só faça isso se tiver certeza!
```

### Erro: "foreign key constraint"

**Problema:** Tentando deletar registro que tem dependências.

**Solução:**
```sql
-- Ver dependências primeiro
SELECT * FROM pedidos WHERE cliente_id = 123;

-- Depois deletar em ordem:
-- 1. pedido_itens
-- 2. pedidos
-- 3. caminhoes
-- 4. clientes
```

### Erro de performance / queries lentas

**Solução:**
```sql
-- 1. Atualizar estatísticas
ANALYZE;

-- 2. Ver queries lentas
-- (query em maintenance_queries.sql)

-- 3. Adicionar índices se necessário
CREATE INDEX idx_nome_indice ON tabela(coluna);
```

### Erro: "senha não confere"

**Problema:** Hash da senha incorreto.

**Solução:**
```sql
-- Resetar para senha padrão (vendedor123)
UPDATE users 
SET senha = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'
WHERE email = 'usuario@exemplo.com';
```

---

## 📞 Suporte

Para dúvidas ou problemas:

1. Consulte `maintenance_queries.sql` para queries comuns
2. Verifique os comentários no código SQL
3. Revise a documentação do Supabase
4. Entre em contato com o administrador do sistema

---

## 📚 Recursos Adicionais

- [Documentação do PostgreSQL](https://www.postgresql.org/docs/)
- [Documentação do Supabase](https://supabase.com/docs)
- [Guia de SQL](https://www.w3schools.com/sql/)

---

---

## 📂 Arquivos Disponíveis

Este diretório contém os seguintes arquivos SQL:

| Arquivo | Descrição | Quando Usar |
|---------|-----------|-------------|
| `create_all_tables.sql` | Script completo de criação das tabelas | Instalação inicial do banco |
| `insert_initial_data.sql` | Dados iniciais e exemplos | Após criar as tabelas |
| `maintenance_queries.sql` | Queries de administração e manutenção | Uso diário, relatórios |
| `migrations_and_updates.sql` | Scripts de migração e atualização | Atualizar banco existente |
| `examples_and_demos.sql` | Exemplos práticos de uso | Aprendizado e referência |
| `create_fretes_table.sql` | Criação específica da tabela fretes | Adicionar tabela fretes |
| `README.md` | Este arquivo de documentação | Leitura e orientação |

### 🎯 Fluxo Recomendado

**Para banco NOVO:**
1. Execute `create_all_tables.sql`
2. Execute `insert_initial_data.sql`
3. Configure os buckets de storage no Supabase
4. Faça login e teste o sistema

**Para banco EXISTENTE:**
1. Faça backup completo
2. Execute `migrations_and_updates.sql`
3. Verifique os logs e teste
4. Use `maintenance_queries.sql` para verificações

**Para aprender:**
1. Leia este `README.md`
2. Estude `examples_and_demos.sql`
3. Experimente as queries em ambiente de teste

---

**Última atualização:** Outubro de 2025
**Versão:** 1.0.0

