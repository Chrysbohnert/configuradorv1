# Guia de correção do erro 22P02 ao deletar registros de `guindastes`

Este guia descreve passo a passo como corrigir o erro `22P02: invalid input syntax for type bigint` que ocorre ao tentar executar `DELETE` na tabela `public.guindastes` via Supabase.

## Resumo do problema
- A política RLS `guindastes_delete_admin` está com a condição:
  ```sql
  users.id = ((auth.uid())::text)::bigint AND users.tipo = 'admin'
  ```
- `auth.uid()` retorna um UUID (ex.: `dd2803fa-217c-43a6-9894-44b9f61a6235`).
- Ao converter esse UUID para `bigint`, o Postgres lança `22P02`.
- O erro não tem relação com o tipo do ID do guindaste (que é `int4`), e sim com o cast incorreto dentro da política.

## Objetivo da correção
- Comparar `auth.uid()` (UUID) com uma coluna também do tipo `uuid` na tabela `users` (por exemplo, `users.auth_user_id uuid`).
- Remover qualquer cast de `auth.uid()` para tipos numéricos em políticas/trigger.

---

## Checklist do que fazer
1. Criar (se necessário) a coluna `auth_user_id uuid` na tabela `public.users` e indexá-la.
2. Preencher `auth_user_id` para os usuários existentes (especialmente os administradores).
3. Corrigir a política `guindastes_delete_admin` para comparar UUID com UUID.
4. Revisar e corrigir políticas de `INSERT`/`UPDATE` relacionadas a `guindastes` para o mesmo padrão.
5. Testar com um usuário admin logado e confirmar que o `DELETE` funciona.
6. (Opcional) Verificar se não há gatilhos (triggers) que gravem `auth.uid()` em coluna numérica.
7. (Opcional) Verificar chaves estrangeiras que possam impedir o `DELETE` (erros `23503`).

---

## Passo a passo detalhado

### 1) Criar coluna `auth_user_id` (UUID) em `public.users`
Execute no SQL Editor do Supabase:
```sql
-- 1. Adiciona a coluna UUID, caso não exista
alter table public.users
  add column if not exists auth_user_id uuid;

-- 2. Cria índice único (somente quando houver valor), para evitar duplicidade
create unique index if not exists users_auth_user_id_unique
  on public.users (auth_user_id)
  where auth_user_id is not null;
```

### 2) Preencher `auth_user_id` dos usuários
Existem várias maneiras. Duas opções comuns:

- Por correspondência de e-mail entre `auth.users` e `public.users`:
```sql
update public.users u
set auth_user_id = au.id
from auth.users au
where au.email = u.email
  and u.auth_user_id is null;
```

- Manualmente (útil para um admin específico):
```sql
update public.users
set auth_user_id = 'SEU-UUID-AQUI'
where id = 1; -- ajuste o ID conforme necessário
```

Validação rápida:
```sql
select id, nome, email, tipo, auth_user_id
from public.users
order by id;
```
Certifique-se de que o usuário admin logado tenha `tipo = 'admin'` e `auth_user_id` preenchido com seu UUID de autenticação.

### 3) Corrigir a política `guindastes_delete_admin`
Substitua a condição que faz cast para `bigint` por comparação UUID a UUID:
```sql
alter policy "guindastes_delete_admin"
on "public"."guindastes"
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.auth_user_id = auth.uid()
      and u.tipo = 'admin'
  )
);
```

Valide as políticas existentes:
```sql
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where tablename = 'guindastes'
order by policyname;
```

### 4) Corrigir políticas de `INSERT`/`UPDATE` (se necessário)
Aplique o mesmo padrão (UUID a UUID) nas demais políticas do mesmo recurso:
```sql
-- UPDATE
alter policy "guindastes_update_admin_fixed"
on "public"."guindastes"
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.auth_user_id = auth.uid()
      and u.tipo = 'admin'
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.auth_user_id = auth.uid()
      and u.tipo = 'admin'
  )
);

-- INSERT
alter policy "guindastes_insert_admin"
on "public"."guindastes"
to authenticated
with check (
  exists (
    select 1 from public.users u
    where u.auth_user_id = auth.uid()
      and u.tipo = 'admin'
  )
);
```

Se houver outras políticas antigas que ainda tentem castear `auth.uid()` para tipos numéricos, considere removê-las:
```sql
drop policy if exists guindastes_update_authenticated on public.guindastes;
-- Avalie cada política antes de remover. O ideal é manter uma única regra clara.
```

### 5) Testes
- Faça login como um usuário com `tipo = 'admin'` e com `auth_user_id` corretamente vinculado.
- Tente deletar um guindaste (ex.: `id = 46`) via aplicação.
- O erro `400 / 22P02` deve desaparecer.

Testes adicionais:
- Usuário não-admin não deve conseguir deletar.
- Se ocorrer erro `23503` (violação de chave estrangeira), identifique e trate as referências relacionadas (ver próximo passo opcional).

### 6) (Opcional) Verificar triggers que possam gravar `auth.uid()` em colunas numéricas
Se existir trigger de auditoria/log que grave o UID em colunas `integer/bigint`, ajuste essas colunas para `uuid` ou remova o cast.

### 7) (Opcional) Verificar chaves estrangeiras que possam bloquear o `DELETE`
Use esta consulta para listar FKs que referenciam `guindastes`:
```sql
select
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_name as referenced_table,
  ccu.column_name as referenced_column,
  rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
  and tc.table_schema = kcu.table_schema
join information_schema.referential_constraints rc
  on tc.constraint_name = rc.constraint_name
  and tc.table_schema = rc.constraint_schema
join information_schema.constraint_column_usage ccu
  on rc.unique_constraint_name = ccu.constraint_name
  and rc.unique_constraint_schema = ccu.constraint_schema
where tc.constraint_type = 'FOREIGN KEY'
  and ccu.table_name = 'guindastes';
```
Caso precise permitir exclusão em cascata, avalie `ON DELETE CASCADE` nas FKs relevantes (com cuidado). Caso contrário, remova dependências antes do `DELETE`.

---

## Observações importantes
- O `deleteGuindaste(id)` no seu `src/config/supabase.js` está correto: ele converte o `id` para número (`int4`) e faz `.eq('id', numericId)`.
- O problema está exclusivamente no cast de `auth.uid()` dentro da política RLS.
- Evite qualquer cast de `auth.uid()` para `text -> integer/bigint`. Prefira sempre comparação `uuid` com `uuid`.

---

## Pendências de front-end (checklist)
- [ ] Verificar se há erros no console do navegador ao realizar `DELETE`.
- [ ] Confirmar que os dados retornam corretamente do banco após a operação.
- [ ] Analisar a função `extractCapacidades` (se usada no fluxo) para garantir filtragem correta e que não haja impactos colaterais.

---

## Rollback (se necessário)
Se precisar liberar temporariamente para testes, você pode usar:
```sql
alter policy "guindastes_delete_admin"
on "public"."guindastes"
to authenticated
using (true);
```
Atenção: esta política permite que qualquer usuário autenticado delete, portanto use apenas para diagnóstico rápido e volte à versão correta (UUID a UUID) em seguida.

---

## Conclusão
Após ajustar a política para comparar `auth.uid()` com uma coluna `uuid` (`users.auth_user_id`), o erro `22P02` desaparece e o `DELETE` volta a funcionar para administradores. Garanta que todas as políticas relacionadas sigam o mesmo padrão e que seus usuários admin estejam mapeados corretamente ao UUID de autenticação.