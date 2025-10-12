# 🚀 Instruções para Executar a Migração de Pontos de Instalação

## ✅ O que foi implementado

### 1. **Backend (Banco de Dados)**
- ✅ Script de migração para adicionar colunas `uf` e `regiao_grupo` na tabela `fretes`
- ✅ Script de inserção com **48 pontos de instalação** em 7 estados:
  - **RS**: 15 oficinas
  - **PR**: 21 oficinas
  - **SC**: 4 oficinas
  - **MS**: 2 oficinas
  - **MT**: 3 oficinas
  - **SP**: 2 oficinas
  - **GO**: 1 oficina

### 2. **Frontend (React)**
- ✅ Criado `regiaoMapper.js` - mapeia região do vendedor para grupo
- ✅ Atualizado `supabase.js` - novo método `getPontosInstalacaoPorRegiao()`
- ✅ Atualizado `PaymentPolicy.jsx` - carrega pontos filtrados por região
- ✅ UI atualizada - mostra contador de oficinas disponíveis
- ✅ Seleção de frete (Prioridade/Reaproveitamento) já funcional

### 3. **Lógica de Filtragem**
O sistema agora:
1. Identifica a região do vendedor (ex: "rio grande do sul", "paraná")
2. Mapeia para grupo (ex: "rs-com-ie", "sul-sudeste", "centro-oeste")
3. Carrega apenas oficinas daquele grupo
4. Ao selecionar oficina, exibe valores de Prioridade e Reaproveitamento
5. Soma automaticamente o frete na política de pagamento

---

## 📋 PASSO A PASSO PARA EXECUTAR

### **Passo 1: Acessar o Supabase**

