# 🔧 Correção - Ordem de Declaração de Hooks

**Data:** 11/10/2025  
**Status:** ✅ Corrigido  
**Severidade:** CRÍTICA  
**Tipo:** Reference Error  

---

## 🐛 Erro Original

```
Uncaught ReferenceError: Cannot access 'capacidadesUnicas' before initialization
    at GerenciarGuindastes.jsx:204
```

**Impacto:** Aplicação completamente quebrada (não carrega)

---

## 🔍 Causa Raiz

### Ordem Incorreta no Código

```javascript
// ❌ ERRADO: useEffect usa capacidadesUnicas ANTES dela existir

// Linha 197-204: useEffect tenta acessar capacidadesUnicas
useEffect(() => {
  if (guindastes.length > 0 && !hasInitializedFiltro && capacidadesUnicas.length > 0) {
    const primeiraCapacidade = capacidadesUnicas[0]; // ❌ ERRO!
    setFiltroCapacidade(primeiraCapacidade);
    setHasInitializedFiltro(true);
  }
}, [guindastes.length, capacidadesUnicas, hasInitializedFiltro]);

// Linha 230-232: capacidadesUnicas é declarado DEPOIS
const capacidadesUnicas = useMemo(() => {
  return extractCapacidadesUnicas(guindastes);
}, [guindastes, extractCapacidadesUnicas]);
```

**Problema:** JavaScript não permite acessar uma variável antes de sua declaração (Temporal Dead Zone).

---

## ✅ Solução Aplicada

### Reordenação Cirúrgica

**Mudança:** Mover o `useEffect` para **DEPOIS** da declaração de `capacidadesUnicas`.

### Código Corrigido

```javascript
// ✅ CORRETO: Declarações primeiro, useEffects depois

// Linha 201-223: Declarações das funções e constantes
const extractCapacidadesUnicas = useMemo(() => (...), []);
const capacidadesUnicas = useMemo(() => {
  return extractCapacidadesUnicas(guindastes);
}, [guindastes, extractCapacidadesUnicas]);
const getCapacidadesUnicas = () => capacidadesUnicas;

// Linha 229-238: useEffect DEPOIS de capacidadesUnicas existir
useEffect(() => {
  if (guindastes.length > 0 && !hasInitializedFiltro && capacidadesUnicas.length > 0) {
    const primeiraCapacidade = capacidadesUnicas[0]; // ✅ OK!
    setFiltroCapacidade(primeiraCapacidade);
    setHasInitializedFiltro(true);
    console.log(`🎯 Filtro inicial configurado: ${primeiraCapacidade}t`);
  }
}, [guindastes.length, capacidadesUnicas, hasInitializedFiltro]);
```

---

## 📝 Mudanças Realizadas

### Arquivo: `src/pages/GerenciarGuindastes.jsx`

#### 1. **Removido (linhas 196-204)**
```javascript
// Inicializar filtro com a primeira capacidade (6.5t, etc)
useEffect(() => {
  if (guindastes.length > 0 && !hasInitializedFiltro && capacidadesUnicas.length > 0) {
    const primeiraCapacidade = capacidadesUnicas[0];
    setFiltroCapacidade(primeiraCapacidade);
    setHasInitializedFiltro(true);
    console.log(`🎯 Filtro inicial configurado: ${primeiraCapacidade}t`);
  }
}, [guindastes.length, capacidadesUnicas, hasInitializedFiltro]);
```

#### 2. **Adicionado (linhas 229-238, após declaração de capacidadesUnicas)**
```javascript
// Inicializar filtro com a primeira capacidade (6.5t, etc)
// IMPORTANTE: Deve estar DEPOIS da declaração de capacidadesUnicas
useEffect(() => {
  if (guindastes.length > 0 && !hasInitializedFiltro && capacidadesUnicas.length > 0) {
    const primeiraCapacidade = capacidadesUnicas[0]; // Menor capacidade
    setFiltroCapacidade(primeiraCapacidade);
    setHasInitializedFiltro(true);
    console.log(`🎯 Filtro inicial configurado: ${primeiraCapacidade}t`);
  }
}, [guindastes.length, capacidadesUnicas, hasInitializedFiltro]);
```

