# 🔍 DIAGNÓSTICO - Produtor Rural vs Rodoviário

## 📋 **PROBLEMA REPORTADO**

Quando seleciona **Produtor Rural** ou **Rodoviário**, o sistema está calculando **valores absurdos**.

### **Regras Corretas:**
- **Rodoviário** = Cliente **SEM** Inscrição Estadual (IE)
- **Produtor Rural** = Cliente **COM** Inscrição Estadual (IE)

### **Contexto:**
- O **Admin** cadastra preços diferentes para:
  - RS com IE (Produtor Rural)
  - RS sem IE (Rodoviário)
- Para **vendedores do RS**, o sistema deve puxar o preço correto baseado na seleção

---

## 🎯 **FLUXO ATUAL**

### **1. Usuário Seleciona Guindaste:**
- Preço inicial é carregado baseado na região do vendedor
- Exemplo: Vendedor RS → preço `rs-com-ie` ou `rs-sem-ie`

### **2. Usuário Vai para "Política de Pagamento":**
- Seleciona "Cliente" ou "Revenda"
- Seleciona "Produtor Rural" ou "Rodoviário"

### **3. Sistema Atualiza Preços:**
- **Dispara `useEffect`** no `NovoPedido.jsx` (linha 153)
- **Recalcula TODOS os preços** do carrinho
- Usa `normalizarRegiao(user.regiao, clienteTemIE)`

---

## 🔧 **LOGS IMPLEMENTADOS**

### **Console do Navegador (F12):**

Agora você verá logs detalhados assim:

```
============================================================
🔄 ATUALIZANDO PREÇOS DO CARRINHO
👤 Vendedor: Chrystian | Região: Rio Grande do Sul
📋 Cliente tem IE: SIM (Produtor Rural)
============================================================

🔍 Item: Guindaste 10.8t - GSI
   Região original: "Rio Grande do Sul"
   Região normalizada: "rs-com-ie"
   Preço atual: R$ 105.000,00
   
🔍 [DB] getPrecoPorRegiao chamado: { guindasteId: 123, regiao: "rs-com-ie" }
📊 [DB] Resposta do Supabase: { data: [{ preco: 100000 }], error: null }
✅ [DB] Preço encontrado: 100000
🔢 [DB] Tipo do preço: "number"
📊 [DB] Valor numérico: 100000

   Novo preço (do banco): R$ 100.000,00
```

---

## 🧪 **TESTE PASSO A PASSO**

### **1. Limpar Cache:**
```javascript
localStorage.clear();
location.reload();
```

### **2. Abrir Console (F12):**
- Vá para aba "Console"
- Deixe aberto durante todo o teste

### **3. Fazer Novo Pedido:**

#### **Cenário A: Vendedor do RS + Produtor Rural**
1. Login com vendedor da região "Rio Grande do Sul"
2. Selecione um guindaste
3. **OBSERVE:** Preço inicial (deve vir do banco)
4. Vá para "Política de Pagamento"
5. Selecione "Cliente"
6. Selecione "Não" em "Participação de Revenda"
7. Selecione "Produtor Rural" (🚜)
8. **OBSERVE OS LOGS NO CONSOLE:**
   - `Região normalizada: "rs-com-ie"`
   - `Novo preço: R$ 100.000,00` (ou o valor que está cadastrado)

#### **Cenário B: Vendedor do RS + Rodoviário**
1. Repita passos 1-6 acima
2. Selecione "Rodoviário" (🚛)
3. **OBSERVE OS LOGS NO CONSOLE:**
   - `Região normalizada: "rs-sem-ie"`
   - `Novo preço: R$ 105.000,00` (ou o valor que está cadastrado)

#### **Cenário C: Vendedor de Outra Região**
1. Login com vendedor de "Sul", "Norte" ou "Centro-Oeste"
2. Selecione um guindaste
3. Vá para "Política de Pagamento"
4. Selecione "Produtor Rural" ou "Rodoviário"
5. **OBSERVE:** A região normalizada **NÃO DEVE MUDAR**
   - Ex: `Região normalizada: "sul-sudeste"` (sempre)

---

## 🔍 **O QUE VERIFICAR**

### **1. Região do Vendedor no Banco:**
```sql
SELECT id, nome, email, regiao 
FROM users 
WHERE email = 'seu_email@exemplo.com';
```

**Valores válidos:**
- `Rio Grande do Sul` (ou `RS`)
- `Sul`
- `Sudeste`
- `Norte`
- `Nordeste`
- `Centro-Oeste`

### **2. Preços Cadastrados:**
```sql
SELECT 
  g.subgrupo,
  p.regiao,
  p.preco
FROM guindastes g
LEFT JOIN precos_guindaste_regiao p ON g.id = p.guindaste_id
WHERE g.id = [ID_DO_GUINDASTE]
ORDER BY p.regiao;
```

**Deve ter 5 linhas (uma para cada região):**
- `centro-oeste`
- `norte-nordeste`
- `rs-com-ie`
- `rs-sem-ie`
- `sul-sudeste`

### **3. Se Algum Preço Estiver NULL ou 0:**
```sql
-- Inserir preço manualmente:
INSERT INTO precos_guindaste_regiao (guindaste_id, regiao, preco)
VALUES 
  ([ID_DO_GUINDASTE], 'rs-com-ie', 100000),
  ([ID_DO_GUINDASTE], 'rs-sem-ie', 105000);
```

---

## ❌ **POSSÍVEIS CAUSAS DO VALOR ABSURDO**

### **1. Região do Vendedor Incorreta:**
- Se estiver `NULL` ou vazia → usa default `sul-sudeste`
- Se estiver escrito errado → pode não normalizar corretamente

### **2. Preços Não Cadastrados:**
- Se `rs-com-ie` ou `rs-sem-ie` não existir no banco → retorna 0
- Se retornar 0 → carrinho pode ter valor antigo corrompido

### **3. Carrinho com Dados Antigos:**
- Se o localStorage tem preços antigos corrompidos
- **SOLUÇÃO:** Limpar localStorage antes de testar

### **4. Multiplicação no PaymentPolicy:**
- O `PaymentPolicy` pode estar aplicando desconto/acréscimo sobre um valor já errado
- **SOLUÇÃO:** Ver o "Preço Base" no resumo

---

## 📊 **EXEMPLO DE LOGS ESPERADOS**

### **✅ Correto:**
```
Região original: "Rio Grande do Sul"
Região normalizada: "rs-com-ie"
Preço atual: R$ 99.000,00
Novo preço (do banco): R$ 100.000,00
💰 TOTAL DO CARRINHO: R$ 100.000,00
```

### **❌ Errado (valor absurdo):**
```
Região original: "Rio Grande do Sul"
Região normalizada: "rs-com-ie"
Preço atual: R$ 1.050.000,00  ← ABSURDO!
Novo preço (do banco): R$ 100.000,00
💰 TOTAL DO CARRINHO: R$ 1.050.000,00  ← NÃO ATUALIZOU!
```

**Se isso acontecer:**
1. O preço atual já estava errado
2. O novo preço do banco está correto (R$ 100.000)
3. MAS o `updateAllPrices` não está funcionando

---

## 🎯 **PRÓXIMOS PASSOS**

1. **Limpe o cache** completamente
2. **Teste com console aberto**
3. **Me envie:**
   - Print do console completo
   - Região do vendedor logado
   - Qual opção selecionou (Produtor Rural ou Rodoviário)
   - Valor que apareceu (absurdo)

Com esses dados, consigo identificar exatamente onde está o problema! 🚀

