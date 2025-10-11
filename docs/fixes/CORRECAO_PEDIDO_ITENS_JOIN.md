# 🔧 Correção: Erro ao Buscar Detalhes do Pedido no Histórico

**Data:** 11/10/2025  
**Status:** ✅ Corrigido  
**Erro:** `Could not find a relationship between 'pedido_itens' and 'guindastes' in the schema cache`

---

## 🐛 Problema Identificado

Ao clicar em "Ver Detalhes" no histórico de pedidos, o sistema retornava erro:

```
Historico.jsx:99 Erro ao buscar detalhes do pedido: 
{
  code: 'PGRST200',
  details: "Searched for a foreign key relationship between 'pedido_itens' and 'guindastes' in the schema 'public', but no matches were found.",
  hint: null,
  message: "Could not find a relationship between 'pedido_itens' and 'guindastes' in the schema cache"
}
```

### **Causa Raiz**

O Supabase estava tentando fazer um **JOIN automático** entre as tabelas `pedido_itens` e `guindastes` usando a sintaxe:

```javascript
.select(`
  *,
  guindaste:guindastes(*),
  opcional:opcionais(*)
`)
```

Porém, essa sintaxe **requer que exista uma Foreign Key** configurada no banco de dados entre `pedido_itens.guindaste_id` e `guindastes.id`.

**Possíveis causas da ausência da FK:**
1. FK nunca foi criada no schema do Supabase
2. FK foi removida acidentalmente
3. Permissões do Supabase não reconhecem a FK
4. Coluna `guindaste_id` pode ter outro nome ou não existir

---

## ✅ Solução Aplicada

### **Abordagem: Buscar Dados Manualmente**

Em vez de confiar no JOIN automático do Supabase, implementamos **buscas manuais** para cada relacionamento:

#### **Antes (Com Erro):**

```javascript
async getPedidoItens(pedidoId) {
  const { data, error } = await supabase
    .from('pedido_itens')
    .select(`
      *,
      guindaste:guindastes(*),  // ❌ Falha se não houver FK
      opcional:opcionais(*)     // ❌ Falha se não houver FK
    `)
    .eq('pedido_id', pedidoId);
  
  if (error) throw error;
  return data || [];
}
```

#### **Depois (Corrigido):**

```javascript
async getPedidoItens(pedidoId) {
  try {
    // 1. Buscar os itens do pedido
    const { data: itens, error: itensError } = await supabase
      .from('pedido_itens')
      .select('*')
      .eq('pedido_id', pedidoId);
    
    if (itensError) throw itensError;
    
    // 2. Para cada item, buscar os dados relacionados manualmente
    const itensCompletos = await Promise.all(
      (itens || []).map(async (item) => {
        let guindaste = null;
        let opcional = null;
        
        // Se o item é um guindaste, buscar dados do guindaste
        if (item.tipo === 'guindaste' && item.guindaste_id) {
          const { data: guindasteData } = await supabase
            .from('guindastes')
            .select('*')
            .eq('id', item.guindaste_id)
            .single();
          guindaste = guindasteData;
        }
        
        // Se o item é um opcional, buscar dados do opcional
        if (item.tipo === 'opcional' && item.opcional_id) {
          const { data: opcionalData } = await supabase
            .from('opcionais')
            .select('*')
            .eq('id', item.opcional_id)
            .single();
          opcional = opcionalData;
        }
        
        return {
          ...item,
          guindaste,
          opcional
        };
      })
    );
    
    return itensCompletos;
  } catch (error) {
    console.error('❌ Erro ao buscar itens do pedido:', error);
    throw error;
  }
}
```

---

## 🔄 Fluxo da Correção

### **Antes (Com Erro):**

```
1. Histórico → Clicar "Ver Detalhes"
   ↓
2. Chamar db.getPedidoItens(pedido.id)
   ↓
3. Supabase tenta JOIN automático: pedido_itens → guindastes
   ↓
4. ❌ ERRO: "Could not find a relationship"
   ↓
5. ❌ PDF não é gerado
```

