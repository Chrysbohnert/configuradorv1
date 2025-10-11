# 💰 Implementação dos Campos FINAME e NCM

**Data:** 11/10/2025  
**Status:** ✅ Concluído  

---

## 📋 Objetivo

Garantir que os campos **FINAME** e **NCM** cadastrados pelo administrador apareçam para o vendedor na proposta final em PDF.

---

## 🔧 Alterações Realizadas

### 1. **Salvamento dos Campos no Backend** (`GerenciarGuindastes.jsx`)

**Problema:** Os campos `finame` e `ncm` não estavam sendo incluídos no objeto `guindasteData` ao salvar.

**Solução:** Adicionados os campos ao objeto de dados:

```javascript
const guindasteData = {
  subgrupo: formData.subgrupo.trim(),
  modelo: formData.modelo.trim(),
  peso_kg: configuracaoLancas,
  configuração: formData.configuração.trim(),
  tem_contr: formData.tem_contr,
  imagem_url: formData.imagem_url?.trim() || null,
  descricao: formData.descricao?.trim() || null,
  nao_incluido: formData.nao_incluido?.trim() || null,
  imagens_adicionais: formData.imagens_adicionais || [],
  finame: formData.finame?.trim() || null,  // ✅ NOVO
  ncm: formData.ncm?.trim() || null          // ✅ NOVO
};
```

**Arquivo:** `src/pages/GerenciarGuindastes.jsx` (linhas 443-455)

---

### 2. **Inclusão no Carrinho** (`NovoPedido.jsx`)

**Problema:** Quando o vendedor adicionava um guindaste ao carrinho, os campos `finame` e `ncm` não eram incluídos no objeto do produto.

**Solução:** Adicionados os campos em **dois lugares** onde o guindaste é adicionado ao carrinho:

#### **Local 1: Seleção direta de guindaste**
```javascript
const produto = {
  id: guindaste.id,
  nome: guindaste.subgrupo,
  modelo: guindaste.modelo,
  codigo_produto: guindaste.codigo_referencia,
  grafico_carga_url: guindaste.grafico_carga_url,
  preco: precoGuindaste,
  tipo: 'guindaste',
  finame: guindaste.finame || '',  // ✅ NOVO
  ncm: guindaste.ncm || ''          // ✅ NOVO
};
```

**Arquivo:** `src/pages/NovoPedido.jsx` (linhas 283-293)

#### **Local 2: Guindaste vindo da tela de detalhes**
```javascript
const produto = {
  id: guindaste.id,
  nome: guindaste.subgrupo,
  modelo: guindaste.modelo,
  codigo_produto: guindaste.codigo_referencia,
  grafico_carga_url: guindaste.grafico_carga_url,
  preco: precoGuindaste,
  tipo: 'guindaste',
  finame: guindaste.finame || '',  // ✅ NOVO
  ncm: guindaste.ncm || ''          // ✅ NOVO
};
```

**Arquivo:** `src/pages/NovoPedido.jsx` (linhas 85-95)

---

### 3. **Exibição no PDF** (Já implementado previamente)

O componente `PDFGenerator.jsx` **já estava preparado** para exibir os campos FINAME e NCM quando disponíveis:

```javascript
const guindasteComCodigos = guindastesCompletos.find(g => g.finame || g.ncm);
const codigosSection = guindasteComCodigos ? `
  <div style="padding: 20px; background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border: 3px solid #f59e0b;">
    <h4 style="color: #92400e;">
      📋 INFORMAÇÕES PARA FINANCIAMENTO
    </h4>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <div>
        <div>CÓDIGO FINAME</div>
        <div style="font-size: 24px; font-weight: bold;">${guindasteComCodigos.finame}</div>
      </div>
      <div>
        <div>CÓDIGO NCM</div>
        <div style="font-size: 24px; font-weight: bold;">${guindasteComCodigos.ncm}</div>
      </div>
    </div>
  </div>
` : '';
```

**Arquivo:** `src/components/PDFGenerator.jsx` (linhas 244-273)

---

## 🎯 Fluxo Completo

### 1. **Admin cadastra guindaste**
- Preenche campos FINAME e NCM no formulário
- Os campos são salvos no banco de dados Supabase

### 2. **Vendedor cria proposta**
- Seleciona guindaste na tela de Novo Pedido
- Os campos FINAME e NCM são carregados junto com os dados do guindaste
- São incluídos no objeto `produto` do carrinho

### 3. **Geração do PDF**
- O `PDFGenerator` lê os campos do carrinho
- Exibe a seção "INFORMAÇÕES PARA FINANCIAMENTO" destacada
- Mostra os códigos FINAME e NCM em fonte grande e destacada

---

## 📊 Estrutura de Dados

### **Objeto Guindaste (Admin)**
```javascript
{
  id: 1,
  subgrupo: "Guindaste GSE 6.5T",
  modelo: "GSE 6.5T",
  peso_kg: "3h1m",
  configuração: "STANDARD - Pedido Padrão",
  tem_contr: "Sim",
  imagem_url: "https://...",
  descricao: "Descrição técnica...",
  nao_incluido: "Itens não incluídos...",
  finame: "03795187",      // ✅ NOVO
  ncm: "8436.80.00"        // ✅ NOVO
}
```

### **Objeto Produto no Carrinho (Vendedor)**
```javascript
{
  id: 1,
  nome: "Guindaste GSE 6.5T",
  modelo: "GSE 6.5T",
  codigo_produto: "GSE-6.5T-STANDARD",
  grafico_carga_url: "https://...",
  preco: 150000,
  tipo: "guindaste",
  finame: "03795187",      // ✅ Vem do banco
  ncm: "8436.80.00"        // ✅ Vem do banco
}
```

---

## ✅ Testes Necessários

1. ✅ Cadastrar guindaste com FINAME e NCM
2. ✅ Verificar se os dados são salvos no banco
3. ✅ Criar proposta com o guindaste cadastrado
4. ✅ Gerar PDF e verificar se os códigos aparecem destacados
5. ✅ Testar com guindastes sem FINAME/NCM (não deve quebrar)

---

## ⚠️ Observações Importantes

### **Campo `peso_kg`**
O campo `peso_kg` no banco de dados precisa ser do tipo **`text`** para aceitar valores como "3h1m" (configuração de lanças).

**SQL para alterar:**
```sql
ALTER TABLE guindastes 
ALTER COLUMN peso_kg TYPE text;
```

### **Validação**
Os campos FINAME e NCM são marcados como `required` no formulário do admin, garantindo que sempre sejam preenchidos.

### **Fallback**
Se o guindaste não tiver FINAME ou NCM, a seção não aparece no PDF (evita exibir campos vazios).

---

## 📝 Arquivos Modificados

1. ✅ `src/pages/GerenciarGuindastes.jsx` (linhas 443-455)
2. ✅ `src/pages/NovoPedido.jsx` (linhas 85-95, 283-293)
3. ℹ️ `src/components/PDFGenerator.jsx` (já estava pronto)

---

## 🚀 Resultado Final

Quando o vendedor gerar um PDF de proposta, verá uma seção destacada em amarelo com:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 INFORMAÇÕES PARA FINANCIAMENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────┬─────────────────┐
│ CÓDIGO FINAME   │ CÓDIGO NCM      │
│ 03795187        │ 8436.80.00      │
└─────────────────┴─────────────────┘

⚠️ Importante: Estes códigos são fundamentais
para processos de financiamento e documentação
fiscal.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

**Conclusão:** Agora os campos FINAME e NCM cadastrados pelo administrador aparecem automaticamente para o vendedor no PDF da proposta, com destaque visual profissional.

