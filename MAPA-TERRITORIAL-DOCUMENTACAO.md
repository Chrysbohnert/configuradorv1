# Documentação técnica completa — Módulo de Mapa Territorial (GeoCanal)

Documento de referência para reproduzir fielmente, em outro sistema, o módulo de mapa
interativo do Brasil com cadastro/edição de entidades e seleção de municípios de
atuação por clique no mapa.

Stack de origem: React 19 + TypeScript, TanStack Start (Vite 7) + TanStack Router,
TanStack Query v5, d3-geo, Tailwind CSS v4, Supabase (Postgres) como persistência.

---

## 1. Arquitetura geral

```text
                    +-------------------------------+
                    |  IBGE (APIs públicas, sem key)|
                    |  /api/v3/malhas   (GeoJSON)   |
                    |  /api/v1/localidades (listas) |
                    +---------------+---------------+
                                    | fetch + cache (TanStack Query, staleTime Infinity)
                                    v
   src/lib/ibge.ts  ---------------------------------------------------------
   UFS, ufByCode, ufBySigla, ufOfMunicipio, statesGeoQuery,
   municipiosGeoQuery(uf), municipioListQuery(uf), centroidOf(feature)
                                    |
                                    v
   src/components/MapaBrasil.tsx  (SVG puro, d3-geo geoIdentity+reflectY)
   - projeção fitExtent 900x700, foco em UF
   - zoom por scroll (k 1..40) e pan por arrastar (pointer events)
   - hover de estado e de município, tooltip HTML flutuante
   - paint: Map<municipioId, {color, parceiroId, parceiroNome}>
   - owners: Map<municipioId, PaintEntry> (dono real, resolve clique fora do foco)
   - selectable/selected/onToggleMunicipio: modo seleção usado no cadastro
   - pins: instaladores e vendas posicionados pelo centróide do município
                                    |
        +---------------------------+---------------------------+
        v                                                       v
   src/routes/index.tsx  (página Mapa)                 src/routes/cadastros.tsx
   - filtro 1: tipo de canal                           - formulário unificado
   - filtro 2: seleção específica (por UF em foco)     - cesta de municípios
   - camadas: instaladores / vendas + período          - mapa lateral selecionável
   - legenda dinâmica, foco por região                 - conflito e transferência
        \                                                     /
         +----------------------- src/lib/store.ts ----------+
             useSyncExternalStore + localStorage + Supabase
             tabelas: public.cadastros, public.vendas
```

Módulo reempacotado e independente (mesma lógica, sem acoplamento ao app):
`src/components/mapa/` — descrito na seção 12 e com código completo na seção 14.

---

## 2. Arquivos envolvidos

| Caminho | Papel |
| --- | --- |
| `src/lib/ibge.ts` | Serviço de dados geográficos IBGE (malhas, listas, UFs, centróide). |
| `src/lib/store.ts` | Store de domínio (cadastros/vendas), tipos, paleta, persistência Supabase + localStorage. |
| `src/components/MapaBrasil.tsx` | Componente do mapa SVG (projeção, zoom, pan, hover, clique, pins, seleção). |
| `src/routes/index.tsx` | Página do mapa: filtros, camadas, legenda, foco por parceiro. |
| `src/routes/cadastros.tsx` | Cadastro/edição unificado + seleção de municípios pelo mapa. |
| `src/routes/__root.tsx` | Layout raiz, providers (QueryClientProvider), navegação. |
| `src/router.tsx` | Criação do router e do QueryClient. |
| `src/integrations/supabase/client.ts` | Cliente Supabase (gerado). |
| `src/styles.css` | Tokens de design, incluindo tokens do mapa (`--map-*`, `--pin-*`). |
| `supabase/migrations/*.sql` | Schema das tabelas `cadastros` e `vendas`. |
| `src/components/mapa/*` | Versão isolada e reutilizável do mapa (props-only). |
| `MAPA-INTEGRACAO.md` | Guia curto de integração do módulo isolado. |

---

## 3. Bibliotecas e dependências

Obrigatórias para o mapa:

```bash
npm i react react-dom @tanstack/react-query d3-geo
npm i -D @types/d3-geo @types/geojson typescript
npm i tailwindcss @tailwindcss/vite      # estilos (Tailwind v4)
npm i @supabase/supabase-js              # persistência (opcional/adaptável)
```

Do app de origem: `@tanstack/react-router` + `@tanstack/react-start` (roteamento/SSR).
Nada de Leaflet, Mapbox, Google Maps ou shadcn é necessário. Nenhuma variável de
ambiente é exigida pelas APIs do IBGE (públicas, sem chave).

O app precisa estar dentro de um `QueryClientProvider`.

---

## 4. Carregamento de estados e municípios

1. **Malha dos estados** (`statesGeoQuery`): `GET /api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=intermediaria&intrarregiao=UF`.
   Retorna `FeatureCollection` cujas features têm `properties.codarea` = código de 2 dígitos da UF.
2. **Malha de municípios de uma UF** (`municipiosGeoQuery(uf)`): `GET /api/v3/malhas/estados/{UF}?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio`.
   `properties.codarea` = código IBGE de 7 dígitos do município.
3. **Lista de municípios** (`municipioListQuery(uf)`): `GET /api/v1/localidades/estados/{UF}/municipios`, mapeada para `{id, nome}` e ordenada com `localeCompare(pt-BR)`. Usada para nomes em tooltip, chips e selects.
4. Todas as queries usam `staleTime: Infinity` e `gcTime: Infinity` (dados estáveis; download único por sessão).
5. `ufOfMunicipio(code)` deriva a UF pelos 2 primeiros dígitos do código do município — é assim que o sistema sabe a que estado pertence cada município salvo, sem consulta extra.
6. O mapa carrega malhas municipais **somente** das UFs necessárias: `extraUfs` (UFs com área pintada ou com pins) + `focusUf`. Isso mantém o payload pequeno.
7. Projeção: `geoIdentity().reflectY(true).fitExtent([[24,24],[W-24,H-24]], collection)` com `W=900`, `H=700`. `reflectY(true)` é obrigatório porque o GeoJSON do IBGE em coordenadas geográficas fica invertido no eixo Y do SVG. Quando há `focusUf`, o `fitExtent` recebe apenas a feature daquele estado (zoom de enquadramento no estado).
8. Centróide dos pins: `centroidOf()` calcula o **centro do bounding box planar**, e não `geoCentroid`, porque o sentido dos anéis (winding) das malhas do IBGE quebra o cálculo esférico.

---

## 5. Comportamento visual e interação do mapa

**Zoom (scroll):** listener `wheel` não-passivo no `<svg>`; `k` multiplica por `2^(-deltaY/400)`, limitado entre `MIN_K=1` e `MAX_K=40`, com ancoragem no cursor
(`x = px - ((px - v.x)/v.k) * k`). Como tudo é SVG vetorial, não há perda de qualidade.

**Pan (arrastar):** `onPointerDown/Move/Up` guardam origem em `drag.current`; deslocamento convertido de pixels de tela para unidades do viewBox. `moved=true` após 3px, e o handler de clique ignora o clique quando houve arrasto (`dragged()`).

**clampView:** impede arrastar para fora — `x ∈ [W - W*k, 0]`, `y ∈ [H - H*k, 0]`.

**Botões flutuantes:** `+` / `−` (`zoomBy` com fator 1.6 ancorado no centro), "Redefinir zoom" (aparece com `k > 1`) e "← Voltar ao Brasil" (quando há `focusUf`).

**Reset:** `useEffect` zera `{k:1,x:0,y:0}` sempre que `focusUf` muda.

**Espessura de traço:** `sw(n) = n / view.k` mantém a linha com a mesma espessura aparente em qualquer zoom.

**Estados:** preenchimento `fill-map-land`, hover `hover:fill-map-land-hover`, contorno `stroke-map-boundary` com `strokeWidth={sw(1.4)}` e `strokeOpacity=1`. No macro (Brasil), hover mostra o nome do estado e o sub-texto "Clique para ampliar"; clique chama `onFocusUf(sigla)`. Se já está em foco, clicar volta para o Brasil (`null`). Com `focusUf` ativo, os demais estados não são renderizados.

**Municípios:** renderizados apenas quando visíveis — no estado em foco, todos os municípios daquela UF; no Brasil, só os que estão pintados (`paint`) ou selecionados.
- `interactive = selectable || !!focusUf`. No macro sem seleção, `pointerEvents: none` — assim o hover/clique continua sendo do estado (comportamento pedido: no Brasil sempre se seleciona o estado inteiro).
- Preenchimento: selecionado → `var(--primary)`; pintado → cor do parceiro; senão hover → `var(--map-land-hover)`; senão `transparent`.
- Opacidade: selecionado 0,75 (0,95 em hover); pintado 0,70 (0,95 em hover); vazio 0 (1 em hover).
- Contorno sempre `stroke-map-boundary` (quase preto), `strokeWidth={sw(isHover ? 2 : 1.2)}`, `strokeOpacity=1`, `strokeLinejoin="round"` — garante que as divisas continuem visíveis mesmo sobre áreas coloridas.
- Tooltip: nome do município + sub-texto contextual ("Clique para adicionar/remover" no modo seleção, ou o nome do parceiro dono).

**Tooltip:** `div` absoluto posicionado pelas coordenadas do mouse relativas ao contêiner (`boxRef`), `pointer-events-none`, `-translate-x-1/2 -translate-y-[130%]`.

**Pins:** `<g transform="translate(x,y) scale(1/k)">` (tamanho constante em qualquer zoom), gota SVG com `fill-pin-install` (azul) ou `fill-pin-sale` (laranja) e borda branca.

**Tokens de cor** (em `src/styles.css`, replicados em `src/components/mapa/mapa.css`):
`--map-water`, `--map-land`, `--map-land-hover`, `--map-line`, `--map-line-soft`,
`--map-boundary` (divisas em quase-preto), `--pin-install`, `--pin-sale`.

**Paleta de parceiros:** `PALETTE` + `colorOf(index)` — a cor é atribuída pela posição do parceiro na lista filtrada por tipo, portanto é estável enquanto a lista não muda.

---

## 6. Modelo de dados

### Tipos de entidade (`PerfilTipo`)

| valor | rótulo | grupo | tem área de atuação |
| --- | --- | --- | --- |
| `cliente` | Cliente Final | pin | não |
| `concessionaria` | Concessionária | area | **sim** |
| `rep_rodoviario` | Representante Rodoviário | area | **sim** |
| `rep_agricola` | Representante Agrícola | area | **sim** |
| `vendedor` | Vendedor | outro | não |
| `instalador` | Instalador | pin | não |

`CANAIS = TIPOS.filter(grupo === "area")` alimenta o filtro 1 do mapa.
`temArea(tipo)` (em `cadastros.tsx`) libera o bloco de municípios de atuação.

### Entidade `Cadastro`

| campo | tipo | descrição |
| --- | --- | --- |
| `id` | string | chave primária (gerada por `novoId()`: `c-<base36>-<rand>`). |
| `tipo` | PerfilTipo | tipo da entidade. |
| `nome`, `documento`, `contato`, `email`, `endereco` | string | dados cadastrais. |
| `uf` | string | UF da sede. |
| `municipioId` | string | código IBGE (7 dígitos) da cidade-sede — usado para posicionar pins. |
| `municipioNome` | string | nome da cidade-sede (desnormalizado para exibição offline). |
| `municipios` | string[] | **área de atuação**: lista de códigos IBGE. Vazia para não-parceiros. |

### Entidade `Venda`

`id`, `cliente`, `municipioId`, `municipioNome`, `uf`, `periodo` (`YYYY-MM`), `valor` (number), `parceiroId?`.

### Relacionamentos

Não há FK física. Os vínculos são lógicos e resolvidos em memória:
- **Área de atuação:** `Cadastro.municipios[] → código IBGE` (array em coluna `text[]`).
- **Parceiro ↔ município:** invertido em runtime num `Map<municipioId, PaintEntry>` (`paint`/`owners`).
- **Instalador ↔ parceiro:** implícito — instalador pertence ao parceiro cujo `municipios` contém o `municipioId` do instalador.
- **Venda ↔ parceiro:** `vendas.parceiro_id` (opcional) e/ou pelo município da venda estar na área do parceiro.
- **Município ↔ UF:** derivado do código (`ufOfMunicipio`).

---

## 7. SQL / schema necessário

Schema real aplicado (Postgres/Supabase). RLS habilitada com política pública
(protótipo sem login); restrinja conforme o sistema de destino.

```sql
-- public.cadastros
CREATE TABLE public.cadastros (
  id             text PRIMARY KEY,
  tipo           text NOT NULL,
  nome           text NOT NULL DEFAULT '',
  documento      text NOT NULL DEFAULT '',
  contato        text NOT NULL DEFAULT '',
  email          text NOT NULL DEFAULT '',
  endereco       text NOT NULL DEFAULT '',
  uf             text NOT NULL DEFAULT '',
  municipio_id   text NOT NULL DEFAULT '',
  municipio_nome text NOT NULL DEFAULT '',
  municipios     text[] NOT NULL DEFAULT '{}'::text[],
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cadastros TO anon, authenticated;
GRANT ALL ON public.cadastros TO service_role;
ALTER TABLE public.cadastros ENABLE ROW LEVEL SECURITY;
CREATE POLICY cadastros_public_all ON public.cadastros
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- public.vendas
CREATE TABLE public.vendas (
  id             text PRIMARY KEY,
  cliente        text NOT NULL DEFAULT '',
  municipio_id   text NOT NULL DEFAULT '',
  municipio_nome text NOT NULL DEFAULT '',
  uf             text NOT NULL DEFAULT '',
  periodo        text NOT NULL DEFAULT '',
  valor          numeric NOT NULL DEFAULT 0,
  parceiro_id    text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendas TO anon, authenticated;
GRANT ALL ON public.vendas TO service_role;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY vendas_public_all ON public.vendas
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- índices úteis (opcionais)
CREATE INDEX cadastros_tipo_idx ON public.cadastros (tipo);
CREATE INDEX cadastros_uf_idx ON public.cadastros (uf);
CREATE INDEX cadastros_municipios_gin ON public.cadastros USING gin (municipios);
CREATE INDEX vendas_municipio_idx ON public.vendas (municipio_id);
```

Consulta equivalente "quem atende o município X":

```sql
SELECT id, nome, tipo FROM public.cadastros
WHERE tipo = 'concessionaria' AND '4317202' = ANY (municipios);
```

### API de dados (camada `store`)

| operação | implementação |
| --- | --- |
| leitura completa | `supabase.from("cadastros").select("*")` + `supabase.from("vendas").select("*")` |
| gravar/atualizar cadastro | `supabase.from("cadastros").upsert(row)` |
| remover cadastro | `supabase.from("cadastros").delete().eq("id", id)` |
| reset/seed | `delete().neq("id","")` nas duas tabelas + `upsert` do SEED |

Mapeamento camelCase ↔ snake_case em `toCadastro/toCadastroRow` e `toVenda/toVendaRow`.
Estado reativo via `useSyncExternalStore` (`useDb()`), com espelho em `localStorage`
(chave `geomarketing-db-v1`) para leitura instantânea e uso offline; `hydrate()` carrega
da nuvem e migra o que só existia no navegador.

---

## 8. Cadastro e edição de entidades (fluxo completo)

1. **Abrir** `/cadastros`. `useEffect(() => hydrate(), [])` garante os dados carregados; `useDb()` mantém a tela sincronizada.
2. **Novo cadastro:** `form` começa em `vazio()` (tipo `concessionaria`, UF `RS`).
3. **Tipo de perfil** define o restante da tela: `temArea(tipo)` (concessionária, rep. rodoviário, rep. agrícola) exibe o bloco "Municípios de atuação" e o mapa selecionável; os demais tipos não.
4. **Sede:** select de UF (`UFS`) → `municipioListQuery(form.uf)` carrega a lista → select de cidade grava `municipioId`. Ao trocar a UF, `municipioId` é limpo.
5. **Municípios de atuação — por busca:** select de UF (`ufSel`, que também define `mapUf`, o estado enquadrado no mapa) + campo de busca (`startsWith`, case-insensitive pt-BR, máx. 300 opções, já excluindo os que estão na cesta) + botão "Adicionar" (`adicionarMunicipio`).
6. **Municípios de atuação — por clique no mapa:** o mapa lateral é renderizado com `selectable`, `selected={form.municipios}` e `onToggleMunicipio={alternarMunicipio}`. Clicar num município **adiciona**; clicar de novo **remove**. Selecionados aparecem em `var(--primary)`; áreas de outros parceiros do mesmo tipo aparecem em suas próprias cores com legenda abaixo do mapa.
7. **Cesta:** chips com nome do município + UF derivada do código e botão `×` para remover.
8. **Salvar** (`salvar`): valida nome, gera `id` com `novoId()` quando novo, recupera `municipioNome` da lista carregada, zera `municipios` se o tipo não tem área, chama `store.save()` (atualiza estado local + `upsert` no banco) e limpa o formulário.
9. **Editar** (`editar(c)`): `setForm(c)` — como `municipios` já vem no registro, **a cesta e a seleção no mapa aparecem preenchidas automaticamente** (a seleção do mapa é derivada de `form.municipios`, não de estado paralelo). Também define `ufSel` e `mapUf` com a UF do cadastro (o mapa abre já no estado certo) e rola a página para o topo.
10. **Excluir:** `store.remove(id)` (estado local + `delete` no banco).
11. **Visualizar no mapa principal:** ao abrir `/`, os mesmos `municipios` viram polígonos coloridos via `buildPaint`.

