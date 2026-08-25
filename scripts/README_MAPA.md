# Mapa Territorial — Dados Geográficos

Este diretório contém o script responsável por baixar e preparar as malhas geográficas do IBGE para o módulo **Mapa Territorial**.

## Arquivos gerados

- `public/data/mapa/br-states.json` — GeoJSON com todos os estados brasileiros.
- `public/data/mapa/br-municipios/{uf}.json` — GeoJSON com os municípios de cada UF.

Cada `Feature` possui as propriedades normalizadas:

```json
{
  "codigo_ibge": "3543402",
  "nome": "Ribeirão Preto",
  "sigla_uf": "SP"
}
```

## Executar a preparação dos dados

```bash
npm run prepare:map-data
```

O script consulta as APIs oficiais do IBGE, enriquece os dados com nomes completos e salva os arquivos no formato GeoJSON. Uma vez gerados, o mapa funciona **sem depender de chamadas externas**.

## Fallback online

Durante o desenvolvimento, se os arquivos acima ainda não existirem, o componente `useMapData` busca os dados diretamente da API do IBGE e os armazena em `localStorage` para uso posterior.

## Integração com entidades (instaladoras, concessionárias, representantes)

O mapa gerencia **áreas de atuação** vinculadas a entidades cadastradas no sistema, todas usando a mesma tabela genérica.

Modelo territorial reutilizável:

- **Entidade**: possui `id`, `nome`, cidade/UF de **sede** e cor própria.
- **Área de atuação**: conjunto de municípios associados à entidade.

A área de atuação fica na tabela genérica `areas_atuacao`:

| Coluna          | Descrição                                      |
|-----------------|------------------------------------------------|
| `tipo_entidade` | `instaladora`, `concessionaria`, `representante` |
| `entidade_id`   | ID da entidade na sua tabela base (TEXT)       |
| `codigo_ibge`   | Código IBGE do município                       |
| `nome`          | Nome do município                              |
| `uf`            | Sigla do estado                                |
| `cor`           | Cor usada no mapa (opcional)                   |

Execute as migrations antes de usar a funcionalidade:

```sql
-- backend/migrations/create_areas_atuacao.sql
-- backend/migrations/update_areas_atuacao_generic_ids.sql
```

A primeira migration cria a tabela genérica e migra os dados antigos de `frete_areas_atuacao`. A segunda altera `entidade_id` para `TEXT` (suportando inteiros e UUIDs) e adiciona as colunas `cidade`, `uf` e `cor` nas tabelas `concessionarias` e `app_users`.

Endpoints backend (genéricos):

- `GET /api/areas/:tipo/entidades` — lista entidades de um tipo.
- `GET /api/areas/todas/entidades` — lista todas as entidades territoriais.
- `GET /api/areas/:tipo/:entidadeId` — lista municípios da área.
- `PUT /api/areas/:tipo/:entidadeId` — substitui a área (enviar `{ areas: [{ codigo_ibge, nome, uf, cor }] }`).
- `GET /api/areas/:tipo/:entidadeId/instaladoras-comuns` — instaladoras com municípios em comum (útil para concessionárias/representantes).

Compatibilidade preservada:

- `GET /api/fretes/admin/:id/areas`
- `PUT /api/fretes/admin/:id/areas`

### Como usar no frontend

1. Acesse **Mapa Territorial** no menu admin.
2. Use as abas **Todos | Instaladoras | Concessionárias | Representantes** para filtrar.
3. No modo **Todos**, todas as entidades são exibidas simultaneamente com transparência e marcadores de sede.
4. Selecione uma entidade no sidebar para editar sua área de atuação.
5. O mapa foca na UF da sede e exibe um marcador na cidade.
6. Clique nos municípios para compor a área de atuação.
7. Clique em **Salvar área de atuação**.

Quando uma **concessionária** ou **representante** é selecionada, as instaladoras que atuam em municípios comuns são destacadas na lista.

Para criar uma nova instaladora a partir do mapa:

1. Filtre **Instaladoras** e clique em **Nova instaladora no mapa**.
2. Selecione um estado e clique no município da sede.
3. Você será redirecionado para `/gerenciar-fretes?cidade=X&uf=Y` com os dados preenchidos.

### Replicar para outras entidades

A estrutura já suporta concessionárias e representantes sem duplicar tabelas. Para novos tipos:

1. Use a mesma tabela `areas_atuacao` com o novo `tipo_entidade`.
2. Adicione a listagem no `territorioService.js`.
3. Exponha endpoints genéricos em `backend/routes/areas.js`.
4. No frontend, o `MapaTerritorial.jsx` já carrega entidades de todos os tipos via `getEntidades()`.

## Notas

- O download de todos os municípios pode levar alguns minutos devido ao volume de dados.
- Reexecute o script sempre que quiser atualizar as malhas para uma nova edição do IBGE.
- Os arquivos gerados são versionáveis; eles garantem performance e funcionamento offline em produção.
