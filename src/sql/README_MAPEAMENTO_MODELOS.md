# 🎯 Mapeamento de Configuração de Lanças por Modelo

## 📋 Problema Identificado

A coluna `peso_kg` está com valores numéricos (peso em kg) ao invés das configurações de lanças (2H1M, 3H1M, etc).

**Exemplo do problema:**
```
| modelo    | peso_kg | ❌ Errado (peso) | ✅ Correto (config) |
|-----------|---------|------------------|---------------------|
| GSI 6.5   | 6500    | ❌               | 2H1M               |
| GSI 8.0   | 8000    | ❌               | 3H1M               |
| GSE 10.8  | 10800   | ❌               | 3H0M               |
```

---

## 🔧 Solução

Use o script **`atualizar_configuracao_por_modelo.sql`** que mapeia cada modelo para sua configuração correta.

---

## 📊 Mapeamento Completo

### GSI (Guindastes Stark Industrial)

| Modelo  | Configuração | Descrição                    |
|---------|--------------|------------------------------|
| GSI 6.5 | **2H1M**     | 2 Hidráulicas + 1 Manual     |
| GSI 8.0 | **3H1M**     | 3 Hidráulicas + 1 Manual     |
| GSI 10.8| **4H0M**     | 4 Hidráulicas + 0 Manual     |

### GSE (Guindastes Stark Especiais)

| Modelo   | Configuração | Descrição                    |
|----------|--------------|------------------------------|
| GSE 6.5  | **2H1M**     | 2 Hidráulicas + 1 Manual     |
| GSE 8.0  | **3H1M**     | 3 Hidráulicas + 1 Manual     |
| GSE 10.8 | **3H0M**     | 3 Hidráulicas + 0 Manual     |
| GSE 12.8 | **3H2M**     | 3 Hidráulicas + 2 Manuais    |
| GSE 13.0 | **4H1M**     | 4 Hidráulicas + 1 Manual     |
| GSE 15.0 | **4H2M**     | 4 Hidráulicas + 2 Manuais    |
| GSE 15.8 | **4H2M**     | 4 Hidráulicas + 2 Manuais    |

---

## 🚀 Como Usar

### Passo 1: Abrir Supabase SQL Editor
1. Acesse seu projeto no Supabase
2. Vá em **SQL Editor**

### Passo 2: Copiar o Script
1. Abra o arquivo `atualizar_configuracao_por_modelo.sql`
2. Copie **todo o conteúdo**

### Passo 3: Executar
1. Cole no SQL Editor do Supabase
2. Clique em **Run** (ou pressione Ctrl+Enter)
3. Aguarde a execução

### Passo 4: Verificar Resultado
Execute esta query para confirmar:

```sql
SELECT 
  peso_kg AS configuracao,
  COUNT(*) AS quantidade
FROM guindastes
WHERE peso_kg IN ('2H1M', '3H0M', '3H1M', '3H2M', '4H0M', '4H1M', '4H2M')
GROUP BY peso_kg
ORDER BY peso_kg;
```

**Resultado esperado:**
```
configuracao | quantidade
-------------|------------
2H1M         | X
3H0M         | X
3H1M         | X
3H2M         | X
4H0M         | X
4H1M         | X
4H2M         | X
```

---

## 🔍 Verificar Guindastes Não Atualizados

Se ainda houver guindastes com valores numéricos:

```sql
SELECT 
  id,
  subgrupo,
  modelo,
  grupo,
  peso_kg
FROM guindastes
WHERE peso_kg NOT IN ('2H1M', '3H0M', '3H1M', '3H2M', '4H0M', '4H1M', '4H2M')
  AND peso_kg IS NOT NULL
ORDER BY grupo, modelo;
```

---

## 📝 Exemplo de Atualização Manual

Se algum guindaste específico não foi atualizado:

```sql
-- Por ID
UPDATE guindastes SET peso_kg = '3H1M' WHERE id = 123;

-- Por modelo
UPDATE guindastes SET peso_kg = '2H1M' WHERE modelo = 'GSI 6.5';

-- Por grupo e capacidade
UPDATE guindastes SET peso_kg = '4H0M' 
WHERE grupo = 'GSI' AND modelo LIKE 'GSI 10.8%';
```

---

## ✅ Checklist de Verificação

Após executar o script, verifique:

- [ ] Todos os GSI 6.5 estão com `2H1M`
- [ ] Todos os GSI 8.0 estão com `3H1M`
- [ ] Todos os GSI 10.8 estão com `4H0M`
- [ ] Todos os GSE 6.5 estão com `2H1M`
- [ ] Todos os GSE 8.0 estão com `3H1M`
- [ ] Todos os GSE 10.8 estão com `3H0M`
- [ ] Todos os GSE 12.8 estão com `3H2M`
- [ ] Todos os GSE 13.0 estão com `4H1M`
- [ ] Todos os GSE 15.0 estão com `4H2M`
- [ ] Todos os GSE 15.8 estão com `4H2M`

---

## 🎨 Baseado na Planilha Original

Este mapeamento foi criado com base na planilha fornecida onde:
- **Verde** 🟩 = Modelos principais
- **Amarelo** 🟨 = Modelos especiais
- **Branco** ⬜ = Modelos padrão

---

## ⚠️ IMPORTANTE

Este script **substitui os valores numéricos** de `peso_kg` pelas configurações de lanças.

Se você precisar manter os pesos originais, considere:
1. Criar uma coluna `peso_kg_original` antes de executar
2. Ou criar uma nova coluna `configuracao_lancas` separada

**Para criar backup dos pesos:**
```sql
-- Criar coluna de backup
ALTER TABLE guindastes ADD COLUMN peso_kg_backup TEXT;

-- Copiar valores
UPDATE guindastes SET peso_kg_backup = peso_kg;

-- Depois pode executar o script de atualização
```

---

## 📞 Dúvidas?

Se algum modelo não foi mapeado ou está incorreto:
1. Verifique a query de guindastes não atualizados (acima)
2. Adicione o mapeamento manual conforme necessário
3. Execute novamente a verificação

**Data de criação:** 12/10/2025

