# 📄 Gerador de PDF Profissional - Proposta Comercial

## Visão Geral

O novo gerador de PDF cria propostas comerciais **completas e profissionais** com todas as informações necessárias, formatadas corretamente e distribuídas em múltiplas páginas.

---

## ✅ O Que Está Incluído no PDF

### **Página 1: Dados Gerais**
- ✅ Cabeçalho com logo e número da proposta
- ✅ **Dados do Vendedor**
  - Nome, email, telefone, região
- ✅ **Dados do Cliente**
  - Razão social, CNPJ/CPF
  - Inscrição Estadual
  - Email, telefone
  - Endereço completo (rua, cidade, UF, CEP)
- ✅ **Estudo Veicular**
  - Tipo de veículo, marca, modelo
  - Ano, voltagem, placa
  - Observações

### **Página 2: Especificação do Equipamento**
- ✅ **Informações Principais**
  - Modelo e capacidade
  - Código de referência
  - Peso e configuração
  - Possui CONTR
  - FINAME e NCM
- ✅ **Descrição Técnica Completa**
  - Todas as características técnicas
  - Especificações detalhadas
- ✅ **Não Incluído**
  - Lista de itens não inclusos
  - Formatado em destaque (vermelho)

### **Página 3: Gráfico de Carga**
- ✅ Imagem do gráfico de carga
- ✅ Centralizado e em alta qualidade
- ✅ Mantém proporções originais
- ✅ Ocupa página inteira se necessário

### **Página 4: Condições de Pagamento**
- ✅ **Valores Detalhados**
  - Valor base do equipamento
  - Descontos aplicados (% e R$)
  - Acréscimos (se houver)
  - Valor do frete (CIF/FOB)
  - Valor da instalação
  - **VALOR TOTAL** em destaque
- ✅ **Forma de Pagamento**
  - Prazo selecionado
  - Financiamento bancário (se aplicável)
  - Entrada (valor e percentual)
  - Sinal e restante da entrada
  - Saldo a pagar
- ✅ **Parcelamento**
  - Lista de parcelas com valores
  - Datas de vencimento
- ✅ **Local de Instalação**
  - Endereço da instalação
  - Tipo (por conta da fábrica/cliente)

### **Página 5: Cláusulas Contratuais**
- ✅ **8 Cláusulas Padrão**
  1. Validade da proposta (30 dias)
  2. Prazo de entrega (15 dias úteis)
  3. Garantia (12 meses)
  4. Instalação
  5. Frete (CIF/FOB)
  6. Condições de pagamento
  7. Cancelamento (multa 20%)
  8. Responsabilidades
- ✅ **Observações Adicionais**
  - Campo livre para observações personalizadas

### **Página Final: Assinaturas e Contato**
- ✅ Campos para assinatura
  - STARK Guindastes (representante legal)
  - Cliente
- ✅ **QR Code para WhatsApp**
  - Contato direto com o vendedor
  - Mensagem pré-formatada com número da proposta
- ✅ Rodapé em todas as páginas
  - Nome da empresa
  - Número da página

---

## 🎨 Características Visuais

