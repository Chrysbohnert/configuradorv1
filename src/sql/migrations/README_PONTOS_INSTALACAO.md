# Migração: Pontos de Instalação por Região

## 📋 Objetivo

Adicionar suporte completo para pontos de instalação filtrados por região do vendedor, com valores de frete (Prioridade e Reaproveitamento) específicos para cada oficina.

## 🚀 Execução das Migrações

Execute os scripts SQL **na ordem abaixo** no seu banco de dados Supabase:

### 1️⃣ Adicionar colunas UF e região_grupo

```bash
# Arquivo: add_uf_regiao_to_fretes.sql
```

Este script:
- ✅ Adiciona coluna `uf` (UF do estado)
- ✅ Adiciona coluna `regiao_grupo` (para filtrar por grupo de região)
- ✅ Cria índices para performance
- ✅ Atualiza constraint UNIQUE para incluir UF

### 2️⃣ Inserir todos os pontos de instalação

```bash
# Arquivo: insert_all_installation_points.sql
```

Este script insere:
- ✅ 15 pontos no Rio Grande do Sul (RS)
- ✅ 21 pontos no Paraná (PR)
- ✅ 2 pontos no Mato Grosso do Sul (MS)
- ✅ 3 pontos no Mato Grosso (MT)
- ⏳ **AGUARDANDO dados de SC, SP, MG, GO, Norte, Nordeste**

## 📊 Grupos de Regiões

Os pontos são agrupados por:

| Grupo | Estados | Descrição |
|-------|---------|-----------|
| `rs-com-ie` | RS | Rio Grande do Sul com Inscrição Estadual |
| `rs-sem-ie` | RS | Rio Grande do Sul sem Inscrição Estadual |
| `sul-sudeste` | SC, PR, SP, MG | Sul e Sudeste |
| `centro-oeste` | MS, MT, GO, DF | Centro-Oeste |
| `norte-nordeste` | AC, AM, AP, PA, RO, RR, TO, AL, BA, CE, MA, PB, PE, PI, RN, SE | Norte e Nordeste |

## 🔧 Como Funciona no Sistema

1. **Vendedor faz login** → Sistema identifica `user.regiao`
2. **Sistema mapeia região** → Determina o `regiao_grupo` usando `regiaoMapper.js`
3. **Carrega pontos filtrados** → Busca apenas oficinas do grupo da região do vendedor
4. **Vendedor seleciona ponto** → Aparece escolha: Prioridade ou Reaproveitamento
5. **Valor somado** → Frete é adicionado automaticamente na política de pagamento

## 📝 Dados Já Cadastrados

### Rio Grande do Sul (RS)
- ✅ 15 oficinas cadastradas
- ✅ Valores de Prioridade e Reaproveitamento configurados

### Paraná (PR)
- ✅ 21 oficinas cadastradas
- ✅ Valores de Prioridade e Reaproveitamento configurados

### Mato Grosso do Sul (MS)
- ✅ 2 oficinas cadastradas
- ✅ Valores de Prioridade e Reaproveitamento configurados

### Mato Grosso (MT)
- ✅ 3 oficinas cadastradas
- ✅ Valores de Prioridade e Reaproveitamento configurados

## 🔜 Próximos Passos

Para completar a implementação, precisamos dos dados de:

1. **Santa Catarina (SC)** - oficinas, cidades, valores
2. **São Paulo (SP)** - oficinas, cidades, valores
3. **Minas Gerais (MG)** - oficinas, cidades, valores
4. **Goiás (GO)** - oficinas, cidades, valores
5. **Estados do Norte** - se houver pontos de instalação
6. **Estados do Nordeste** - se houver pontos de instalação

### Formato dos Dados Necessários

```
Oficina | Cidade | UF | Valor Prioridade | Valor Reaproveitamento
--------|--------|----|-----------------|-----------------------
Nome    | Cidade | SC | R$ 0.000,00     | R$ 0.000,00
```

## ✅ Verificação Pós-Migração

Execute estas queries para verificar se tudo está correto:

```sql
-- Ver total de oficinas por estado
SELECT uf, COUNT(*) as total 
FROM fretes 
GROUP BY uf 
ORDER BY uf;

-- Ver total por grupo de região
SELECT regiao_grupo, COUNT(*) as total 
FROM fretes 
GROUP BY regiao_grupo 
ORDER BY regiao_grupo;

-- Ver todas as oficinas de um estado específico
SELECT oficina, cidade, uf, valor_prioridade, valor_reaproveitamento 
FROM fretes 
WHERE uf = 'PR' 
ORDER BY cidade;
```

## 🐛 Troubleshooting

### Erro: "column uf does not exist"
- ➡️ Execute primeiro o script `add_uf_regiao_to_fretes.sql`

### Erro: "duplicate key value violates unique constraint"
- ➡️ Normal se executar o script de inserção múltiplas vezes
- ➡️ O script usa `ON CONFLICT DO UPDATE` para atualizar valores existentes

### Pontos não aparecem para o vendedor
- ➡️ Verifique se o vendedor tem `regiao` cadastrada na tabela `users`
- ➡️ Verifique se existe `regiao_grupo` correspondente na tabela `fretes`
- ➡️ Veja logs no console do navegador (busque por "🌍 Carregando pontos")

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs no console do navegador (F12)
2. Verifique os logs no SQL (execute as queries de verificação acima)
3. Confirme que ambos os scripts foram executados na ordem correta

