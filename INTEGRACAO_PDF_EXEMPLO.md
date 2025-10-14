# 🔗 Integração do PDF Profissional no NovoPedido.jsx

## Como Integrar

### **Passo 1: Importar o Componente**

No topo do arquivo `NovoPedido.jsx`, adicione:

```javascript
import PDFGeneratorProfessional from '../components/PDFGeneratorProfessional';
```

### **Passo 2: Adicionar no Step 5 (Revisão)**

Localize o **Step 5** no componente `NovoPedido.jsx` e adicione o novo gerador de PDF:

```javascript
case 5:
  return (
    <div className="step-content">
      <div className="step-header">
        <h2>Revisão do Pedido</h2>
        <p>Confira todos os dados antes de finalizar</p>
      </div>

      {/* RESUMO EXISTENTE */}
      <div className="resumo-pedido">
        {/* ... código existente de resumo ... */}
      </div>

      {/* NOVO: GERADOR DE PDF PROFISSIONAL */}
      <div style={{ 
        marginTop: '30px', 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        border: '2px dashed #2962ff'
      }}>
        <h3 style={{ 
          color: '#2962ff', 
          marginBottom: '10px',
          fontSize: '18px',
          fontWeight: '600'
        }}>
          📄 Gerar Proposta Comercial Completa
        </h3>
        
        <PDFGeneratorProfessional
          dadosCompletos={{
            numeroPedido: `PROP-${Date.now()}`,
            vendedor: {
              nome: user?.nome || 'Vendedor',
              email: user?.email || '',
              telefone: user?.telefone || '',
              regiao: user?.regiao || ''
            },
            cliente: clienteData,
            caminhao: caminhaoData,
            equipamento: carrinho.find(item => item.tipo === 'guindaste') || {},
            pagamento: {
              ...pagamentoData,
              valorBase: getTotalCarrinho(),
              parcelas: pagamentoData.parcelas || []
            },
            observacoes: clienteData.observacoes || ''
          }}
          onSuccess={(fileName) => {
            alert(`✅ Proposta comercial gerada com sucesso!\n\nArquivo: ${fileName}\n\nO PDF foi baixado automaticamente.`);
          }}
          onError={(error) => {
            alert(`❌ Erro ao gerar proposta:\n\n${error}\n\nTente novamente ou contate o suporte.`);
          }}
        />
      </div>
    </div>
  );
```

---

## Exemplo Completo do Step 5