### **Depois (Corrigido):**

```
1. Histórico → Clicar "Ver Detalhes"
   ↓
2. Chamar db.getPedidoItens(pedido.id)
   ↓
3. Buscar pedido_itens (sem JOIN)
   ↓
4. Para cada item:
   - Se tipo === 'guindaste' → buscar guindastes.id = item.guindaste_id
   - Se tipo === 'opcional' → buscar opcionais.id = item.opcional_id
   ↓
5. ✅ Retorna itens com dados completos
   ↓
6. ✅ PDF é gerado com sucesso
```

---

## 📊 Estrutura da Tabela `pedido_itens`

### **Colunas Esperadas:**

```sql
CREATE TABLE pedido_itens (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER REFERENCES pedidos(id),
  tipo TEXT NOT NULL,              -- 'guindaste' ou 'opcional'
  guindaste_id INTEGER,             -- FK para guindastes.id (se tipo = 'guindaste')
  opcional_id INTEGER,              -- FK para opcionais.id (se tipo = 'opcional')
  quantidade INTEGER DEFAULT 1,
  preco_unitario DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **Dados de Exemplo:**

```json
{
  "id": 1,
  "pedido_id": 123,
  "tipo": "guindaste",
  "guindaste_id": 45,
  "opcional_id": null,
  "quantidade": 1,
  "preco_unitario": 150000.00
}
```

---

## 🛠️ Melhorias no `Historico.jsx`

Além da correção no `supabase.js`, também melhoramos o tratamento de dados no `Historico.jsx`:

### **1. Nome do Guindaste Correto**

```javascript
// ✅ ANTES (Incorreto)
const nome = item.guindaste?.nome || 'Item não encontrado';

// ✅ DEPOIS (Correto)
const nome = item.tipo === 'guindaste' 
  ? (item.guindaste?.subgrupo || item.guindaste?.modelo || 'Guindaste não identificado')
  : (item.opcional?.nome || 'Item não encontrado');
```

**Por quê?**  
Os guindastes usam o campo `subgrupo` como nome principal, não `nome`.

### **2. Logs de Debug Adicionados**

```javascript
console.log('🔍 Buscando detalhes do pedido:', pedido.id);
console.log('📦 Itens encontrados:', itens);
console.log('📄 Dados preparados para PDF:', pedidoData);
```

Facilita o debug caso ocorram novos erros.

### **3. Dados Completos para PDF**

Agora o PDF recebe **todos os dados necessários**:

```javascript
const pedidoData = {
  carrinho: [...],        // Itens do pedido
  clienteData: {          // Dados completos do cliente
    nome,
    telefone,
    email,
    documento,
    endereco,
    inscricao_estadual    // ✅ Adicionado
  },
  caminhaoData: {         // Dados completos do caminhão
    tipo,                 // ✅ Adicionado
    marca,                // ✅ Adicionado
    modelo,
    ano,
    voltagem,             // ✅ Adicionado
    placa
  },
  pagamentoData: {        // ✅ Adicionado
    tipoPagamento,
    prazoPagamento,
    valorTotal
  }
};
```

---

## 🎯 Vantagens da Solução

### **1. Independência de FKs**
- ✅ Não depende de Foreign Keys configuradas no Supabase
- ✅ Funciona mesmo se as FKs não existirem
- ✅ Mais robusto e previsível

### **2. Controle Total**
- ✅ Controle explícito sobre quais dados buscar
- ✅ Pode adicionar lógica condicional (ex: buscar apenas se `guindaste_id` existir)
- ✅ Tratamento de erros granular

### **3. Performance Aceitável**
- ⚠️ Faz múltiplas queries em vez de um JOIN
- ✅ Usa `Promise.all` para buscar em paralelo
- ✅ Para pedidos típicos (1-5 itens), a diferença é imperceptível

### **4. Compatibilidade**
- ✅ Funciona com o schema atual do Supabase
- ✅ Não requer migrations ou alterações no banco
- ✅ Solução imediata e pragmática

---

## ⚠️ Desvantagens e Alternativas

### **Desvantagens:**

1. **Múltiplas Queries:**
   - Faz N+1 queries (1 para itens + N para cada relacionamento)
   - Pode ser lento para pedidos com muitos itens (10+)

2. **Complexidade:**
   - Código mais verboso que um JOIN simples
   - Mais difícil de manter

### **Alternativa: Configurar FKs no Supabase**

Se quiser usar a sintaxe de JOIN original, precisa garantir que as FKs existam:

```sql
-- Adicionar FKs na tabela pedido_itens
ALTER TABLE pedido_itens
  ADD CONSTRAINT fk_pedido_itens_guindaste
  FOREIGN KEY (guindaste_id) REFERENCES guindastes(id);

