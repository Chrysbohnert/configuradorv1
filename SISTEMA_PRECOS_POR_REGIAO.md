# 📊 Sistema de Preços por Região e Tipo de Cliente

## 🎯 Visão Geral

O sistema está **TOTALMENTE IMPLEMENTADO** e funcional. Permite que:
1. **Admin cadastre preços diferentes** para cada guindaste em cada região
2. **Vendedores vejam apenas os preços** da sua região
3. **Vendedores do RS** escolham entre **Produtor Rural** (com IE) ou **Rodoviário** (sem IE)

---

## 🗂️ Estrutura de Regiões

### 5 Grupos de Preços

| Grupo | Descrição | Vendedores |
|-------|-----------|------------|
| **Norte-Nordeste** | Norte + Nordeste unificados | Vendedores de AM, PA, AC, RO, RR, AP, TO, MA, PI, CE, RN, PB, PE, AL, SE, BA |
| **Centro Oeste** | Centro-Oeste | Vendedores de MT, MS, GO, DF |
| **Sul-Sudeste** | Sul + Sudeste unificados (EXCETO RS) | Vendedores de PR, SC, SP, RJ, ES, MG |
| **RS com IE** | Rio Grande do Sul - **Produtor Rural** | Vendedores do RS quando cliente tem Inscrição Estadual |
| **RS sem IE** | Rio Grande do Sul - **Rodoviário** | Vendedores do RS quando cliente NÃO tem Inscrição Estadual |

---

## 👨‍💼 Para o ADMIN

### Como Cadastrar Preços por Região

1. Acesse **Gerenciar Guindastes** no painel admin
2. Clique no botão **"Preços por Região"** do guindaste desejado
3. Preencha os preços para cada região:
   - Norte-Nordeste
   - Centro Oeste
   - Sul-Sudeste
   - **RS com Inscrição Estadual** ← Produtor Rural
   - **RS sem Inscrição Estadual** ← Rodoviário
4. Clique em **Salvar**

### ⚠️ Importante
- **Cada guindaste** deve ter preços cadastrados para **todas as 5 regiões**
- Se deixar vazio, o preço padrão (R$ 0,00) será usado
- O admin pode atualizar os preços a qualquer momento

---

## 🛒 Para o VENDEDOR

### Vendedores do RS (Rio Grande do Sul)

Ao criar um pedido e selecionar **"Cliente"** no tipo de pagamento:

1. **Aparece um campo destacado:**
   ```
   ⚠️ IMPORTANTE: Este campo afeta o PREÇO BASE do equipamento
   
   O cliente possui Inscrição Estadual?
   
   [ ] 🚜 Produtor rural  (Com IE)
   [ ] 🚛 Rodoviário      (Sem IE)
   ```

2. **Ao selecionar "Produtor rural":**
   - Sistema busca preços da tabela **RS com Inscrição Estadual**
   - Geralmente preços mais baixos (incentivo fiscal)

3. **Ao selecionar "Rodoviário":**
   - Sistema busca preços da tabela **RS sem Inscrição Estadual**
   - Preços padrão para empresas sem IE

### Vendedores de Outras Regiões

- **Não veem** o campo de seleção Produtor/Rodoviário
- Sistema **automaticamente** busca preços da região correta:
  - Norte → `norte-nordeste`
  - Nordeste → `norte-nordeste`
  - Sul (PR, SC) → `sul-sudeste`
  - Sudeste (SP, RJ, MG, ES) → `sul-sudeste`
  - Centro-Oeste (MT, MS, GO, DF) → `centro-oeste`

---

## 🔧 Arquivos Técnicos

### 1. `src/components/PrecosPorRegiaoModal.jsx`
**Função:** Modal onde o admin cadastra os preços

**Regiões disponíveis:**
```javascript
const regioes = [
  { id: 'norte-nordeste', nome: 'Norte-Nordeste' },
  { id: 'centro-oeste', nome: 'Centro Oeste' },
  { id: 'sul-sudeste', nome: 'Sul-Sudeste' },
  { id: 'rs-com-ie', nome: 'RS com Inscrição Estadual' },
  { id: 'rs-sem-ie', nome: 'RS sem Inscrição Estadual' },
];
```

### 2. `src/utils/regiaoHelper.js`
**Função:** Normaliza a região do vendedor para buscar preços

**Lógica principal:**
```javascript
export const normalizarRegiao = (regiao, temIE = true) => {
  const regiaoLower = regiao.toLowerCase().trim();
  
  // RS tem tratamento especial
  if (regiaoLower === 'rio grande do sul' || regiaoLower === 'rs') {
    return temIE ? 'rs-com-ie' : 'rs-sem-ie';
  }
  
  // Norte e Nordeste agrupados
  if (regiaoLower === 'norte' || regiaoLower === 'nordeste') {
    return 'norte-nordeste';
  }
  
  // Sul e Sudeste agrupados
  if (regiaoLower === 'sul' || regiaoLower === 'sudeste') {
    return 'sul-sudeste';
  }
  
  // Centro-Oeste
  if (regiaoLower === 'centro-oeste') {
    return 'centro-oeste';
  }
  
  return 'sul-sudeste'; // Default
};
```