### **Design Profissional**
- ✅ Cores corporativas (azul #2962ff)
- ✅ Tipografia clara e legível
- ✅ Espaçamento adequado
- ✅ Hierarquia visual bem definida

### **Formatação Inteligente**
- ✅ Quebra automática de página
- ✅ Texto com wrap automático
- ✅ Imagens redimensionadas proporcionalmente
- ✅ Cabeçalho e rodapé em todas as páginas

### **Responsivo**
- ✅ Adapta-se ao conteúdo
- ✅ Adiciona páginas conforme necessário
- ✅ Mantém formatação consistente

---

## 🚀 Como Usar

### **1. No Componente NovoPedido.jsx**

```javascript
import PDFGeneratorProfessional from '../components/PDFGeneratorProfessional';

// No step 5 (Revisão), adicionar:
<PDFGeneratorProfessional
  dadosCompletos={{
    numeroPedido: 'PROP-001',
    vendedor: user,
    cliente: clienteData,
    caminhao: caminhaoData,
    equipamento: carrinho[0], // Guindaste principal
    pagamento: pagamentoData,
    observacoes: 'Observações adicionais aqui'
  }}
  onSuccess={(fileName) => {
    console.log('PDF gerado:', fileName);
    alert('Proposta comercial gerada com sucesso!');
  }}
  onError={(error) => {
    console.error('Erro:', error);
    alert('Erro ao gerar PDF: ' + error);
  }}
/>
```

### **2. Estrutura de Dados Esperada**

```javascript
const dadosCompletos = {
  numeroPedido: 'PROP-001',
  
  vendedor: {
    nome: 'João Silva',
    email: 'joao@stark.com',
    telefone: '(55) 99999-9999',
    regiao: 'Rio Grande do Sul'
  },
  
  cliente: {
    nome: 'Empresa XYZ Ltda',
    documento: '12.345.678/0001-90',
    inscricao_estadual: '123456789',
    email: 'contato@empresa.com',
    telefone: '(51) 3333-3333',
    endereco: 'Rua das Flores, 123',
    cidade: 'Porto Alegre',
    uf: 'RS',
    cep: '90000-000'
  },
  
  caminhao: {
    tipo: 'Caminhão',
    marca: 'Mercedes-Benz',
    modelo: 'Atego 1719',
    ano: '2020',
    voltagem: '24V',
    placa: 'ABC-1234',
    observacoes: 'Veículo em bom estado'
  },
  
  equipamento: {
    modelo: 'GSI 3000',
    subgrupo: '3 Toneladas',
    codigo_referencia: 'GSI-3000-CR',
    peso_kg: '850 kg',
    configuracao: 'CR + EH',
    tem_contr: 'Sim',
    finame: '12345',
    ncm: '8426.41.00',
    descricao: 'Guindaste hidráulico articulado...',
    nao_incluido: 'Não inclui: suportes especiais...',
    grafico_carga_url: 'https://...'
  },
  
  pagamento: {
    tipoPagamento: 'cliente',
    valorBase: 120000,
    desconto: 5,
    valorDesconto: 6000,
    acrescimo: 0,
    valorFrete: 2500,
    valorInstalacao: 4000,
    valorFinal: 120500,
    prazoPagamento: '60 dias',
    financiamentoBancario: 'nao',
    entradaTotal: 36000,
    valorSinal: 10000,
    faltaEntrada: 26000,
    percentualEntrada: 30,
    saldoAPagar: 84500,
    parcelas: [
      { valor: 14083.33, vencimento: '30 dias' },
      { valor: 14083.33, vencimento: '60 dias' },
      // ...
    ],
    localInstalacao: 'Agiltec - Santa Rosa/RS',
    tipoInstalacao: 'fabrica',
    tipoFrete: 'cif'
  },
  
  observacoes: 'Proposta válida por 30 dias'
};
```

---

## 📋 Checklist de Implementação

### **Passo 1: Instalar Dependências** ✅
```bash
# Já instaladas:
# - jspdf
# - qrcode
```

### **Passo 2: Importar no NovoPedido.jsx**
```javascript
import PDFGeneratorProfessional from '../components/PDFGeneratorProfessional';
```

### **Passo 3: Adicionar no Step 5 (Revisão)**
Substituir o botão antigo de gerar PDF pelo novo componente.

### **Passo 4: Preparar Dados**
Garantir que todos os dados estão disponíveis:
- ✅ Dados do vendedor (user)
- ✅ Dados do cliente (clienteData)
- ✅ Dados do caminhão (caminhaoData)
- ✅ Dados do equipamento (carrinho[0])
- ✅ Dados de pagamento (pagamentoData)

### **Passo 5: Testar**
1. Criar um orçamento completo
2. Preencher todos os campos
3. Gerar PDF no step 5
4. Verificar se todas as informações aparecem
5. Verificar formatação e quebras de página

---

## 🎯 Vantagens do Novo Gerador

### **Comparação: Antigo vs Novo**

| Aspecto | Antigo | Novo |
|---------|--------|------|
| **Páginas** | 1-2 | 5-7 (conforme necessário) |
| **Dados do Cliente** | Básico | Completo com endereço |
| **Dados do Veículo** | Básico | Completo com observações |
| **Equipamento** | Modelo e preço | Descrição técnica completa |
| **Descrição Técnica** | ❌ | ✅ Completa |
| **Não Incluído** | ❌ | ✅ Destacado |
| **Gráfico de Carga** | Pequeno | Página inteira |
| **Pagamento** | Resumido | Detalhado com parcelas |
| **Cláusulas** | ❌ | ✅ 8 cláusulas padrão |
| **Assinaturas** | ❌ | ✅ Campos para assinatura |
| **QR Code** | Básico | WhatsApp direto |
| **Formatação** | Simples | Profissional |
| **Quebra de Página** | Manual | Automática |

---

## 🔧 Personalização

### **Alterar Cores**
```javascript
// Em pdfGeneratorProfessional.js
doc.setTextColor(41, 98, 255); // Azul principal
// Alterar para suas cores corporativas
```

### **Alterar Logo**
```javascript
// Adicionar logo da empresa
const logo = await loadImage('/path/to/logo.png');
doc.addImage(logo, 'PNG', 20, 10, 30, 15);
```

### **Adicionar Cláusulas Personalizadas**
```javascript
// Adicionar na array de cláusulas
const clausulas = [
  // ... cláusulas existentes
  {
    titulo: '9. NOVA CLÁUSULA',
    texto: 'Texto da nova cláusula...'
  }
];
```

### **Alterar Rodapé**
```javascript
// Em addFooter()
doc.text('Sua Empresa - Contato', 105, 285, { align: 'center' });
```

---

## 📞 Suporte

Para dúvidas ou problemas:
- Email: chrystianbohnert10@gmail.com
- Telefone: (55) 98172-1286

---

## ✅ Status

- [x] Gerador de PDF criado
- [x] Componente React criado
- [x] Documentação completa
- [ ] Integrado no NovoPedido.jsx
- [ ] Testado em produção

---

**Desenvolvido com ❤️ para STARK Guindastes**
**Data: 14/10/2025**
