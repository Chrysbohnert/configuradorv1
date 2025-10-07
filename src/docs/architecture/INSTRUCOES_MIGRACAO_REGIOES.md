# Instruções de Migração - Nova Estrutura de Regiões

## 📋 Resumo das Mudanças

A estrutura de regiões foi atualizada para o seguinte padrão:

1. **Norte-Nordeste** (unificado)
2. **Centro Oeste**
3. **Sul-Sudeste** (unificado)
4. **RS com Inscrição Estadual**
5. **RS sem Inscrição Estadual**

## 🔄 Alterações Realizadas no Código

### 1. PrecosPorRegiaoModal.jsx
- ✅ Modal de preços atualizado com as 5 regiões do novo padrão
- ✅ Admin pode cadastrar preços separados para RS com IE e sem IE

### 2. NovoPedido.jsx
- ✅ Lógica de busca de preços adaptada para o novo padrão
- ✅ Campo de seleção "Cliente possui IE?" aparece APENAS para vendedores do RS
- ✅ Preços são buscados automaticamente conforme a região e IE do cliente

### 3. GerenciarVendedores.jsx
- ✅ Adicionada opção "Rio Grande do Sul" no cadastro de vendedores
- ✅ Mantidas as regiões antigas para compatibilidade

## 🗄️ Migração do Banco de Dados

### Passo 1: Backup (Recomendado)
Antes de executar qualquer script, faça um backup do banco de dados no Supabase.

### Passo 2: Executar Script SQL
Abra o **Supabase SQL Editor** e execute o script `migration_regioes.sql` disponível na raiz do projeto.

O script faz o seguinte:

1. **Atualiza a região do vendedor Hugo** de `'sul'` para `'rio grande do sul'`
2. **Cria backup** dos preços antigos (tabela `precos_guindaste_regiao_backup`)
3. **Migra os preços**:
   - Norte + Nordeste → Norte-Nordeste
   - Sul + Sudeste → Sul-Sudeste
   - Sul → RS com IE e RS sem IE (inicialmente com mesmo preço)
4. **Mantém regiões antigas** por compatibilidade (pode deletar depois)

### Passo 3: Ajustar Preços Manualmente
Após a migração, acesse o sistema como admin e ajuste os preços de **RS com IE** e **RS sem IE** conforme necessário.

### Passo 4: Atualizar Outros Vendedores (Se Necessário)
Se houver outros vendedores do Rio Grande do Sul além do Hugo, execute:

```sql
UPDATE users 
SET regiao = 'rio grande do sul' 
WHERE id = 'ID_DO_VENDEDOR';
```

### Passo 5: Verificar Funcionamento
1. Faça login como vendedor do RS (Hugo)
2. Crie um novo pedido
3. Selecione um guindaste
4. Verifique se o campo "Cliente possui IE?" aparece
5. Teste ambas as opções (Com IE / Sem IE)
6. Confirme que os preços estão sendo aplicados corretamente

### Passo 6: Limpar Regiões Antigas (Opcional)
**⚠️ ATENÇÃO:** Só execute este passo após confirmar que tudo está funcionando!

```sql
-- Deletar preços das regiões antigas
DELETE FROM precos_guindaste_regiao 
WHERE regiao IN ('norte', 'nordeste', 'sul', 'sudeste');

-- Deletar backup
DROP TABLE precos_guindaste_regiao_backup;
```

## 🔍 Como Funciona

### Para Vendedores do Rio Grande do Sul:
1. Ao criar um pedido e chegar no step 2 (Política de Pagamento)
2. Aparece um campo destacado perguntando: "O cliente possui Inscrição Estadual?"
3. Vendedor seleciona SIM ou NÃO
4. Sistema busca automaticamente o preço correto (rs-com-ie ou rs-sem-ie)

### Para Vendedores de Outras Regiões:
- Norte ou Nordeste → usa preços de "norte-nordeste"
- Sul ou Sudeste → usa preços de "sul-sudeste"
- Centro-Oeste → usa preços de "centro-oeste"
- Campo de IE **não aparece** para estas regiões

## 📊 Estrutura das Tabelas

### Tabela `users`
```
regiao (text):
- 'norte'
- 'nordeste'
- 'sudeste'
- 'sul'
- 'centro-oeste'
- 'rio grande do sul' ← NOVA OPÇÃO
```

### Tabela `precos_guindaste_regiao`
```
regiao (text):
- 'norte-nordeste' ← NOVA
- 'centro-oeste'
- 'sul-sudeste' ← NOVA
- 'rs-com-ie' ← NOVA
- 'rs-sem-ie' ← NOVA
- 'norte' (manter por compatibilidade)
- 'nordeste' (manter por compatibilidade)
- 'sul' (manter por compatibilidade)
- 'sudeste' (manter por compatibilidade)
```

## 🚨 Troubleshooting

### Problema: Preços não aparecem
**Solução**: Verifique se os preços foram migrados corretamente executando:
```sql
SELECT regiao, COUNT(*) FROM precos_guindaste_regiao GROUP BY regiao;
```

### Problema: Campo de IE não aparece para vendedor do RS
**Solução**: Verifique se a região do vendedor está como 'rio grande do sul':
```sql
SELECT nome, regiao FROM users WHERE nome ILIKE '%hugo%';
```

### Problema: Erro ao selecionar guindaste
**Solução**: Limpe o localStorage e faça login novamente:
```javascript
localStorage.clear();
```

## 📞 Suporte

Em caso de dúvidas ou problemas, consulte os logs do console do navegador (F12) e do Supabase.

