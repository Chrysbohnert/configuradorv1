# Refatoração da Política de Pagamento

## 📋 Resumo

A tela de Política de Pagamento foi completamente refatorada para trabalhar com dados estruturados em JSON, permitindo uma gestão mais flexível e escalável dos planos de pagamento.

## 🗂️ Arquitetura

### Estrutura de Arquivos

```
src/
├── data/
│   └── payment_plans.json          # Dados dos planos de pagamento
├── types/
│   └── payment.js                   # Definições de tipos (JSDoc)
├── services/
│   └── paymentPlans.js             # Serviço para acessar os planos
├── lib/
│   └── payments.js                  # Motor de cálculo de pagamentos
└── features/
    └── payment/
        ├── PaymentPolicy.jsx        # Componente principal
        └── PaymentPolicy.css        # Estilos do componente
```

## 📊 Estrutura de Dados

### PaymentPlan (src/data/payment_plans.json)

```typescript
{
  "audience": "revenda" | "cliente",     // Tipo de cliente
  "order": number,                       // Ordem do plano (opcional)
  "description": string,                 // Ex: "30/60/90 DD"
  "installments": number,                // Número de parcelas
  "active": boolean,                     // Se o plano está ativo
  "nature": string,                      // Ex: "Venda"
  "discount_percent": number,            // 0.03 = 3% desconto
  "surcharge_percent": number,           // 0.01 = 1% acréscimo
  "min_order_value": number,             // Valor mínimo do pedido (R$)
  "entry_percent": number,               // 0.5 = 50% de entrada
  "entry_min": number,                   // Valor mínimo de entrada (R$)
  "juros_mensal": number                 // Para uso futuro (0.01 = 1%/mês)
}
```

### Exemplo de Plano

```json
{
  "audience": "cliente",
  "order": 3,
  "description": "30/60/90 DD",
  "installments": 3,
  "active": true,
  "nature": "Venda",
  "entry_percent": 0.50,
  "min_order_value": 10000
}
```

## 🔧 Como Usar

### 1. Serviço de Planos

```javascript
import { getPaymentPlans, getPlanByDescription, getPlanLabel } from '@/services/paymentPlans';

// Obter todos os planos ativos
const todosPlanos = getPaymentPlans();

// Obter planos apenas de revenda
const planosRevenda = getPaymentPlans('revenda');

// Buscar um plano específico
const plano = getPlanByDescription('30/60/90 DD', 'cliente');

// Gerar label descritivo
const label = getPlanLabel(plano);
// Resultado: "30/60/90 DD (entrada 50%, pedido mín. R$ 10.000)"
```

### 2. Motor de Cálculo

```javascript
import { calcularPagamento } from '@/lib/payments';

try {
  const resultado = calcularPagamento({
    precoBase: 50000,
    plan: plano,
    dataEmissaoNF: new Date()
  });

  console.log(resultado);
  // {
  //   precoBase: 50000,
  //   descontoValor: 0,
  //   acrescimoValor: 0,
  //   valorAjustado: 50000,
  //   entrada: 25000,
  //   saldo: 25000,
  //   parcelas: [
  //     { numero: 1, valor: 8333.33, vencimento: Date, vencimentoStr: "01/11/2025" },
  //     { numero: 2, valor: 8333.33, vencimento: Date, vencimentoStr: "01/12/2025" },
  //     { numero: 3, valor: 8333.34, vencimento: Date, vencimentoStr: "31/12/2025" }
  //   ],
  //   total: 50000
  // }
} catch (error) {
  console.error(error.message);
  // "Valor do pedido (R$ 5.000,00) é menor que o mínimo exigido..."
}
```

### 3. Componente PaymentPolicy

```javascript
import PaymentPolicy from '@/features/payment/PaymentPolicy';

<PaymentPolicy
  precoBase={getTotalCarrinho()}
  onPaymentComputed={(dadosPagamento) => {
    // Recebe o resultado do cálculo completo
    setPagamentoData(dadosPagamento);
  }}
  onPlanSelected={(plan) => {
    // Recebe o plano selecionado
    console.log('Plano selecionado:', plan);
  }}
  errors={validationErrors}
/>
```

## 🔄 Como Substituir os Dados da Planilha

### Passo 1: Converter a Planilha

1. Abra sua planilha Excel/Google Sheets
2. Acesse as abas **Revenda** e **Cliente**
3. Para cada linha, crie um objeto JSON seguindo a estrutura:

```json
{
  "audience": "revenda",
  "order": 1,
  "description": "À Vista (7 DD)",
  "installments": 1,
  "active": true,
  "nature": "Venda",
  "discount_percent": 0.03
}
```

### Passo 2: Atualizar o JSON

Substitua o conteúdo de `src/data/payment_plans.json` com seus dados completos:

