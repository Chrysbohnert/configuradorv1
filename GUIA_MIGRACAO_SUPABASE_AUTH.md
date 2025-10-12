# 🔐 Guia Completo: Migração para Supabase Auth

## 📋 Visão Geral

Este guia explica como migrar do sistema dual de autenticação (Supabase Auth + Local) para usar **apenas Supabase Auth**.

### **Status Atual:**
- ✅ Script de migração criado
- ✅ Login refatorado (prioriza Supabase Auth)
- ✅ ProtectedRoute atualizado
- ⚠️ Sistema híbrido (compatível com ambos)

---

## 🚀 Passo a Passo - Migração Segura

### **FASE 1: Preparação** (Você está aqui! ✅)

Arquivos criados:
- `src/utils/migrateUsersToSupabaseAuth.js` → Script de migração
- `src/pages/LoginRefactored.jsx` → Novo login
- `src/components/ProtectedRouteRefactored.jsx` → Nova proteção de rotas

**Não quebra nada!** Sistema atual continua funcionando.

---

### **FASE 2: Migrar Usuários para Supabase Auth** 

#### **Passo 1: Verificar Usuários Existentes**

No console do navegador (F12):

```javascript
// Importar função
import { checkMigrationStatus } from './utils/migrateUsersToSupabaseAuth';

// Verificar status
await checkMigrationStatus();
```

Vai mostrar todos os usuários na tabela `users`.

---

#### **Passo 2: Migrar Todos os Usuários**

```javascript
// Importar função de migração
import { migrateAllUsers } from './utils/migrateUsersToSupabaseAuth';

// Executar migração (senha temporária: Temp@123456)
const result = await migrateAllUsers('Temp@123456');

// Ver resultado
console.log(result);
```

**O que acontece:**
1. ✅ Cria cada usuário no Supabase Auth
2. ✅ Preserva tipo (admin/vendedor) no `user_metadata`
3. ✅ Envia email de confirmação
4. ✅ Define senha temporária `Temp@123456`

**IMPORTANTE:**
- 📧 Os usuários receberão email de confirmação
- 🔐 Peça para trocarem a senha no primeiro login
- ⚠️ A senha temporária é a mesma para todos (por simplicidade)

---

#### **Passo 3: Migrar Usuário Individual (Opcional)**

Para testar com um usuário primeiro:

```javascript
import { migrateSingleUser } from './utils/migrateUsersToSupabaseAuth';

// Migrar admin de teste
await migrateSingleUser('admin@exemplo.com', 'Temp@123456');
```

---

### **FASE 3: Ativar Sistema Refatorado**

#### **Passo 1: Substituir Login**

Em `src/App.jsx` (ou onde as rotas estão):

**ANTES:**
```javascript
import Login from './pages/Login';
```

**DEPOIS:**
```javascript
import Login from './pages/LoginRefactored';
```

---

#### **Passo 2: Substituir ProtectedRoute**

**ANTES:**
```javascript
import ProtectedRoute from './components/ProtectedRoute';
```

**DEPOIS:**
```javascript
import ProtectedRoute from './components/ProtectedRouteRefactored';
```

---

#### **Passo 3: Testar**

1. **Fazer logout** (se logado)
2. **Limpar localStorage:**
   ```javascript
   localStorage.clear();
   ```
3. **Fazer login** com usuário migrado:
   - Email: `seu@email.com`
   - Senha: `Temp@123456` (ou a senha temporária definida)
4. **Acessar dashboards** e verificar permissões

---

### **FASE 4: Ajustar Políticas RLS** 🔒

Agora que todos estão no Supabase Auth, **as políticas RLS funcionarão perfeitamente!**

#### **Política para Guindastes (já existe):**

```sql
-- Leitura para usuários autenticados
CREATE POLICY "guindastes_select_authed" 
ON guindastes 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update para usuários autenticados
CREATE POLICY "Allow full update for authenticated users" 
ON guindastes 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);
```

✅ Agora vai funcionar porque todos terão `auth.uid()` válido!

---

## 📊 Como Funciona o Sistema Refatorado

### **LoginRefactored.jsx:**