ALTER TABLE pedido_itens
  ADD CONSTRAINT fk_pedido_itens_opcional
  FOREIGN KEY (opcional_id) REFERENCES opcionais(id);
```

Depois, o código original funcionaria:

```javascript
const { data, error } = await supabase
  .from('pedido_itens')
  .select(`
    *,
    guindaste:guindastes(*),  // ✅ Funcionaria com FK
    opcional:opcionais(*)     // ✅ Funcionaria com FK
  `)
  .eq('pedido_id', pedidoId);
```

---

## 🧪 Como Testar

### **Teste 1: Histórico Vazio**
1. Login como vendedor
2. Acessar `/historico`
3. ✅ Verificar se mostra "Nenhum pedido encontrado"

### **Teste 2: Ver Detalhes de Pedido**
1. Login como vendedor que tem pedidos
2. Acessar `/historico`
3. Clicar em "Ver Detalhes" em um pedido
4. ✅ Verificar se o PDF é gerado sem erros
5. ✅ Verificar se o PDF contém o nome correto do guindaste

### **Teste 3: Console Logs**
1. Abrir DevTools (F12)
2. Acessar `/historico`
3. Clicar em "Ver Detalhes"
4. ✅ Verificar logs:
   ```
   🔍 Buscando detalhes do pedido: 123
   📦 Itens encontrados: [{...}]
   📄 Dados preparados para PDF: {...}
   ```

### **Teste 4: Pedido com Múltiplos Itens**
1. Criar pedido com guindaste + opcionais
2. Finalizar pedido
3. Acessar `/historico`
4. Clicar em "Ver Detalhes"
5. ✅ Verificar se todos os itens aparecem no PDF

---

## 📝 Arquivos Modificados

| Arquivo | Mudança | Linhas |
|---------|---------|--------|
| `src/config/supabase.js` | Reimplementar `getPedidoItens` sem JOIN | 408-457 |
| `src/pages/Historico.jsx` | Melhorar `handleVerDetalhes` com logs e dados completos | 68-124 |

---

## 🎓 Lições Aprendidas

1. **JOINs no Supabase requerem FKs:**
   - A sintaxe `tabela:relacao(*)` só funciona com Foreign Keys configuradas
   - Sempre verificar se as FKs existem antes de usar essa sintaxe

2. **Buscas Manuais são mais robustas:**
   - Não dependem de configurações no banco
   - Mais controle e previsibilidade
   - Trade-off: performance vs simplicidade

3. **Logs de Debug são essenciais:**
   - Console.logs detalhados facilitam muito o debug
   - Especialmente útil para erros relacionados ao banco

4. **Campos de Guindastes:**
   - `subgrupo` é o nome principal, não `nome`
   - Sempre verificar a estrutura real das tabelas

---

**Conclusão:** Sistema agora busca itens do pedido corretamente sem depender de Foreign Keys no Supabase. PDFs são gerados com sucesso no histórico! 🚀

