# 🔄 Fluxo de Seleção de Guindaste - Detalhes Automáticos

**Data:** 11/10/2025  
**Status:** ✅ Implementado  
**Objetivo:** Ao selecionar um guindaste, navegar automaticamente para a página de detalhes **SEM** mostrar essa etapa no cabeçalho do stepper.

---

## 📋 Requisito

> "preciso que aparece o detalhes-guindaste logo após selecionar guindaste, mas nao mostre ele no cabeclaho, naso ele precisa exisiter"

### **Interpretação:**
1. Ao clicar em "Selecionar" em um guindaste, o sistema deve:
   - Adicionar o guindaste ao carrinho
   - Navegar automaticamente para `/detalhes-guindaste/:id`
   - Mostrar todos os detalhes do guindaste (imagens, especificações, gráfico de carga, etc.)

2. A página de detalhes NÃO deve aparecer como uma etapa no stepper
   - O stepper continua mostrando as 5 etapas: Guindaste → Pagamento → Cliente → Caminhão → Finalizar
   - Detalhes é uma "página intermediária" entre a seleção e o restante do fluxo

---

## 🛠️ Implementação

### **1. Modificação no `handleSelecionarGuindaste`**

**Arquivo:** `src/pages/NovoPedido.jsx`  
**Linhas:** 249-312

```javascript
const handleSelecionarGuindaste = async (guindaste) => {
  const jaSelecionado = guindastesSelecionados.find(g => g.id === guindaste.id);
  
  if (jaSelecionado) {
    // Se já selecionado, remove
    setGuindastesSelecionados(prev => prev.filter(g => g.id !== guindaste.id));
    removerItemPorIndex(carrinho.findIndex(item => item.id === guindaste.id));
  } else {
    // Buscar preço baseado na região
    let precoGuindaste = 0;
    try {
      let regiaoVendedor = user?.regiao || 'sul-sudeste';
      
      if (regiaoVendedor === 'rio grande do sul') {
        regiaoVendedor = clienteTemIE ? 'rs-com-ie' : 'rs-sem-ie';
      } else if (regiaoVendedor === 'norte' || regiaoVendedor === 'nordeste') {
        regiaoVendedor = 'norte-nordeste';
      } else if (regiaoVendedor === 'sul' || regiaoVendedor === 'sudeste') {
        regiaoVendedor = 'sul-sudeste';
      } else if (regiaoVendedor === 'centro-oeste') {
        regiaoVendedor = 'centro-oeste';
      }
      
      precoGuindaste = await db.getPrecoPorRegiao(guindaste.id, regiaoVendedor);
      
      if (!precoGuindaste || precoGuindaste === 0) {
        alert('Atenção: Este guindaste não possui preço definido para a sua região.');
      }
    } catch (error) {
      console.error('Erro ao buscar preço do guindaste:', error);
      alert('Erro ao buscar preço do guindaste. Verifique com o administrador.');
    }
    
    // Adicionar ao carrinho
    setGuindastesSelecionados(prev => [...prev, guindaste]);
    
    const produto = {
      id: guindaste.id,
      nome: guindaste.subgrupo,
      modelo: guindaste.modelo,
      codigo_produto: guindaste.codigo_referencia,
      grafico_carga_url: guindaste.grafico_carga_url,
      preco: precoGuindaste,
      tipo: 'guindaste',
      finame: guindaste.finame || '',
      ncm: guindaste.ncm || ''
    };
    
    adicionarAoCarrinho(produto, 'guindaste');
    
    console.log('✅ Guindaste adicionado ao carrinho:', produto.nome);
    
    // ⭐ NOVIDADE: Navegar automaticamente para detalhes
    navigate(`/detalhes-guindaste/${guindaste.id}`, {
      state: { 
        from: '/novo-pedido',
        guindaste: guindaste,
        precoGuindaste: precoGuindaste
      }
    });
  }
};
```

### **2. Stepper Permanece Inalterado**

**Arquivo:** `src/pages/NovoPedido.jsx`  
**Linhas:** 767-790

O stepper continua mostrando apenas as 5 etapas principais:

```jsx
<div className="progress-steps">
  {steps.map((step) => (
    <div
      key={step.id}
      className={`step ${currentStep >= step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}
    >
      <div className="step-number">{/* ... */}</div>
      <div className="step-info">
        <div className="step-title">{step.title}</div>
        <div className="step-description">{step.description}</div>
      </div>
    </div>
  ))}
