# 📋 Sistema de Pedidos para Concessionárias - Uso Interno Stark

## Objetivo
Permitir que usuários internos da Stark façam pedidos em nome de concessionárias sem precisar fazer login em cada conta individual.

---

## ⚙️ Configuração Inicial (OBRIGATÓRIA)

### 1. Executar Migration SQL no Banco de Dados

**Acesse o Supabase SQL Editor e execute:**

```sql
-- Adicionar campo uso_interno_stark para permitir que Stark faça pedidos em nome de concessionárias
ALTER TABLE concessionarias 
ADD COLUMN IF NOT EXISTS uso_interno_stark BOOLEAN DEFAULT FALSE;

-- Comentário explicativo
COMMENT ON COLUMN concessionarias.uso_interno_stark IS 'Indica se esta concessionária/usuário pode fazer pedidos em nome de outras concessionárias (uso interno da Stark)';
```

**Localização do arquivo:** `backend/migrations/add_uso_interno_stark.sql`

---

### 2. Criar Concessionária para Uso Interno

Existem duas opções:

#### **Opção A: Criar nova concessionária "Stark Interno"**
1. Acesse: **Admin Stark → Concessionárias**
2. Clique: **+ Nova Concessionária**
3. Preencha:
   - Nome: `Stark Interno` (ou qualquer nome identificável)
   - Região de preço: Escolha uma região padrão
   - CNPJ, telefone, email, endereço
   - Crie um admin para esta concessionária
4. **Após criar**, execute no SQL Editor:
   ```sql
   UPDATE concessionarias 
   SET uso_interno_stark = TRUE 
   WHERE nome = 'Stark Interno';
   ```

#### **Opção B: Habilitar concessionária existente**
Se já existe uma concessionária que deve ter acesso:
```sql
UPDATE concessionarias 
SET uso_interno_stark = TRUE 
WHERE id = [ID_DA_CONCESSIONARIA];
```

---

## 🎯 Como Usar

### Para Usuários com Permissão

1. **Faça login** com a conta da concessionária habilitada (uso_interno_stark = TRUE)

2. **Acesse:** Novo Pedido da Concessionária

3. **Na primeira tela**, você verá um novo campo:
   ```
   Pedido realizado para:
   [Selecionar concessionária ▼]
   ```

4. **Opções:**
   - **Deixar em branco**: O pedido será registrado para sua própria concessionária (comportamento padrão)
   - **Selecionar outra concessionária**: O pedido será registrado em nome da concessionária selecionada
     - ✅ **A região de preços será automaticamente ajustada** para a região cadastrada da concessionária selecionada
     - ✅ **Os preços dos equipamentos serão recalculados** usando a tabela de preços dessa região
     - ✅ **Você verá a confirmação** na tela: "Região de compra: [região] (região de [nome da concessionária])"

5. **Continue normalmente** com o fluxo de pedido:
   - Selecione equipamentos
   - Configure pagamento
   - Preencha estudo veicular
   - Gere o PDF

---

## 📄 O que Aparece no PDF

Quando uma concessionária é selecionada, o PDF exibirá:

```
┌─────────────────────────────────────┐
│ CONCESSIONÁRIA                      │
│ NOME: Concessionária XYZ            │
│ CNPJ/CPF: 12.345.678/0001-90       │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 📋 PEDIDO REALIZADO PARA:       │ │
│ │    Concessionária ABC           │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 🔒 Segurança e Regras

### ✅ Permitido:
- Usuários com `uso_interno_stark = TRUE` podem fazer pedidos para qualquer concessionária ativa
- O sistema salva automaticamente qual concessionária foi selecionada
- **A região de preços é automaticamente ajustada** para a região da concessionária selecionada
- **Os preços são buscados da tabela correta** (`precos_compra_concessionaria_por_regiao`)
- Todos os cálculos, preços e descontos funcionam normalmente
- Não há alteração nas regras de negócio existentes

### ❌ Não Permitido:
- Concessionárias normais NÃO veem o seletor (campo não aparece)
- Não é possível alterar a concessionária após gerar o PDF
- Vendedores normais não têm acesso a este recurso

---

## 📊 Dados Salvos no Banco

Quando um pedido é feito para outra concessionária, os seguintes dados são salvos em `dados_serializados`:

```json
{
  "concessionariaPedidoId": 123,
  "concessionariaPedidoNome": "Concessionária ABC",
  "concessionaria_id": 456,  // ID da concessionária que fez o pedido
  "concessionariaInfo": { ... }  // Dados da concessionária logada
}
```

---

## 🧪 Teste Rápido

1. Execute a migration SQL
2. Habilite uma concessionária com `uso_interno_stark = TRUE`
3. Faça login com essa concessionária
4. Acesse "Novo Pedido da Concessionária"
5. Verifique se o campo "Pedido realizado para:" aparece
6. Selecione uma concessionária de **região diferente**
7. **Verifique que a região mudou** - deve aparecer: "Região de compra: [nova região] (região de [nome])"
8. **Verifique que os preços mudaram** - adicione um guindaste ao carrinho e confirme o preço
9. Complete o pedido e gere o PDF
10. Verifique se aparece "📋 PEDIDO REALIZADO PARA: [Nome]" no PDF

---

## ❓ Perguntas Frequentes

**Q: O que acontece se eu não selecionar nenhuma concessionária?**  
A: O pedido será registrado normalmente para sua própria concessionária (comportamento padrão).

**Q: Posso mudar a concessionária depois de gerar o PDF?**  
A: Não. A concessionária é salva permanentemente nos dados do pedido.

**Q: Isso afeta os preços ou descontos?**  
A: Sim! Os preços são automaticamente ajustados para usar a região da concessionária selecionada. Se você selecionar uma concessionária do Sul-Sudeste, os preços serão buscados da tabela de preços dessa região.

**Q: Concessionárias normais veem este campo?**  
A: Não. O campo só aparece para concessionárias com `uso_interno_stark = TRUE`.

**Q: Como desabilitar este recurso para uma concessionária?**  
A: Execute: `UPDATE concessionarias SET uso_interno_stark = FALSE WHERE id = [ID];`

---

## 📝 Arquivos Modificados

### Backend:
- `backend/services/concessionariasService.js` - Adicionado campo `uso_interno_stark` no update
- `backend/migrations/add_uso_interno_stark.sql` - Migration SQL

### Frontend:
- `src/lib/pages/NovoPedido.jsx` - Adicionado seletor de concessionária
- `src/components/NovoPedido/ResumoPedido.jsx` - Salva concessionária selecionada
- `src/components/PDFGenerator.jsx` - Exibe concessionária no PDF

---

## 🚀 Implementação Mínima

Esta solução foi implementada seguindo os princípios:
- ✅ Sem criar novo perfil de usuário
- ✅ Sem alterar cálculos, preços ou descontos
- ✅ Sem impactar fluxo de vendedores ou concessionárias normais
- ✅ Implementação simples e não invasiva
- ✅ Fácil de habilitar/desabilitar por concessionária

---

**Desenvolvido em:** 11/06/2026  
**Versão:** 1.0
