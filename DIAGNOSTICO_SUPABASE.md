# 🔍 Diagnóstico: Erro "Failed to fetch" do Supabase

## ❌ Erro Atual
```
TypeError: Failed to fetch
```

## 🎯 Possíveis Causas

### 1. Arquivo `.env.local` não existe ou está incorreto

**Verificar:**
```bash
# Na raiz do projeto, verificar se existe:
cat .env.local
```

**Deve conter:**
```env
VITE_SUPABASE_URL=https://fgaklrgwjeakhjbslgbk.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

### 2. Servidor de desenvolvimento não carregou as variáveis

**Solução:**
```bash
# PARAR o servidor (Ctrl+C)
# REINICIAR o servidor
npm run dev
```

⚠️ **IMPORTANTE**: Variáveis de ambiente só são carregadas quando o servidor inicia!

### 3. Verificar se as variáveis estão sendo lidas

**Abrir Console do Navegador (F12) e executar:**
```javascript
// Ver as variáveis carregadas
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Configurada' : 'FALTANDO');
```

### 4. Verificar conexão com Supabase

**No Console do Navegador:**
```javascript
// Testar conexão direta
fetch('https://fgaklrgwjeakhjbslgbk.supabase.co/rest/v1/')
  .then(r => console.log('✅ Supabase acessível', r.status))
  .catch(e => console.error('❌ Supabase inacessível', e));
```

## ✅ Solução Rápida

### Passo 1: Criar/Verificar `.env.local`
```bash
# Na raiz do projeto (mesmo nível do package.json)
# Criar arquivo .env.local com:

VITE_SUPABASE_URL=https://fgaklrgwjeakhjbslgbk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnYWtscmd3amVha2hqYnNsZ2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE1MjU1OTksImV4cCI6MjA0NzEwMTU5OX0.xyz...
```

### Passo 2: Reiniciar o servidor
```bash
# Parar o servidor (Ctrl+C no terminal)
npm run dev
```

### Passo 3: Verificar no navegador
```
http://localhost:5173
```

## 🔧 Debug Avançado

### Verificar estrutura de arquivos:
```
configuradorv1/
├── .env.local          ← DEVE EXISTIR AQUI
├── package.json
├── vite.config.js
└── src/
    └── config/
        └── supabase.js
```

### Verificar se Vite está lendo o arquivo:

**No `vite.config.js`:**
```javascript
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  console.log('🔍 Variáveis carregadas:')
  console.log('URL:', env.VITE_SUPABASE_URL ? '✅' : '❌')
  console.log('KEY:', env.VITE_SUPABASE_ANON_KEY ? '✅' : '❌')
  
  return {
    // ... resto da config
  }
})
```

## 📝 Checklist

- [ ] Arquivo `.env.local` existe na raiz do projeto
- [ ] Arquivo contém `VITE_SUPABASE_URL`
- [ ] Arquivo contém `VITE_SUPABASE_ANON_KEY`
- [ ] Servidor foi **reiniciado** após criar/editar `.env.local`
- [ ] Console do navegador não mostra erro de variáveis faltando
- [ ] Supabase está acessível (teste com fetch)

## 🚨 Se ainda não funcionar

### Última alternativa: Hardcode temporário (APENAS PARA TESTE)

**Em `src/config/supabase.js`:**
```javascript
// TEMPORÁRIO - APENAS PARA TESTAR
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fgaklrgwjeakhjbslgbk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'SUA_CHAVE_AQUI';
```

⚠️ **NÃO COMMITAR ESSE CÓDIGO!** É só para testar.

## 📞 Próximos Passos

Se nada funcionar:
1. Verificar firewall/antivírus
2. Testar em outra rede
3. Verificar se o Supabase project está ativo
4. Verificar se as credenciais estão corretas no painel do Supabase