---

## 9. Filtros por tipo de entidade

**Página de cadastros:**
- `filtroTipo` (`todos` | PerfilTipo) filtra a lista de registros.
- Filtro geográfico implícito: se o mapa está enquadrado em um estado (`mapUf`), a lista mostra apenas cadastros cuja sede é daquele estado **ou** que tenham algum município de atuação nele: `c.uf === mapUf || c.municipios.some(code => ufOfMunicipio(code) === mapUf)`. No mapa do Brasil (`mapUf === null`) a lista mostra tudo. O cabeçalho exibe `Cadastros (n) · UF|Brasil`.

**Página do mapa:**
- **Filtro 1 — Tipo de canal:** botões de `CANAIS`; trocar o canal limpa seleção e foco.
- **Filtro 2 — Seleção específica:** checkboxes com `parceirosVisiveis`, que lista **somente parceiros com atuação no estado em foco** quando há `focusUf`; sem foco, lista todos do canal. "Todos (n)" desmarca tudo.
- **Filtro 3 — Camadas extras:** instaladores, vendas e, para vendas, o período (`YYYY-MM`, derivado de `db.vendas`), com total em R$.
- **Legenda dinâmica:** parceiros ativos (`ativos`) com atuação na UF em foco, cor e contagem de municípios.

---

## 10. Sobreposição, conflitos e múltiplas entidades

Regra de negócio: **um município pertence a no máximo um parceiro do mesmo tipo**.
Parceiros de tipos diferentes (ex.: concessionária e rep. agrícola) podem cobrir o mesmo município — as camadas são exibidas uma por canal.

- `pares` = cadastros do mesmo `tipo` do formulário que possuem área.
- `donoPorMunicipio` = `Map<code, Cadastro>` com todos os municípios já ocupados por **outro** parceiro do mesmo tipo (o próprio registro em edição é excluído).
- `resolverConflito(code)`: se há dono, exibe `window.confirm("O município X já pertence a Y. Deseja transferir para Z?")`. Confirmando, o município é **removido do dono anterior** (`store.save({...dono, municipios: sem o code})`, gravado imediatamente) e liberado para a cesta atual. Recusando, nada acontece.
- `alternarMunicipio(code)`: se já está na cesta, remove; senão passa pelo `resolverConflito` e adiciona. É o handler tanto do clique no mapa quanto (via `adicionarMunicipio`) da busca.
- `paint` no mapa de cadastro pinta as áreas dos **outros** parceiros do mesmo tipo (cada um com sua cor + legenda), evidenciando as regiões descobertas do estado.
- No mapa principal, `owners` guarda o dono de **todos** os municípios do canal: clicar num município fora da região em foco troca o foco para o dono daquele município (`onSelectRegion`), e clicar num município sem dono não faz nada.

---

## 11. Fluxo completo (abrir → salvar → visualizar)

```text
/cadastros
  hydrate() -> localStorage (instantâneo) -> Supabase (autoritativo) -> useDb()
  escolher tipo -> (tem área?) -> bloco de municípios + mapa selecionável
  escolher UF -> municipioListQuery(UF) + municipiosGeoQuery(UF)
  clicar município no mapa -> alternarMunicipio(code)
        |-- já na cesta?  -> remove
        |-- tem outro dono do mesmo tipo? -> confirm -> transfere (save do dono)
        +-- adiciona ao form.municipios (pinta em --primary, chip na cesta)
  salvar -> store.save() -> estado em memória + localStorage + upsert Supabase
/
  hydrate() -> filtro por canal -> buildPaint(parceiros) -> Map<code, PaintEntry>
  MapaBrasil pinta polígonos, hover mostra município/parceiro,
  clique foca o parceiro dono e filtra instaladores/vendas dele
/cadastros (editar)
  editar(c) -> form recebe municipios já salvos -> cesta e mapa aparecem marcados
```

---

## 12. Módulo isolado `src/components/mapa/`

Versão desacoplada do mapa, que recebe todos os dados por props (sem banco, sem
dados fictícios). Interfaces públicas: `ParceiroMapa`, `PontoMapa`, `VendaMapa`,
`CanalMapa`, `MapaProps`. O hook `useMunicipioResolver` converte `cidade + UF` em
código IBGE (normalização sem acentos contra a lista oficial da UF), de modo que o
sistema de destino não precisa de latitude/longitude. Uso mínimo:

```tsx
import { Mapa } from "@/components/mapa";

<Mapa
  canais={[{ value: "concessionaria", label: "Concessionária" }]}
  parceiros={[{ id: "1", nome: "Concessionária Sul", canal: "concessionaria",
               cidades: [{ cidade: "Passo Fundo", uf: "RS" }] }]}
  instaladores={[]} clientes={[]} vendedores={[]} vendas={[]}
/>;
```

---

## 13. Código completo — aplicação

A partir daqui, todos os arquivos aparecem íntegros, identificados pelo caminho original.


---

## 13.1 Serviços e store

### `src/lib/ibge.ts`

```ts
import { queryOptions } from "@tanstack/react-query";
import type { Feature, FeatureCollection, Geometry } from "geojson";

export const UFS = [
  { code: "12", sigla: "AC", nome: "Acre" },
  { code: "27", sigla: "AL", nome: "Alagoas" },
  { code: "16", sigla: "AP", nome: "Amapá" },
  { code: "13", sigla: "AM", nome: "Amazonas" },
  { code: "29", sigla: "BA", nome: "Bahia" },
  { code: "23", sigla: "CE", nome: "Ceará" },
  { code: "53", sigla: "DF", nome: "Distrito Federal" },
  { code: "32", sigla: "ES", nome: "Espírito Santo" },
  { code: "52", sigla: "GO", nome: "Goiás" },
  { code: "21", sigla: "MA", nome: "Maranhão" },
  { code: "51", sigla: "MT", nome: "Mato Grosso" },
  { code: "50", sigla: "MS", nome: "Mato Grosso do Sul" },
  { code: "31", sigla: "MG", nome: "Minas Gerais" },
  { code: "15", sigla: "PA", nome: "Pará" },
  { code: "25", sigla: "PB", nome: "Paraíba" },
  { code: "41", sigla: "PR", nome: "Paraná" },
  { code: "26", sigla: "PE", nome: "Pernambuco" },
  { code: "22", sigla: "PI", nome: "Piauí" },
  { code: "33", sigla: "RJ", nome: "Rio de Janeiro" },
  { code: "24", sigla: "RN", nome: "Rio Grande do Norte" },
  { code: "43", sigla: "RS", nome: "Rio Grande do Sul" },
  { code: "11", sigla: "RO", nome: "Rondônia" },
  { code: "14", sigla: "RR", nome: "Roraima" },
  { code: "42", sigla: "SC", nome: "Santa Catarina" },
  { code: "35", sigla: "SP", nome: "São Paulo" },
  { code: "28", sigla: "SE", nome: "Sergipe" },
  { code: "17", sigla: "TO", nome: "Tocantins" },
] as const;

export type Uf = (typeof UFS)[number]["sigla"];

export const ufByCode = new Map<string, { code: string; sigla: string; nome: string }>(
  UFS.map((u) => [u.code as string, { code: u.code, sigla: u.sigla, nome: u.nome }]),
);
export const ufBySigla = new Map<string, { code: string; sigla: string; nome: string }>(
  UFS.map((u) => [u.sigla as string, { code: u.code, sigla: u.sigla, nome: u.nome }]),
);


/** Municipality IBGE code -> UF sigla (first two digits). */
export function ufOfMunicipio(codMun: string): string {
  return ufByCode.get(codMun.slice(0, 2))?.sigla ?? "";
}

const MALHAS = "https://servicodados.ibge.gov.br/api/v3/malhas";
const LOCALIDADES = "https://servicodados.ibge.gov.br/api/v1/localidades";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao carregar dados do IBGE (${res.status})`);
  return (await res.json()) as T;
}

export type Geo = FeatureCollection<Geometry, { codarea: string }>;

export const statesGeoQuery = queryOptions({
  queryKey: ["ibge", "malha", "br"],
  staleTime: Infinity,
  gcTime: Infinity,
  queryFn: () =>
    getJson<Geo>(
      `${MALHAS}/paises/BR?formato=application/vnd.geo+json&qualidade=intermediaria&intrarregiao=UF`,
    ),
});

export const municipiosGeoQuery = (uf: string) =>
  queryOptions({
    queryKey: ["ibge", "malha", "mun", uf],
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: () =>
      getJson<Geo>(
        `${MALHAS}/estados/${uf}?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio`,
      ),
  });

export type Municipio = { id: number; nome: string };

export const municipioListQuery = (uf: string) =>
  queryOptions({
    queryKey: ["ibge", "municipios", uf],
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: !!uf,
    queryFn: async () => {
      const list = await getJson<Array<{ id: number; nome: string }>>(
        `${LOCALIDADES}/estados/${uf}/municipios`,
      );
      return list
        .map((m) => ({ id: m.id, nome: m.nome }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    },
  });

/**
 * Planar bbox centre in lon/lat. IBGE meshes use ring winding that breaks
 * spherical centroid math, so the bounding-box centre is used instead.
 */
export function centroidOf(feature: Feature<Geometry, unknown>): [number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const visit = (coords: unknown) => {
    if (Array.isArray(coords) && typeof coords[0] === "number" && typeof coords[1] === "number") {
      const [x, y] = coords as [number, number];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      return;
    }
    if (Array.isArray(coords)) coords.forEach(visit);
  };

  const geom = feature.geometry as { coordinates?: unknown };
  visit(geom?.coordinates);
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}
```

### `src/lib/store.ts`

```ts
import { useSyncExternalStore } from "react";

export type PerfilTipo =
  | "cliente"
  | "concessionaria"
  | "rep_rodoviario"
  | "rep_agricola"
  | "vendedor"
  | "instalador";

export const TIPOS: { value: PerfilTipo; label: string; grupo: "area" | "pin" | "outro" }[] = [
  { value: "cliente", label: "Cliente Final", grupo: "pin" },
  { value: "concessionaria", label: "Concessionária", grupo: "area" },
  { value: "rep_rodoviario", label: "Representante Rodoviário", grupo: "area" },
  { value: "rep_agricola", label: "Representante Agrícola", grupo: "area" },
  { value: "vendedor", label: "Vendedor", grupo: "outro" },
  { value: "instalador", label: "Instalador", grupo: "pin" },
];

export const CANAIS = TIPOS.filter((t) => t.grupo === "area");

export const tipoLabel = (t: PerfilTipo) => TIPOS.find((x) => x.value === t)?.label ?? t;

export interface Cadastro {
  id: string;
  tipo: PerfilTipo;
  nome: string;
  documento: string;
  contato: string;
  email: string;
  endereco: string;
  uf: string;
  /** IBGE code of the base city */
  municipioId: string;
  municipioNome: string;
  /** IBGE codes of municipalities served (partners only) */
  municipios: string[];
}

export interface Venda {
  id: string;
  cliente: string;
  municipioId: string;
  municipioNome: string;
  uf: string;
  /** YYYY-MM */
  periodo: string;
  valor: number;
  parceiroId?: string;
}

export interface DB {
  cadastros: Cadastro[];
  vendas: Venda[];
}

export const PALETTE = [
  "#e0653a",
  "#2f8f6b",
  "#3b6ea5",
  "#c9a227",
  "#a2497f",
  "#4f8f2f",
  "#b5423a",
  "#2f7f9f",
];

export function colorOf(index: number) {
  return PALETTE[index % PALETTE.length];
}

const M = (id: string, nome: string) => ({ id, nome });

const RS = {
  santaRosa: M("4317202", "Santa Rosa"),
  ijui: M("4310207", "Ijuí"),
  cruzAlta: M("4306106", "Cruz Alta"),
  passoFundo: M("4314100", "Passo Fundo"),
  santoAngelo: M("4317509", "Santo Ângelo"),
  portoAlegre: M("4314902", "Porto Alegre"),
  caxias: M("4305108", "Caxias do Sul"),
  pelotas: M("4314407", "Pelotas"),
  santaMaria: M("4316907", "Santa Maria"),
  erechim: M("4307005", "Erechim"),
};
const SP = {
  saoPaulo: M("3550308", "São Paulo"),
  campinas: M("3509502", "Campinas"),
  ribeirao: M("3543402", "Ribeirão Preto"),
  sorocaba: M("3552205", "Sorocaba"),
  bauru: M("3506003", "Bauru"),
  piracicaba: M("3538709", "Piracicaba"),
  rioPreto: M("3549805", "São José do Rio Preto"),
  santos: M("3548500", "Santos"),
};
const PR = {
  curitiba: M("4106902", "Curitiba"),
  londrina: M("4113700", "Londrina"),
  maringa: M("4115200", "Maringá"),
  cascavel: M("4104808", "Cascavel"),
  pontaGrossa: M("4119905", "Ponta Grossa"),
  foz: M("4108304", "Foz do Iguaçu"),
};
const MT = {
  cuiaba: M("5103403", "Cuiabá"),
  sorriso: M("5107925", "Sorriso"),
  sinop: M("5107909", "Sinop"),
  rondonopolis: M("5107602", "Rondonópolis"),
  lucas: M("5105259", "Lucas do Rio Verde"),
  primavera: M("5107040", "Primavera do Leste"),
};

function parceiro(
  id: string,
  tipo: PerfilTipo,
  nome: string,
  base: { id: string; nome: string },
  uf: string,
  municipios: { id: string; nome: string }[],
): Cadastro {
  return {
    id,
    tipo,
    nome,
    documento: "00.000.000/0001-00",
    contato: "(55) 3000-0000",
    email: `contato@${id}.com.br`,
    endereco: "Av. Principal, 1000",
    uf,
    municipioId: base.id,
    municipioNome: base.nome,
    municipios: municipios.map((m) => m.id),
  };
}

function ponto(
  id: string,
  tipo: PerfilTipo,
  nome: string,
  base: { id: string; nome: string },
  uf: string,
  endereco: string,
): Cadastro {
  return {
    id,
    tipo,
    nome,
    documento: "000.000.000-00",
    contato: "(55) 99000-0000",
    email: `${id}@email.com`,
    endereco,
    uf,
    municipioId: base.id,
    municipioNome: base.nome,
    municipios: [],
  };
}

const SEED: DB = {
  cadastros: [
    parceiro("conc-noroeste", "concessionaria", "Concessionária Noroeste Máquinas", RS.santaRosa, "RS", [
      RS.santaRosa,
      RS.ijui,
      RS.santoAngelo,
      RS.cruzAlta,
    ]),
    parceiro("conc-serra", "concessionaria", "Concessionária Serra Diesel", RS.caxias, "RS", [
      RS.caxias,
      RS.passoFundo,
      RS.erechim,
    ]),
    parceiro("conc-paulista", "concessionaria", "Concessionária Paulista Truck", SP.campinas, "SP", [
      SP.campinas,
      SP.piracicaba,
      SP.sorocaba,
      SP.saoPaulo,
    ]),
    parceiro("rep-sul-rodo", "rep_rodoviario", "Rep. Rodoviário Sul Cargas", RS.portoAlegre, "RS", [
      RS.portoAlegre,
      RS.pelotas,
      RS.santaMaria,
    ]),
    parceiro("rep-parana-rodo", "rep_rodoviario", "Rep. Rodoviário Paraná Log", PR.curitiba, "PR", [
      PR.curitiba,
      PR.pontaGrossa,
      PR.londrina,
    ]),
    parceiro("rep-agro-mt", "rep_agricola", "Rep. Agrícola Centro-Oeste", MT.sorriso, "MT", [
      MT.sorriso,
      MT.sinop,
      MT.lucas,
      MT.primavera,
    ]),
    parceiro("rep-agro-interior", "rep_agricola", "Rep. Agrícola Interior Paulista", SP.ribeirao, "SP", [
      SP.ribeirao,
      SP.rioPreto,
      SP.bauru,
    ]),
    parceiro("rep-agro-oeste-pr", "rep_agricola", "Rep. Agrícola Oeste PR", PR.cascavel, "PR", [
      PR.cascavel,
      PR.maringa,
      PR.foz,
    ]),

    ponto("inst-1", "instalador", "Oficina Rota Sul", RS.santaRosa, "RS", "Rua Expedicionário, 220 - Centro"),
    ponto("inst-2", "instalador", "Instaladora Ijuí Truck", RS.ijui, "RS", "Av. Getúlio Vargas, 890"),
    ponto("inst-3", "instalador", "Eletro Diesel Serra", RS.caxias, "RS", "Rua Sinimbu, 1450"),
    ponto("inst-4", "instalador", "Tele Rastro Campinas", SP.campinas, "SP", "Av. John Boyd Dunlop, 300"),
    ponto("inst-5", "instalador", "Instala Agro Sorriso", MT.sorriso, "MT", "Av. Blumenau, 77"),
    ponto("inst-6", "instalador", "Sinop Rastreamento", MT.sinop, "MT", "Av. das Itaúbas, 1200"),
    ponto("inst-7", "instalador", "Curitiba Car Service", PR.curitiba, "PR", "Rua XV de Novembro, 45"),
    ponto("inst-8", "instalador", "Oeste PR Instalações", PR.cascavel, "PR", "Av. Brasil, 5600"),
    ponto("inst-9", "instalador", "Ribeirão Agro Tec", SP.ribeirao, "SP", "Av. Independência, 900"),
    ponto("inst-10", "instalador", "Pampa Instalações", RS.portoAlegre, "RS", "Av. Assis Brasil, 3000"),

    ponto("cli-1", "cliente", "Transportes Missões Ltda", RS.santoAngelo, "RS", "BR-392, km 12"),
    ponto("cli-2", "cliente", "Agropecuária Boa Safra", MT.lucas, "MT", "Rod. MT-235, km 40"),
    ponto("cli-3", "cliente", "Log Paraná Express", PR.londrina, "PR", "Av. Tiradentes, 2100"),

    ponto("vend-1", "vendedor", "Marcelo Andrade", RS.portoAlegre, "RS", "Escritório Regional Sul"),
    ponto("vend-2", "vendedor", "Fernanda Lima", SP.campinas, "SP", "Escritório Regional Sudeste"),
  ],
  vendas: [
    { id: "v1", cliente: "Transportes Missões Ltda", municipioId: RS.santoAngelo.id, municipioNome: RS.santoAngelo.nome, uf: "RS", periodo: "2026-05", valor: 48000, parceiroId: "conc-noroeste" },
    { id: "v2", cliente: "Frota Ijuí Cargas", municipioId: RS.ijui.id, municipioNome: RS.ijui.nome, uf: "RS", periodo: "2026-06", valor: 32500, parceiroId: "conc-noroeste" },
    { id: "v3", cliente: "Serra Transportes", municipioId: RS.caxias.id, municipioNome: RS.caxias.nome, uf: "RS", periodo: "2026-06", valor: 27600, parceiroId: "conc-serra" },
    { id: "v4", cliente: "Rodo Passo Fundo", municipioId: RS.passoFundo.id, municipioNome: RS.passoFundo.nome, uf: "RS", periodo: "2026-07", valor: 51200, parceiroId: "conc-serra" },
    { id: "v5", cliente: "Campinas Distribuição", municipioId: SP.campinas.id, municipioNome: SP.campinas.nome, uf: "SP", periodo: "2026-07", valor: 88000, parceiroId: "conc-paulista" },
    { id: "v6", cliente: "Agro Boa Safra", municipioId: MT.lucas.id, municipioNome: MT.lucas.nome, uf: "MT", periodo: "2026-06", valor: 143000, parceiroId: "rep-agro-mt" },
    { id: "v7", cliente: "Fazenda Sorriso Grande", municipioId: MT.sorriso.id, municipioNome: MT.sorriso.nome, uf: "MT", periodo: "2026-07", valor: 96500, parceiroId: "rep-agro-mt" },
    { id: "v8", cliente: "Log Paraná Express", municipioId: PR.londrina.id, municipioNome: PR.londrina.nome, uf: "PR", periodo: "2026-05", valor: 41000, parceiroId: "rep-parana-rodo" },
    { id: "v9", cliente: "Curitiba Fretes", municipioId: PR.curitiba.id, municipioNome: PR.curitiba.nome, uf: "PR", periodo: "2026-07", valor: 63000, parceiroId: "rep-parana-rodo" },
    { id: "v10", cliente: "Usina Ribeirão", municipioId: SP.ribeirao.id, municipioNome: SP.ribeirao.nome, uf: "SP", periodo: "2026-06", valor: 118000, parceiroId: "rep-agro-interior" },
    { id: "v11", cliente: "Oeste Agro Cascavel", municipioId: PR.cascavel.id, municipioNome: PR.cascavel.nome, uf: "PR", periodo: "2026-07", valor: 75500, parceiroId: "rep-agro-oeste-pr" },
    { id: "v12", cliente: "Pampa Cargas", municipioId: RS.pelotas.id, municipioNome: RS.pelotas.nome, uf: "RS", periodo: "2026-05", valor: 29800, parceiroId: "rep-sul-rodo" },
  ],
};

const KEY = "geomarketing-db-v1";

let db: DB = SEED;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* ignore */
  }
}

