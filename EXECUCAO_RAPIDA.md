# ⚡ Execução Rápida - Pontos de Instalação

## 🎯 Problema Encontrado
A tabela `fretes` não existe no banco de dados.

## ✅ Solução
Execute os scripts SQL **na ordem abaixo** no Supabase:

---

## 📋 ORDEM DE EXECUÇÃO

### 1️⃣ **CRIAR A TABELA**
📁 `src/sql/migrations/00_create_fretes_table.sql`

```
Acesse Supabase → SQL Editor → Cole o script → RUN
```

**Resultado esperado:**
```
✅ Tabela fretes criada com sucesso!
```

---

### 2️⃣ **INSERIR OS DADOS**
📁 `src/sql/migrations/insert_all_installation_points.sql`

```
Cole o script no SQL Editor → RUN
```

**Resultado esperado:**
```
Success. 48 rows affected
```

---

### 3️⃣ **VERIFICAR**
```sql
SELECT uf, COUNT(*) as total 
FROM fretes 
GROUP BY uf 
ORDER BY uf;
```

**Deve retornar:**
```
GO  | 1
MS  | 2
MT  | 3
PR  | 21
RS  | 15
SC  | 4
SP  | 2
```

---

## ⚠️ IMPORTANTE

**NÃO execute** o script `add_uf_regiao_to_fretes.sql` - ele é para casos onde a tabela já existia sem as colunas `uf` e `regiao_grupo`.

Como você está criando a tabela do zero, ela já vem com todas as colunas necessárias!

---

## 🎯 Resumo

1. ✅ Execute `00_create_fretes_table.sql` - Cria a tabela
2. ✅ Execute `insert_all_installation_points.sql` - Insere 48 oficinas
3. ✅ Teste no sistema

Pronto! O sistema vai funcionar automaticamente! 🚀

