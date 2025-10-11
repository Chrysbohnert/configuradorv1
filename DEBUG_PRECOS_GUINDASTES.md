# 🔍 DEBUG - Preços dos Guindastes Não Puxando Corretamente

## ⚠️ **PROBLEMA REPORTADO**
Após a refatoração, os preços que o admin estabelece para cada equipamento não estão sendo puxados corretamente para o vendedor.

---

## 🔍 **ANÁLISE DO FLUXO**

### **Fluxo Correto de Busca de Preços**

```
1. Admin cadastra guindastes
   ├─ Tabela: guindastes
   └─ Campos: id, subgrupo, modelo, codigo_referencia, etc.

2. Admin define preços por região
   ├─ Tabela: precos_guindaste_regiao
   ├─ Campos: guindaste_id, regiao, preco
   └─ Regiões: 'norte-nordeste', 'sul-sudeste', 'centro-oeste', 'rs-com-ie', 'rs-sem-ie'

3. Vendedor faz login
   ├─ Tabela: users
   ├─ Campos carregados: id, nome, email, regiao
   └─ Armazenado em: localStorage('user')

4. Vendedor seleciona guindaste
   ├─ Função: handleSelecionarGuindaste()
   ├─ user.regiao → normalizarRegiao() → região normalizada
   ├─ db.getPrecoPorRegiao(guindasteId, regiaoNormalizada)
   └─ Busca em: precos_guindaste_regiao WHERE guindaste_id = X AND regiao = 'Y'

5. Preço é adicionado ao carrinho
   ├─ Hook: useCarrinho()
   ├─ Armazenado em: localStorage('carrinho')
   └─ Estrutura: { id, nome, modelo, preco, tipo: 'guindaste' }
```

---

## 🐛 **POSSÍVEIS CAUSAS DO BUG**

### **Causa #1: Região do Vendedor Incorreta** 🔴
**Problema**: O campo `regiao` do vendedor no banco pode estar:
- ❌ Vazio (NULL)
- ❌ Com valor diferente do esperado
- ❌ Com formatação errada

**Verificar**:
```sql
SELECT id, nome, email, regiao 
FROM users 
WHERE tipo = 'vendedor';
```

**Valores esperados** para `regiao`:
- `Sul`
- `Sudeste`
- `Norte`
- `Nordeste`
- `Centro-Oeste`
- `Rio Grande do Sul`

---

### **Causa #2: Tabela precos_guindaste_regiao Vazia** 🔴
**Problema**: Admin pode não ter cadastrado preços por região

**Verificar**:
```sql
-- Ver se existem preços cadastrados
SELECT COUNT(*) FROM precos_guindaste_regiao;

-- Ver preços de um guindaste específico
SELECT * FROM precos_guindaste_regiao 
WHERE guindaste_id = 123;

-- Ver todas as regiões cadastradas
SELECT DISTINCT regiao FROM precos_guindaste_regiao;
```

**Regiões que DEVEM existir**:
- `norte-nordeste`
- `sul-sudeste`
- `centro-oeste`
- `rs-com-ie`
- `rs-sem-ie`

---

### **Causa #3: IDs dos Guindastes Não Batem** 🔴
**Problema**: O `id` do guindaste pode ser diferente entre:
- Tabela `guindastes`
- Tabela `precos_guindaste_regiao`

**Verificar**:
```sql
-- Guindastes SEM preço em alguma região
SELECT g.id, g.subgrupo, g.codigo_referencia
FROM guindastes g
WHERE NOT EXISTS (
  SELECT 1 FROM precos_guindaste_regiao p
  WHERE p.guindaste_id = g.id
);
```

---

### **Causa #4: normalizarRegiao Retornando Valor Errado** 🟡
**Problema**: A função pode não estar normalizando corretamente

**Teste no Console**:
```javascript
// Abra o console (F12) e teste:
import { normalizarRegiao } from './utils/regiaoHelper';

console.log(normalizarRegiao('Sul', true)); // Deve retornar: 'sul-sudeste'
console.log(normalizarRegiao('Norte', true)); // Deve retornar: 'norte-nordeste'
console.log(normalizarRegiao('Rio Grande do Sul', true)); // Deve retornar: 'rs-com-ie'
console.log(normalizarRegiao('Rio Grande do Sul', false)); // Deve retornar: 'rs-sem-ie'
```

---

### **Causa #5: getPrecoPorRegiao Retornando 0** 🟡
**Problema**: A query pode não estar encontrando o registro

**Código Atual** (`src/config/supabase.js`):
```javascript
async getPrecoPorRegiao(guindasteId, regiao) {
  const { data, error } = await supabase
    .from('precos_guindaste_regiao')
    .select('preco')
    .eq('guindaste_id', guindasteId)
    .eq('regiao', regiao)
    .limit(1);
  
  if (error) {
    console.error('Erro ao buscar preço por região:', error);
    return 0;
  }
  
  if (!data || data.length === 0) return 0;
  
  return data[0]?.preco || 0;
}
```