```json
[
  {
    "audience": "revenda",
    "order": 1,
    "description": "À Vista (7 DD)",
    "installments": 1,
    "active": true,
    "nature": "Venda",
    "discount_percent": 0.03
  },
  {
    "audience": "revenda",
    "order": 2,
    "description": "30 DD",
    "installments": 1,
    "active": true,
    "nature": "Venda",
    "surcharge_percent": 0.03
  },
  // ... mais planos
]
```

### Passo 3: Validar

1. Certifique-se de que todos os planos têm `active: true` ou `active: false`
2. Verifique que `audience` é sempre `"revenda"` ou `"cliente"`
3. Confirme que `installments` corresponde ao número de parcelas em `description`
4. Teste no sistema para garantir que tudo funciona

## 📝 Campos da Tela

### Campos Obrigatórios

1. **Tipo de Cliente e Pagamento**: Select com "Revenda" ou "Cliente"
2. **Prazo de Pagamento**: Select dinâmico baseado no tipo selecionado
3. **Local de Instalação**: Campo de texto
4. **Pagamento por conta de**: Radio com "Cliente" ou "Fábrica"

### Campos Calculados Automaticamente

- Preço Base
- Desconto (se aplicável)
- Acréscimo (se aplicável)
- Valor Ajustado
- Entrada (se aplicável)
- Lista de Parcelas com valores e vencimentos
- Total Final

## ⚙️ Motor de Cálculo

### Regras de Cálculo

1. **Desconto e Acréscimo**: Aplicados nesta ordem sobre o preço base
   ```
   valorAjustado = precoBase - (precoBase × discount_percent) + (precoBase × surcharge_percent)
   ```

2. **Entrada**: Maior valor entre percentual e mínimo
   ```
   entrada = max(valorAjustado × entry_percent, entry_min)
   ```

3. **Saldo**: Valor após entrada
   ```
   saldo = valorAjustado - entrada
   ```

4. **Parcelas**: Distribuídas uniformemente, ajuste na última
   ```
   parcela[i] = saldo / installments
   parcela[última] = saldo - soma(parcelas anteriores)
   ```

5. **Vencimentos**: Parseados de `description` (ex: "30/60/90 DD" → [30, 60, 90] dias)
   - Se não houver DD explícito, gera de 30 em 30 dias

### Validações

- **Valor Mínimo**: Bloqueia cálculo se `precoBase < min_order_value`
- **Plano Ativo**: Apenas planos com `active: true` aparecem no select
- **Dados Obrigatórios**: Valida presença de tipo, prazo e local de instalação

## 🎨 UI/UX

### Comportamento

1. Ao mudar "Tipo de Cliente" → Recarrega lista de prazos e limpa seleção
2. Ao selecionar "Prazo" → Dispara cálculo automático
3. Exibe mensagem clara se valor abaixo do mínimo
4. Mostra hints nos labels: "30/60/90 DD (entrada 50%, pedido mín. R$ 10.000)"

### Estados

- **Vazio**: Nenhum cálculo, apenas campos de seleção
- **Calculando**: Exibe resumo completo com parcelas
- **Erro**: Mostra mensagem amigável (ex: valor mínimo não atingido)

## 🔌 Integração com PDF

O componente expõe via callback `onPaymentComputed` um objeto completo que pode ser usado na geração do PDF:

```javascript
{
  precoBase: 50000,
  descontoValor: 0,
  acrescimoValor: 0,
  valorAjustado: 50000,
  entrada: 25000,
  saldo: 25000,
  parcelas: [...],
  total: 50000,
  plan: {...},
  tipoCliente: 'cliente',
  localInstalacao: 'Mecânica XYZ',
  pagamentoPorConta: 'cliente',
  // Compatibilidade com estrutura antiga:
  tipoPagamento: 'cliente',
  prazoPagamento: '30/60/90 DD',
  desconto: 0,
  acrescimo: 0,
  valorFinal: 50000,
  tipoInstalacao: 'cliente'
}
```

## 🚀 Próximos Passos

1. **Converter Planilha Completa**: Substituir `payment_plans.json` com todos os planos
2. **Adicionar Juros**: Implementar cálculo com `juros_mensal` usando fórmula Price (já preparado em `pmt()`)
3. **Testes**: Validar todos os cenários de cálculo
4. **Histórico**: Salvar plano selecionado no banco de dados

## 📞 Suporte

Em caso de dúvidas ou problemas:

1. Verifique a estrutura do JSON em `src/data/payment_plans.json`
2. Consulte os tipos em `src/types/payment.js`
3. Teste o cálculo isoladamente usando `calcularPagamento()`
4. Verifique o console do navegador para erros

---

**Versão**: 1.0  
**Data**: Outubro 2025  
**Autor**: Sistema de Configuração de Guindastes



