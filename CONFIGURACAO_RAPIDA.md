# ⚡ Configuração Rápida - Uso Interno Stark

## 🎯 Solução Implementada (SEM Banco de Dados)

Como não foi possível adicionar a coluna `uso_interno_stark` no banco devido a problemas de permissão, implementamos uma **solução via configuração no código**.

---

## 🔧 Como Habilitar uma Concessionária

### **Opção 1: Por ID (Recomendado)**

Edite o arquivo: `src/config/concessionariasInternas.js`

```javascript
export const concessionariasInternasIds = [
  1,  // ← Substitua pelo ID da sua concessionária
  5,  // Adicione mais IDs conforme necessário
  12,
];
```

**Como descobrir o ID:**
1. Acesse o Supabase → Table Editor → `concessionarias`
2. Encontre a concessionária desejada
3. Copie o valor da coluna `id`

---

### **Opção 2: Por Nome**

Edite o arquivo: `src/config/concessionariasInternas.js`

```javascript
export const palavrasChaveInternas = [
  'stark interno',  // Qualquer concessionária com "stark interno" no nome
  'stark',          // Qualquer concessionária com "stark" no nome
  'uso interno',
  'interno',
];
```

**Exemplo:**
- Concessionária chamada "Stark Interno" → ✅ Habilitada
- Concessionária chamada "Stark Guindastes" → ✅ Habilitada
- Concessionária chamada "ABC Distribuidora" → ❌ Não habilitada

---

## 🚀 Teste Rápido

1. **Edite o arquivo de configuração:**
   ```javascript
   // src/config/concessionariasInternas.js
   export const concessionariasInternasIds = [
     1, // Seu ID aqui
   ];
   ```

2. **Faça login** com a concessionária do ID configurado

3. **Acesse:** Novo Pedido da Concessionária

4. **Verifique:** O campo "Pedido realizado para:" deve aparecer

5. **Selecione** outra concessionária e teste o fluxo completo

---

## ✅ Vantagens Desta Solução

- ✅ **Funciona imediatamente** - Sem precisar mexer no banco
- ✅ **Fácil de configurar** - Apenas editar um arquivo
- ✅ **Fácil de manter** - Adicionar/remover concessionárias é simples
- ✅ **Sem riscos** - Não altera estrutura do banco
- ✅ **Reversível** - Pode voltar atrás facilmente

---

## 🔄 Migração Futura (Quando Resolver o Problema de Permissão)

Quando conseguir adicionar a coluna no banco:

1. Execute o SQL:
   ```sql
   ALTER TABLE concessionarias 
   ADD COLUMN uso_interno_stark BOOLEAN DEFAULT FALSE;
   ```

2. Atualize as concessionárias:
   ```sql
   UPDATE concessionarias 
   SET uso_interno_stark = TRUE 
   WHERE id IN (1, 5, 12); -- IDs configurados
   ```

3. **Não precisa alterar o código!** A função `isConcessionariaInterna()` já verifica a coluna primeiro:
   ```javascript
   if (concessionaria.uso_interno_stark === true) {
     return true; // ← Vai usar a coluna quando existir
   }
   ```

---

## 📝 Arquivos Modificados

### Criados:
- ✅ `src/config/concessionariasInternas.js` - Configuração de acesso

### Modificados:
- ✅ `src/lib/pages/NovoPedido.jsx` - Usa a função de configuração
- ✅ `backend/services/concessionariasService.js` - Removido campo que não existe

### Removidos:
- ❌ Dependência da coluna `uso_interno_stark` no banco

---

## 🆘 Suporte

**Para habilitar uma nova concessionária:**
1. Descubra o ID dela no Supabase
2. Adicione em `concessionariasInternasIds`
3. Reinicie o frontend (se necessário)

**Para desabilitar:**
1. Remova o ID de `concessionariasInternasIds`
2. Ou remova a palavra-chave de `palavrasChaveInternas`

---

**Status:** ✅ Pronto para uso imediato  
**Configuração:** `src/config/concessionariasInternas.js`  
**Banco de dados:** Não requer alterações