```javascript
case 5:
  return (
    <div className="step-content">
      <div className="step-header">
        <h2>Revisão do Pedido</h2>
        <p>Confira todos os dados antes de finalizar</p>
      </div>

      {/* RESUMO DO CLIENTE */}
      <div className="info-section">
        <h3>👤 Dados do Cliente</h3>
        <div className="info-grid">
          <div><strong>Nome:</strong> {clienteData.nome}</div>
          <div><strong>Documento:</strong> {clienteData.documento}</div>
          <div><strong>Email:</strong> {clienteData.email}</div>
          <div><strong>Telefone:</strong> {clienteData.telefone}</div>
          <div><strong>Endereço:</strong> {clienteData.endereco}</div>
          <div><strong>Cidade/UF:</strong> {clienteData.cidade}/{clienteData.uf}</div>
        </div>
      </div>

      {/* RESUMO DO VEÍCULO */}
      <div className="info-section">
        <h3>🚛 Dados do Veículo</h3>
        <div className="info-grid">
          <div><strong>Tipo:</strong> {caminhaoData.tipo}</div>
          <div><strong>Marca:</strong> {caminhaoData.marca}</div>
          <div><strong>Modelo:</strong> {caminhaoData.modelo}</div>
          <div><strong>Voltagem:</strong> {caminhaoData.voltagem}</div>
          {caminhaoData.ano && <div><strong>Ano:</strong> {caminhaoData.ano}</div>}
        </div>
      </div>

      {/* RESUMO DO EQUIPAMENTO */}
      <div className="info-section">
        <h3>🏗️ Equipamento Selecionado</h3>
        {carrinho.filter(item => item.tipo === 'guindaste').map((guindaste, index) => (
          <div key={index} className="equipamento-card">
            <h4>{guindaste.nome || guindaste.modelo}</h4>
            <p><strong>Código:</strong> {guindaste.codigo_produto || guindaste.codigo_referencia}</p>
            <p><strong>Capacidade:</strong> {guindaste.subgrupo}</p>
            <p><strong>Valor:</strong> {formatCurrency(guindaste.preco)}</p>
          </div>
        ))}
      </div>

      {/* RESUMO DO PAGAMENTO */}
      <div className="info-section">
        <h3>💰 Condições de Pagamento</h3>
        <div className="info-grid">
          <div><strong>Tipo:</strong> {pagamentoData.tipoPagamento === 'revenda' ? 'Revenda' : 'Cliente Final'}</div>
          <div><strong>Prazo:</strong> {pagamentoData.prazoPagamento}</div>
          <div><strong>Frete:</strong> {pagamentoData.tipoFrete?.toUpperCase()}</div>
          {pagamentoData.valorFinal && (
            <div style={{ gridColumn: '1 / -1', fontSize: '18px', color: '#2962ff', fontWeight: 'bold' }}>
              <strong>VALOR TOTAL:</strong> {formatCurrency(pagamentoData.valorFinal)}
            </div>
          )}
        </div>
      </div>

      {/* GERADOR DE PDF PROFISSIONAL */}
      <div style={{ 
        marginTop: '30px', 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        border: '2px dashed #2962ff'
      }}>
        <h3 style={{ 
          color: '#2962ff', 
          marginBottom: '10px',
          fontSize: '18px',
          fontWeight: '600'
        }}>
          📄 Gerar Proposta Comercial Completa
        </h3>
        
        <p style={{ 
          fontSize: '14px', 
          color: '#666', 
          marginBottom: '15px' 
        }}>
          Clique no botão abaixo para gerar um PDF profissional com:
        </p>
        
        <ul style={{ 
          fontSize: '13px', 
          color: '#666', 
          marginBottom: '20px',
          paddingLeft: '20px'
        }}>
          <li>✅ Dados completos do cliente e veículo</li>
          <li>✅ Especificação técnica detalhada do equipamento</li>
          <li>✅ Gráfico de carga em alta qualidade</li>
          <li>✅ Condições de pagamento com parcelas</li>
          <li>✅ Cláusulas contratuais</li>
          <li>✅ QR Code para contato via WhatsApp</li>
        </ul>
        
        <PDFGeneratorProfessional
          dadosCompletos={{
            numeroPedido: `PROP-${Date.now()}`,
            vendedor: {
              nome: user?.nome || 'Vendedor',
              email: user?.email || '',
              telefone: user?.telefone || '',
              regiao: user?.regiao || ''
            },
            cliente: clienteData,
            caminhao: caminhaoData,
            equipamento: carrinho.find(item => item.tipo === 'guindaste') || {},
            pagamento: {
              ...pagamentoData,
              valorBase: getTotalCarrinho(),
              parcelas: pagamentoData.parcelas || []
            },
            observacoes: clienteData.observacoes || ''
          }}
          onSuccess={(fileName) => {
            alert(`✅ Proposta comercial gerada com sucesso!\n\nArquivo: ${fileName}\n\nO PDF foi baixado automaticamente.`);
          }}
          onError={(error) => {
            console.error('Erro ao gerar PDF:', error);
            alert(`❌ Erro ao gerar proposta:\n\n${error}\n\nTente novamente ou contate o suporte.`);
          }}
        />
      </div>

      {/* BOTÃO PARA SALVAR NO BANCO */}
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={handleFinish}
          style={{
            padding: '12px 24px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          💾 Salvar Pedido no Sistema
        </button>
      </div>
    </div>
  );
```

---

## CSS Adicional (Opcional)

Adicione ao arquivo `NovoPedido.css`:

```css
.info-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.info-section h3 {
  color: #2962ff;
  margin-bottom: 15px;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
  font-size: 14px;
}

.info-grid div {
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
}

.info-grid strong {
  color: #495057;
  margin-right: 8px;
}

.equipamento-card {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  border-left: 4px solid #2962ff;
}

.equipamento-card h4 {
  color: #2962ff;
  margin-bottom: 10px;
  font-size: 16px;
}

.equipamento-card p {
  margin: 5px 0;
  font-size: 14px;
  color: #495057;
}
```

---

## Testando a Integração

### **1. Criar um Pedido Completo**
- Selecionar guindaste
- Preencher política de pagamento
- Preencher dados do cliente
- Preencher dados do veículo
- Ir para revisão (Step 5)

### **2. Gerar PDF**
- Clicar no botão "Gerar Proposta Comercial (PDF)"
- Aguardar processamento
- PDF será baixado automaticamente

### **3. Verificar Conteúdo**
- ✅ Todas as páginas foram geradas?
- ✅ Dados do cliente estão corretos?
- ✅ Dados do veículo estão corretos?
- ✅ Especificação do equipamento está completa?
- ✅ Gráfico de carga aparece?
- ✅ Condições de pagamento estão corretas?
- ✅ Cláusulas aparecem?
- ✅ QR Code funciona?

---

## Troubleshooting

### **Problema: PDF não gera**
**Solução:** Verificar console do navegador para erros. Garantir que todos os dados obrigatórios estão preenchidos.

### **Problema: Gráfico de carga não aparece**
**Solução:** Verificar se `equipamento.grafico_carga_url` está preenchido e acessível.

### **Problema: Formatação quebrada**
**Solução:** Verificar se os textos muito longos estão sendo quebrados corretamente. Ajustar `maxWidth` se necessário.

### **Problema: QR Code não funciona**
**Solução:** Verificar se o telefone do vendedor está no formato correto (apenas números com DDI).

---

## 📞 Suporte

Para dúvidas:
- Email: chrystianbohnert10@gmail.com
- Telefone: (55) 98172-1286

---

**Pronto para usar! 🚀**
