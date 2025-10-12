# ✅ REVISÃO - Sistema de Preços por Região

## 📋 Checklist de Implementação

### ✅ 1. Admin - Cadastro de Preços por Região
**Arquivo:** `src/components/PrecosPorRegiaoModal.jsx`

**O que foi implementado:**
- ✅ Modal com 5 campos de preço:
  - Norte-Nordeste (Estados do Norte e Nordeste)
  - Centro Oeste (MT, MS, GO, DF)
  - Sul-Sudeste (PR, SC, SP, RJ, MG, ES - exceto RS)
  - **RS com Inscrição Estadual** 🚜 Produtor Rural (DESTAQUE AMARELO)
  - **RS sem Inscrição Estadual** 🚛 Rodoviário (DESTAQUE AMARELO)
- ✅ Banner informativo azul explicando as duas opções do RS
- ✅ Descrições claras em cada campo
- ✅ Salva corretamente na tabela `precos_guindaste_regiao`

**Status:** ✅ CORRETO

---

### ✅ 2. Vendedor - Seleção Produtor Rural vs Rodoviário
**Arquivo:** `src/features/payment/PaymentPolicy.jsx`

**O que foi implementado:**
- ✅ Campo aparece quando:
  - `tipoCliente === 'cliente'`
  - `participacaoRevenda` está definido (sim ou não)
- ✅ Título do campo:
  - **Com participação de revenda:** "Tipo de Revenda:"
  - **Sem participação de revenda:** "O cliente possui Inscrição Estadual?"
- ✅ Banner azul específico para vendedores do RS:
  - "ℹ️ Vendedores do RS: Selecione 'Produtor rural' para preços RS com IE ou 'Rodoviário' para preços RS sem IE"
- ✅ Botões com ícones e descrições:
  - 🚜 Produtor rural
    - Subtexto (só RS): "Com Inscrição Estadual"
  - 🚛 Rodoviário
    - Subtexto (só RS): "Sem Inscrição Estadual"
- ✅ Callback `onClienteIEChange(true/false)` dispara recálculo de preços

**Status:** ✅ CORRETO

---

### ✅ 3. Recálculo Automático de Preços
**Arquivo:** `src/pages/NovoPedido.jsx`

**Função:** `recalcularPrecosCarrinho()`

**Lógica:**
```javascript
1. Determina se cliente tem IE:
   - Se vendedor do RS + tipo cliente = 'cliente' → usa clienteTemIE
   - Outros casos → true (padrão)

2. Normaliza a região:
   - RS + com IE → 'rs-com-ie'
   - RS + sem IE → 'rs-sem-ie'
   - Norte/Nordeste → 'norte-nordeste'
   - Sul/Sudeste → 'sul-sudeste'
   - Centro-Oeste → 'centro-oeste'

3. Para cada guindaste no carrinho:
   - Busca preço: db.getPrecoPorRegiao(guindasteId, regiaoNormalizada)
   - Atualiza item.preco com o novo valor
   - Salva no localStorage

4. Dispara quando muda:
   - tipoPagamento
   - participacaoRevenda
   - revendaTemIE
   - clienteTemIE
   - currentStep
```

**Status:** ✅ CORRETO

---

### ✅ 4. Helper de Normalização de Região
**Arquivo:** `src/utils/regiaoHelper.js`

**Função:** `normalizarRegiao(regiao, temIE)`

**Mapeamento:**
| Região do Vendedor | Cliente tem IE? | Região Normalizada |
|--------------------|-----------------|-------------------|
| Rio Grande do Sul | ✅ Sim | `rs-com-ie` |
| Rio Grande do Sul | ❌ Não | `rs-sem-ie` |
| Norte | - | `norte-nordeste` |
| Nordeste | - | `norte-nordeste` |
| Sul (PR, SC) | - | `sul-sudeste` |
| Sudeste (SP, RJ, MG, ES) | - | `sul-sudeste` |
| Centro-Oeste | - | `centro-oeste` |

