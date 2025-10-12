# 🚀 Instruções para Deploy em Produção - Acesso Admin aos Guindastes

## 📋 Problema Identificado

O admin não consegue ver os guindastes em produção porque:
- ✅ **RLS (Row Level Security)** está ativo e exige autenticação
- ✅ **Sessão do Supabase** não estava sendo persistida corretamente
- ✅ **Políticas RLS** exigem usuário `authenticated`

## ✅ Correções Aplicadas

### 1. **Persistência de Sessão do Supabase** (`src/config/supabase.js`)
```javascript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,      // ✅ Mantém sessão entre reloads
    autoRefreshToken: true,     // ✅ Renova token automaticamente
    detectSessionInUrl: true,   // ✅ Detecta sessão na URL
    storageKey: 'supabase.auth.token',
  }
});
```

### 2. **Validação de Autenticação** (`src/pages/GerenciarGuindastes.jsx`)
```javascript
// Verifica se sessão Supabase está ativa antes de carregar dados
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  // Redireciona para login se não autenticado
  localStorage.clear();
  navigate('/');
  return;
}
```

### 3. **Validação de URL de Imagem**
- Corrigido erro `ERR_INVALID_URL`
- Apenas URLs válidas (http/https) são carregadas
- Ícone SVG é exibido para guindastes sem imagem

---

## 🔧 Passos para Deploy em Produção

### **Passo 1: Verificar Variáveis de Ambiente no Vercel**

1. Acesse o **Vercel Dashboard**
2. Vá em **Settings** → **Environment Variables**
3. Verifique se existem:
   - `VITE_SUPABASE_URL` → URL do seu projeto Supabase
   - `VITE_SUPABASE_ANON_KEY` → Chave pública (anon)

⚠️ **IMPORTANTE:** Use a mesma URL e KEY que funcionam localmente!

---

### **Passo 2: Verificar Políticas RLS no Supabase**

As políticas atuais da tabela `guindastes` estão **CORRETAS**:

✅ **guindastes_select_authed** → `SELECT` → `authenticated`
✅ **Allow full update for authenticated users** → `UPDATE` → `authenticated`

Essas políticas permitem que **usuários autenticados** (admins logados) acessem os dados.

**NÃO é necessário criar política pública!** O admin deve estar logado.

---

### **Passo 3: Fazer Deploy das Alterações**

```bash
# 1. Commitar as alterações
git add .
git commit -m "fix: garantir autenticação Supabase para acesso admin aos guindastes"

# 2. Push para produção
git push origin main
```

O Vercel vai detectar o push e fazer deploy automático.

---

### **Passo 4: Testar em Produção**

1. **Fazer logout** (se estiver logado)
2. **Limpar localStorage** do navegador:
   ```javascript
   // No console do navegador (F12)
   localStorage.clear();
   location.reload();
   ```
3. **Fazer login novamente** como admin
4. **Acessar "Gerenciar Guindastes"**
5. **Verificar se os guindastes aparecem**

---

## 🔍 Debug em Produção (se ainda não funcionar)

### **1. Abrir Console do Navegador (F12)**

Verifique se há mensagens de erro:
- ❌ `Sessão Supabase não encontrada` → Problema de autenticação
- ❌ `401 Unauthorized` → RLS bloqueando acesso
- ❌ `403 Forbidden` → Permissões insuficientes

### **2. Verificar Sessão Supabase**

No console do navegador:
```javascript
// Verificar se sessão está ativa
const { data } = await supabase.auth.getSession();
console.log('Sessão:', data.session);

// Verificar usuário autenticado
const { data: user } = await supabase.auth.getUser();
console.log('Usuário:', user);
```

### **3. Verificar localStorage**

```javascript
// Ver o que está armazenado
console.log(localStorage);

// Verificar token Supabase
console.log(localStorage.getItem('supabase.auth.token'));
```

---

## 🎯 Checklist Final

Antes de declarar que está funcionando, verifique:

- [ ] Fez login em produção com usuário admin
- [ ] Consegue ver os 51/61 guindastes
- [ ] Não há erros no console
- [ ] Pode criar/editar/deletar guindastes
- [ ] Filtros de capacidade funcionam
- [ ] Botão "Todos" funciona sem erros
- [ ] Imagens carregam corretamente

---

## 🆘 Se Ainda Não Funcionar

### **Cenário A: Nenhum guindaste aparece**
→ Problema de RLS ou sessão
→ Verifique se o login está criando sessão Supabase
→ Verifique console para erro de autenticação

### **Cenário B: Aparecem poucos guindastes (ex: 50 de 61)**
→ Problema de paginação resolvido (pageSize=100)
→ Se ainda aparecer 50, verificar se há limite no RLS

### **Cenário C: Erro 401/403**
→ RLS está bloqueando
→ Verificar se políticas estão ativas
→ Verificar se usuário está como `authenticated`

---

## 📞 Suporte

Se o problema persistir, envie:
1. Screenshot do console (F12)
2. Screenshot das políticas RLS
3. Logs do Vercel (se houver erro de build)

---

## ✅ Resumo das Mudanças

| Arquivo | Alteração | Motivo |
|---------|-----------|--------|
| `src/config/supabase.js` | Adicionado `persistSession: true` | Manter sessão entre reloads |
| `src/pages/GerenciarGuindastes.jsx` | Validação de sessão antes de carregar | Garantir usuário autenticado |
| `src/pages/GerenciarGuindastes.jsx` | Validação de URL de imagem | Evitar erro ERR_INVALID_URL |

---

**Data:** 12/10/2025
**Status:** ✅ Pronto para produção