/* ---------- mapeamento banco <-> app ---------- */

type CadastroRow = {
  id: string;
  tipo: string;
  nome: string;
  documento: string;
  contato: string;
  email: string;
  endereco: string;
  uf: string;
  municipio_id: string;
  municipio_nome: string;
  municipios: string[];
};

type VendaRow = {
  id: string;
  cliente: string;
  municipio_id: string;
  municipio_nome: string;
  uf: string;
  periodo: string;
  valor: number;
  parceiro_id: string | null;
};

const toCadastro = (r: CadastroRow): Cadastro => ({
  id: r.id,
  tipo: r.tipo as PerfilTipo,
  nome: r.nome,
  documento: r.documento,
  contato: r.contato,
  email: r.email,
  endereco: r.endereco,
  uf: r.uf,
  municipioId: r.municipio_id,
  municipioNome: r.municipio_nome,
  municipios: r.municipios ?? [],
});

const toCadastroRow = (c: Cadastro) => ({
  id: c.id,
  tipo: c.tipo,
  nome: c.nome ?? "",
  documento: c.documento ?? "",
  contato: c.contato ?? "",
  email: c.email ?? "",
  endereco: c.endereco ?? "",
  uf: c.uf ?? "",
  municipio_id: c.municipioId ?? "",
  municipio_nome: c.municipioNome ?? "",
  municipios: c.municipios ?? [],
  updated_at: new Date().toISOString(),
});

const toVenda = (r: VendaRow): Venda => ({
  id: r.id,
  cliente: r.cliente,
  municipioId: r.municipio_id,
  municipioNome: r.municipio_nome,
  uf: r.uf,
  periodo: r.periodo,
  valor: Number(r.valor),
  parceiroId: r.parceiro_id ?? undefined,
});

const toVendaRow = (v: Venda) => ({
  id: v.id,
  cliente: v.cliente,
  municipio_id: v.municipioId,
  municipio_nome: v.municipioNome,
  uf: v.uf,
  periodo: v.periodo,
  valor: v.valor,
  parceiro_id: v.parceiroId ?? null,
});

function localDb(): DB | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DB;
    return parsed?.cadastros?.length ? parsed : null;
  } catch {
    return null;
  }
}

async function fetchAll(): Promise<DB> {
  const { supabase } = await import("@/integrations/supabase/client");
  const [c, v] = await Promise.all([
    supabase.from("cadastros").select("*"),
    supabase.from("vendas").select("*"),
  ]);
  return {
    cadastros: ((c.data ?? []) as CadastroRow[]).map(toCadastro),
    vendas: ((v.data ?? []) as VendaRow[]).map(toVenda),
  };
}

async function pushAll(next: DB) {
  const { supabase } = await import("@/integrations/supabase/client");
  if (next.cadastros.length)
    await supabase.from("cadastros").upsert(next.cadastros.map(toCadastroRow));
  if (next.vendas.length) await supabase.from("vendas").upsert(next.vendas.map(toVendaRow));
}

/** Carrega do banco na nuvem; na primeira vez migra o que estava salvo no navegador. */
export function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;

  const local = localDb();
  if (local) {
    db = local;
    emit();
  }

  void (async () => {
    try {
      const remote = await fetchAll();
      if (!remote.cadastros.length) {
        // banco ainda vazio: sobe o que existir localmente, senão os dados iniciais
        const seedSource = local ?? SEED;
        await pushAll(seedSource);
        db = seedSource;
      } else if (local) {
        // mescla o que só existe no navegador (cadastros feitos antes da nuvem)
        const ids = new Set(remote.cadastros.map((c) => c.id));
        const novos = local.cadastros.filter((c) => !ids.has(c.id));
        const vIds = new Set(remote.vendas.map((v) => v.id));
        const novasVendas = local.vendas.filter((v) => !vIds.has(v.id));
        if (novos.length || novasVendas.length) {
          await pushAll({ cadastros: novos, vendas: novasVendas });
        }
        db = {
          cadastros: [...remote.cadastros, ...novos],
          vendas: [...remote.vendas, ...novasVendas],
        };
      } else {
        db = remote;
      }

      persist();
      emit();
    } catch {
      /* offline: segue com os dados locais */
    }
  })();
}

function setDb(next: DB) {
  db = next;
  persist();
  emit();
}

export const store = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => db,
  save(c: Cadastro) {
    const exists = db.cadastros.some((x) => x.id === c.id);
    setDb({
      ...db,
      cadastros: exists ? db.cadastros.map((x) => (x.id === c.id ? c : x)) : [...db.cadastros, c],
    });
    void (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.from("cadastros").upsert(toCadastroRow(c));
    })();
  },
  remove(id: string) {
    setDb({ ...db, cadastros: db.cadastros.filter((c) => c.id !== id) });
    void (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.from("cadastros").delete().eq("id", id);
    })();
  },
  reset() {
    setDb(SEED);
    void (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.from("cadastros").delete().neq("id", "");
      await supabase.from("vendas").delete().neq("id", "");
      await pushAll(SEED);
    })();
  },
};

export function useDb(): DB {
  return useSyncExternalStore(
    store.subscribe,
    () => db,
    () => SEED,
  );
}

export function novoId() {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
```

### `src/integrations/supabase/client.ts`

```ts
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { brokeredPreviewStorage } from './previewAuthStorage';

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}


function createSupabaseClient() {
  // Use import.meta.env for client-side (Vite build-time replacement)
  // Fall back to process.env for SSR (server-side rendering)
  const SUPABASE_URL = import.meta.env['VITE_SUPABASE_URL'] || process.env['SUPABASE_URL'];
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] || process.env['SUPABASE_PUBLISHABLE_KEY'];

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(', ')}. Connect Supabase in Lovable Cloud.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
    },
    auth: {
      storage: brokeredPreviewStorage(),
      persistSession: true,
      autoRefreshToken: true,
    }
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
```


---

## 13.2 Componente do mapa

### `src/components/MapaBrasil.tsx`

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { geoIdentity, geoPath } from "d3-geo";
import type { Feature, Geometry } from "geojson";
import {
  centroidOf,
  municipioListQuery,
  municipiosGeoQuery,
  statesGeoQuery,
  ufByCode,
  ufOfMunicipio,
  type Geo,
} from "@/lib/ibge";

export type PaintEntry = { color: string; parceiroId: string; parceiroNome: string };
export type Pin = {
  id: string;
  label: string;
  sub: string;
  municipioId: string;
  kind: "instalador" | "venda";
};

const W = 900;
const H = 700;
const MIN_K = 1;
const MAX_K = 40;

type Props = {
  focusUf: string | null;
  onFocusUf: (uf: string | null) => void;
  paint: Map<string, PaintEntry>;
  /** dono real de cada município (todos os parceiros), usado para clique/hover */
  owners?: Map<string, PaintEntry>;
  pins: Pin[];
  onSelectRegion: (parceiroId: string, municipioId: string) => void;
  extraUfs: string[];
  /** modo seleção: clicar em qualquer município alterna a seleção */
  selectable?: boolean;
  selected?: string[];
  onToggleMunicipio?: (municipioId: string) => void;
};

export function MapaBrasil({
  focusUf,
  onFocusUf,
  paint,
  owners,
  pins,
  onSelectRegion,
  extraUfs,
  selectable = false,
  selected,
  onToggleMunicipio,
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number; text: string; sub?: string } | null>(
    null,
  );
  const [hoverMuni, setHoverMuni] = useState<string | null>(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });

  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const [panning, setPanning] = useState(false);

  const selectedSet = useMemo(() => new Set(selected ?? []), [selected]);

  const states = useQuery(statesGeoQuery);

  const ufsToLoad = useMemo(() => {
    const s = new Set<string>(extraUfs.filter(Boolean));
    if (focusUf) s.add(focusUf);
    return [...s];
  }, [extraUfs, focusUf]);

  const meshes = useQueries({
    queries: ufsToLoad.map((uf) => municipiosGeoQuery(uf)),
  });
  const lists = useQueries({
    queries: ufsToLoad.map((uf) => municipioListQuery(uf)),
  });

  const muniFeatures = useMemo(() => {
    const out: Feature<Geometry, { codarea: string }>[] = [];
    meshes.forEach((m) => {
      const data = m.data as Geo | undefined;
      if (data) out.push(...data.features);
    });
    return out;
  }, [meshes]);

  const nomes = useMemo(() => {
    const map = new Map<string, string>();
    lists.forEach((l) => l.data?.forEach((m) => map.set(String(m.id), m.nome)));
    return map;
  }, [lists]);

  const stateFeatures = states.data?.features ?? [];

  const projection = useMemo(() => {
    const target = focusUf
      ? stateFeatures.find((f) => ufByCode.get(f.properties.codarea)?.sigla === focusUf)
      : undefined;
    const collection = target
      ? { type: "FeatureCollection" as const, features: [target] }
      : { type: "FeatureCollection" as const, features: stateFeatures };
    if (!collection.features.length) return null;
    return geoIdentity()
      .reflectY(true)
      .fitExtent(
      [
        [24, 24],
        [W - 24, H - 24],
      ],
      collection as never,
    );
  }, [stateFeatures, focusUf]);

  const path = useMemo(() => (projection ? geoPath(projection) : null), [projection]);

  // reset zoom/pan when the framing changes
  useEffect(() => {
    setView({ k: 1, x: 0, y: 0 });
  }, [focusUf]);

  // wheel zoom towards the cursor (non-passive listener)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * W;
      const py = ((e.clientY - rect.top) / rect.height) * H;
      setView((v) => {
        const k = Math.min(MAX_K, Math.max(MIN_K, v.k * Math.pow(2, -e.deltaY / 400)));
        if (k === v.k) return v;
        const x = px - ((px - v.x) / v.k) * k;
        const y = py - ((py - v.y) / v.k) * k;
        return clampView({ k, x, y });
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const visibleMunis = useMemo(() => {
    if (!path) return [];
    return muniFeatures.filter((f) => {
      const uf = ufOfMunicipio(f.properties.codarea);
      if (focusUf) return uf === focusUf;
      return paint.has(f.properties.codarea) || selectedSet.has(f.properties.codarea);
    });
  }, [muniFeatures, focusUf, paint, path, selectedSet]);

  const pinPoints = useMemo(() => {
    if (!projection) return [];
    const byCode = new Map(muniFeatures.map((f) => [f.properties.codarea, f]));
    return pins
      .filter((p) => (focusUf ? ufOfMunicipio(p.municipioId) === focusUf : true))
      .map((p) => {
        const f = byCode.get(p.municipioId);
        if (!f) return null;
        const xy = projection(centroidOf(f));
        if (!xy) return null;
        return { ...p, x: xy[0], y: xy[1] };
      })
      .filter(Boolean) as (Pin & { x: number; y: number })[];
  }, [pins, muniFeatures, projection, focusUf]);

  const loading = states.isLoading || meshes.some((m) => m.isLoading);

  function moveTip(e: React.MouseEvent, text: string, sub?: string) {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, text, sub });
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
    setPanning(true);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const dx = ((e.clientX - d.x) / rect.width) * W;
    const dy = ((e.clientY - d.y) / rect.height) * H;
    if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 3) d.moved = true;
    setView((v) => clampView({ k: v.k, x: d.vx + dx, y: d.vy + dy }));
  }

  function endPan(e: React.PointerEvent) {
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    setPanning(false);
    // keep "moved" for the click handler that fires right after
    setTimeout(() => (drag.current = null), 0);
  }

  const dragged = () => drag.current?.moved === true;
  const sw = (n: number) => n / view.k;

  return (
    <div ref={boxRef} className="relative h-full w-full overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-full w-full touch-none"
        style={{ cursor: panning ? "grabbing" : "grab" }}
        role="img"
        aria-label="Mapa do Brasil"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        <rect width={W} height={H} className="fill-map-water" />
        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
        {path &&
          stateFeatures.map((f) => {
            const uf = ufByCode.get(f.properties.codarea);
            const isFocus = uf?.sigla === focusUf;
            if (focusUf && !isFocus) return null;
            return (
              <path
                key={f.properties.codarea}
                d={path(f as never) ?? ""}
                className="cursor-pointer fill-map-land stroke-map-boundary transition-colors hover:fill-map-land-hover"
                strokeWidth={sw(1.4)}
                strokeOpacity={1}
                onMouseMove={(e) => moveTip(e, uf?.nome ?? "", focusUf ? undefined : "Clique para ampliar")}
                onMouseLeave={() => setHover(null)}
                onClick={() => {
                  if (dragged()) return;
                  if (uf) onFocusUf(isFocus ? null : uf.sigla);
                }}
              />
            );
          })}

        {path &&
          visibleMunis.map((f) => {
            const code = f.properties.codarea;
            const p = paint.get(code);
            const owner = p ?? owners?.get(code);
            const isHover = hoverMuni === code;
            const isSel = selectable && selectedSet.has(code);
            // no macro view (Brasil) os municípios são apenas visuais:
            // hover/clique continuam pertencendo ao estado
            const interactive = selectable || !!focusUf;
            const fill = isSel
              ? "var(--primary)"
              : p
                ? p.color
                : isHover
                  ? "var(--map-land-hover)"
                  : "transparent";
            const fillOpacity = isSel
              ? isHover
                ? 0.95
                : 0.75
              : p
                ? isHover
                  ? 0.95
                  : 0.7
                : isHover
                  ? 1
                  : 0;
            return (
              <path
                key={code}
                d={path(f as never) ?? ""}
                fill={fill}
                fillOpacity={fillOpacity}
                className="stroke-map-boundary"
                strokeWidth={sw(isHover ? 2 : 1.2)}
                strokeOpacity={1}
                strokeLinejoin="round"
                style={{
                  cursor: selectable || owner ? "pointer" : "inherit",
                  pointerEvents: interactive ? "auto" : "none",
                }}
                onMouseMove={(e) => {
                  setHoverMuni(code);
                  moveTip(
                    e,
                    nomes.get(code) ?? `Município ${code}`,
                    selectable
                      ? isSel
                        ? "Clique para remover"
                        : "Clique para adicionar"
                      : owner?.parceiroNome,
                  );
                }}
                onMouseLeave={() => {
                  setHoverMuni((c) => (c === code ? null : c));
                  setHover(null);
                }}
                onClick={(e) => {
                  if (dragged()) return;
                  if (selectable) {
                    e.stopPropagation();
                    onToggleMunicipio?.(code);
                    return;
                  }
                  if (!owner) return;
                  e.stopPropagation();
                  onSelectRegion(owner.parceiroId, code);
                }}
              />
            );
          })}


        {pinPoints.map((p) => (
          <g
            key={p.kind + p.id}
            transform={`translate(${p.x},${p.y}) scale(${1 / view.k})`}
            onMouseMove={(e) => moveTip(e, p.label, p.sub)}
            onMouseLeave={() => setHover(null)}
            className="cursor-pointer"
          >
            <path
              d="M0,0 C-7,-9 -9,-12 -9,-16 A9,9 0 1 1 9,-16 C9,-12 7,-9 0,0 Z"
              className={p.kind === "instalador" ? "fill-pin-install" : "fill-pin-sale"}
              stroke="white"
              strokeWidth={1.2}
            />
            <circle cy={-16} r={3.2} fill="white" />
          </g>
        ))}
        </g>
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[130%] rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: hover.x, top: hover.y }}
        >
          <div className="font-semibold text-popover-foreground">{hover.text}</div>
          {hover.sub && <div className="text-muted-foreground">{hover.sub}</div>}
        </div>
      )}

      {loading && (
        <div className="absolute left-4 top-4 rounded-xl border border-border/60 bg-card/90 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-md">
          Carregando malha do IBGE…
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
        <ZoomBtn label="Aproximar" onClick={() => setView((v) => zoomBy(v, 1.6))}>
          +
        </ZoomBtn>
        <ZoomBtn label="Afastar" onClick={() => setView((v) => zoomBy(v, 1 / 1.6))}>
          −
        </ZoomBtn>
        {view.k > 1 && (
          <button
            onClick={() => setView({ k: 1, x: 0, y: 0 })}
            className="rounded-xl border border-border/60 bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-md transition-all duration-200 hover:bg-secondary"
          >
            Redefinir zoom
          </button>
        )}
      </div>

      {focusUf && (
        <button
          onClick={() => onFocusUf(null)}
          className="absolute right-4 top-4 rounded-xl border border-border/60 bg-card/90 px-3.5 py-2 text-xs font-semibold text-foreground shadow-md backdrop-blur-md transition-all duration-200 hover:bg-secondary"
        >
          ← Voltar ao Brasil
        </button>
      )}
    </div>
  );
}

type View = { k: number; x: number; y: number };

function clampView(v: View): View {
  const k = Math.min(MAX_K, Math.max(MIN_K, v.k));
  const maxX = 0;
  const minX = W - W * k;
  const maxY = 0;
  const minY = H - H * k;
  return {
    k,
    x: Math.min(maxX, Math.max(minX, v.x)),
    y: Math.min(maxY, Math.max(minY, v.y)),
  };
}

function zoomBy(v: View, f: number): View {
  const k = Math.min(MAX_K, Math.max(MIN_K, v.k * f));
  const cx = W / 2;
  const cy = H / 2;
  return clampView({ k, x: cx - ((cx - v.x) / v.k) * k, y: cy - ((cy - v.y) / v.k) * k });
}

function ZoomBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-xl border border-border/60 bg-card text-base font-bold leading-none text-foreground shadow-md transition-all duration-200 hover:bg-secondary active:scale-95"
    >
      {children}
    </button>
  );
}
```


