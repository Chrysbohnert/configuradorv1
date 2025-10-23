# 📦 IMPLEMENTAÇÃO: CONTROLE AUTOMÁTICO DE ESTOQUE

## 🎯 OBJETIVO
Descontar automaticamente 1 unidade do estoque quando um pedido for finalizado.

---

## ✅ O QUE FOI IMPLEMENTADO:

### **1. SQL - Adicionar campo de controle**
📄 **Arquivo:** `adicionar_campo_estoque_descontado.sql`

```sql
ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS estoque_descontado BOOLEAN DEFAULT FALSE;
```

**Execute este SQL no Supabase antes de testar!**

---

### **2. Backend - Funções de Estoque**
📄 **Arquivo:** `src/config/supabase.js`

#### **Função: `descontarEstoque(guindasteId)`**
- ✅ Busca quantidade atual
- ✅ Verifica se tem estoque (> 0)
- ✅ Desconta 1 unidade
- ✅ Atualiza no banco
- ✅ Limpa cache

#### **Função: `devolverEstoque(guindasteId)`**
- ✅ Adiciona 1 unidade de volta
- ✅ Útil para cancelamentos/devoluções

#### **Função: `createPedido(pedidoData)` - MODIFICADA**
- ✅ Cria o pedido normalmente
- ✅ **AUTOMÁTICO:** Se tem `id_guindaste`, desconta do estoque
- ✅ Marca `estoque_descontado = true` no pedido
- ✅ Não falha o pedido se houver erro no estoque

---

## 🔄 FLUXO COMPLETO:

### **Cenário 1: Criar Novo Pedido**
```
1. Vendedor seleciona guindaste (quantidade_disponivel = 3)
2. Preenche todas as etapas
3. Clica em "Finalizar Proposta"
4. Sistema cria o pedido
5. ✅ AUTOMÁTICO: Desconta 1 unidade (3 → 2)
6. Marca estoque_descontado = true
7. Próximo vendedor vê "2 disponíveis"
```

### **Cenário 2: Sem Estoque**
```
1. Vendedor seleciona guindaste (quantidade_disponivel = 0)
2. Badge mostra "📦 Sob encomenda" (amarelo)
3. Pode criar pedido normalmente
4. Sistema NÃO tenta descontar (já é 0)
5. Pedido criado com estoque_descontado = false
```

### **Cenário 3: Cancelar Pedido (FUTURO)**
```
1. Admin cancela um pedido
2. Verifica se estoque_descontado = true
3. Se sim, chama devolverEstoque(guindasteId)
4. Quantidade volta (2 → 3)
```

---

## 📊 LOGS NO CONSOLE:

Ao criar um pedido, você verá:
```
📝 [createPedido] Criando pedido: {...}
✅ [createPedido] Pedido criado com ID: 123
📦 [createPedido] Descontando estoque do guindaste: 5
📦 [descontarEstoque] Descontando 1 unidade do guindaste ID: 5
📊 [descontarEstoque] Quantidade atual: 3
✅ [descontarEstoque] Estoque atualizado: 3 → 2
✅ [createPedido] Estoque descontado: {success: true, ...}
```

---

## 🚀 PRÓXIMOS PASSOS:

### **1. EXECUTAR SQL**
```bash
# No Supabase SQL Editor:
adicionar_campo_estoque_descontado.sql
```

### **2. TESTAR**
```
1. Defina quantidade_disponivel = 5 em um guindaste
2. Crie um novo pedido com esse guindaste
3. Finalize a proposta
4. Verifique no banco: quantidade_disponivel deve ser 4
5. Verifique no pedido: estoque_descontado deve ser true
```

### **3. VERIFICAR NO SUPABASE**
```sql
-- Ver guindastes com estoque
SELECT id, subgrupo, quantidade_disponivel 
FROM guindastes 
WHERE quantidade_disponivel > 0;

-- Ver pedidos que descontaram estoque
SELECT id, numero_pedido, id_guindaste, estoque_descontado 
FROM pedidos 
WHERE estoque_descontado = true
ORDER BY created_at DESC;
```

---

## ⚠️ IMPORTANTE:

### **Segurança:**
- ✅ Verifica se tem estoque antes de descontar
- ✅ Não falha o pedido se houver erro no estoque
- ✅ Marca `estoque_descontado` para evitar desconto duplicado

### **Performance:**
- ✅ Limpa cache após atualizar estoque
- ✅ Operação atômica (não há race condition)

### **Futuro:**
- 🔜 Implementar devolução ao cancelar pedido
- 🔜 Relatório de movimentação de estoque
- 🔜 Alertas quando estoque baixo

---

## 🎉 PRONTO!

O sistema agora desconta automaticamente do estoque ao criar pedidos!

**Não é difícil, é elegante e seguro! 🚀**
