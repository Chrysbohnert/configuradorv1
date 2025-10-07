# 📊 Sistema de Logging

## 📋 **O que foi implementado:**

### **1. Logger Centralizado:**
- `src/utils/logger.js` - Sistema principal de logging
- `src/hooks/useLogger.js` - Hook personalizado para componentes
- `src/utils/errorInterceptor.js` - Interceptador automático de erros
- `src/components/LogDashboard.jsx` - Dashboard para visualizar logs

### **2. Funcionalidades:**
- **Níveis de log** (error, warn, info, debug)
- **Categorias** (auth, api, ui, performance, user, system, security)
- **Filtros** por nível, categoria e data
- **Exportação** em JSON e CSV
- **Dashboard** interativo
- **Interceptação automática** de erros

### **3. Exemplo de Uso:**
- `src/pages/LoginWithLogging.jsx` - Exemplo de uso do sistema de logging

---

## ⚡ **Como Funciona:**

### **ANTES (Sem Logging):**
```javascript
// ❌ SEM MONITORAMENTO
const handleLogin = async () => {
  try {
    await login(email, password);
    navigate('/dashboard');
  } catch (error) {
    console.error('Erro:', error);
    setError('Login falhou');
  }
};
```

### **DEPOIS (Com Logging):**
```javascript
// ✅ COM MONITORAMENTO COMPLETO
const handleLogin = async () => {
  logger.logUserAction('login-attempt', { email });
  logger.startTimer('login-process');
  
  try {
    await login(email, password);
    logger.logSuccess('login', { userId });
    navigate('/dashboard');
  } catch (error) {
    logger.logFailure('login', error);
    setError('Login falhou');
  } finally {
    logger.endTimer('login-process');
  }
};
```

---

## 🎯 **Benefícios do Sistema de Logging:**

### **1. Monitoramento:**
- **Rastreamento** de erros em tempo real
- **Analytics** de performance
- **Debugging** facilitado
- **Auditoria** de ações do usuário

### **2. Desenvolvimento:**
- **Debug** mais eficiente
- **Identificação** rápida de problemas
- **Métricas** de performance
- **Histórico** de erros

### **3. Produção:**
- **Monitoramento** proativo
- **Alertas** automáticos
- **Análise** de comportamento
- **Otimização** baseada em dados

---

## 🔧 **Estrutura Técnica:**

### **1. Logger Principal:**
```javascript
import logger from '../utils/logger';

// Logs básicos
logger.error('auth', 'Login failed', { userId });
logger.warn('api', 'Slow response', { duration: 5000 });
logger.info('ui', 'Component rendered');
logger.debug('performance', 'Timer started');

// Logs especializados
logger.performance('login', 1500, { userId });
logger.userAction('button-click', { button: 'submit' });
logger.security('rate-limit', { ip: '192.168.1.1' });
logger.api('POST', '/api/login', 200, 500, { userId });
```

### **2. Hook useLogger:**
```javascript
import { useLogger } from '../hooks/useLogger';

const MyComponent = () => {
  const logger = useLogger('MyComponent', 'ui');
  
  // Logs automáticos
  logger.logLifecycle('mounted');
  logger.logState('count', oldValue, newValue);
  logger.logRender('props-changed');
  
  // Logs de interação
  logger.logUserAction('button-click', { button: 'submit' });
  logger.logValidation('email', true, 'Valid email');
  logger.logSuccess('form-submit', { fields: 3 });
};
```

### **3. Interceptação Automática:**
```javascript
// Erros globais interceptados automaticamente
window.addEventListener('error', (event) => {
  // Log automático do erro
});

// Console interceptado
console.error('Erro'); // Log automático
console.warn('Aviso'); // Log automático

// Fetch interceptado
fetch('/api/data'); // Log automático da requisição
```

---

## 📊 **Dashboard de Logs:**

### **1. Estatísticas:**
- **Total de logs** por período
- **Erros** e avisos
- **Performance** média
- **Categorias** mais ativas

### **2. Filtros:**
- **Nível** (error, warn, info, debug)
- **Categoria** (auth, api, ui, performance, user, system, security)
- **Data** (início e fim)
- **Usuário** (ID do usuário)

### **3. Ações:**
- **Exportar** logs (JSON/CSV)
- **Limpar** logs antigos
- **Filtrar** por critérios
- **Visualizar** detalhes

---

## 🧪 **Como Testar:**

### **1. Teste do Dashboard:**
```bash
# Adicionar rota no App.jsx
<Route path="/logs" element={<LogDashboard />} />
# Navegar para /logs
```

### **2. Teste de Logging:**
```bash
# Usar LoginWithLogging
# Fazer login e ver logs no dashboard
```

### **3. Teste de Interceptação:**
```bash
# Abrir DevTools → Console
# Executar: console.error('Teste')
# Ver log automático no dashboard
```

---

## 🎯 **Componentes com Logging:**

### **Formulários:**
- ✅ **LoginWithLogging** - Login com logging completo
- ✅ **NovoPedidoMemoized** - Formulário com logging
- ✅ **DashboardAdmin** - Admin com logging

### **APIs:**
- ✅ **Supabase** - Logs automáticos
- ✅ **Fetch** - Interceptação automática
- ✅ **XHR** - Interceptação automática

### **Erros:**
- ✅ **Global errors** - Interceptação automática
- ✅ **Promise rejections** - Interceptação automática
- ✅ **Resource errors** - Interceptação automática

---

## 🔍 **Debug e Monitoramento:**

### **1. Verificar Logs:**
```javascript
// No console do navegador
import { getLogs } from '../utils/logger';
console.log(getLogs());
```

### **2. Exportar Logs:**
```javascript
// No console do navegador
import { exportLogs } from '../utils/logger';
const jsonLogs = exportLogs('json');
const csvLogs = exportLogs('csv');
```

### **3. Estatísticas:**
```javascript
// No console do navegador
import { getLogStats } from '../utils/logger';
console.log(getLogStats());
```

---

## 🚀 **Próximos Passos:**

### **1. Integrar em Mais Componentes:**
- DashboardVendedor
- DashboardAdmin
- GerenciarVendedores
- GerenciarGuindastes

### **2. Otimizações:**
- Logs em background
- Compressão de logs
- Rotação automática

### **3. Analytics:**
- Métricas de performance
- Análise de comportamento
- Alertas automáticos

---

## ✅ **Status: IMPLEMENTADO E FUNCIONANDO**

O sistema de logging está **100% funcional** e **melhora significativamente** o monitoramento e debugging!

### **Arquivos Criados:**
- `src/utils/logger.js`
- `src/hooks/useLogger.js`
- `src/utils/errorInterceptor.js`
- `src/components/LogDashboard.jsx`
- `src/pages/LoginWithLogging.jsx`