---

## 13.3 Páginas

### `src/routes/index.tsx`

```tsx
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MapaBrasil, type PaintEntry, type Pin } from "@/components/MapaBrasil";
import { ufOfMunicipio } from "@/lib/ibge";
import { CANAIS, colorOf, hydrate, useDb, type Cadastro, type PerfilTipo } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mapa de Atuação | GeoCanal Geomarketing" },
      {
        name: "description",
        content:
          "Mapa interativo com áreas de atuação de concessionárias e representantes, pontos de instalação e vendas realizadas por município.",
      },
      { property: "og:title", content: "Mapa de Atuação | GeoCanal Geomarketing" },
      {
        property: "og:description",
        content:
          "Mapa interativo com áreas de atuação de concessionárias e representantes, pontos de instalação e vendas realizadas por município.",
      },
    ],
  }),
  component: MapaPage,
});

const money = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function MapaPage() {
  useEffect(() => hydrate(), []);
  const db = useDb();

  const [canal, setCanal] = useState<PerfilTipo>("concessionaria");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [verInstaladores, setVerInstaladores] = useState(false);
  const [verVendas, setVerVendas] = useState(false);
  const [periodo, setPeriodo] = useState("todos");
  const [focusUf, setFocusUf] = useState<string | null>(null);
  const [regiao, setRegiao] = useState<{ parceiroId: string; municipioId: string } | null>(null);

  const parceiros = useMemo(
    () => db.cadastros.filter((c) => c.tipo === canal),
    [db.cadastros, canal],
  );

  const base = useMemo(
    () => (selecionados.length ? parceiros.filter((p) => selecionados.includes(p.id)) : parceiros),
    [parceiros, selecionados],
  );

  const ativos = useMemo(
    () => (regiao ? base.filter((p) => p.id === regiao.parceiroId) : base),
    [base, regiao],
  );

  const cores = useMemo(() => {
    const m = new Map<string, string>();
    parceiros.forEach((p, i) => m.set(p.id, colorOf(i)));
    return m;
  }, [parceiros]);

  const buildPaint = (lista: Cadastro[]) => {
    const m = new Map<string, PaintEntry>();
    lista.forEach((p) => {
      p.municipios.forEach((code) =>
        m.set(code, {
          color: cores.get(p.id) ?? colorOf(0),
          parceiroId: p.id,
          parceiroNome: p.nome,
        }),
      );
    });
    return m;
  };

  // todas as áreas continuam pintadas/clicáveis: clicar num município de outro
  // parceiro troca o foco para o dono daquele município
  const paint = useMemo(() => buildPaint(base), [base, cores]);
  // área do parceiro em foco (usada para pins e listas)
  const paintFoco = useMemo(() => buildPaint(ativos), [ativos, cores]);
  // donos de todos os municípios do canal (resolve o clique fora da região em foco)
  const owners = useMemo(() => buildPaint(parceiros), [parceiros, cores]);

  const parceirosVisiveis = useMemo(
    () =>
      focusUf
        ? parceiros.filter((p) => p.municipios.some((c) => ufOfMunicipio(c) === focusUf))
        : parceiros,
    [parceiros, focusUf],
  );

  const instaladoresVisiveis = useMemo(
    () =>
      db.cadastros.filter((c) => c.tipo === "instalador" && paintFoco.has(c.municipioId)),
    [db.cadastros, paintFoco],
  );

  const periodos = useMemo(
    () => [...new Set(db.vendas.map((v) => v.periodo))].sort().reverse(),
    [db.vendas],
  );

  const vendasVisiveis = useMemo(
    () =>
      db.vendas.filter(
        (v) => paintFoco.has(v.municipioId) && (periodo === "todos" || v.periodo === periodo),
      ),
    [db.vendas, paintFoco, periodo],
  );

  const pins: Pin[] = useMemo(() => {
    const out: Pin[] = [];
    if (verInstaladores)
      instaladoresVisiveis.forEach((i) =>
        out.push({
          id: i.id,
          label: i.nome,
          sub: `${i.endereco} — ${i.municipioNome}/${i.uf}`,
          municipioId: i.municipioId,
          kind: "instalador",
        }),
      );
    if (verVendas)
      vendasVisiveis.forEach((v) =>
        out.push({
          id: v.id,
          label: v.cliente,
          sub: `${v.municipioNome}/${v.uf} — ${money(v.valor)} (${v.periodo})`,
          municipioId: v.municipioId,
          kind: "venda",
        }),
      );
    return out;
  }, [verInstaladores, verVendas, instaladoresVisiveis, vendasVisiveis]);

  const extraUfs = useMemo(() => {
    const s = new Set<string>();
    paint.forEach((_v, code) => s.add(ufOfMunicipio(code)));
    pins.forEach((p) => s.add(ufOfMunicipio(p.municipioId)));
    return [...s].filter(Boolean);
  }, [paint, pins]);

  const legenda = useMemo(
    () =>
      ativos.filter((p) =>
        focusUf ? p.municipios.some((c) => ufOfMunicipio(c) === focusUf) : true,
      ),
    [ativos, focusUf],
  );

  const parceiroFoco = regiao ? db.cadastros.find((c) => c.id === regiao.parceiroId) : null;

  function toggleParceiro(id: string) {
    setRegiao(null);
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[1800px] gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_368px]">
      <section className="min-h-[420px] overflow-hidden rounded-2xl border border-border bg-card shadow-md lg:h-[calc(100vh-9rem)]">
        <MapaBrasil
          focusUf={focusUf}
          onFocusUf={(uf) => {
            setFocusUf(uf);
            if (!uf) setRegiao(null);
          }}
          paint={regiao ? paintFoco : paint}
          owners={owners}
          pins={pins}
          extraUfs={extraUfs}
          onSelectRegion={(parceiroId, municipioId) => {
            setRegiao({ parceiroId, municipioId });
            const uf = ufOfMunicipio(municipioId);
            if (uf) setFocusUf(uf);
          }}
        />
      </section>

      <aside className="flex flex-col gap-4 lg:h-[calc(100vh-9rem)] lg:overflow-y-auto lg:pr-1">
        <Painel titulo="1. Tipo de canal">
          <div className="grid gap-2">
            {CANAIS.map((c) => (
              <button
                key={c.value}
                onClick={() => {
                  setCanal(c.value);
                  setSelecionados([]);
                  setRegiao(null);
                }}
                className={`rounded-xl border px-3.5 py-2.5 text-left text-sm font-semibold transition-all duration-200 ${
                  canal === c.value
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-secondary"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </Painel>


        <Painel titulo="2. Seleção específica">
          <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--primary)]"
              checked={selecionados.length === 0}
              onChange={() => {
                setSelecionados([]);
                setRegiao(null);
              }}
            />
            Todos ({parceirosVisiveis.length}){focusUf ? ` em ${focusUf}` : ""}
          </label>
          <div className="grid gap-1">
            {parceirosVisiveis.map((p) => (
              <label
                key={p.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors duration-200 hover:bg-secondary"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--primary)]"
                  checked={selecionados.includes(p.id)}
                  onChange={() => toggleParceiro(p.id)}
                />
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: cores.get(p.id) }}
                />
                <span className="min-w-0 truncate">{p.nome}</span>
              </label>
            ))}
            {!parceirosVisiveis.length && (
              <p className="text-sm text-muted-foreground">
                Nenhum parceiro {focusUf ? `com atuação em ${focusUf}` : "cadastrado neste canal"}.
              </p>
            )}
          </div>
        </Painel>

        <Painel titulo="3. Camadas extras">
          <label className="flex cursor-pointer items-center gap-2 py-1 text-sm font-medium">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--primary)]"
              checked={verInstaladores}
              onChange={(e) => setVerInstaladores(e.target.checked)}
            />
            <span className="h-3 w-3 rounded-full bg-pin-install" />
            Mostrar pontos de instalação
          </label>
          <label className="flex cursor-pointer items-center gap-2 py-1 text-sm font-medium">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--primary)]"
              checked={verVendas}
              onChange={(e) => setVerVendas(e.target.checked)}
            />
            <span className="h-3 w-3 rounded-full bg-pin-sale" />
            Mostrar vendas realizadas
          </label>
          {verVendas && (
            <div className="mt-2">
              <label className="text-xs font-semibold text-muted-foreground">Período</label>
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-card px-2.5 py-2 text-sm focus:border-ring focus:outline-none"
              >
                <option value="todos">Todos os períodos</option>
                {periodos.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-muted-foreground">
                {vendasVisiveis.length} venda(s) —{" "}
                {money(vendasVisiveis.reduce((s, v) => s + v.valor, 0))}
              </p>
            </div>
          )}
        </Painel>

        <Painel titulo="Legenda dinâmica">
          {legenda.length ? (
            <ul className="grid gap-1.5">
              {legenda.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: cores.get(p.id) }}
                  />
                  <span className="min-w-0 truncate">{p.nome}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {p.municipios.length} mun.
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma área ativa {focusUf ? `em ${focusUf}` : ""}.
            </p>
          )}
        </Painel>

        {parceiroFoco && (
          <Painel
            titulo={`Instaladores — ${parceiroFoco.nome}`}
            acao={
              <button
                onClick={() => setRegiao(null)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                limpar foco
              </button>
            }
          >
            <ListaInstaladores
              itens={db.cadastros.filter(
                (c) => c.tipo === "instalador" && parceiroFoco.municipios.includes(c.municipioId),
              )}
            />
          </Painel>
        )}

        {!parceiroFoco && verInstaladores && (
          <Painel titulo={`Instaladores na seleção (${instaladoresVisiveis.length})`}>
            <ListaInstaladores itens={instaladoresVisiveis} />
          </Painel>
        )}
      </aside>
    </div>
  );
}

function Painel({
  titulo,
  acao,
  children,
}: {
  titulo: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
          {titulo}
        </h2>
        {acao}
      </div>
      {children}
    </div>
  );
}

function ListaInstaladores({ itens }: { itens: Cadastro[] }) {
  if (!itens.length)
    return <p className="text-sm text-muted-foreground">Nenhum instalador nesta área.</p>;
  return (
    <ul className="grid gap-2">
      {itens.map((i) => (
        <li
          key={i.id}
          className="rounded-xl border border-border bg-secondary/50 p-3 transition-colors duration-200 hover:bg-secondary"
        >
          <p className="text-sm font-semibold text-foreground">{i.nome}</p>
          <p className="text-xs text-muted-foreground">{i.endereco}</p>
          <p className="text-xs text-muted-foreground">
            {i.municipioNome}/{i.uf} — {i.contato}
          </p>
        </li>
      ))}
    </ul>
  );
}
```

### `src/routes/cadastros.tsx`

```tsx
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { municipioListQuery, UFS, ufOfMunicipio } from "@/lib/ibge";
import { MapaBrasil } from "@/components/MapaBrasil";
import {
  novoId,
  hydrate,
  store,
  colorOf,
  tipoLabel,
  TIPOS,
  useDb,
  type Cadastro,
  type PerfilTipo,
} from "@/lib/store";
import type { PaintEntry } from "@/components/MapaBrasil";


export const Route = createFileRoute("/cadastros")({
  head: () => ({
    meta: [
      { title: "Cadastros Unificados | GeoCanal" },
      {
        name: "description",
        content:
          "Cadastre clientes, concessionárias, representantes, vendedores e instaladores e gerencie os municípios de atuação de cada parceiro.",
      },
      { property: "og:title", content: "Cadastros Unificados | GeoCanal" },
      {
        property: "og:description",
        content:
          "Painel único de cadastro com seletor de perfil e gestão de municípios de atuação em cascata.",
      },
    ],
  }),
  component: CadastrosPage,
});

const vazio = (): Cadastro => ({
  id: "",
  tipo: "concessionaria",
  nome: "",
  documento: "",
  contato: "",
  email: "",
  endereco: "",
  uf: "RS",
  municipioId: "",
  municipioNome: "",
  municipios: [],
});

const temArea = (t: PerfilTipo) =>
  t === "concessionaria" || t === "rep_rodoviario" || t === "rep_agricola";