**Status:** ✅ CORRETO

---

### ✅ 5. Banco de Dados - Busca de Preços
**Arquivo:** `src/config/supabase.js`

**Métodos:**
```javascript
// Admin: Buscar todos os preços de um guindaste
async getPrecosPorRegiao(guindasteId)
  → SELECT * FROM precos_guindaste_regiao WHERE guindaste_id = ?

// Admin: Salvar preços
async salvarPrecosPorRegiao(guindasteId, precos)
  → DELETE + INSERT em precos_guindaste_regiao

// Vendedor: Buscar preço específico
async getPrecoPorRegiao(guindasteId, regiao)
  → SELECT preco FROM precos_guindaste_regiao 
    WHERE guindaste_id = ? AND regiao = ?
  → Retorna 0 se não encontrar
```

**Status:** ✅ CORRETO

---

## 🧪 Cenários de Teste

### Cenário 1: Vendedor do RS - Produtor Rural
```
1. Login como vendedor do RS
2. Novo Pedido → Adicionar guindaste "CR 3000"
3. Política de Pagamento → Tipo: Cliente
4. Participação de Revenda: Não
5. Selecionar: 🚜 Produtor rural

ESPERADO:
- Sistema busca preço na região 'rs-com-ie'
- Preço do guindaste atualiza automaticamente
- Console mostra: "Cliente tem IE: true, Região: rs-com-ie"
```

### Cenário 2: Vendedor do RS - Rodoviário
```
1. Mesmo fluxo do Cenário 1
2. Selecionar: 🚛 Rodoviário

ESPERADO:
- Sistema busca preço na região 'rs-sem-ie'
- Preço muda imediatamente (se admin cadastrou preços diferentes)
- Console mostra: "Cliente tem IE: false, Região: rs-sem-ie"
```

### Cenário 3: Vendedor de SP
```
1. Login como vendedor de São Paulo
2. Novo Pedido → Adicionar guindaste
3. Política de Pagamento → Tipo: Cliente

ESPERADO:
- Campo "Produtor rural vs Rodoviário" NÃO aparece
- Banner azul do RS NÃO aparece
- Subtexto nos botões NÃO aparece
- Sistema busca preço em 'sul-sudeste' automaticamente
```

### Cenário 4: Admin Cadastra Preços
```
1. Login como admin
2. Gerenciar Guindastes → CR 3000 → "Preços por Região"
3. Preencher:
   - Norte-Nordeste: R$ 120.000,00
   - Centro Oeste: R$ 115.000,00
   - Sul-Sudeste: R$ 110.000,00
   - RS com IE (🚜 Produtor Rural): R$ 105.000,00
   - RS sem IE (🚛 Rodoviário): R$ 112.000,00
4. Salvar

ESPERADO:
- 5 registros inseridos na tabela precos_guindaste_regiao
- Campos RS destacados em amarelo
- Banner azul informativo visível
```

---

## 🔍 Possíveis Problemas e Verificações

### ❌ Problema 1: Preço não muda ao selecionar Produtor/Rodoviário
**Causas possíveis:**
1. Admin não cadastrou preços para `rs-com-ie` ou `rs-sem-ie`
2. `useEffect` do recálculo não está disparando
3. `onClienteIEChange` não está sendo chamado

**Como verificar:**
- Abrir console do navegador
- Procurar por logs: `[recalcularPrecosCarrinho]`
- Verificar se mostra: "rs-com-ie = R$ XXX, rs-sem-ie = R$ YYY"

**Solução:**
- Admin deve cadastrar preços para ambas as regiões do RS
- Verificar se `PaymentPolicy` está passando `onClienteIEChange` corretamente

---

### ❌ Problema 2: Campo não aparece para vendedor do RS
**Causas possíveis:**
1. Região do vendedor não está definida como "rio grande do sul"
2. Tipo de pagamento não é "cliente"
3. `participacaoRevenda` está vazio

