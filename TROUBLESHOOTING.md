# 🔧 Guia de Solução de Problemas

## 🚨 **PROBLEMA: Erro de Login "Invalid login credentials"**

### **Sintomas:**
- Erro 400 no Supabase Auth
- Mensagem "Invalid login credentials"
- Login não funciona mesmo com credenciais corretas

### **Causa:**
O Supabase Auth está falhando, mas o sistema deveria fazer fallback para o banco local.

### **Solução Passo a Passo:**

#### **1. Verificar se a Migração foi Executada**
```javascript
// No console do navegador (F12)
checkMigrationNeeded()
```

#### **2. Se Precisar Migrar, Execute:**
```javascript
runPasswordMigration()
```

#### **3. Debug Detalhado do Login:**
```javascript
// Substitua pelo seu email e senha
debugLogin('seu-email@exemplo.com', 'sua-senha')
```

#### **4. Listar Todos os Usuários:**
```javascript
listAllUsers()
```

#### **5. Testar Hash de Senha:**
```javascript
testPasswordHash('sua-senha')
```

## 🔍 **COMANDOS DE DEBUG DISPONÍVEIS**

### **Verificar Migração:**
```javascript
checkMigrationNeeded()
```
**Resultado esperado:** Lista de usuários que precisam migrar (deve estar vazia após migração)

### **Debug de Login:**
```javascript
debugLogin('email@exemplo.com', 'senha')
```
**Resultado esperado:** 
- `user: {dados do usuário}`
- `isValidPassword: true`
- `isHashed: true`

### **Listar Usuários:**
```javascript
listAllUsers()
```
**Resultado esperado:** Lista de todos os usuários com status de hash

### **Testar Hash:**
```javascript
testPasswordHash('minhasenha')
```
**Resultado esperado:** Hash gerado e verificação `true`

## 🛠️ **SOLUÇÕES ESPECÍFICAS**

### **Problema: "Senha em formato antigo"**
**Solução:**
```javascript
runPasswordMigration()
```

### **Problema: "Email não encontrado"**
**Soluções:**
1. Verificar se o email está correto
2. Listar usuários: `listAllUsers()`
3. Criar usuário de teste: `createTestVendedor()`

### **Problema: "Senha incorreta"**
**Soluções:**
1. Verificar se a senha está correta
2. Testar hash: `testPasswordHash('sua-senha')`
3. Debug completo: `debugLogin('email', 'senha')`

### **Problema: "Erro interno"**
**Soluções:**
1. Verificar console para erros
2. Verificar conexão com Supabase
3. Verificar variáveis de ambiente

## 📊 **STATUS ESPERADOS APÓS CORREÇÃO**

### **Login Bem-Sucedido:**
```
✅ Login via fallback bem-sucedido!
```

### **Usuário Encontrado:**
```
👤 Usuário encontrado: Sim
📋 Dados do usuário:
  - ID: [id]
  - Nome: [nome]
  - Email: [email]
  - Tipo: [tipo]
  - Senha (hash): [hash...]
  - Tamanho da senha: 64
  - É hash?: true
```

### **Senha Válida:**
```
🔐 Verificando senha...
✅ Senha válida: true
```

## 🚀 **COMANDOS RÁPIDOS**

### **Para Testar Login:**
```javascript
debugLogin('seu-email@exemplo.com', 'sua-senha')
```

### **Para Migrar Senhas:**
```javascript
runPasswordMigration()
```

### **Para Criar Usuário de Teste:**
```javascript
createTestVendedor()
```

### **Para Verificar Status:**
```javascript
checkMigrationNeeded()
```

## ⚠️ **PROBLEMAS COMUNS**

### **1. Senha não funciona após migração**
- **Causa:** Senha antiga em texto plano
- **Solução:** Use a senha original, o sistema fará hash automaticamente

### **2. "Email não encontrado"**
- **Causa:** Email incorreto ou usuário não existe
- **Solução:** Verificar email ou criar novo usuário

### **3. "Senha incorreta"**
- **Causa:** Senha digitada incorretamente
- **Solução:** Verificar se Caps Lock está ativo, digitar senha correta

### **4. Erro de conexão**
- **Causa:** Problema com Supabase
- **Solução:** Verificar variáveis de ambiente e conexão

## 📞 **SUPORTE**

Se os problemas persistirem:

1. **Verifique o console** para mensagens de erro
2. **Execute debug completo** com `debugLogin()`
3. **Verifique variáveis de ambiente** do Supabase
4. **Teste com usuário de teste** criado

---

**💡 Dica:** Sempre execute `checkMigrationNeeded()` primeiro para verificar o status das senhas!