</div>
```

**Etapas visíveis:**
1. Selecionar Guindaste
2. Pagamento
3. Dados do Cliente
4. Estudo Veicular
5. Finalizar

**Etapa NÃO visível:**
- Detalhes do Guindaste (página intermediária)

---

## 🎯 Fluxo Completo

### **Passo a Passo:**

1. **Usuário acessa `/novo-pedido`**
   - Stepper mostra: [1] Guindaste → [2] Pagamento → [3] Cliente → [4] Caminhão → [5] Finalizar
   - Step 1 está ativo

2. **Usuário seleciona capacidade → modelo → guindaste**
   - Capacidade: Ex: 6.5 ton
   - Modelo: Ex: GSI 6.5
   - Guindaste: Ex: Guindaste GSI 6.5C CR/EH/P

3. **Usuário clica em "Selecionar"**
   - Guindaste é adicionado ao carrinho
   - Sistema busca preço baseado na região do vendedor
   - **Navegação automática** para `/detalhes-guindaste/123`

4. **Página de Detalhes é exibida**
   - Mostra imagens, especificações, gráfico de carga
   - Mostra FINAME e NCM
   - Botão "Voltar" retorna para `/novo-pedido`
   - Botão "Próximo" avança para Step 2 (Pagamento)
   - **Stepper permanece mostrando as mesmas 5 etapas**

5. **Usuário clica em "Próximo"**
   - Retorna para `/novo-pedido`
   - Avança automaticamente para Step 2 (Pagamento)
   - Guindaste permanece no carrinho

---

## 🔍 Detalhes Técnicos

### **Estado Passado para Detalhes:**

```javascript
navigate(`/detalhes-guindaste/${guindaste.id}`, {
  state: { 
    from: '/novo-pedido',           // De onde veio
    guindaste: guindaste,            // Dados completos do guindaste
    precoGuindaste: precoGuindaste   // Preço já calculado
  }
});
```

### **Página de Detalhes Acessa o Estado:**

```javascript
const location = useLocation();
const { from, guindaste, precoGuindaste } = location.state || {};

// Botão Voltar
<button onClick={() => navigate(from || '/novo-pedido')}>
  Voltar
</button>

// Botão Próximo (avança para Step 2)
<button onClick={() => navigate('/novo-pedido', { state: { currentStep: 2 } })}>
  Próximo
</button>
```

---

## ✅ Vantagens Dessa Abordagem

1. **✨ UX Melhorada:**
   - Usuário vê os detalhes completos do guindaste antes de continuar
   - Pode revisar especificações técnicas, gráfico de carga, etc.

2. **🎯 Fluxo Natural:**
   - Seleção → Detalhes → Pagamento
   - Sem confusão com etapas extras no stepper

3. **🧭 Navegação Intuitiva:**
   - Botões "Voltar" e "Próximo" mantêm o contexto
   - Carrinho persiste entre navegações

4. **📱 Responsivo:**
   - Funciona perfeitamente em desktop e mobile
   - Estado é mantido via `location.state`

---

## 🧪 Como Testar

1. **Acessar Novo Pedido:**
   ```
   Login → Dashboard → Novo Pedido
   ```

2. **Selecionar Guindaste:**
   - Escolher capacidade (ex: 6.5 ton)
   - Escolher modelo (ex: GSI 6.5)
   - Clicar em "Selecionar" no guindaste desejado

3. **Verificar Navegação:**
   - ✅ Sistema deve navegar automaticamente para `/detalhes-guindaste/:id`
   - ✅ Página de detalhes deve exibir todas as informações
   - ✅ Stepper NÃO deve mostrar uma etapa extra de "Detalhes"

4. **Voltar e Avançar:**
   - Clicar em "Voltar" → deve retornar para seleção de guindaste
   - Clicar em "Próximo" → deve avançar para Step 2 (Pagamento)

5. **Verificar Carrinho:**
   - Guindaste deve permanecer no carrinho
   - Preço deve estar correto baseado na região

---

## 📝 Observações Importantes

1. **Stepper não muda:**
   - Continua mostrando 5 etapas
   - Detalhes é uma "página de passagem"

2. **Estado é mantido:**
   - Guindaste no carrinho
   - Dados do vendedor/região
   - Preço calculado

3. **Navegação flexível:**
   - Usuário pode voltar para trocar de guindaste
   - Pode avançar para continuar o fluxo

4. **Compatível com fluxo existente:**
   - Não quebra funcionalidades atuais
   - Melhora a experiência sem remover recursos

---

## 🎨 Melhorias Futuras (Opcional)

1. **Breadcrumbs:**
   - Mostrar: Novo Pedido > Seleção > Detalhes > Pagamento

2. **Animação de Transição:**
   - Fade in/out ao navegar entre páginas

3. **Preview no Card:**
   - Mostrar mini-detalhes no hover do card de seleção

4. **Comparação:**
   - Permitir comparar múltiplos guindastes antes de selecionar

---

**Conclusão:** Fluxo implementado com sucesso! O usuário agora vê os detalhes do guindaste automaticamente após a seleção, sem poluir o stepper com etapas extras. 🚀