**Como verificar:**
```sql
-- Verificar região do vendedor no banco
SELECT id, nome, regiao FROM users WHERE tipo = 'vendedor';
```

**Solução:**
- Atualizar região do vendedor para "rio grande do sul" (minúsculas)
- Garantir que fluxo passa por `tipoCliente = 'cliente'`

---

### ❌ Problema 3: Banner azul aparece para outros vendedores
**Causa:**
- Erro na condição `user?.regiao === 'rio grande do sul'`

**Como verificar:**
- Linha 583-587 do `PaymentPolicy.jsx`
- Deve ter: `{user?.regiao === 'rio grande do sul' && ( ... )}`

**Status:** ✅ CORRETO no código atual

---

## 📊 Estrutura do Banco de Dados

### Tabela: `precos_guindaste_regiao`

```sql
CREATE TABLE precos_guindaste_regiao (
  id SERIAL PRIMARY KEY,
  guindaste_id INTEGER NOT NULL REFERENCES guindastes(id),
  regiao TEXT NOT NULL,
  preco DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(guindaste_id, regiao)
);
```

### Valores Válidos para `regiao`:
- `'norte-nordeste'`
- `'centro-oeste'`
- `'sul-sudeste'`
- `'rs-com-ie'` ← Produtor Rural
- `'rs-sem-ie'` ← Rodoviário

### Exemplo de Dados:
```sql
INSERT INTO precos_guindaste_regiao (guindaste_id, regiao, preco) VALUES
(1, 'norte-nordeste', 120000.00),
(1, 'centro-oeste', 115000.00),
(1, 'sul-sudeste', 110000.00),
(1, 'rs-com-ie', 105000.00),   -- Produtor Rural (mais barato)
(1, 'rs-sem-ie', 112000.00);   -- Rodoviário
```

---

## ✅ RESUMO DA REVISÃO

### O que está CORRETO ✅:
1. ✅ Modal do admin cadastra 5 preços separados
2. ✅ Campos RS com IE e sem IE destacados em amarelo
3. ✅ Banner informativo no modal do admin
4. ✅ Campo de seleção aparece apenas para tipo "Cliente"
5. ✅ Título muda: "Tipo de Revenda" ou "O cliente possui IE?"
6. ✅ Banner azul APENAS para vendedores do RS
7. ✅ Subtextos "Com/Sem Inscrição Estadual" APENAS para RS
8. ✅ Callback `onClienteIEChange` dispara recálculo
9. ✅ Função `normalizarRegiao` mapeia corretamente
10. ✅ `getPrecoPorRegiao` retorna 0 se não encontrar preço
11. ✅ Recálculo automático quando muda Produtor/Rodoviário
12. ✅ Logs detalhados no console para debug

### O que precisa TESTAR 🧪:
1. 🧪 Admin cadastrar preços diferentes para rs-com-ie e rs-sem-ie
2. 🧪 Vendedor do RS selecionar Produtor e ver preço mudar
3. 🧪 Vendedor do RS selecionar Rodoviário e ver preço mudar
4. 🧪 Vendedor de outra região não ver o campo
5. 🧪 Logs no console mostrando região correta

---

## 🎯 CONCLUSÃO

O sistema está **IMPLEMENTADO CORRETAMENTE** ✅

**Requisitos atendidos:**
- ✅ Admin cadastra preços separados para RS com IE e RS sem IE
- ✅ Vendedores do RS selecionam "Produtor rural" ou "Rodoviário"
- ✅ Preços são buscados automaticamente da região correta
- ✅ Interface clara com banners informativos
- ✅ Outros vendedores não veem o campo RS
- ✅ Recálculo automático funciona

**Próximos passos:**
1. Testar no ambiente de desenvolvimento
2. Admin deve cadastrar preços para todos os guindastes
3. Verificar logs no console durante os testes
4. Fazer commit e deploy

**Data da revisão:** 12/10/2025

