# 🔍 DIAGNÓSTICO: Problema de Login de Concessionária

## 📋 PASSO 1: Verificar se o usuário foi criado

Execute esta query no **SQL Editor do Supabase**:

```sql
-- Buscar a última concessionária criada e seu admin
SELECT 
  c.id as concessionaria_id,
  c.nome as concessionaria_nome,
  c.email as concessionaria_email,
  c.ativo as concessionaria_ativa,
  c.created_at as concessionaria_criada_em,
  u.id as user_id,
  u.nome as user_nome,
  u.email as user_email,
  u.tipo as user_tipo,
  u.concessionaria_id as user_concessionaria_id,
  u.senha as user_senha_hash,
  LENGTH(u.senha) as tamanho_senha
FROM concessionarias c
LEFT JOIN users u ON u.concessionaria_id = c.id AND u.tipo = 'admin_concessionaria'
ORDER BY c.created_at DESC
LIMIT 5;
```

---

## 🎯 POSSÍVEIS PROBLEMAS IDENTIFICADOS

### **PROBLEMA 1: Usuário não foi criado na tabela `users`**

**Sintoma:** A query acima mostra `user_id = NULL`

**Causa:** Erro silencioso durante `db.createUser()` na linha 215 de `Concessionarias.jsx`

**Solução:**
```sql
-- Criar o usuário manualmente
INSERT INTO users (nome, email, senha, tipo, concessionaria_id)
VALUES (
  'Nome do Admin',
  'email@concessionaria.com',
  -- Senha em hash SHA256 (exemplo: senha "123456")
  '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
  'admin_concessionaria',
  123 -- ID da concessionária
);
```

---

### **PROBLEMA 2: Senha não está em formato hash**

**Sintoma:** `tamanho_senha` diferente de 64 caracteres

**Causa:** Falha na função `hashPassword()` durante criação

**Solução:**
```sql
-- Atualizar senha para hash correto
-- Exemplo: senha "123456" = hash abaixo
UPDATE users
SET senha = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'
WHERE email = 'email@concessionaria.com';
```

**Para gerar hash de uma senha:**
1. Abra o console do navegador (F12)
2. Cole este código:
```javascript
async function gerarHash(senha) {
  const encoder = new TextEncoder();
  const data = encoder.encode(senha);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  console.log('Hash da senha:', hashHex);
  return hashHex;
}

// Exemplo: gerar hash da senha "minhasenha123"
gerarHash('minhasenha123');
```

---

### **PROBLEMA 3: Email com espaços ou caracteres especiais**

**Sintoma:** Email encontrado no banco mas login falha

**Solução:**
```sql
-- Verificar e limpar email
SELECT 
  id,
  email,
  LENGTH(email) as tamanho,
  email = TRIM(email) as email_limpo
FROM users
WHERE tipo = 'admin_concessionaria'
ORDER BY created_at DESC
LIMIT 5;

-- Se necessário, limpar email
UPDATE users
SET email = TRIM(LOWER(email))
WHERE tipo = 'admin_concessionaria';
```

---

### **PROBLEMA 4: Concessionária inativa**

**Sintoma:** Usuário existe mas login retorna erro de concessionária inativa

**Solução:**
```sql
-- Ativar concessionária
UPDATE concessionarias
SET ativo = true
WHERE id = 123; -- ID da concessionária
```

---

## 🔧 QUERY COMPLETA DE DIAGNÓSTICO

Execute esta query para ver TUDO:

```sql
SELECT 
  '=== CONCESSIONÁRIA ===' as secao,
  c.id,
  c.nome,
  c.email,
  c.ativo,
  c.regiao_preco,
  c.created_at
FROM concessionarias c
WHERE c.id = (SELECT MAX(id) FROM concessionarias)

UNION ALL

SELECT 
  '=== USUÁRIO ADMIN ===' as secao,
  u.id::text,
  u.nome,
  u.email,
  CASE WHEN u.senha IS NULL THEN 'SEM SENHA' 
       WHEN LENGTH(u.senha) = 64 THEN 'HASH OK' 
       ELSE 'HASH INVÁLIDO' END,
  u.tipo,
  u.created_at::text
FROM users u
WHERE u.concessionaria_id = (SELECT MAX(id) FROM concessionarias)
  AND u.tipo = 'admin_concessionaria';
```

---

## ✅ CHECKLIST DE VERIFICAÇÃO

Execute cada item e marque:

- [ ] **1. Concessionária existe na tabela `concessionarias`?**
- [ ] **2. Concessionária está ativa (`ativo = true`)?**
- [ ] **3. Usuário admin existe na tabela `users`?**
- [ ] **4. Email do usuário está correto (sem espaços)?**
- [ ] **5. Senha está em hash SHA256 (64 caracteres)?**
- [ ] **6. Campo `tipo` = 'admin_concessionaria'?**
- [ ] **7. Campo `concessionaria_id` aponta para concessionária correta?**

---

## 🚨 SE NADA FUNCIONAR

Execute este script para **recriar o usuário admin** manualmente:

```sql
-- 1. Deletar usuário existente (se houver)
DELETE FROM users 
WHERE email = 'SEU_EMAIL_AQUI@concessionaria.com';

-- 2. Criar novo usuário com senha hash
INSERT INTO users (nome, email, senha, tipo, concessionaria_id)
VALUES (
  'Admin Concessionária',
  'SEU_EMAIL_AQUI@concessionaria.com',
  -- Hash SHA256 da senha "senha123" (TROQUE POR SUA SENHA)
  '9b8769a4a742959a2d0298c36fb70623f2dfacda8436237df08d8dfd5b37374c',
  'admin_concessionaria',
  (SELECT MAX(id) FROM concessionarias) -- Última concessionária criada
)
RETURNING *;
```

---

## 📞 PRÓXIMOS PASSOS

1. Execute as queries acima
2. Me informe o resultado
3. Vou identificar o problema exato
4. Implementarei a correção no código se necessário

---

## 🔑 SENHAS HASH COMUNS (APENAS PARA TESTE)

| Senha | Hash SHA256 |
|-------|-------------|
| `123456` | `8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92` |
| `senha123` | `9b8769a4a742959a2d0298c36fb70623f2dfacda8436237df08d8dfd5b37374c` |
| `admin123` | `240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9` |

**⚠️ IMPORTANTE:** Troque a senha após o primeiro login!