---

## 🧪 **COMO TESTAR AGORA**

### **Passo 1: Verificar Logs no Console**

Adicionei logs detalhados! Quando selecionar um guindaste, você verá:

```
🔍 DEBUG COMPLETO - Busca de Preço:
  📦 Guindaste: { id: 123, nome: 'GSI 6.5', codigo: 'GSI65-001' }
  👤 Usuário: { nome: 'João Silva', regiao_original: 'Sul', email: 'joao@email.com' }
  📋 Cliente tem IE: true
  🌎 Região normalizada: 'sul-sudeste'
  🔎 Buscando preço em precos_guindaste_regiao...
  💰 Preço retornado do banco: 85000
  ✅ Preço encontrado com sucesso!
  📦 Produto adicionado ao carrinho: { id: 123, preco: 85000, ... }
```

### **Passo 2: Se aparecer "PREÇO NÃO ENCONTRADO"**

Você verá no console:
```
❌ PREÇO NÃO ENCONTRADO!
ℹ️ Verifique se existe registro em precos_guindaste_regiao para:
   - guindaste_id = 123
   - regiao = 'sul-sudeste'
```

**Ação**: Execute no SQL:
```sql
SELECT * FROM precos_guindaste_regiao 
WHERE guindaste_id = 123 
AND regiao = 'sul-sudeste';
```

---

## ✅ **SOLUÇÃO RÁPIDA**

### **Se não há preços cadastrados:**

Execute este SQL para cadastrar preços de exemplo:

```sql
-- Exemplo: Cadastrar preços para guindaste ID 1
INSERT INTO precos_guindaste_regiao (guindaste_id, regiao, preco) VALUES
(1, 'norte-nordeste', 95000),
(1, 'sul-sudeste', 85000),
(1, 'centro-oeste', 90000),
(1, 'rs-com-ie', 88000),
(1, 'rs-sem-ie', 92000);
```

### **Se a região do vendedor está errada:**

```sql
-- Corrigir região de um vendedor
UPDATE users 
SET regiao = 'Sul' 
WHERE email = 'vendedor@email.com';
```

### **Se quiser resetar tudo:**

```sql
-- Limpar preços antigos
DELETE FROM precos_guindaste_regiao;

-- Inserir preços novos (exemplo para guindaste ID 1)
INSERT INTO precos_guindaste_regiao (guindaste_id, regiao, preco) VALUES
(1, 'norte-nordeste', 95000),
(1, 'sul-sudeste', 85000),
(1, 'centro-oeste', 90000),
(1, 'rs-com-ie', 88000),
(1, 'rs-sem-ie', 92000);
```

---

## 📋 **CHECKLIST DE VERIFICAÇÃO**

Execute na ordem:

### **1. Verificar Vendedor**
```sql
SELECT id, nome, email, regiao FROM users WHERE tipo = 'vendedor';
```
✅ Campo `regiao` deve ter um valor válido

### **2. Verificar Guindastes**
```sql
SELECT id, subgrupo, codigo_referencia FROM guindastes LIMIT 5;
```
✅ Anote os IDs

### **3. Verificar Preços**
```sql
SELECT * FROM precos_guindaste_regiao WHERE guindaste_id = [ID_DO_PASSO_2];
```
✅ Deve ter 5 registros (uma para cada região)

### **4. Testar Normalização**
Abra o console do navegador e teste:
```javascript
// Carregue a página e teste no console
const { normalizarRegiao } = await import('./src/utils/regiaoHelper.js');
console.log(normalizarRegiao('Sul', true));
```

### **5. Testar Seleção de Guindaste**
- Selecione um guindaste
- Veja os logs no console
- Identifique qual etapa está falhando

---

## 🎯 **RESULTADO ESPERADO**

Quando tudo estiver correto, ao selecionar um guindaste você deve ver:

```
✅ Preço encontrado com sucesso!
📦 Produto adicionado ao carrinho: {
  id: 123,
  nome: "Guindaste GSI 6.5 CR/EH",
  preco: 85000,
  tipo: "guindaste"
}
```

E o valor deve aparecer corretamente no resumo!

---

## 📞 **PRÓXIMOS PASSOS**

1. ✅ Commit e push do código com logs
2. ✅ Fazer deploy no Vercel
3. ✅ Logar como vendedor
4. ✅ Selecionar um guindaste
5. ✅ Abrir console (`F12`) e copiar TODOS os logs
6. ✅ Me enviar os logs para análise

---

**Status**: 🔧 Logs de debug adicionados  
**Próximo Passo**: Testar e compartilhar logs do console
**Arquivo**: `src/pages/NovoPedido.jsx` (linhas 208-257)