```
┌─────────────────────────────────────────┐
│  Usuário digita email + senha           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  1. Tenta Supabase Auth (prioridade)    │
└──────────────┬──────────────────────────┘
               │
         ┌─────┴─────┐
         │           │
     Sucesso      Falhou
         │           │
         ▼           ▼
     Redireciona  2. Tenta Local (fallback)
     para         │
     Dashboard    ▼
              ┌───────┐
              │ Sucesso│ → Redireciona + Aviso de migração
              │ Falhou │ → Erro "Email ou senha incorretos"
              └────────┘
```

### **ProtectedRouteRefactored.jsx:**

```
┌─────────────────────────────────────────┐
│  Usuário tenta acessar rota protegida  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  1. Verifica Sessão Supabase Auth       │
└──────────────┬──────────────────────────┘
               │
         ┌─────┴─────┐
         │           │
      Existe     Não existe
         │           │
         ▼           ▼
     Autoriza    2. Verifica Local (fallback)
                     │
                 ┌───┴───┐
                 │       │
              Válido  Inválido
                 │       │
                 ▼       ▼
             Autoriza  Redireciona
                       para Login
```

---

## 🎯 Benefícios do Sistema Refatorado

### **Antes (Sistema Dual):**
- ❌ Dois métodos de autenticação confusos
- ❌ RLS não funcionava com autenticação local
- ❌ Fallback complicado
- ❌ Difícil de debugar

### **Depois (Supabase Auth Prioritário):**
- ✅ Um sistema principal claro (Supabase Auth)
- ✅ RLS funciona perfeitamente
- ✅ Fallback apenas para compatibilidade temporária
- ✅ Fácil de remover fallback no futuro
- ✅ Tokens JWT seguros
- ✅ Renovação automática de token
- ✅ Auditoria de acessos

---

## 🔧 Comandos Úteis

### **Verificar sessão Supabase:**
```javascript
const { data } = await supabase.auth.getSession();
console.log('Sessão:', data.session);
```

### **Ver usuário autenticado:**
```javascript
const { data } = await supabase.auth.getUser();
console.log('Usuário:', data.user);
console.log('Metadata:', data.user.user_metadata);
```

### **Fazer logout:**
```javascript
await supabase.auth.signOut();
localStorage.clear();
```

### **Trocar senha:**
```javascript
await supabase.auth.updateUser({
  password: 'nova_senha_123'
});
```

---

## ⚠️ Troubleshooting

### **Problema: "Email não confirmado"**

**Solução:** No Supabase Dashboard:
1. Authentication → Users
2. Encontrar usuário
3. Clicar nos "..." → Confirm email

---

### **Problema: "Sessão Supabase não encontrada"**

**Solução:** Usuário ainda não foi migrado.
```javascript
await migrateSingleUser('email@usuario.com');
```

---

### **Problema: "RLS bloqueia acesso"**

**Solução:** Verificar se políticas RLS estão corretas:
```sql
-- Ver políticas ativas
SELECT * FROM pg_policies WHERE tablename = 'guindastes';
```

---

## 🗑️ FASE 5: Limpeza (Futuro)

Depois que **todos** os usuários foram migrados e testados, você pode:

1. **Remover Login antigo:**
   ```bash
   rm src/pages/Login.jsx
   ```

2. **Remover ProtectedRoute antigo:**
   ```bash
   rm src/components/ProtectedRoute.jsx
   ```

3. **Renomear arquivos refatorados:**
   ```bash
   mv src/pages/LoginRefactored.jsx src/pages/Login.jsx
   mv src/components/ProtectedRouteRefactored.jsx src/components/ProtectedRoute.jsx
   ```

4. **Remover código de fallback** nos arquivos refatorados

5. **(Opcional) Remover tabela `users`** - manter apenas Supabase Auth

---

## 📝 Checklist de Migração

- [ ] Fase 1: Arquivos criados ✅
- [ ] Fase 2: Usuários migrados para Supabase Auth
- [ ] Fase 3: Sistema refatorado ativado
- [ ] Fase 4: RLS ajustado e testado
- [ ] Fase 5: Código antigo removido

---

## 🆘 Suporte

Se algo der errado:

1. **Reverter para sistema antigo** (trocar imports)
2. **Verificar logs** no console (F12)
3. **Verificar Supabase Dashboard** → Authentication → Users
4. **Testar com usuário individual** antes de migrar todos

---

**Data:** 12/10/2025  
**Status:** ✅ Fase 1 Completa - Pronto para migração de usuários!

