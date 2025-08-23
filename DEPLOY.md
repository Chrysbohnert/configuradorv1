# Guia de Deploy no Vercel

## Problema Identificado
O projeto está aparecendo em branco no Vercel porque as variáveis de ambiente do Supabase não estão configuradas.

## Solução

### 1. Configurar Variáveis de Ambiente no Vercel

1. Acesse o [Dashboard do Vercel](https://vercel.com/dashboard)
2. Selecione seu projeto `configuradorv1`
3. Vá para **Settings** > **Environment Variables**
4. Adicione as seguintes variáveis:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

**Importante:** Substitua pelos valores reais do seu projeto Supabase.

### 2. Como Obter as Credenciais do Supabase

1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá para **Settings** > **API**
4. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`

### 3. Re-deploy

Após configurar as variáveis:
1. No Vercel, vá para **Deployments**
2. Clique em **Redeploy** no último deployment
3. Ou faça um novo commit no GitHub para trigger automático

### 4. Verificação

Após o deploy, acesse:
- `https://configuradorv1-theta.vercel.app`
- O app deve carregar normalmente com a tela de login

## Arquivos Modificados

- ✅ `vercel.json` - Configuração otimizada para Vite
- ✅ `vite.config.js` - Simplificado para melhor compatibilidade
- ✅ `env.example` - Exemplo completo das variáveis necessárias

## Troubleshooting

Se ainda não funcionar:

1. **Verifique os logs do build** no Vercel
2. **Confirme que as variáveis estão corretas**
3. **Teste localmente** com `npm run build && npm run preview`
4. **Verifique se o Supabase está acessível** (não bloqueado por firewall)

## Comandos Úteis

```bash
# Teste local
npm run build
npm run preview

# Verificar variáveis de ambiente
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY
``` 