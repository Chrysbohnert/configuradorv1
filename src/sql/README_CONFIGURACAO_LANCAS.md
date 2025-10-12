# 📋 Atualização de Configuração de Lanças

## 🎯 Objetivo

Atualizar a coluna `peso_kg` na tabela `guindastes` com as configurações de lanças (ex: 2H1M, 3H1M, 4H0M, etc).

**Nota:** A coluna `peso_kg` está sendo usada para armazenar a configuração de lanças, não o peso real do equipamento.

---

## 📁 Arquivos SQL

1. **`atualizar_configuracao_lancas.sql`** - Script básico e rápido
2. **`atualizar_configuracao_lancas_completo.sql`** - Script completo com validações e relatórios

---

## 🚀 Como Usar

### Opção 1: Script Rápido (Recomendado para primeira execução)

1. Acesse o **Supabase Dashboard** → Projeto → **SQL Editor**
2. Abra o arquivo `atualizar_configuracao_lancas.sql`
3. Copie e cole todo o conteúdo no SQL Editor
4. Clique em **Run** para executar
5. Verifique os resultados com as queries de verificação no final do script

### Opção 2: Script Completo (Para ajustes finos)

1. Use o arquivo `atualizar_configuracao_lancas_completo.sql`
2. Execute seção por seção conforme as instruções no arquivo
3. Verifique os relatórios entre cada etapa

---

## 📊 Configurações Disponíveis

Com base na planilha fornecida:

| Configuração | Descrição | Exemplo de Modelo |
|--------------|-----------|-------------------|
| **2H1M** | 2 Hidráulicas + 1 Manual | CR 3000 2H1M |
| **3H0M** | 3 Hidráulicas + 0 Manual | EH 3500 3H0M |
| **3H1M** | 3 Hidráulicas + 1 Manual | CR 5000 3H1M (mais comum) |
| **3H2M** | 3 Hidráulicas + 2 Manuais | EH 5000 3H2M |
| **4H0M** | 4 Hidráulicas + 0 Manual | CR 8000 4H0M |
| **4H1M** | 4 Hidráulicas + 1 Manual | EH 8000 4H1M |
| **4H2M** | 4 Hidráulicas + 2 Manuais | CR 10000 4H2M |

---

## 🔍 Verificar Resultado

Execute esta query no Supabase SQL Editor para ver o resultado:

```sql
-- Contar guindastes por configuração
SELECT 
  peso_kg AS configuracao_lancas,
  COUNT(*) AS quantidade
FROM guindastes
WHERE peso_kg IS NOT NULL
GROUP BY peso_kg
ORDER BY peso_kg;
```

**Resultado esperado:**

```
configuracao_lancas | quantidade
--------------------|------------
2H1M                | X
3H0M                | X
3H1M                | X (maior quantidade)
3H2M                | X
4H0M                | X
4H1M                | X
4H2M                | X
```

---

## ⚠️ Guindastes Sem Configuração

Se alguns guindastes não foram atualizados automaticamente, execute:

```sql
SELECT 
  id,
  nome,
  modelo,
  subgrupo,
  peso_kg
FROM guindastes
WHERE peso_kg IS NULL OR peso_kg = ''
ORDER BY nome;
```

Para atualizar manualmente:

```sql
-- Substitua ID e configuração conforme necessário
UPDATE guindastes SET peso_kg = '3H1M' WHERE id = 123;
```

---

## 🔧 Ajustes Manuais

Se precisar atualizar um guindaste específico:

```sql
-- Por ID
UPDATE guindastes SET peso_kg = '2H1M' WHERE id = 1;

-- Por nome exato
UPDATE guindastes SET peso_kg = '3H1M' WHERE nome = 'CR 5000';

-- Por padrão no nome
UPDATE guindastes SET peso_kg = '4H0M' WHERE nome ILIKE '%CR 8000%';
```

---

## 📈 Relatório Completo

```sql
-- Ver todos os guindastes ordenados por configuração
SELECT 
  peso_kg AS config,
  nome,
  modelo,
  subgrupo
FROM guindastes
ORDER BY 
  CASE 
    WHEN peso_kg = '2H1M' THEN 1
    WHEN peso_kg = '3H0M' THEN 2
    WHEN peso_kg = '3H1M' THEN 3
    WHEN peso_kg = '3H2M' THEN 4
    WHEN peso_kg = '4H0M' THEN 5
    WHEN peso_kg = '4H1M' THEN 6
    WHEN peso_kg = '4H2M' THEN 7
    ELSE 99
  END,
  nome;
```

---

## 🎨 Cores na Planilha Original

Na planilha que você forneceu, as cores eram:

- **Verde** 🟩: Modelos principais/mais vendidos
- **Amarelo** 🟨: Modelos especiais/destaque
- **Branco** ⬜: Modelos padrão

**Nota:** As cores não são armazenadas no banco de dados, são apenas visuais na planilha.

---

## ✅ Checklist Pós-Execução

- [ ] Todos os guindastes têm configuração de lanças (`peso_kg` preenchido)
- [ ] Configurações estão corretas (2H1M, 3H1M, etc)
- [ ] Nenhum guindaste com `peso_kg` vazio ou NULL
- [ ] Contagem de guindastes por configuração faz sentido

---

## 🆘 Problemas Comuns

### Problema 1: Alguns guindastes não foram atualizados
**Causa:** Nome/modelo do guindaste não contém a configuração  
**Solução:** Use atualização manual (seção "Ajustes Manuais" acima)

### Problema 2: Configuração errada
**Causa:** Padrão no nome estava ambíguo  
**Solução:** Corrija com UPDATE manual

### Problema 3: Preciso desfazer tudo
**Solução:**
```sql
-- Limpar todas as configurações
UPDATE guindastes SET peso_kg = NULL;

-- Ou restaurar backup se tiver
```

---

## 📞 Suporte

Se tiver dúvidas:
1. Verifique os logs do Supabase SQL Editor
2. Execute as queries de verificação
3. Consulte os comentários nos arquivos SQL

**Data de criação:** 12/10/2025  
**Última atualização:** 12/10/2025