1. Abra o [Supabase](https://supabase.com)
2. Entre no projeto `configuradorv1`
3. Vá em **SQL Editor** (ícone de código no menu lateral)

---

### **Passo 2: Criar a Tabela Fretes**

📁 Arquivo: `src/sql/migrations/00_create_fretes_table.sql`

**⚠️ IMPORTANTE: Execute este script PRIMEIRO se a tabela fretes não existir**

**Copie TODO o conteúdo do arquivo e cole no SQL Editor**

Este script vai:
- Criar a tabela `fretes` com todas as colunas necessárias
- Criar índices para performance
- Adicionar constraints de validação

Clique em **RUN** ▶️

**Resultado esperado:**
```
✅ Tabela fretes criada com sucesso!
```

Se aparecer "Tabela fretes já existe", pode pular para o Passo 4.

---

### **Passo 3: Executar Script de Migração (Apenas se a tabela já existia)**

📁 Arquivo: `src/sql/migrations/add_uf_regiao_to_fretes.sql`

**Copie TODO o conteúdo do arquivo e cole no SQL Editor**

Este script vai:
- Adicionar coluna `uf` (estado)
- Adicionar coluna `regiao_grupo` (grupo de região)
- Criar índices para performance
- Atualizar registros existentes do RS

Clique em **RUN** ▶️

**Resultado esperado:**
```
Success. Rows returned: 15
```

---

### **Passo 4: Executar Script de Inserção**

📁 Arquivo: `src/sql/migrations/insert_all_installation_points.sql`

**Copie TODO o conteúdo do arquivo e cole no SQL Editor**

Este script vai inserir:
- 15 oficinas do RS
- 21 oficinas do PR
- 4 oficinas do SC
- 2 oficinas do MS
- 3 oficinas do MT
- 2 oficinas do SP
- 1 oficina do GO

Clique em **RUN** ▶️

**Resultado esperado:**
```
Success. 48 rows affected
```

---

### **Passo 5: Verificar Inserção**

Execute esta query para verificar:

```sql
-- Ver total de oficinas por estado
SELECT uf, COUNT(*) as total 
FROM fretes 
GROUP BY uf 
ORDER BY uf;
```

**Resultado esperado:**
```
uf  | total
----|------
GO  | 1
MS  | 2
MT  | 3
PR  | 21
RS  | 15
SC  | 4
SP  | 2
```

Execute esta query para ver por grupo:

```sql
-- Ver total por grupo de região
SELECT regiao_grupo, COUNT(*) as total 
FROM fretes 
GROUP BY regiao_grupo 
ORDER BY regiao_grupo;
```

**Resultado esperado:**
```
regiao_grupo  | total
--------------|------
centro-oeste  | 5
rs-com-ie     | 15
sul-sudeste   | 28
```

---

## 🎯 Como Testar no Sistema

### **Teste 1: Vendedor do RS**

1. Faça login com usuário que tem `regiao = 'rio grande do sul'`
2. Vá em **Novo Pedido**
3. Selecione um guindaste
4. Vá para **Política de Pagamento**
5. Selecione **Cliente**
6. Informe participação de revenda e IE
7. Selecione percentual de entrada e prazo
8. **Verificar**: Deve aparecer **15 oficinas disponíveis** no select de Local de Instalação
9. Selecione uma oficina (ex: Rodokurtz - Pelotas/RS)
10. **Verificar**: Deve aparecer a escolha entre **Prioridade (R$ 5.824,00)** e **Reaproveitamento (R$ 3.000,00)**
11. Selecione um tipo
12. **Verificar**: O valor do frete deve aparecer somado no cálculo final

### **Teste 2: Vendedor do PR**

1. Faça login com usuário que tem `regiao = 'paraná'`
2. Repita o processo acima
3. **Verificar**: Deve aparecer **28 oficinas disponíveis** (21 PR + 4 SC + 2 SP + 1 GO)

### **Teste 3: Vendedor do MS ou MT**

1. Faça login com usuário que tem `regiao = 'mato grosso do sul'` ou `'mato grosso'`
2. Repita o processo
3. **Verificar**: Deve aparecer **5 oficinas disponíveis** (2 MS + 3 MT)

---

## 🐛 Resolução de Problemas

### **Erro: "column uf does not exist"**
➡️ **Solução**: Execute primeiro o Passo 2 (add_uf_regiao_to_fretes.sql)

### **Erro: "duplicate key value"**
➡️ **Solução**: Normal se executar múltiplas vezes. O script usa `ON CONFLICT DO UPDATE`

### **Oficinas não aparecem no select**
➡️ **Verificar**:
1. Abra o console do navegador (F12)
2. Procure por logs: `🌍 Carregando pontos para:`
3. Verifique se o `grupoRegiao` está correto
4. Verifique se o usuário tem `regiao` preenchida na tabela `users`

### **Valores de frete não aparecem**
➡️ **Verificar**:
1. Veja no console: `✅ Frete encontrado para:`
2. Se não aparecer, verifique se o formato é: `Oficina - Cidade/UF`
3. Execute: 
   ```sql
   SELECT * FROM fretes WHERE oficina = 'Nome da Oficina';
   ```

---

## 📊 Resumo dos Dados Cadastrados

| Estado | Oficinas | Região        | Exemplo de Frete              |
|--------|----------|---------------|-------------------------------|
| RS     | 15       | rs-com-ie     | Prioridade: R$ 16,00 - R$ 5.824,00 |
| PR     | 21       | sul-sudeste   | Prioridade: R$ 2.400,00 - R$ 6.920,00 |
| SC     | 4        | sul-sudeste   | Prioridade: R$ 2.576,00 - R$ 6.552,00 |
| SP     | 2        | sul-sudeste   | Prioridade: R$ 9.136,00 - R$ 10.008,00 |
| GO     | 1        | sul-sudeste   | Prioridade: R$ 12.528,00 |
| MS     | 2        | centro-oeste  | Prioridade: R$ 7.304,00 - R$ 9.072,00 |
| MT     | 3        | centro-oeste  | Prioridade: R$ 14.728,00 - R$ 18.240,00 |

---

## ⏭️ Próximos Passos (Opcional)

Se você tiver pontos de instalação em **Minas Gerais (MG)**, **Norte** ou **Nordeste**, basta:

1. Adicionar no arquivo `insert_all_installation_points.sql`:
```sql
INSERT INTO fretes (oficina, cidade, uf, regiao_grupo, valor_prioridade, valor_reaproveitamento) VALUES
('Nome Oficina', 'Cidade', 'MG', 'sul-sudeste', 0000.00, 0000.00)
ON CONFLICT (oficina, cidade, uf) DO UPDATE SET
    valor_prioridade = EXCLUDED.valor_prioridade,
    valor_reaproveitamento = EXCLUDED.valor_reaproveitamento;
```

2. Executar novamente no Supabase

---

## ✅ Checklist Final

- [ ] Executei o script `add_uf_regiao_to_fretes.sql`
- [ ] Executei o script `insert_all_installation_points.sql`
- [ ] Verifiquei que 48 oficinas foram inseridas
- [ ] Testei com vendedor do RS (15 oficinas)
- [ ] Testei com vendedor de PR/SC/SP/GO (28 oficinas)
- [ ] Testei com vendedor de MS/MT (5 oficinas)
- [ ] O frete aparece na seleção Prioridade/Reaproveitamento
- [ ] O valor do frete soma no total da política de pagamento

---

## 📞 Suporte

Se tiver dúvidas:
1. Veja os logs no console (F12)
2. Execute as queries de verificação acima
3. Confirme que os 2 scripts SQL foram executados na ordem correta