**Diferença:** Código **idêntico**, apenas **posição** diferente.

---

## 🎯 Por Que Aconteceu?

### JavaScript Hoisting e Temporal Dead Zone

```javascript
// Exemplo do problema:

// ❌ ERRO
console.log(minhaVar); // ReferenceError: Cannot access 'minhaVar' before initialization
const minhaVar = 'valor';

// ✅ CORRETO
const minhaVar = 'valor';
console.log(minhaVar); // 'valor'
```

**No React:**
- `useMemo`, `useCallback`, `const` criam declarações que precisam ser resolvidas antes de serem usadas
- `useEffect` é executado depois do render, mas suas **dependências** são validadas durante a **compilação**
- Se uma dependência não existe ainda = erro de referência

---

## 📊 Ordem Correta de Hooks e Declarações

### Padrão Recomendado

```javascript
function Component() {
  // 1️⃣ Estados
  const [state, setState] = useState();
  
  // 2️⃣ Refs
  const ref = useRef();
  
  // 3️⃣ Memoizações (useMemo, useCallback)
  const memoValue = useMemo(() => ..., []);
  const callback = useCallback(() => ..., []);
  
  // 4️⃣ useEffects (que dependem dos valores acima)
  useEffect(() => {
    // Pode usar memoValue e callback
  }, [memoValue, callback]);
  
  // 5️⃣ Handlers
  const handleClick = () => {};
  
  // 6️⃣ Render
  return <div>...</div>;
}
```

---

## ✅ Checklist de Validação

- [x] Erro de referência corrigido
- [x] Aplicação carrega sem erros
- [x] Filtro inicial funciona (6.5t selecionado)
- [x] Chips aparecem na ordem correta
- [x] Busca funciona normalmente
- [x] Zero erros de linting
- [x] Código idêntico, apenas reordenado
- [x] Comentário adicionado explicando a ordem

---

## 🧪 Como Validar

### 1️⃣ Aplicação Carrega
```
✅ Abrir /gerenciar-guindastes
✅ Página carrega sem erros
✅ Console sem "ReferenceError"
```

### 2️⃣ Filtro Inicial Funciona
```
✅ Primeiro chip (6.5t) está ativo
✅ Mostra apenas guindastes de 6.5t
✅ Log no console: "🎯 Filtro inicial configurado: 6.5t"
```

### 3️⃣ Funcionalidades Intactas
```
✅ Clicar em outros chips funciona
✅ Busca funciona
✅ "Todos" funciona
✅ Cards renderizam corretamente
```

---

## 📚 Lições Aprendidas

### 1. **Ordem Importa em JavaScript**
```javascript
// Sempre declarar antes de usar
const valor = calculaValor();
useEffect(() => {
  console.log(valor); // ✅ OK
}, [valor]);
```

### 2. **useEffect Depende de Valores Declarados**
```javascript
// ❌ ERRADO
useEffect(() => {
  console.log(minhaConstante);
}, [minhaConstante]); // Erro se não existe

const minhaConstante = 'valor';

// ✅ CORRETO
const minhaConstante = 'valor';

useEffect(() => {
  console.log(minhaConstante);
}, [minhaConstante]);
```

### 3. **Comentários Previnem Repetição**
```javascript
// IMPORTANTE: Deve estar DEPOIS da declaração de capacidadesUnicas
useEffect(() => {
  // usa capacidadesUnicas
}, [capacidadesUnicas]);
```

---

## 🚀 Resultado

**Status:** ✅ CORRIGIDO  
**Breaking Changes:** ❌ Nenhum  
**Código Alterado:** Apenas reordenado  
**Funcionalidade:** 100% mantida  

---

**Implementado com precisão cirúrgica por SpecEngineer** 🎯  
**Tempo de Correção:** ~2 minutos  
**Complexidade:** Baixa (reordenação)  
**Impacto:** Crítico → Zero (aplicação funcional)  

✅ **Aplicação 100% funcional novamente!**

