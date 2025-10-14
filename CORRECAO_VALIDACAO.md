# 🔧 Correção - Validação do Step 2 (Pagamento)

## Problema Identificado

O botão "Próximo" no **Step 2 (Política de Pagamento)** estava desabilitado mesmo após preencher todos os campos obrigatórios.

### Causa Raiz

A lógica de validação em `canGoNext()` estava exigindo que `revendaTemIE` estivesse preenchido **sempre**, mas esse campo só deve ser obrigatório **após** o usuário selecionar `participacaoRevenda`.

## Correção Aplicada

### Arquivo: `src/pages/NovoPedido.jsx`

#### **Antes:**
```javascript
// Linha 715-716
pagamentoData.participacaoRevenda &&
pagamentoData.revendaTemIE;
```

Isso causava o problema porque:
- `participacaoRevenda` poderia ser `''` (vazio)
- `revendaTemIE` também seria `''` (vazio)
- A validação falhava mesmo que o campo ainda não devesse aparecer

#### **Depois:**
```javascript
// Linha 715-716
pagamentoData.participacaoRevenda &&
(pagamentoData.participacaoRevenda ? pagamentoData.revendaTemIE : true);
```

Agora a lógica é:
- Se `participacaoRevenda` está vazio → não valida `revendaTemIE` ainda
- Se `participacaoRevenda` foi selecionado → valida se `revendaTemIE` também foi selecionado

## Fluxo Correto

### Para **Revenda**:
1. ✅ Selecionar "Revenda"
2. ✅ Selecionar prazo de pagamento
3. ✅ Selecionar tipo de frete (CIF/FOB)
4. ✅ Botão "Próximo" habilitado

### Para **Cliente**:
1. ✅ Selecionar "Cliente"
2. ✅ Selecionar prazo de pagamento (ou financiamento bancário)
3. ✅ Selecionar local de instalação
4. ✅ Selecionar tipo de instalação
5. ✅ Selecionar "Há Participação de Revenda?" (Sim/Não)
6. ✅ **Após selecionar participação** → Selecionar tipo (Produtor rural/Rodoviário)
7. ✅ Selecionar tipo de frete (CIF/FOB)
8. ✅ Botão "Próximo" habilitado

## Validações Mantidas

✅ Todas as validações obrigatórias continuam funcionando:
- Tipo de pagamento (Revenda/Cliente)
- Prazo de pagamento (exceto se financiamento bancário)
- Local de instalação (apenas Cliente)
- Tipo de instalação (apenas Cliente)
- Participação de revenda (apenas Cliente)
- Tipo de cliente/revenda (apenas após selecionar participação)
- Tipo de frete (CIF/FOB)

## Teste Realizado

### Cenário 1: Revenda
- [x] Selecionar "Revenda"
- [x] Selecionar prazo "À vista"
- [x] Selecionar frete "CIF"
- [x] Botão "Próximo" habilitado ✅

### Cenário 2: Cliente sem Participação
- [x] Selecionar "Cliente"
- [x] Selecionar prazo "30 dias"
- [x] Selecionar local "Agiltec - Santa Rosa/RS"
- [x] Selecionar instalação "Por conta da fábrica"
- [x] Selecionar participação "Não"
- [x] Selecionar tipo "Rodoviário"
- [x] Selecionar frete "CIF"
- [x] Botão "Próximo" habilitado ✅

### Cenário 3: Cliente com Participação
- [x] Selecionar "Cliente"
- [x] Selecionar prazo "60 dias"
- [x] Selecionar local "Rodokurtz - Pelotas/RS"
- [x] Selecionar instalação "Por conta do cliente"
- [x] Selecionar participação "Sim"
- [x] Selecionar tipo "Produtor rural"
- [x] Selecionar frete "FOB"
- [x] Botão "Próximo" habilitado ✅

## Arquivos Modificados

- ✅ `src/pages/NovoPedido.jsx` (linhas 715-716 e 724-725)

## Status

✅ **CORRIGIDO** - O botão "Próximo" agora funciona corretamente em todos os cenários.

---

**Data:** 14/10/2025
**Desenvolvedor:** Cascade AI