### 3. `src/features/payment/PaymentPolicy.jsx`
**Função:** Exibe o campo de seleção Produtor/Rodoviário

**Condição para exibir:**
- Apenas para vendedores do RS
- Apenas quando tipo de cliente = "Cliente"
- Quando há participação de revenda

### 4. `src/pages/NovoPedido.jsx`
**Função:** Recalcula preços automaticamente quando:
- Vendedor seleciona Produtor ou Rodoviário
- Tipo de pagamento muda
- Participação de revenda muda

**Método principal:**
```javascript
const recalcularPrecosCarrinho = async () => {
  const temIE = determinarClienteTemIE();
  const regiaoVendedor = normalizarRegiao(user.regiao, temIE);
  
  for (const item of carrinho) {
    if (item.tipo === 'guindaste') {
      const novoPreco = await db.getPrecoPorRegiao(item.id, regiaoVendedor);
      // Atualiza carrinho com novo preço
    }
  }
};
```

### 5. `src/config/supabase.js`
**Função:** Busca preços do banco de dados

**Métodos principais:**
```javascript
// Buscar todos os preços de um guindaste
async getPrecosPorRegiao(guindasteId)

// Buscar preço específico por região
async getPrecoPorRegiao(guindasteId, regiao)

// Salvar preços (admin)
async salvarPrecosPorRegiao(guindasteId, precos)
```

---

## 🗄️ Estrutura do Banco de Dados

### Tabela: `precos_guindaste_regiao`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | SERIAL | ID único |
| `guindaste_id` | INTEGER | ID do guindaste (FK) |
| `regiao` | TEXT | Código da região |
| `preco` | DECIMAL(10,2) | Preço em reais |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Última atualização |

**Valores válidos para `regiao`:**
- `norte-nordeste`
- `centro-oeste`
- `sul-sudeste`
- `rs-com-ie`
- `rs-sem-ie`

---

## 🧪 Como Testar

### Teste 1: Admin Cadastra Preços
1. Login como admin
2. Gerenciar Guindastes → Selecionar um guindaste
3. Clicar em "Preços por Região"
4. Preencher preços diferentes para cada região
5. Salvar

### Teste 2: Vendedor RS - Produtor Rural
1. Login como vendedor do RS
2. Novo Pedido → Adicionar guindaste
3. Política de Pagamento → Tipo: Cliente
4. Selecionar **"🚜 Produtor rural"**
5. Verificar se o preço exibido corresponde a "RS com IE"

### Teste 3: Vendedor RS - Rodoviário
1. Mesmo fluxo do Teste 2
2. Selecionar **"🚛 Rodoviário"**
3. Verificar se o preço mudou para "RS sem IE"

### Teste 4: Vendedor de Outra Região
1. Login como vendedor de SP (ou outra região)
2. Novo Pedido → Adicionar guindaste
3. **Campo Produtor/Rodoviário NÃO deve aparecer**
4. Preço deve ser automaticamente de "sul-sudeste"

---

## ✅ Status da Implementação

| Feature | Status | Arquivo |
|---------|--------|---------|
| Admin cadastra preços por região | ✅ Implementado | `PrecosPorRegiaoModal.jsx` |
| 5 grupos de região (incluindo RS com/sem IE) | ✅ Implementado | `regiaoHelper.js` |
| Campo Produtor/Rodoviário para vendedores RS | ✅ Implementado | `PaymentPolicy.jsx` |
| Recálculo automático de preços | ✅ Implementado | `NovoPedido.jsx` |
| Busca preços do banco por região | ✅ Implementado | `supabase.js` |
| Migração de dados antigos | ✅ Documentado | `INSTRUCOES_MIGRACAO_REGIOES.md` |

---

## 🔍 Troubleshooting

### Problema: Preços não aparecem para vendedor
**Causa:** Admin não cadastrou preços para aquela região  
**Solução:** Admin deve acessar "Preços por Região" e cadastrar

### Problema: Campo Produtor/Rodoviário não aparece
**Causa 1:** Vendedor não é do RS  
**Causa 2:** Tipo de cliente não é "Cliente"  
**Solução:** Verificar região do vendedor no cadastro

### Problema: Preço não muda ao selecionar Produtor/Rodoviário
**Causa:** `useEffect` de recálculo pode estar desabilitado  
**Solução:** Verificar console do navegador para logs de recálculo

---

## 📝 Próximas Melhorias Sugeridas

1. ✨ **Melhorar feedback visual** quando preço muda
2. 📊 **Dashboard** mostrando preços cadastrados vs faltantes
3. 🔔 **Alertas** para admin quando preços não estão cadastrados
4. 📋 **Relatório** de pedidos por região e tipo de cliente
5. 🎨 **Ícones mais claros** para Produtor Rural vs Rodoviário

---

## 📞 Suporte

Se tiver dúvidas ou problemas:
1. Verifique os logs no console do navegador
2. Consulte `INSTRUCOES_MIGRACAO_REGIOES.md` para detalhes de migração
3. Revise o código dos arquivos listados acima

**Sistema desenvolvido e testado em:** Outubro 2025  
**Última atualização:** 12/10/2025

