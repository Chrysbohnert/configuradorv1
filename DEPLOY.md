# 🚀 GUIA DE DEPLOY - VERCEL

## 📋 **PRÉ-REQUISITOS**

### **1. Contas Necessárias:**
- ✅ [GitHub](https://github.com) - Para hospedar o código
- ✅ [Vercel](https://vercel.com) - Para hospedar a aplicação
- ✅ [Supabase](https://supabase.com) - Banco de dados (já configurado)

### **2. Projeto Preparado:**
- ✅ Código funcionando localmente
- ✅ Variáveis de ambiente configuradas
- ✅ Banco de dados configurado

---

## **PASSO 1: CRIAR REPOSITÓRIO NO GITHUB**

### **1.1. Criar Repositório:**
1. Acesse [github.com](https://github.com)
2. Clique em **"New repository"**
3. Configure:
   - **Repository name:** `stark-orcamento`
   - **Description:** Sistema de orçamentos para guindastes
   - **Visibility:** Private (recomendado)
4. Clique em **"Create repository"**

### **1.2. Enviar Código:**
```bash
# No terminal, na pasta do projeto
git init
git add .
git commit -m "Primeira versão - Sistema de orçamentos"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/stark-orcamento.git
git push -u origin main
```

---

## **PASSO 2: CONFIGURAR VERCEL**

### **2.1. Criar Conta:**
1. Acesse [vercel.com](https://vercel.com)
2. Clique em **"Sign Up"**
3. Use sua conta do GitHub para login

### **2.2. Conectar Repositório:**
1. No dashboard da Vercel, clique em **"New Project"**
2. Selecione o repositório `stark-orcamento`
3. Clique em **"Import"**

### **2.3. Configurar Projeto:**
1. **Framework Preset:** Vite
2. **Root Directory:** `./` (deixar padrão)
3. **Build Command:** `npm run build` (deixar padrão)
4. **Output Directory:** `dist` (deixar padrão)
5. **Install Command:** `npm install` (deixar padrão)

### **2.4. Configurar Variáveis de Ambiente:**
Clique em **"Environment Variables"** e adicione:

```
VITE_SUPABASE_URL=sua-url-do-supabase
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

**IMPORTANTE:** Use os mesmos valores do seu `.env.local`

### **2.5. Deploy:**
1. Clique em **"Deploy"**
2. Aguarde o build (2-3 minutos)
3. Pronto! Seu site estará online

---

## **PASSO 3: CONFIGURAR DOMÍNIO (OPCIONAL)**

### **3.1. Domínio Personalizado:**
1. No projeto Vercel, vá em **"Settings"**
2. Clique em **"Domains"**
3. Adicione seu domínio (ex: `starkorcamento.com`)
4. Configure os DNS conforme instruções da Vercel

### **3.2. Subdomínio:**
- URL padrão: `stark-orcamento.vercel.app`
- Você pode personalizar: `stark-orcamento-seu-nome.vercel.app`

---

## **PASSO 4: TESTAR PRODUÇÃO**

### **4.1. Verificar Funcionalidades:**
1. ✅ Login funciona
2. ✅ Cadastro de vendedores
3. ✅ Cadastro de guindastes
4. ✅ Upload de imagens
5. ✅ Criação de orçamentos
6. ✅ Geração de PDF

### **4.2. Testar em Diferentes Dispositivos:**
- 📱 Mobile
- 💻 Desktop
- 📱 Tablet

---

## **PASSO 5: MANUTENÇÃO**

### **5.1. Atualizações Automáticas:**
- Cada push para `main` faz deploy automático
- A Vercel detecta mudanças e reconstrói

### **5.2. Monitoramento:**
- Vercel Analytics (opcional)
- Logs de erro no dashboard
- Performance monitoring

### **5.3. Backup:**
- Código: GitHub
- Banco: Supabase (backup automático)
- Imagens: Supabase Storage

---

## **🔧 TROUBLESHOOTING**

### **Erro de Build:**
```bash
# Verificar localmente
npm run build
```

### **Erro de Variáveis de Ambiente:**
- Verificar se estão configuradas na Vercel
- Confirmar nomes: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`

### **Erro de CORS:**
- Configurar domínios permitidos no Supabase
- Adicionar URL da Vercel nas configurações

### **Erro de Upload:**
- Verificar políticas do Supabase Storage
- Confirmar bucket `guindastes-images` existe

---

## **📞 SUPORTE**

### **Links Úteis:**
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev/guide/)

### **Comandos Úteis:**
```bash
# Testar build local
npm run build

# Preview da build
npm run preview

# Verificar variáveis
echo $VITE_SUPABASE_URL
```

---

**🎉 PARABÉNS! Seu sistema está online e profissional!** 