function CadastrosPage() {
  useEffect(() => hydrate(), []);
  const db = useDb();
  const [form, setForm] = useState<Cadastro>(vazio);
  const [filtroTipo, setFiltroTipo] = useState<"todos" | PerfilTipo>("todos");

  // cascade selector state
  const [ufSel, setUfSel] = useState("RS");
  const [busca, setBusca] = useState("");
  const [munSel, setMunSel] = useState("");
  const [mapUf, setMapUf] = useState<string | null>("RS");

  const listaBase = useQuery(municipioListQuery(form.uf));
  const listaAtuacao = useQuery(municipioListQuery(ufSel));

  const nomesAtuacao = useMemo(() => {
    const m = new Map<string, string>();
    listaAtuacao.data?.forEach((x) => m.set(String(x.id), x.nome));
    listaBase.data?.forEach((x) => m.set(String(x.id), x.nome));
    return m;
  }, [listaAtuacao.data, listaBase.data]);

  const opcoes = useMemo(() => {
    const q = busca.trim().toLocaleLowerCase("pt-BR");
    return (listaAtuacao.data ?? [])
      .filter((m) => !form.municipios.includes(String(m.id)))
      .filter((m) => (q ? m.nome.toLocaleLowerCase("pt-BR").startsWith(q) : true))
      .slice(0, 300);
  }, [listaAtuacao.data, busca, form.municipios]);

  const registros = useMemo(() => {
    const porTipo =
      filtroTipo === "todos" ? db.cadastros : db.cadastros.filter((c) => c.tipo === filtroTipo);
    if (!mapUf) return porTipo;
    return porTipo.filter(
      (c) => c.uf === mapUf || c.municipios.some((code) => ufOfMunicipio(code) === mapUf),
    );
  }, [db.cadastros, filtroTipo, mapUf]);


  /** parceiros do mesmo tipo (para cor, legenda e checagem de conflito) */
  const pares = useMemo(
    () => db.cadastros.filter((c) => c.tipo === form.tipo && temArea(c.tipo)),
    [db.cadastros, form.tipo],
  );

  const cores = useMemo(() => {
    const m = new Map<string, string>();
    pares.forEach((c, i) => m.set(c.id, colorOf(i)));
    return m;
  }, [pares]);

  /** municípios já ocupados por OUTRO parceiro do mesmo tipo */
  const donoPorMunicipio = useMemo(() => {
    const m = new Map<string, Cadastro>();
    pares.forEach((c) => {
      if (c.id === form.id) return;
      c.municipios.forEach((code) => m.set(code, c));
    });
    return m;
  }, [pares, form.id]);

  const paint = useMemo(() => {
    const m = new Map<string, PaintEntry>();
    pares.forEach((c) => {
      if (c.id === form.id) return;
      const color = cores.get(c.id) ?? colorOf(0);
      c.municipios.forEach((code) =>
        m.set(code, { color, parceiroId: c.id, parceiroNome: c.nome }),
      );
    });
    return m;
  }, [pares, cores, form.id]);

  function set<K extends keyof Cadastro>(k: K, v: Cadastro[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  /** retorna true se pode adicionar (fazendo a transferência quando confirmado) */
  function resolverConflito(code: string) {
    const dono = donoPorMunicipio.get(code);
    if (!dono) return true;
    const nome = nomesAtuacao.get(code) ?? code;
    const ok = window.confirm(
      `O município ${nome} já pertence a ${dono.nome}.\n\nDeseja transferir para ${form.nome || "este cadastro"}?`,
    );
    if (!ok) return false;
    store.save({ ...dono, municipios: dono.municipios.filter((c) => c !== code) });
    return true;
  }

  function alternarMunicipio(code: string) {
    if (form.municipios.includes(code)) {
      setForm((f) => ({ ...f, municipios: f.municipios.filter((c) => c !== code) }));
      return;
    }
    if (!resolverConflito(code)) return;
    setForm((f) => ({ ...f, municipios: [...f.municipios, code] }));
  }

  function adicionarMunicipio() {
    if (!munSel) return;
    if (form.municipios.includes(munSel)) return;
    if (!resolverConflito(munSel)) return;
    setForm((f) => ({ ...f, municipios: [...f.municipios, munSel] }));
    setMunSel("");
  }


  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    const base = listaBase.data?.find((m) => String(m.id) === form.municipioId);
    store.save({
      ...form,
      id: form.id || novoId(),
      municipioNome: base?.nome ?? form.municipioNome,
      municipios: temArea(form.tipo) ? form.municipios : [],
    });
    setForm(vazio());
  }

  function editar(c: Cadastro) {
    setForm(c);
    setUfSel(c.uf);
    setMapUf(c.uf);
    setBusca("");
    setMunSel("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mx-auto grid w-full max-w-[1800px] gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
      <form
        onSubmit={salvar}
        className="h-fit rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <h1 className="font-display text-xl font-bold text-foreground">
          {form.id ? "Editar cadastro" : "Novo cadastro"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Painel unificado para todos os perfis da operação.
        </p>

        <Campo label="Tipo de perfil">
          <select
            value={form.tipo}
            onChange={(e) => set("tipo", e.target.value as PerfilTipo)}
            className="input"
            required
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Campo>

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Nome / Razão social">
            <input
              className="input"
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              required
            />
          </Campo>
          <Campo label="CNPJ / CPF">
            <input
              className="input"
              value={form.documento}
              onChange={(e) => set("documento", e.target.value)}
            />
          </Campo>
          <Campo label="Contato">
            <input
              className="input"
              value={form.contato}
              onChange={(e) => set("contato", e.target.value)}
            />
          </Campo>
          <Campo label="E-mail">
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Campo>
        </div>

        <Campo label="Endereço">
          <input
            className="input"
            value={form.endereco}
            onChange={(e) => set("endereco", e.target.value)}
          />
        </Campo>

        <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
          <Campo label="Estado">
            <select
              className="input"
              value={form.uf}
              onChange={(e) => {
                set("uf", e.target.value);
                set("municipioId", "");
              }}
            >
              {UFS.map((u) => (
                <option key={u.sigla} value={u.sigla}>
                  {u.sigla}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Cidade">
            <select
              className="input"
              value={form.municipioId}
              onChange={(e) => set("municipioId", e.target.value)}
              required
            >
              <option value="">
                {listaBase.isLoading ? "Carregando…" : "Selecione a cidade"}
              </option>
              {listaBase.data?.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {m.nome}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        {temArea(form.tipo) && (
          <div className="mt-5 rounded-2xl border border-border bg-secondary/40 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
              Municípios de atuação
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-[110px_minmax(0,1fr)]">
              <Campo label="Estado">
                <select
                  className="input"
                  value={ufSel}
                  onChange={(e) => {
                    setUfSel(e.target.value);
                    setMapUf(e.target.value);
                    setMunSel("");
                    setBusca("");
                  }}
                >
                  {UFS.map((u) => (
                    <option key={u.sigla} value={u.sigla}>
                      {u.sigla}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Buscar município (digite as primeiras letras)">
                <input
                  className="input"
                  placeholder="Ex.: San…"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </Campo>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <select
                className="input"
                size={1}
                value={munSel}
                onChange={(e) => setMunSel(e.target.value)}
              >
                <option value="">
                  {listaAtuacao.isLoading ? "Carregando municípios…" : `Municípios de ${ufSel}`}
                </option>
                {opcoes.map((m) => (
                  <option key={m.id} value={String(m.id)}>
                    {m.nome}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={adicionarMunicipio}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90"
              >
                Adicionar
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {form.municipios.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum município na cesta ainda.</p>
              )}
              {form.municipios.map((code) => (
                <span
                  key={code}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold text-secondary-foreground"
                >
                  {nomesAtuacao.get(code) ?? code}
                  <span className="text-muted-foreground">{ufOfMunicipio(code)}</span>
                  <button
                    type="button"
                    aria-label="Remover município"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        municipios: f.municipios.filter((c) => c !== code),
                      }))
                    }
                    className="text-destructive"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90"
          >
            {form.id ? "Salvar alterações" : "Cadastrar"}
          </button>
          {form.id && (
            <button
              type="button"
              onClick={() => setForm(vazio())}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-secondary"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="grid gap-4">
        {temArea(form.tipo) && (
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold">
                Selecionar municípios no mapa
                {form.nome ? <span className="text-muted-foreground"> · {form.nome}</span> : null}
              </h2>
              <span className="text-xs text-muted-foreground">
                {form.municipios.length} selecionado(s) · clique para adicionar/remover
              </span>
            </div>
            <div className="mt-4 h-[520px] overflow-hidden rounded-2xl border border-border shadow-sm">
              <MapaBrasil
                focusUf={mapUf}
                onFocusUf={(uf) => {
                  setMapUf(uf);
                  if (uf) setUfSel(uf);
                }}
                paint={paint}
                pins={[]}
                onSelectRegion={() => {}}
                extraUfs={mapUf ? [mapUf] : []}
                selectable
                selected={form.municipios}
                onToggleMunicipio={alternarMunicipio}
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <span className="h-3 w-3 rounded-sm bg-primary" />
                {form.nome || "Cadastro atual"}
              </span>
              {pares
                .filter((c) => c.id !== form.id && c.municipios.length > 0)
                .map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <span
                      className="h-3 w-3 rounded-sm"
                      style={{ background: cores.get(c.id), opacity: 0.8 }}
                    />
                    {c.nome} ({c.municipios.length})
                  </span>
                ))}
            </div>
          </section>

        )}

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
          <h2 className="truncate font-display text-lg font-bold">
            Cadastros ({registros.length})
            <span className="ml-1 text-sm font-semibold text-muted-foreground">
              {mapUf ? `· ${mapUf}` : "· Brasil"}
            </span>
          </h2>

          <select
            className="input w-auto shrink-0"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as "todos" | PerfilTipo)}
          >
            <option value="todos">Todos os perfis</option>
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <ul className="mt-4 grid gap-2">
          {registros.map((c) => (
            <li
              key={c.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-secondary/40 p-3.5 transition-colors duration-200 hover:bg-secondary"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{c.nome}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {tipoLabel(c.tipo)} · {c.municipioNome}/{c.uf}
                  {temArea(c.tipo) ? ` · ${c.municipios.length} município(s) de atuação` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  onClick={() => editar(c)}
                  className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:bg-secondary"
                >
                  Editar
                </button>
                <button
                  onClick={() => store.remove(c.id)}
                  className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-destructive transition-all duration-200 hover:bg-destructive/10"
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
        </section>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-3 block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
```

### `src/routes/__root.tsx`

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "author", content: "GeoCanal" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Mapa de Atuação | GeoCanal Geomarketing" },
      { property: "og:title", content: "Mapa de Atuação | GeoCanal Geomarketing" },
      { name: "twitter:title", content: "Mapa de Atuação | GeoCanal Geomarketing" },
      { name: "description", content: "Mapa interativo com áreas de atuação de concessionárias e representantes, pontos de instalação e vendas realizadas por município." },
      { property: "og:description", content: "Mapa interativo com áreas de atuação de concessionárias e representantes, pontos de instalação e vendas realizadas por município." },
      { name: "twitter:description", content: "Mapa interativo com áreas de atuação de concessionárias e representantes, pontos de instalação e vendas realizadas por município." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1f5e7f8c-ef56-41fd-b0c2-b0d62c54df4c/id-preview-2e236361--f59cd1ed-7f98-4bef-8390-5a313064ca72.lovable.app-1785855183223.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1f5e7f8c-ef56-41fd-b0c2-b0d62c54df4c/id-preview-2e236361--f59cd1ed-7f98-4bef-8390-5a313064ca72.lovable.app-1785855183223.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=Barlow:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-card/80 backdrop-blur-md">
          <div className="mx-auto grid w-full max-w-[1800px] grid-cols-[minmax(0,1fr)_auto] items-center gap-6 px-5 py-3.5 sm:flex sm:justify-between sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary font-display text-sm font-extrabold text-primary-foreground shadow-sm">
                GC
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-base font-bold leading-none tracking-tight text-foreground">
                  GeoCanal
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  Geomarketing de canais e instaladores
                </p>
              </div>
            </div>
            <nav className="flex shrink-0 items-center gap-2">
              <Link
                to="/"
                activeOptions={{ exact: true }}
                className="rounded-xl px-4 py-2 text-sm font-semibold tracking-tight text-muted-foreground transition-all duration-200 hover:bg-secondary hover:text-foreground"
                activeProps={{
                  className: "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
                }}
              >
                Mapa
              </Link>
              <Link
                to="/cadastros"
                className="rounded-xl px-4 py-2 text-sm font-semibold tracking-tight text-muted-foreground transition-all duration-200 hover:bg-secondary hover:text-foreground"
                activeProps={{
                  className: "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
                }}
              >
                Cadastros
              </Link>
            </nav>
          </div>
        </header>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </QueryClientProvider>
  );
}
```

### `src/router.tsx`

```tsx
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
```

### `src/start.ts`

```ts
import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
```

### `src/server.ts`

```ts
import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
```


---

## 13.4 Estilos e configuração

### `src/styles.css`

```css
@import "tailwindcss" source(none);
@source "../src";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

/*
 * Design system definition.
 *
 * The @theme inline block maps CSS custom properties to Tailwind utility
 * classes (e.g. --color-primary -> bg-primary, text-primary).
 *
 * The :root and .dark blocks define the actual color values using oklch.
 * All colors MUST use oklch format.
 *
 * To add a new semantic color:
 * 1. Add the variable to :root (light value) and .dark (dark value)
 * 2. Register it in @theme inline as --color-<name>: var(--<name>)
 */

@theme inline {
  --font-sans: "Barlow", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Archivo", ui-sans-serif, system-ui, sans-serif;
  --color-map-water: var(--map-water);
  --color-map-land: var(--map-land);
  --color-map-land-hover: var(--map-land-hover);
  --color-map-line: var(--map-line);
  --color-map-line-soft: var(--map-line-soft);
  --color-map-boundary: var(--map-boundary);
  --color-pin-install: var(--pin-install);
  --color-pin-sale: var(--pin-sale);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);
  --radius-3xl: calc(var(--radius) + 12px);
  --radius-4xl: calc(var(--radius) + 16px);

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-ring-offset-background: var(--background);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

:root {
  --radius: 0.875rem;
  --background: oklch(0.984 0.003 247);
  --foreground: oklch(0.24 0.02 250);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.24 0.02 250);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.24 0.02 250);
  --primary: oklch(0.55 0.11 172);
  --primary-foreground: oklch(0.99 0.005 180);
  --secondary: oklch(0.965 0.006 250);
  --secondary-foreground: oklch(0.34 0.03 210);
  --muted: oklch(0.968 0.004 250);
  --muted-foreground: oklch(0.56 0.015 250);
  --accent: oklch(0.94 0.04 175);
  --accent-foreground: oklch(0.34 0.06 175);
  --destructive: oklch(0.58 0.19 25);
  --destructive-foreground: oklch(0.99 0.005 250);
  --border: oklch(0.935 0.004 250);
  --input: oklch(0.915 0.005 250);
  --ring: oklch(0.62 0.1 172);
  --map-water: oklch(0.978 0.006 230);
  --map-land: oklch(0.935 0.006 240);
  --map-land-hover: oklch(0.89 0.03 175);
  --map-line: oklch(0.35 0 0);
  --map-line-soft: oklch(0.8 0.02 160);
  --map-boundary: oklch(0.28 0.01 250);
  --pin-install: oklch(0.55 0.14 240);
  --pin-sale: oklch(0.63 0.19 45);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.984 0.003 247.858);
  --sidebar-foreground: oklch(0.129 0.042 264.695);
  --sidebar-primary: oklch(0.208 0.042 265.755);
  --sidebar-primary-foreground: oklch(0.984 0.003 247.858);
  --sidebar-accent: oklch(0.968 0.007 247.896);
  --sidebar-accent-foreground: oklch(0.208 0.042 265.755);
  --sidebar-border: oklch(0.929 0.013 255.508);
  --sidebar-ring: oklch(0.704 0.04 256.788);
}


.dark {
  --background: oklch(0.129 0.042 264.695);
  --foreground: oklch(0.984 0.003 247.858);
  --card: oklch(0.208 0.042 265.755);
  --card-foreground: oklch(0.984 0.003 247.858);
  --popover: oklch(0.208 0.042 265.755);
  --popover-foreground: oklch(0.984 0.003 247.858);
  --primary: oklch(0.929 0.013 255.508);
  --primary-foreground: oklch(0.208 0.042 265.755);
  --secondary: oklch(0.279 0.041 260.031);
  --secondary-foreground: oklch(0.984 0.003 247.858);
  --muted: oklch(0.279 0.041 260.031);
  --muted-foreground: oklch(0.704 0.04 256.788);
  --accent: oklch(0.279 0.041 260.031);
  --accent-foreground: oklch(0.984 0.003 247.858);
  --destructive: oklch(0.704 0.191 22.216);
  --destructive-foreground: oklch(0.984 0.003 247.858);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.551 0.027 264.364);
  --map-line: oklch(0.85 0.005 240);
  --map-boundary: oklch(0.92 0.005 240);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.208 0.042 265.755);
  --sidebar-foreground: oklch(0.984 0.003 247.858);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.984 0.003 247.858);
  --sidebar-accent: oklch(0.279 0.041 260.031);
  --sidebar-accent-foreground: oklch(0.984 0.003 247.858);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.551 0.027 264.364);
}

@layer base {
  * {
    border-color: var(--color-border);
  }

  body {
    background-color: var(--color-background);
    color: var(--color-foreground);
  }
}

@layer base {
  h1,
  h2,
  h3 {
    font-family: var(--font-display);
    letter-spacing: -0.015em;
  }
}

@utility input {
  width: 100%;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-input);
  background-color: var(--color-background);
  padding: 0.5rem 0.625rem;
  font-size: 0.875rem;
  color: var(--color-foreground);
  outline: none;

  &:focus {
    border-color: var(--color-ring);
    box-shadow: 0 0 0 2px color-mix(in oklch, var(--color-ring) 30%, transparent);
  }
}
```

### `vite.config.ts`

```ts
// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
```

### `package.json`

```json
{
  "name": "tanstack_start_ts",
  "private": true,
  "sideEffects": false,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "preview": "vite preview",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "dependencies": {
    "@hookform/resolvers": "^5.2.2",
    "@radix-ui/react-accordion": "^1.2.12",
    "@radix-ui/react-alert-dialog": "^1.1.15",
    "@radix-ui/react-aspect-ratio": "^1.1.8",
    "@radix-ui/react-avatar": "^1.1.11",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-collapsible": "^1.1.12",
    "@radix-ui/react-context-menu": "^2.2.16",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-hover-card": "^1.1.15",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-menubar": "^1.1.16",
    "@radix-ui/react-navigation-menu": "^1.2.14",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-progress": "^1.1.8",
    "@radix-ui/react-radio-group": "^1.3.8",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.8",
    "@radix-ui/react-slider": "^1.3.6",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-switch": "^1.2.6",
    "@radix-ui/react-tabs": "^1.1.13",
    "@radix-ui/react-toggle": "^1.1.10",
    "@radix-ui/react-toggle-group": "^1.1.11",
    "@radix-ui/react-tooltip": "^1.2.8",
    "@supabase/supabase-js": "^2.112.3",
    "@tailwindcss/vite": "^4.2.1",
    "@tanstack/react-query": "^5.101.1",
    "@tanstack/react-router": "^1.170.18",
    "@tanstack/react-start": "^1.168.32",
    "@tanstack/router-plugin": "^1.168.23",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "d3-geo": "^3.1.1",
    "date-fns": "^4.1.0",
    "embla-carousel-react": "^8.6.0",
    "input-otp": "^1.4.2",
    "lucide-react": "^0.575.0",
    "react": "^19.2.0",
    "react-day-picker": "^9.14.0",
    "react-dom": "^19.2.0",
    "react-hook-form": "^7.71.2",
    "react-resizable-panels": "^4.6.5",
    "recharts": "^2.15.4",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.5.0",
    "tailwindcss": "^4.2.1",
    "topojson-client": "^3.1.0",
    "tw-animate-css": "^1.3.4",
    "vaul": "^1.1.2",
    "vite-tsconfig-paths": "^6.0.2",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@eslint/js": "^9.32.0",
    "@lovable.dev/vite-tanstack-config": "2.13.1",
    "@types/d3-geo": "^3.1.0",
    "@types/node": "^22.16.5",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^5.2.0",
    "eslint": "^9.32.0",
    "eslint-config-prettier": "^10.1.1",
    "eslint-plugin-prettier": "^5.2.6",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.20",
    "globals": "^15.15.0",
    "nitro": "3.0.260603-beta",
    "prettier": "^3.7.3",
    "typescript": "^5.8.3",
    "typescript-eslint": "^8.56.1",
    "vite": "^8.1.5"
  }
}
```

### `tsconfig.json`

```json
{
  "include": ["src/**/*.ts", "src/**/*.tsx", "vite.config.ts", "eslint.config.js"],
  "compilerOptions": {
    "target": "ES2022",
    "jsx": "react-jsx",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],

    /* Bundler mode */
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": false,
    "noEmit": true,

    /* Linting */
    "skipLibCheck": true,
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```


---

## 13.5 Banco de dados (migrações)

### `supabase/migrations/20260824165436_124337a6-39b4-4fdf-9e3a-52ae617d6250.sql`

```sql
CREATE TABLE public.cadastros (
  id text PRIMARY KEY,
  tipo text NOT NULL,
  nome text NOT NULL DEFAULT '',
  documento text NOT NULL DEFAULT '',
  contato text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  endereco text NOT NULL DEFAULT '',
  uf text NOT NULL DEFAULT '',
  municipio_id text NOT NULL DEFAULT '',
  municipio_nome text NOT NULL DEFAULT '',
  municipios text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.vendas (
  id text PRIMARY KEY,
  cliente text NOT NULL DEFAULT '',
  municipio_id text NOT NULL DEFAULT '',
  municipio_nome text NOT NULL DEFAULT '',
  uf text NOT NULL DEFAULT '',
  periodo text NOT NULL DEFAULT '',
  valor numeric NOT NULL DEFAULT 0,
  parceiro_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cadastros TO anon, authenticated;
GRANT ALL ON public.cadastros TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendas TO anon, authenticated;
GRANT ALL ON public.vendas TO service_role;

ALTER TABLE public.cadastros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cadastros_public_all" ON public.cadastros FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "vendas_public_all" ON public.vendas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
```


---

## 14. Código completo — módulo isolado src/components/mapa/

### `src/components/mapa/MapFilters.tsx`

```tsx
import type { CanalMapa, ParceiroMapa } from "./types";
import { money } from "./utils";

export function Painel({
  titulo,
  acao,
  children,
}: {
  titulo: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
          {titulo}
        </h2>
        {acao}
      </div>
      {children}
    </div>
  );
}

export function MapFilters({
  canais,
  canal,
  onCanal,
  parceirosVisiveis,
  cores,
  selecionados,
  onToggleParceiro,
  onLimparSelecao,
  focusUf,
  verInstaladores,
  onVerInstaladores,
  verVendas,
  onVerVendas,
  periodos,
  periodo,
  onPeriodo,
  totalVendas,
  somaVendas,
}: {
  canais: CanalMapa[];
  canal: string;
  onCanal: (value: string) => void;
  parceirosVisiveis: ParceiroMapa[];
  cores: Map<string, string>;
  selecionados: string[];
  onToggleParceiro: (id: string) => void;
  onLimparSelecao: () => void;
  focusUf: string | null;
  verInstaladores: boolean;
  onVerInstaladores: (v: boolean) => void;
  verVendas: boolean;
  onVerVendas: (v: boolean) => void;
  periodos: string[];
  periodo: string;
  onPeriodo: (v: string) => void;
  totalVendas: number;
  somaVendas: number;
}) {
  return (
    <>
      {canais.length > 1 && (
        <Painel titulo="1. Tipo de canal">
          <div className="grid gap-2">
            {canais.map((c) => (
              <button
                key={c.value}
                onClick={() => onCanal(c.value)}
                className={`rounded-xl border px-3.5 py-2.5 text-left text-sm font-semibold transition-all duration-200 ${
                  canal === c.value
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-secondary"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </Painel>
      )}

      <Painel titulo="2. Seleção específica">
        <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--primary)]"
            checked={selecionados.length === 0}
            onChange={onLimparSelecao}
          />
          Todos ({parceirosVisiveis.length}){focusUf ? ` em ${focusUf}` : ""}
        </label>
        <div className="grid gap-1">
          {parceirosVisiveis.map((p) => (
            <label
              key={p.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors duration-200 hover:bg-secondary"
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--primary)]"
                checked={selecionados.includes(p.id)}
                onChange={() => onToggleParceiro(p.id)}
              />
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: cores.get(p.id) }}
              />
              <span className="min-w-0 truncate">{p.nome}</span>
            </label>
          ))}
          {!parceirosVisiveis.length && (
            <p className="text-sm text-muted-foreground">
              Nenhum parceiro {focusUf ? `com atuação em ${focusUf}` : "cadastrado neste canal"}.
            </p>
          )}
        </div>
      </Painel>

      <Painel titulo="3. Camadas extras">
        <label className="flex cursor-pointer items-center gap-2 py-1 text-sm font-medium">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--primary)]"
            checked={verInstaladores}
            onChange={(e) => onVerInstaladores(e.target.checked)}
          />
          <span className="h-3 w-3 rounded-full bg-pin-install" />
          Mostrar pontos de instalação
        </label>
        <label className="flex cursor-pointer items-center gap-2 py-1 text-sm font-medium">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--primary)]"
            checked={verVendas}
            onChange={(e) => onVerVendas(e.target.checked)}
          />
          <span className="h-3 w-3 rounded-full bg-pin-sale" />
          Mostrar vendas realizadas
        </label>
        {verVendas && (
          <div className="mt-2">
            <label className="text-xs font-semibold text-muted-foreground">Período</label>
            <select
              value={periodo}
              onChange={(e) => onPeriodo(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-card px-2.5 py-2 text-sm focus:border-ring focus:outline-none"
            >
              <option value="todos">Todos os períodos</option>
              {periodos.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-muted-foreground">
              {totalVendas} venda(s) — {money(somaVendas)}
            </p>
          </div>
        )}
      </Painel>
    </>
  );
}
```

### `src/components/mapa/MapLegend.tsx`

```tsx
import { Painel } from "./MapFilters";
import type { ParceiroMapa } from "./types";

export function MapLegend({
  itens,
  cores,
  focusUf,
  areaDe,
}: {
  itens: ParceiroMapa[];
  cores: Map<string, string>;
  focusUf: string | null;
  /** quantidade de municípios do parceiro (já resolvidos) */
  areaDe: (id: string) => number;
}) {
  return (
    <Painel titulo="Legenda dinâmica">
      {itens.length ? (
        <ul className="grid gap-1.5">
          {itens.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              <span
                className="h-3.5 w-3.5 shrink-0 rounded-sm"
                style={{ backgroundColor: cores.get(p.id) }}
              />
              <span className="min-w-0 truncate">{p.nome}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {areaDe(p.id)} mun.
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhuma área ativa {focusUf ? `em ${focusUf}` : ""}.
        </p>
      )}
    </Painel>
  );
}
```

### `src/components/mapa/MapMarker.tsx`

```tsx
import type { Pin } from "./types";

/** Pin (gota) renderizado sobre o mapa, com escala inversa ao zoom. */
export function MapMarker({
  pin,
  x,
  y,
  k,
  onHover,
  onLeave,
}: {
  pin: Pin;
  x: number;
  y: number;
  k: number;
  onHover: (e: React.MouseEvent, text: string, sub?: string) => void;
  onLeave: () => void;
}) {
  return (
    <g
      transform={`translate(${x},${y}) scale(${1 / k})`}
      onMouseMove={(e) => onHover(e, pin.label, pin.sub)}
      onMouseLeave={onLeave}
      className="cursor-pointer"
    >
      <path
        d="M0,0 C-7,-9 -9,-12 -9,-16 A9,9 0 1 1 9,-16 C9,-12 7,-9 0,0 Z"
        className={pin.kind === "instalador" ? "fill-pin-install" : "fill-pin-sale"}
        stroke="white"
        strokeWidth={1.2}
      />
      <circle cy={-16} r={3.2} fill="white" />
    </g>
  );
}
```

### `src/components/mapa/MapPopup.tsx`

```tsx
/** Tooltip flutuante que segue o cursor sobre o mapa. */
export function MapPopup({
  x,
  y,
  text,
  sub,
}: {
  x: number;
  y: number;
  text: string;
  sub?: string;
}) {
  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[130%] rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-lg"
      style={{ left: x, top: y }}
    >
      <div className="font-semibold text-popover-foreground">{text}</div>
      {sub && <div className="text-muted-foreground">{sub}</div>}
    </div>
  );
}
```

### `src/components/mapa/Mapa.tsx`

```tsx
import { useMemo, useState } from "react";
import { MapaBrasil } from "./MapaBrasil";
import { MapFilters, Painel } from "./MapFilters";
import { MapLegend } from "./MapLegend";
import { colorOf } from "./constants";
import { money, ufOfMunicipio } from "./utils";
import { useMunicipioResolver } from "./useMunicipioResolver";
import type {
  CanalMapa,
  LocalMapa,
  MapaProps,
  PaintEntry,
  ParceiroMapa,
  Pin,
  PontoMapa,
} from "./types";

/**
 * Componente completo do mapa (mapa + filtros + camadas + legenda).
 * Todos os dados chegam por props — nenhuma dependência de banco ou API interna.
 */
export function Mapa({
  parceiros = [],
  canais,
  instaladores = [],
  clientes = [],
  vendedores = [],
  vendas = [],
  className,
  onSelectParceiro,
}: MapaProps) {
  const canaisList: CanalMapa[] = useMemo(() => {
    if (canais?.length) return canais;
    const set = new Map<string, CanalMapa>();
    parceiros.forEach((p) => set.set(p.canal, { value: p.canal, label: p.canal }));
    return [...set.values()];
  }, [canais, parceiros]);

  const [canal, setCanal] = useState<string>(canaisList[0]?.value ?? "");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [verInstaladores, setVerInstaladores] = useState(false);
  const [verVendas, setVerVendas] = useState(false);
  const [periodo, setPeriodo] = useState("todos");
  const [focusUf, setFocusUf] = useState<string | null>(null);
  const [regiao, setRegiao] = useState<{ parceiroId: string; municipioId: string } | null>(null);

  const pontos: PontoMapa[] = useMemo(
    () => [...instaladores, ...clientes, ...vendedores],
    [instaladores, clientes, vendedores],
  );

  /** cidade/UF -> código IBGE (para parceiros, pontos e vendas) */
  const locais: LocalMapa[] = useMemo(() => {
    const out: LocalMapa[] = [];
    parceiros.forEach((p) => p.cidades?.forEach((c) => out.push(c)));
    pontos.forEach((p) => out.push(p));
    vendas.forEach((v) => out.push(v));
    return out;
  }, [parceiros, pontos, vendas]);

  const { resolve } = useMunicipioResolver(locais);

  /** municípios de cada parceiro já resolvidos em códigos IBGE */
  const areas = useMemo(() => {
    const m = new Map<string, string[]>();
    parceiros.forEach((p) => {
      const codes = new Set<string>(p.municipios ?? []);
      p.cidades?.forEach((c) => {
        const id = resolve(c);
        if (id) codes.add(id);
      });
      m.set(p.id, [...codes]);
    });
    return m;
  }, [parceiros, resolve]);

  const doCanal = useMemo(
    () => parceiros.filter((p) => (canal ? p.canal === canal : true)),
    [parceiros, canal],
  );

  const base = useMemo(
    () => (selecionados.length ? doCanal.filter((p) => selecionados.includes(p.id)) : doCanal),
    [doCanal, selecionados],
  );

  const ativos = useMemo(
    () => (regiao ? base.filter((p) => p.id === regiao.parceiroId) : base),
    [base, regiao],
  );

  const cores = useMemo(() => {
    const m = new Map<string, string>();
    doCanal.forEach((p, i) => m.set(p.id, p.cor ?? colorOf(i)));
    return m;
  }, [doCanal]);

  const buildPaint = useMemo(
    () => (lista: ParceiroMapa[]) => {
      const m = new Map<string, PaintEntry>();
      lista.forEach((p) => {
        (areas.get(p.id) ?? []).forEach((code) =>
          m.set(code, {
            color: cores.get(p.id) ?? colorOf(0),
            parceiroId: p.id,
            parceiroNome: p.nome,
          }),
        );
      });
      return m;
    },
    [areas, cores],
  );

  // todas as áreas continuam pintadas/clicáveis: clicar num município de outro
  // parceiro troca o foco para o dono daquele município
  const paint = useMemo(() => buildPaint(base), [buildPaint, base]);
  const paintFoco = useMemo(() => buildPaint(ativos), [buildPaint, ativos]);
  const owners = useMemo(() => buildPaint(doCanal), [buildPaint, doCanal]);

  const parceirosVisiveis = useMemo(
    () =>
      focusUf
        ? doCanal.filter((p) => (areas.get(p.id) ?? []).some((c) => ufOfMunicipio(c) === focusUf))
        : doCanal,
    [doCanal, focusUf, areas],
  );

  const pontosVisiveis = useMemo(
    () =>
      pontos
        .map((p) => ({ ...p, codigo: resolve(p) }))
        .filter((p) => p.codigo && paintFoco.has(p.codigo)),
    [pontos, resolve, paintFoco],
  );

  const periodos = useMemo(
    () => [...new Set(vendas.map((v) => v.periodo))].sort().reverse(),
    [vendas],
  );

  const vendasVisiveis = useMemo(
    () =>
      vendas
        .map((v) => ({ ...v, codigo: resolve(v) }))
        .filter(
          (v) =>
            v.codigo && paintFoco.has(v.codigo) && (periodo === "todos" || v.periodo === periodo),
        ),
    [vendas, resolve, paintFoco, periodo],
  );

  const pins: Pin[] = useMemo(() => {
    const out: Pin[] = [];
    if (verInstaladores)
      pontosVisiveis.forEach((i) =>
        out.push({
          id: i.id,
          label: i.nome,
          sub: i.descricao ?? `${i.cidade ?? ""}${i.cidade ? "/" : ""}${i.uf}`,
          municipioId: i.codigo as string,
          kind: "instalador",
        }),
      );
    if (verVendas)
      vendasVisiveis.forEach((v) =>
        out.push({
          id: v.id,
          label: v.cliente,
          sub: `${v.cidade ?? ""}${v.cidade ? "/" : ""}${v.uf} — ${money(v.valor)} (${v.periodo})`,
          municipioId: v.codigo as string,
          kind: "venda",
        }),
      );
    return out;
  }, [verInstaladores, verVendas, pontosVisiveis, vendasVisiveis]);

  const extraUfs = useMemo(() => {
    const s = new Set<string>();
    paint.forEach((_v, code) => s.add(ufOfMunicipio(code)));
    pins.forEach((p) => s.add(ufOfMunicipio(p.municipioId)));
    return [...s].filter(Boolean);
  }, [paint, pins]);

  const legenda = useMemo(
    () =>
      ativos.filter((p) =>
        focusUf ? (areas.get(p.id) ?? []).some((c) => ufOfMunicipio(c) === focusUf) : true,
      ),
    [ativos, focusUf, areas],
  );

  const parceiroFoco = regiao ? parceiros.find((c) => c.id === regiao.parceiroId) ?? null : null;

  function toggleParceiro(id: string) {
    setRegiao(null);
    onSelectParceiro?.(null);
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div
      className={
        className ??
        "mx-auto grid w-full max-w-[1800px] gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_368px]"
      }
    >
      <section className="min-h-[420px] overflow-hidden rounded-2xl border border-border bg-card shadow-md lg:h-[calc(100vh-9rem)]">
        <MapaBrasil
          focusUf={focusUf}
          onFocusUf={(uf) => {
            setFocusUf(uf);
            if (!uf) {
              setRegiao(null);
              onSelectParceiro?.(null);
            }
          }}
          paint={regiao ? paintFoco : paint}
          owners={owners}
          pins={pins}
          extraUfs={extraUfs}
          onSelectRegion={(parceiroId, municipioId) => {
            setRegiao({ parceiroId, municipioId });
            onSelectParceiro?.(parceiroId);
            const uf = ufOfMunicipio(municipioId);
            if (uf) setFocusUf(uf);
          }}
        />
      </section>

      <aside className="flex flex-col gap-4 lg:h-[calc(100vh-9rem)] lg:overflow-y-auto lg:pr-1">
        <MapFilters
          canais={canaisList}
          canal={canal}
          onCanal={(v) => {
            setCanal(v);
            setSelecionados([]);
            setRegiao(null);
            onSelectParceiro?.(null);
          }}
          parceirosVisiveis={parceirosVisiveis}
          cores={cores}
          selecionados={selecionados}
          onToggleParceiro={toggleParceiro}
          onLimparSelecao={() => {
            setSelecionados([]);
            setRegiao(null);
            onSelectParceiro?.(null);
          }}
          focusUf={focusUf}
          verInstaladores={verInstaladores}
          onVerInstaladores={setVerInstaladores}
          verVendas={verVendas}
          onVerVendas={setVerVendas}
          periodos={periodos}
          periodo={periodo}
          onPeriodo={setPeriodo}
          totalVendas={vendasVisiveis.length}
          somaVendas={vendasVisiveis.reduce((s, v) => s + v.valor, 0)}
        />

        <MapLegend
          itens={legenda}
          cores={cores}
          focusUf={focusUf}
          areaDe={(id) => (areas.get(id) ?? []).length}
        />

        {parceiroFoco && (
          <Painel
            titulo={`Pontos — ${parceiroFoco.nome}`}
            acao={
              <button
                onClick={() => {
                  setRegiao(null);
                  onSelectParceiro?.(null);
                }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                limpar foco
              </button>
            }
          >
            <ListaPontos itens={pontosVisiveis} />
          </Painel>
        )}

        {!parceiroFoco && verInstaladores && (
          <Painel titulo={`Pontos na seleção (${pontosVisiveis.length})`}>
            <ListaPontos itens={pontosVisiveis} />
          </Painel>
        )}
      </aside>
    </div>
  );
}

function ListaPontos({ itens }: { itens: PontoMapa[] }) {
  if (!itens.length)
    return <p className="text-sm text-muted-foreground">Nenhum ponto nesta área.</p>;
  return (
    <ul className="grid gap-2">
      {itens.map((i) => (
        <li
          key={i.id}
          className="rounded-xl border border-border bg-secondary/50 p-3 transition-colors duration-200 hover:bg-secondary"
        >
          <p className="text-sm font-semibold text-foreground">{i.nome}</p>
          {i.descricao && <p className="text-xs text-muted-foreground">{i.descricao}</p>}
          <p className="text-xs text-muted-foreground">
            {i.cidade ?? ""}
            {i.cidade ? "/" : ""}
            {i.uf}
          </p>
        </li>
      ))}
    </ul>
  );
}
```

### `src/components/mapa/MapaBrasil.tsx`

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { geoIdentity, geoPath } from "d3-geo";
import type { Feature, Geometry } from "geojson";
import {
  centroidOf,
  municipioListQuery,
  municipiosGeoQuery,
  statesGeoQuery,
  ufOfMunicipio,
  type Geo,
} from "./utils";
import { MAP_H, MAP_W, MAX_K, MIN_K, ufByCode } from "./constants";
import type { PaintEntry, Pin } from "./types";
import { MapMarker } from "./MapMarker";
import { MapPopup } from "./MapPopup";

const W = MAP_W;
const H = MAP_H;

export type { PaintEntry, Pin };

type Props = {
  focusUf: string | null;
  onFocusUf: (uf: string | null) => void;
  paint: Map<string, PaintEntry>;
  /** dono real de cada município (todos os parceiros), usado para clique/hover */
  owners?: Map<string, PaintEntry>;
  pins: Pin[];
  onSelectRegion: (parceiroId: string, municipioId: string) => void;
  extraUfs: string[];
  /** modo seleção: clicar em qualquer município alterna a seleção */
  selectable?: boolean;
  selected?: string[];
  onToggleMunicipio?: (municipioId: string) => void;
};

export function MapaBrasil({
  focusUf,
  onFocusUf,
  paint,
  owners,
  pins,
  onSelectRegion,
  extraUfs,
  selectable = false,
  selected,
  onToggleMunicipio,
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number; text: string; sub?: string } | null>(
    null,
  );
  const [hoverMuni, setHoverMuni] = useState<string | null>(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });

  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const [panning, setPanning] = useState(false);

  const selectedSet = useMemo(() => new Set(selected ?? []), [selected]);

  const states = useQuery(statesGeoQuery);

  const ufsToLoad = useMemo(() => {
    const s = new Set<string>(extraUfs.filter(Boolean));
    if (focusUf) s.add(focusUf);
    return [...s];
  }, [extraUfs, focusUf]);

  const meshes = useQueries({
    queries: ufsToLoad.map((uf) => municipiosGeoQuery(uf)),
  });
  const lists = useQueries({
    queries: ufsToLoad.map((uf) => municipioListQuery(uf)),
  });

  const muniFeatures = useMemo(() => {
    const out: Feature<Geometry, { codarea: string }>[] = [];
    meshes.forEach((m) => {
      const data = m.data as Geo | undefined;
      if (data) out.push(...data.features);
    });
    return out;
  }, [meshes]);

  const nomes = useMemo(() => {
    const map = new Map<string, string>();
    lists.forEach((l) => l.data?.forEach((m) => map.set(String(m.id), m.nome)));
    return map;
  }, [lists]);

  const stateFeatures = states.data?.features ?? [];

  const projection = useMemo(() => {
    const target = focusUf
      ? stateFeatures.find((f) => ufByCode.get(f.properties.codarea)?.sigla === focusUf)
      : undefined;
    const collection = target
      ? { type: "FeatureCollection" as const, features: [target] }
      : { type: "FeatureCollection" as const, features: stateFeatures };
    if (!collection.features.length) return null;
    return geoIdentity()
      .reflectY(true)
      .fitExtent(
        [
          [24, 24],
          [W - 24, H - 24],
        ],
        collection as never,
      );
  }, [stateFeatures, focusUf]);

  const path = useMemo(() => (projection ? geoPath(projection) : null), [projection]);

  // reset zoom/pan when the framing changes
  useEffect(() => {
    setView({ k: 1, x: 0, y: 0 });
  }, [focusUf]);

  // wheel zoom towards the cursor (non-passive listener)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * W;
      const py = ((e.clientY - rect.top) / rect.height) * H;
      setView((v) => {
        const k = Math.min(MAX_K, Math.max(MIN_K, v.k * Math.pow(2, -e.deltaY / 400)));
        if (k === v.k) return v;
        const x = px - ((px - v.x) / v.k) * k;
        const y = py - ((py - v.y) / v.k) * k;
        return clampView({ k, x, y });
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const visibleMunis = useMemo(() => {
    if (!path) return [];
    return muniFeatures.filter((f) => {
      const uf = ufOfMunicipio(f.properties.codarea);
      if (focusUf) return uf === focusUf;
      return paint.has(f.properties.codarea) || selectedSet.has(f.properties.codarea);
    });
  }, [muniFeatures, focusUf, paint, path, selectedSet]);

  const pinPoints = useMemo(() => {
    if (!projection) return [];
    const byCode = new Map(muniFeatures.map((f) => [f.properties.codarea, f]));
    return pins
      .filter((p) => (focusUf ? ufOfMunicipio(p.municipioId) === focusUf : true))
      .map((p) => {
        const f = byCode.get(p.municipioId);
        if (!f) return null;
        const xy = projection(centroidOf(f));
        if (!xy) return null;
        return { ...p, x: xy[0], y: xy[1] };
      })
      .filter(Boolean) as (Pin & { x: number; y: number })[];
  }, [pins, muniFeatures, projection, focusUf]);

  const loading = states.isLoading || meshes.some((m) => m.isLoading);

  function moveTip(e: React.MouseEvent, text: string, sub?: string) {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, text, sub });
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
    setPanning(true);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const dx = ((e.clientX - d.x) / rect.width) * W;
    const dy = ((e.clientY - d.y) / rect.height) * H;
    if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 3) d.moved = true;
    setView((v) => clampView({ k: v.k, x: d.vx + dx, y: d.vy + dy }));
  }

  function endPan(e: React.PointerEvent) {
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    setPanning(false);
    // keep "moved" for the click handler that fires right after
    setTimeout(() => (drag.current = null), 0);
  }

  const dragged = () => drag.current?.moved === true;
  const sw = (n: number) => n / view.k;

  return (
    <div ref={boxRef} className="relative h-full w-full overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-full w-full touch-none"
        style={{ cursor: panning ? "grabbing" : "grab" }}
        role="img"
        aria-label="Mapa do Brasil"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        <rect width={W} height={H} className="fill-map-water" />
        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          {path &&
            stateFeatures.map((f) => {
              const uf = ufByCode.get(f.properties.codarea);
              const isFocus = uf?.sigla === focusUf;
              if (focusUf && !isFocus) return null;
              return (
                <path
                  key={f.properties.codarea}
                  d={path(f as never) ?? ""}
                  className="cursor-pointer fill-map-land stroke-map-boundary transition-colors hover:fill-map-land-hover"
                  strokeWidth={sw(1.4)}
                  strokeOpacity={1}
                  onMouseMove={(e) =>
                    moveTip(e, uf?.nome ?? "", focusUf ? undefined : "Clique para ampliar")
                  }
                  onMouseLeave={() => setHover(null)}
                  onClick={() => {
                    if (dragged()) return;
                    if (uf) onFocusUf(isFocus ? null : uf.sigla);
                  }}
                />
              );
            })}

          {path &&
            visibleMunis.map((f) => {
              const code = f.properties.codarea;
              const p = paint.get(code);
              const owner = p ?? owners?.get(code);
              const isHover = hoverMuni === code;
              const isSel = selectable && selectedSet.has(code);
              // no macro view (Brasil) os municípios são apenas visuais:
              // hover/clique continuam pertencendo ao estado
              const interactive = selectable || !!focusUf;
              const fill = isSel
                ? "var(--primary)"
                : p
                  ? p.color
                  : isHover
                    ? "var(--map-land-hover)"
                    : "transparent";
              const fillOpacity = isSel
                ? isHover
                  ? 0.95
                  : 0.75
                : p
                  ? isHover
                    ? 0.95
                    : 0.7
                  : isHover
                    ? 1
                    : 0;
              return (
                <path
                  key={code}
                  d={path(f as never) ?? ""}
                  fill={fill}
                  fillOpacity={fillOpacity}
                  className="stroke-map-boundary"
                  strokeWidth={sw(isHover ? 2 : 1.2)}
                  strokeOpacity={1}
                  strokeLinejoin="round"
                  style={{
                    cursor: selectable || owner ? "pointer" : "inherit",
                    pointerEvents: interactive ? "auto" : "none",
                  }}
                  onMouseMove={(e) => {
                    setHoverMuni(code);
                    moveTip(
                      e,
                      nomes.get(code) ?? `Município ${code}`,
                      selectable
                        ? isSel
                          ? "Clique para remover"
                          : "Clique para adicionar"
                        : owner?.parceiroNome,
                    );
                  }}
                  onMouseLeave={() => {
                    setHoverMuni((c) => (c === code ? null : c));
                    setHover(null);
                  }}
                  onClick={(e) => {
                    if (dragged()) return;
                    if (selectable) {
                      e.stopPropagation();
                      onToggleMunicipio?.(code);
                      return;
                    }
                    if (!owner) return;
                    e.stopPropagation();
                    onSelectRegion(owner.parceiroId, code);
                  }}
                />
              );
            })}

          {pinPoints.map((p) => (
            <MapMarker
              key={p.kind + p.id}
              pin={p}
              x={p.x}
              y={p.y}
              k={view.k}
              onHover={moveTip}
              onLeave={() => setHover(null)}
            />
          ))}
        </g>
      </svg>

      {hover && <MapPopup x={hover.x} y={hover.y} text={hover.text} sub={hover.sub} />}

      {loading && (
        <div className="absolute left-4 top-4 rounded-xl border border-border/60 bg-card/90 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-md">
          Carregando malha do IBGE…
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
        <ZoomBtn label="Aproximar" onClick={() => setView((v) => zoomBy(v, 1.6))}>
          +
        </ZoomBtn>
        <ZoomBtn label="Afastar" onClick={() => setView((v) => zoomBy(v, 1 / 1.6))}>
          −
        </ZoomBtn>
        {view.k > 1 && (
          <button
            onClick={() => setView({ k: 1, x: 0, y: 0 })}
            className="rounded-xl border border-border/60 bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-md transition-all duration-200 hover:bg-secondary"
          >
            Redefinir zoom
          </button>
        )}
      </div>

      {focusUf && (
        <button
          onClick={() => onFocusUf(null)}
          className="absolute right-4 top-4 rounded-xl border border-border/60 bg-card/90 px-3.5 py-2 text-xs font-semibold text-foreground shadow-md backdrop-blur-md transition-all duration-200 hover:bg-secondary"
        >
          ← Voltar ao Brasil
        </button>
      )}
    </div>
  );
}

type View = { k: number; x: number; y: number };

function clampView(v: View): View {
  const k = Math.min(MAX_K, Math.max(MIN_K, v.k));
  const maxX = 0;
  const minX = W - W * k;
  const maxY = 0;
  const minY = H - H * k;
  return {
    k,
    x: Math.min(maxX, Math.max(minX, v.x)),
    y: Math.min(maxY, Math.max(minY, v.y)),
  };
}

function zoomBy(v: View, f: number): View {
  const k = Math.min(MAX_K, Math.max(MIN_K, v.k * f));
  const cx = W / 2;
  const cy = H / 2;
  return clampView({ k, x: cx - ((cx - v.x) / v.k) * k, y: cy - ((cy - v.y) / v.k) * k });
}

function ZoomBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-xl border border-border/60 bg-card text-base font-bold leading-none text-foreground shadow-md transition-all duration-200 hover:bg-secondary active:scale-95"
    >
      {children}
    </button>
  );
}
```

### `src/components/mapa/constants.ts`

```ts
/** Constantes do módulo de mapa (sem dependência do restante do projeto). */

export const UFS = [
  { code: "12", sigla: "AC", nome: "Acre" },
  { code: "27", sigla: "AL", nome: "Alagoas" },
  { code: "16", sigla: "AP", nome: "Amapá" },
  { code: "13", sigla: "AM", nome: "Amazonas" },
  { code: "29", sigla: "BA", nome: "Bahia" },
  { code: "23", sigla: "CE", nome: "Ceará" },
  { code: "53", sigla: "DF", nome: "Distrito Federal" },
  { code: "32", sigla: "ES", nome: "Espírito Santo" },
  { code: "52", sigla: "GO", nome: "Goiás" },
  { code: "21", sigla: "MA", nome: "Maranhão" },
  { code: "51", sigla: "MT", nome: "Mato Grosso" },
  { code: "50", sigla: "MS", nome: "Mato Grosso do Sul" },
  { code: "31", sigla: "MG", nome: "Minas Gerais" },
  { code: "15", sigla: "PA", nome: "Pará" },
  { code: "25", sigla: "PB", nome: "Paraíba" },
  { code: "41", sigla: "PR", nome: "Paraná" },
  { code: "26", sigla: "PE", nome: "Pernambuco" },
  { code: "22", sigla: "PI", nome: "Piauí" },
  { code: "33", sigla: "RJ", nome: "Rio de Janeiro" },
  { code: "24", sigla: "RN", nome: "Rio Grande do Norte" },
  { code: "43", sigla: "RS", nome: "Rio Grande do Sul" },
  { code: "11", sigla: "RO", nome: "Rondônia" },
  { code: "14", sigla: "RR", nome: "Roraima" },
  { code: "42", sigla: "SC", nome: "Santa Catarina" },
  { code: "35", sigla: "SP", nome: "São Paulo" },
  { code: "28", sigla: "SE", nome: "Sergipe" },
  { code: "17", sigla: "TO", nome: "Tocantins" },
] as const;

export type Uf = (typeof UFS)[number]["sigla"];

export const ufByCode = new Map<string, { code: string; sigla: string; nome: string }>(
  UFS.map((u) => [u.code as string, { code: u.code, sigla: u.sigla, nome: u.nome }]),
);
export const ufBySigla = new Map<string, { code: string; sigla: string; nome: string }>(
  UFS.map((u) => [u.sigla as string, { code: u.code, sigla: u.sigla, nome: u.nome }]),
);

/** Endpoints públicos do IBGE (sem chave de API). */
export const IBGE_MALHAS = "https://servicodados.ibge.gov.br/api/v3/malhas";
export const IBGE_LOCALIDADES = "https://servicodados.ibge.gov.br/api/v1/localidades";

/** Viewport interna do SVG e limites de zoom. */
export const MAP_W = 900;
export const MAP_H = 700;
export const MIN_K = 1;
export const MAX_K = 40;

/** Paleta usada para colorir áreas de parceiros. */
export const PALETTE = [
  "#e0653a",
  "#2f8f6b",
  "#3b6ea5",
  "#b8873b",
  "#8a4fa0",
  "#c2415f",
  "#2f7f8f",
  "#6b8f2f",
  "#a05a2f",
  "#4f5fa0",
];

export const colorOf = (i: number) => PALETTE[i % PALETTE.length];
```

### `src/components/mapa/index.ts`

```ts
export { Mapa } from "./Mapa";
export { MapaBrasil } from "./MapaBrasil";
export { MapFilters, Painel } from "./MapFilters";
export { MapLegend } from "./MapLegend";
export { MapMarker } from "./MapMarker";
export { MapPopup } from "./MapPopup";
export { useMunicipioResolver, useMunicipioNames } from "./useMunicipioResolver";
export {
  centroidOf,
  municipioListQuery,
  municipiosGeoQuery,
  money,
  normalizeCidade,
  statesGeoQuery,
  ufOfMunicipio,
  type Geo,
  type Municipio,
} from "./utils";
export {
  colorOf,
  MAP_H,
  MAP_W,
  MAX_K,
  MIN_K,
  PALETTE,
  UFS,
  ufByCode,
  ufBySigla,
  type Uf,
} from "./constants";
export type {
  CanalMapa,
  LocalMapa,
  MapaProps,
  PaintEntry,
  ParceiroMapa,
  Pin,
  PontoMapa,
  VendaMapa,
} from "./types";
```

### `src/components/mapa/mapa.css`

```css
/*
 * Tokens de estilo do módulo de mapa (Tailwind v4).
 * Importe este arquivo no CSS global do projeto de destino:
 *   @import "./components/mapa/mapa.css";
 * (mantendo os @import no topo do arquivo)
 *
 * Se o projeto de destino já tiver os tokens shadcn (background, card, border,
 * primary, muted-foreground, popover, secondary, ring, input), só os tokens
 * de mapa/pin abaixo são realmente necessários.
 */

@theme inline {
  --color-map-water: var(--map-water);
  --color-map-land: var(--map-land);
  --color-map-land-hover: var(--map-land-hover);
  --color-map-line: var(--map-line);
  --color-map-line-soft: var(--map-line-soft);
  --color-map-boundary: var(--map-boundary);
  --color-pin-install: var(--pin-install);
  --color-pin-sale: var(--pin-sale);
}

:root {
  --map-water: oklch(0.978 0.006 230);
  --map-land: oklch(0.935 0.006 240);
  --map-land-hover: oklch(0.89 0.03 175);
  --map-line: oklch(0.35 0 0);
  --map-line-soft: oklch(0.8 0.02 160);
  --map-boundary: oklch(0.28 0.01 250);
  --pin-install: oklch(0.55 0.14 240);
  --pin-sale: oklch(0.63 0.19 45);
}

.dark {
  --map-line: oklch(0.85 0.005 240);
  --map-boundary: oklch(0.92 0.005 240);
}
```

### `src/components/mapa/types.ts`

```ts
/**
 * Tipos públicos do módulo de mapa.
 * Nenhum acoplamento com banco, API ou dados fictícios.
 */

/** Local identificado por cidade + UF (ou já pelo código IBGE do município). */
export interface LocalMapa {
  /** Nome do município (ex.: "Passo Fundo"). Ignorado quando `municipioId` existe. */
  cidade?: string;
  /** Sigla do estado (ex.: "RS"). */
  uf: string;
  /** Código IBGE de 7 dígitos do município. Se ausente, é resolvido por cidade+UF. */
  municipioId?: string;
}

/** Parceiro com área de atuação (concessionária, representante, distribuidor…). */
export interface ParceiroMapa {
  id: string;
  nome: string;
  /** Chave do canal (ex.: "concessionaria"). Deve casar com `CanalMapa.value`. */
  canal: string;
  /** Áreas de atuação: códigos IBGE de município. */
  municipios?: string[];
  /** Alternativa a `municipios`: lista de cidade/UF resolvida automaticamente. */
  cidades?: LocalMapa[];
  /** Cor opcional; quando ausente usa a paleta padrão. */
  cor?: string;
}

/** Ponto no mapa (instalador, cliente, técnico…). */
export interface PontoMapa extends LocalMapa {
  id: string;
  nome: string;
  /** Linha secundária exibida no tooltip. */
  descricao?: string;
}

/** Venda realizada em um município. */
export interface VendaMapa extends LocalMapa {
  id: string;
  cliente: string;
  /** Período no formato YYYY-MM. */
  periodo: string;
  valor: number;
}

/** Canal exibido no filtro "1. Tipo de canal". */
export interface CanalMapa {
  value: string;
  label: string;
}

/** Pintura de um município no mapa. */
export type PaintEntry = { color: string; parceiroId: string; parceiroNome: string };

/** Pin renderizado sobre o mapa. */
export type Pin = {
  id: string;
  label: string;
  sub: string;
  municipioId: string;
  kind: "instalador" | "venda";
};

export interface MapaProps {
  /** Parceiros com área de atuação. */
  parceiros?: ParceiroMapa[];
  /** Canais disponíveis no filtro. Default: derivado dos parceiros. */
  canais?: CanalMapa[];
  /** Pontos de instalação. */
  instaladores?: PontoMapa[];
  /** Clientes finais (mesma camada visual dos instaladores). */
  clientes?: PontoMapa[];
  /** Vendedores exibidos como pontos. */
  vendedores?: PontoMapa[];
  /** Vendas por município/período. */
  vendas?: VendaMapa[];
  className?: string;
  /** Callback ao focar a região de um parceiro. */
  onSelectParceiro?: (parceiroId: string | null) => void;
}
```

### `src/components/mapa/useMunicipioResolver.ts`

```ts
import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { municipioListQuery, normalizeCidade } from "./utils";
import type { LocalMapa } from "./types";

/**
 * Resolve cidade + UF -> código IBGE do município.
 *
 * Usado porque o mapa trabalha com polígonos oficiais (código IBGE) e não com
 * latitude/longitude. Registros que já trazem `municipioId` passam direto.
 */
export function useMunicipioResolver(locais: LocalMapa[]) {
  const ufs = useMemo(() => {
    const s = new Set<string>();
    locais.forEach((l) => {
      if (!l.municipioId && l.uf && l.cidade) s.add(l.uf.toUpperCase());
    });
    return [...s];
  }, [locais]);

  const listas = useQueries({ queries: ufs.map((uf) => municipioListQuery(uf)) });

  const index = useMemo(() => {
    const map = new Map<string, string>();
    ufs.forEach((uf, i) => {
      listas[i]?.data?.forEach((m) => map.set(`${uf}|${normalizeCidade(m.nome)}`, String(m.id)));
    });
    return map;
  }, [ufs, listas]);

  const resolve = useMemo(
    () =>
      (local: LocalMapa): string | null => {
        if (local.municipioId) return local.municipioId;
        if (!local.cidade || !local.uf) return null;
        return index.get(`${local.uf.toUpperCase()}|${normalizeCidade(local.cidade)}`) ?? null;
      },
    [index],
  );

  return { resolve, loading: listas.some((l) => l.isLoading) };
}

/** Nomes de município (código IBGE -> nome) para os estados informados. */
export function useMunicipioNames(ufs: string[]) {
  const listas = useQueries({ queries: ufs.map((uf) => municipioListQuery(uf)) });
  return useMemo(() => {
    const map = new Map<string, string>();
    listas.forEach((l) => l.data?.forEach((m) => map.set(String(m.id), m.nome)));
    return map;
  }, [listas]);
}
```

### `src/components/mapa/utils.ts`

```ts
import { queryOptions } from "@tanstack/react-query";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { IBGE_LOCALIDADES, IBGE_MALHAS, ufByCode } from "./constants";

export type Geo = FeatureCollection<Geometry, { codarea: string }>;
export type Municipio = { id: number; nome: string };

/** Código IBGE do município -> sigla da UF (dois primeiros dígitos). */
export function ufOfMunicipio(codMun: string): string {
  return ufByCode.get(codMun.slice(0, 2))?.sigla ?? "";
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao carregar dados do IBGE (${res.status})`);
  return (await res.json()) as T;
}

/** Malha de todos os estados do Brasil. */
export const statesGeoQuery = queryOptions({
  queryKey: ["ibge", "malha", "br"],
  staleTime: Infinity,
  gcTime: Infinity,
  queryFn: () =>
    getJson<Geo>(
      `${IBGE_MALHAS}/paises/BR?formato=application/vnd.geo+json&qualidade=intermediaria&intrarregiao=UF`,
    ),
});

/** Malha de municípios de um estado. */
export const municipiosGeoQuery = (uf: string) =>
  queryOptions({
    queryKey: ["ibge", "malha", "mun", uf],
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: () =>
      getJson<Geo>(
        `${IBGE_MALHAS}/estados/${uf}?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio`,
      ),
  });

/** Lista de municípios (id + nome) de um estado. */
export const municipioListQuery = (uf: string) =>
  queryOptions({
    queryKey: ["ibge", "municipios", uf],
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: !!uf,
    queryFn: async () => {
      const list = await getJson<Array<{ id: number; nome: string }>>(
        `${IBGE_LOCALIDADES}/estados/${uf}/municipios`,
      );
      return list
        .map((m) => ({ id: m.id, nome: m.nome }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    },
  });

/**
 * Centro do bounding box (lon/lat). As malhas do IBGE têm sentido de anel que
 * quebra o cálculo esférico de centróide, por isso usamos o bbox.
 */
export function centroidOf(feature: Feature<Geometry, unknown>): [number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const visit = (coords: unknown) => {
    if (Array.isArray(coords) && typeof coords[0] === "number" && typeof coords[1] === "number") {
      const [x, y] = coords as [number, number];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      return;
    }
    if (Array.isArray(coords)) coords.forEach(visit);
  };

  const geom = feature.geometry as { coordinates?: unknown };
  visit(geom?.coordinates);
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

/** Normaliza nome de cidade para comparação (sem acentos, minúsculo). */
export function normalizeCidade(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

export const money = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
```


---

## 15. Guia de integração original

### `MAPA-INTEGRACAO.md`

```markdown
# MAPA-INTEGRAÇÃO

Módulo isolado do mapa interativo do Brasil (malhas oficiais do IBGE, áreas de atuação por município, pins, filtros e legenda dinâmica).

## 1. Dependências que preciso instalar

```bash
npm i react react-dom @tanstack/react-query d3-geo
npm i -D @types/d3-geo @types/geojson typescript
# estilos: Tailwind CSS v4
npm i tailwindcss @tailwindcss/vite
```

Nenhuma outra dependência é usada pelo módulo (sem Leaflet, Mapbox, shadcn ou router).

O app precisa estar envolvido por um `QueryClientProvider`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const queryClient = new QueryClient();
<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
```

## 2. Arquivos que preciso copiar

Copiar a pasta inteira `src/components/mapa/`:

```
src/components/mapa/
  Mapa.tsx                  componente completo (mapa + filtros + legenda)
  MapaBrasil.tsx            mapa SVG (zoom, pan, hover, clique, foco por estado)
  MapMarker.tsx             pin
  MapPopup.tsx              tooltip
  MapFilters.tsx            painel de filtros (canal, seleção, camadas, período)
  MapLegend.tsx             legenda dinâmica
  useMunicipioResolver.ts   cidade/UF -> código IBGE
  utils.ts                  queries do IBGE, centróide, normalização, moeda
  constants.ts              UFs, endpoints IBGE, paleta, limites de zoom
  types.ts                  interfaces públicas
  mapa.css                  tokens de cor do mapa
  index.ts                  exports públicos
```

E importar `mapa.css` no CSS global (no topo, junto dos outros `@import`).

## 3. Como importar o componente

```tsx
import { Mapa } from "@/components/mapa";
// ou, sem alias: import { Mapa } from "./components/mapa";
```

Se quiser montar sua própria UI ao redor, use apenas o mapa:

```tsx
import { MapaBrasil } from "@/components/mapa";
```

## 4. Formato dos dados

```ts
interface ParceiroMapa {
  id: string;
  nome: string;
  canal: string;                 // ex.: "concessionaria" | "representante"
  municipios?: string[];         // códigos IBGE (7 dígitos) da área de atuação
  cidades?: { cidade?: string; uf: string; municipioId?: string }[]; // alternativa
  cor?: string;                  // opcional; senão usa a paleta padrão
}

interface PontoMapa {            // instaladores, clientes, vendedores
  id: string;
  nome: string;
  cidade?: string;
  uf: string;
  municipioId?: string;          // se já tiver o código IBGE, é usado direto
  descricao?: string;            // linha extra no tooltip/lista
}

interface VendaMapa {
  id: string;
  cliente: string;
  cidade?: string;
  uf: string;
  municipioId?: string;
  periodo: string;               // "YYYY-MM"
  valor: number;
}

interface CanalMapa { value: string; label: string }
```

### Cidade/UF em vez de latitude/longitude

O mapa **não usa latitude/longitude**: ele trabalha com os polígonos oficiais do IBGE, identificados pelo código do município. A conversão `cidade + UF -> código IBGE` está isolada em `useMunicipioResolver.ts` (usa a lista oficial `/localidades/estados/{UF}/municipios` e comparação sem acentos). Registros que já tenham `municipioId` passam direto, sem chamada extra. Nenhuma coordenada está fixada em componentes.

## 5. Exemplo mínimo de uso

```tsx
import { Mapa } from "@/components/mapa";

export function PaginaMapa() {
  return (
    <Mapa
      canais={[
        { value: "concessionaria", label: "Concessionária" },
        { value: "representante", label: "Representante" },
      ]}
      parceiros={[
        {
          id: "1",
          nome: "Concessionária Sul",
          canal: "concessionaria",
          cidades: [
            { cidade: "Passo Fundo", uf: "RS" },
            { cidade: "Erechim", uf: "RS" },
          ],
        },
      ]}
      instaladores={[{ id: "i1", nome: "Oficina Alfa", cidade: "Passo Fundo", uf: "RS" }]}
      clientes={[]}
      vendedores={[]}
      vendas={[
        { id: "v1", cliente: "Transportes X", cidade: "Erechim", uf: "RS", periodo: "2026-07", valor: 48000 },
      ]}
    />
  );
}
```

## 6. Onde conectar minha API

O módulo não conhece banco, tabelas ou endpoints. Conecte no componente que renderiza `<Mapa />`:

```tsx
const { data } = useQuery({ queryKey: ["mapa"], queryFn: () => fetch("/sua-api").then(r => r.json()) });

<Mapa
  parceiros={data?.parceiros ?? []}
  instaladores={data?.instaladores ?? []}
  vendas={data?.vendas ?? []}
/>;
```

Mapeie seus registros para as interfaces da seção 4 nesse ponto (uma função `adapt()` sua). Use `onSelectParceiro` para reagir ao clique numa região.

## 7. Variáveis de ambiente necessárias

Nenhuma. As APIs do IBGE usadas são públicas e sem chave:

- `https://servicodados.ibge.gov.br/api/v3/malhas`
- `https://servicodados.ibge.gov.br/api/v1/localidades`

Se quiser servir as malhas de um domínio próprio/cache, altere apenas `IBGE_MALHAS` e `IBGE_LOCALIDADES` em `constants.ts`.
```
