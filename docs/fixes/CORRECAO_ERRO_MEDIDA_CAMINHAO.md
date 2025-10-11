# 🔧 Correção: Erro medidaA/medidaB/medidaC/medidaD

**Data:** 11/10/2025  
**Status:** ✅ Corrigido  
**Erro:** `Could not find the 'medidaA' column of 'caminhoes' in the schema cache`

---

## 🐛 Problema

Ao gerar PDF ou finalizar pedido, o sistema retornava erro:
```
Could not find the 'medidaA' column of 'caminhoes' in the schema cache
```

### **Causa Raiz**
O código estava usando o spread operator (`...caminhaoData`) que enviava **todos os campos** do formulário para o banco, incluindo campos que **não existem** na tabela `caminhoes`:
- ❌ `medidaA`
- ❌ `medidaB`  
- ❌ `medidaC`
- ❌ `medidaD`

Esses campos eram do formulário antigo mas nunca foram criados no banco Supabase.

---

## ✅ Solução Aplicada

### **Antes (ERRADO):**
```javascript
const caminhaoDataToSave = {
  ...caminhaoData,  // ❌ Envia TODOS os campos, incluindo os inexistentes
  cliente_id: cliente.id,
  observacoes: caminhaoData.observacoes || null,
  placa: 'N/A'
};
```

### **Depois (CORRETO):**
```javascript
// Filtrar apenas campos que existem na tabela caminhoes
const caminhaoDataToSave = {
  tipo: caminhaoData.tipo,           // ✅ Existe
  marca: caminhaoData.marca,         // ✅ Existe
  modelo: caminhaoData.modelo,       // ✅ Existe
  ano: caminhaoData.ano || null,     // ✅ Existe
  voltagem: caminhaoData.voltagem,   // ✅ Existe
  cliente_id: cliente.id,            // ✅ Existe
  observacoes: caminhaoData.observacoes || null, // ✅ Existe
  placa: 'N/A'                       // ✅ Existe (obrigatório)
};
```

---

## 📊 Campos da Tabela `caminhoes`

### **Estrutura Real no Supabase:**
```sql
CREATE TABLE caminhoes (
  id SERIAL PRIMARY KEY,
  tipo TEXT NOT NULL,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  ano TEXT,
  voltagem TEXT NOT NULL,
  cliente_id INTEGER REFERENCES clientes(id),
  observacoes TEXT,
  placa TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **Campos Aceitos:**
1. ✅ `tipo` - Ex: "Tractor CAVALINHO"
2. ✅ `marca` - Ex: "Mercedes-Benz"
3. ✅ `modelo` - Ex: "Actros"
4. ✅ `ano` - Ex: "2025"
5. ✅ `voltagem` - Ex: "12V" ou "24V"
6. ✅ `cliente_id` - ID do cliente (FK)
7. ✅ `observacoes` - Texto livre (opcional)
8. ✅ `placa` - Ex: "ABC-1234" ou "N/A"

### **Campos Removidos (não existem no banco):**
- ❌ `medidaA`
- ❌ `medidaB`
- ❌ `medidaC`
- ❌ `medidaD`

---

## 🔍 Onde Foi Corrigido

**Arquivo:** `src/pages/NovoPedido.jsx`  
**Linhas:** 1581-1591

```javascript
// Filtrar apenas campos que existem na tabela caminhoes
const caminhaoDataToSave = {
  tipo: caminhaoData.tipo,
  marca: caminhaoData.marca,
  modelo: caminhaoData.modelo,
  ano: caminhaoData.ano || null,
  voltagem: caminhaoData.voltagem,
  cliente_id: cliente.id,
  observacoes: caminhaoData.observacoes || null,
  placa: 'N/A' // Campo obrigatório no banco mas não usado no formulário
};
```

---

## 🚀 Como Testar

1. **Limpar cache do navegador:**
   - Pressione `Ctrl + Shift + R` (Windows/Linux)
   - Ou `Cmd + Shift + R` (Mac)

2. **Criar novo pedido:**
   - Selecionar guindaste
   - Preencher dados do cliente
   - Preencher dados do caminhão (apenas: tipo, marca, modelo, ano, voltagem)
   - Gerar PDF → ✅ Deve funcionar
   - Finalizar Pedido → ✅ Deve funcionar

3. **Verificar no Console:**
   ```
   ✅ Cliente criado: {id: 123, nome: "..."}
   ✅ Caminhão criado: {id: 456, tipo: "...", marca: "..."}
   ✅ Pedido criado: {id: 789, numero_pedido: "..."}
   ```

---

## ⚠️ Se o Erro Persistir

Se mesmo após limpar o cache o erro continuar, **pode ser cache do Vite/Dev Server**:

### **Solução 1: Restart do servidor**
```bash
# Parar o servidor (Ctrl+C)
# Limpar cache do Vite
rm -rf node_modules/.vite

# Reiniciar
npm run dev
```

### **Solução 2: Hard refresh do navegador**
1. Abrir DevTools (F12)
2. Clicar com botão direito no ícone de reload
3. Selecionar "Empty Cache and Hard Reload"

### **Solução 3: Verificar se o código está correto**
```bash
# Buscar por spread operator errado
grep -n "...caminhaoData" src/pages/NovoPedido.jsx

# Não deve retornar nenhuma linha na função salvarRelatorio
```

---

## 📝 Checklist de Verificação

- [x] Código corrigido para enviar apenas campos existentes
- [x] Comentário adicionado no topo do arquivo
- [x] Documentação criada
- [ ] Cache do navegador limpo pelo usuário
- [ ] Teste de gerar PDF realizado
- [ ] Teste de finalizar pedido realizado

---

## 🎯 Resultado Esperado

Após a correção e limpeza de cache:

```
✅ Gerar PDF: Funciona sem erro
✅ Salvar relatório: Funciona sem erro  
✅ Finalizar pedido: Funciona sem erro
✅ Dados salvos no banco: Cliente, Caminhão, Pedido, Itens do Pedido
```

---

## 📞 Suporte

Se o erro persistir após seguir todos os passos:
1. Verificar console do navegador (F12) para ver erro completo
2. Verificar qual linha exata está causando o erro
3. Verificar se o arquivo `NovoPedido.jsx` tem a correção aplicada
4. Reiniciar o servidor de desenvolvimento

---

**Conclusão:** Erro causado por campos inexistentes sendo enviados ao banco. Corrigido filtrando apenas campos válidos da tabela `caminhoes`.

