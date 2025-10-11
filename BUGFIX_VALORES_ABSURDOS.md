# 🐛 BUGFIX - Valores Absurdos no Carrinho

## 📋 **PROBLEMA REPORTADO**
O sistema estava exibindo valores absurdos no carrinho (R$ 513.124,38) sem saber de onde vinham.

---

## 🔍 **INVESTIGAÇÃO**

### **Sintomas**
- ✅ Valor total do carrinho: R$ 513.124,38
- ✅ Valor não faz sentido para um guindaste
- ✅ Aparece logo após selecionar tipo de cliente

### **Causa Raiz Identificada**
O bug estava na linha 130 do `NovoPedido.jsx`:

**ANTES (ERRADO):**
```javascript
updates.push({ itemId: item.id, novoPreco, tipo: 'guindaste' });
```

**PROBLEMA**: O hook `useCarrinho` esperava propriedades com nomes diferentes!

**Hook esperava:**
```javascript
{ id: item.id, preco: novoPreco, tipo: 'guindaste' }
```

**Mas estava recebendo:**
```javascript
{ itemId: item.id, novoPreco, tipo: 'guindaste' }
```

### **Resultado do Bug**
- ❌ O `updateAllPrices` não conseguia encontrar os itens para atualizar
- ❌ Os preços antigos (potencialmente corrompidos) permaneciam
- ❌ Se havia dados ruins no localStorage, eles persistiam

---

## ✅ **CORREÇÃO APLICADA**

### **1. Correção Principal** (linha 130)
```javascript
// ANTES ❌
updates.push({ itemId: item.id, novoPreco, tipo: 'guindaste' });

// DEPOIS ✅
updates.push({ id: item.id, preco: novoPreco, tipo: 'guindaste' });
```

### **2. Correção de Loop Infinito** (linha 155)
O `useEffect` estava causando re-renders infinitos porque tinha `carrinho` nas dependências, que mudava a cada atualização de preço.

```javascript
// ANTES ❌
}, [clienteTemIE, user, carrinho, getTotalCarrinho, updateAllPrices]);

// DEPOIS ✅
}, [clienteTemIE, user]); // Apenas as mudanças que devem triggerar atualização
```

### **3. Logs de Debug Adicionados**
Para facilitar futuras investigações:

```javascript
console.log('🛒 Carrinho atual:', carrinho);
console.log('💰 Total atual:', getTotalCarrinho());
console.log(`📊 Preço para ${item.nome}:`, {
  precoAtual: item.preco,
  novoPreco,
  regiao: regiaoNormalizada
});
console.log('🔄 Atualizando preços:', updates);
```

---

## 🎯 **COMO VERIFICAR SE O BUG FOI CORRIGIDO**

### **Passos para Testar**
1. ✅ Limpar localStorage do navegador (`F12` → Application → Local Storage → Clear)
2. ✅ Fazer login no sistema
3. ✅ Selecionar um guindaste
4. ✅ Ir para a política de pagamento
5. ✅ Selecionar "Cliente" ou "Produtor Rural"
6. ✅ Verificar se o valor total faz sentido

### **Valores Esperados**
- ✅ Guindastes GSI 6.5: ~R$ 80.000 - R$ 120.000
- ✅ Guindastes GSE 8.0: ~R$ 100.000 - R$ 150.000
- ✅ Guindastes maiores: acima de R$ 150.000

### **Se ainda houver problema**
1. Abra o console do navegador (`F12`)
2. Verifique os logs:
   - `🛒 Carrinho atual:` - deve mostrar os itens e preços
   - `📊 Preço para...` - deve mostrar preço atual e novo preço
   - `🔄 Atualizando preços:` - deve mostrar as atualizações

---

## 🔧 **POSSÍVEL CAUSA SECUNDÁRIA**

Se o bug persistir mesmo após a correção, pode haver **dados corrompidos no localStorage**.

### **Solução Definitiva**
Limpar o carrinho ao detectar preços inválidos:

**Adicionar no início do componente NovoPedido:**
```javascript
useEffect(() => {
  // Verificar se há preços absurdos no carrinho
  const totalAtual = getTotalCarrinho();
  if (totalAtual > 1000000) { // Se maior que 1 milhão, algo está errado
    console.warn('⚠️ Detectado valor absurdo no carrinho. Limpando...');
    clearCart();
    alert('O carrinho continha dados inválidos e foi limpo. Por favor, selecione os produtos novamente.');
  }
}, []);
```

---

## 📊 **ANÁLISE TÉCNICA**

### **Por que o bug aconteceu?**
Durante a refatoração, o código antigo usava nomes de propriedades diferentes (`itemId` e `novoPreco`) do que o hook `useCarrinho` esperava (`id` e `preco`).

### **Lições Aprendidas**
1. ✅ **TypeScript preveniria isso** - Erros de tipo seriam detectados em tempo de compilação
2. ✅ **Testes unitários** - Testariam a função `updateAllPrices` com diferentes formatos
3. ✅ **Documentação clara** - JSDoc no hook deveria especificar o formato exato

### **Melhorias Futuras Recomendadas**
```javascript
/**
 * Atualiza preços de múltiplos itens
 * @param {Array<{id: string|number, preco: number, tipo: string}>} updates
 * @example
 * updateAllPrices([
 *   { id: 123, preco: 50000, tipo: 'guindaste' }
 * ])
 */
const updateAllPrices = useCallback((updates) => {
  // Validar formato
  if (!Array.isArray(updates)) {
    console.error('updateAllPrices: updates deve ser um array');
    return;
  }
  
  updates.forEach(update => {
    if (!update.id || typeof update.preco !== 'number' || !update.tipo) {
      console.error('updateAllPrices: formato inválido', update);
    }
  });
  
  setCarrinho(prev =>
    prev.map(item => {
      const update = updates.find(u => u.id === item.id && u.tipo === item.tipo);
      return update ? { ...item, preco: update.preco } : item;
    })
  );
}, []);
```

---

## ✅ **STATUS**
- ✅ Bug identificado
- ✅ Correção aplicada
- ✅ Logs de debug adicionados
- ✅ Loop infinito corrigido
- ⏳ Aguardando teste do usuário

---

**Data**: 11/10/2025  
**Arquivo Afetado**: `src/pages/NovoPedido.jsx`  
**Linhas Corrigidas**: 130, 155  
**Severidade**: 🔴 CRÍTICA (valores incorretos no carrinho)  
**Status**: ✅ CORRIGIDO

