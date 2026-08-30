# Configurador de Preços — Código-fonte completo

Gerado em 2026-08-18.

## Índice de arquivos

- `package.json` — Dependências do projeto
- `src/lib/pricing.ts` — Núcleo de cálculo: fatores de juros, divisor somado, gross-up IR/CSLL, composição do preço
- `src/lib/db-store.ts` — Cadastro (produtos, condições, tributos, parâmetros) com persistência na nuvem
- `src/lib/precificacoes.ts` — Histórico de precificações (salvar/listar/excluir + tributos do faturamento)
- `src/components/NumberField.tsx` — Campo numérico estilo Excel (vírgula, sem zero à frente)
- `src/routes/index.tsx` — Tela do simulador
- `src/routes/database.tsx` — Tela do banco de dados (import/export Excel)
- `src/routes/historico.tsx` — Tela de histórico
- `src/routes/relatorios.tsx` — Tela de relatórios e filtros
- `src/routes/__root.tsx` — Layout raiz
- `src/integrations/supabase/client.ts` — Cliente do banco (gerado)
- `supabase/migrations/20260818141111_2e507be2-b8b1-4af5-9405-1aee319c35aa.sql` — schema SQL
- `supabase/migrations/20260818143924_08dc5af8-5e51-4cbe-82c9-2c9c2f95c6c0.sql` — schema SQL


---

## `package.json`

Dependências do projeto

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
    "@tanstack/react-router": "1.170.18",
    "@tanstack/react-start": "1.168.32",
    "@tanstack/router-plugin": "1.168.23",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
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
    "tw-animate-css": "^1.3.4",
    "vaul": "^1.1.2",
    "vite-tsconfig-paths": "^6.0.2",
    "xlsx": "^0.18.5",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@eslint/js": "^9.32.0",
    "@lovable.dev/vite-tanstack-config": "2.13.1",
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
    "vite": "^8.2.0"
  }
}
```


---

## `src/lib/pricing.ts`

Núcleo de cálculo: fatores de juros, divisor somado, gross-up IR/CSLL, composição do preço

```typescript
export type Entrada = number;

export const PARCELAS = Array.from({ length: 12 }, (_, i) => i + 1);

/**
 * Fatores financeiros calculados a partir da taxa de juros anual e da entrada.
 * Valor presente das parcelas iguais: fator(n) = 1 / (e + (1 − e) · AF(n)/n),
 * com AF(n) = (1 − (1 + i)^-n) / i e i = taxa mensal equivalente.
 */
export function fatoresCondicao(entradaPct: number, taxaAnual: number): number[] {
  const e = Math.min(Math.max(entradaPct / 100, 0), 1);
  const i = Math.pow(1 + taxaAnual, 1 / 12) - 1;
  return PARCELAS.map((n) => {
    if (i <= 0) return 1;
    const af = (1 - Math.pow(1 + i, -n)) / i;
    const den = e + (1 - e) * (af / n);
    return den > 0 ? Number((1 / den).toFixed(4)) : 1;
  });
}

export function fatorMaxCondicao(entradaPct: number, taxaAnual: number): number {
  const row = fatoresCondicao(entradaPct, taxaAnual);
  return row[row.length - 1]!;
}

export const PIS_COFINS = 0.0925;

export const ICMS_UF: Record<string, { contribuinte: number; naoContribuinte: number }> = {
  SP: { contribuinte: 0.088, naoContribuinte: 0.088 },
  RJ: { contribuinte: 0.088, naoContribuinte: 0.088 },
  MG: { contribuinte: 0.088, naoContribuinte: 0.088 },
  PR: { contribuinte: 0.088, naoContribuinte: 0.088 },
  RS: { contribuinte: 0.088, naoContribuinte: 0.088 },
  SC: { contribuinte: 0.088, naoContribuinte: 0.088 },
  ES: { contribuinte: 0.0514, naoContribuinte: 0.088 },
  BA: { contribuinte: 0.0514, naoContribuinte: 0.135 },
  PE: { contribuinte: 0.0514, naoContribuinte: 0.135 },
  CE: { contribuinte: 0.0514, naoContribuinte: 0.135 },
  GO: { contribuinte: 0.0514, naoContribuinte: 0.117 },
  MT: { contribuinte: 0.0514, naoContribuinte: 0.117 },
  MS: { contribuinte: 0.0514, naoContribuinte: 0.117 },
  DF: { contribuinte: 0.0514, naoContribuinte: 0.117 },
  PA: { contribuinte: 0.0514, naoContribuinte: 0.135 },
  AM: { contribuinte: 0.0514, naoContribuinte: 0.135 },
  MA: { contribuinte: 0.0514, naoContribuinte: 0.135 },
  PI: { contribuinte: 0.0514, naoContribuinte: 0.135 },
  RN: { contribuinte: 0.0514, naoContribuinte: 0.135 },
  PB: { contribuinte: 0.0514, naoContribuinte: 0.135 },
  AL: { contribuinte: 0.0514, naoContribuinte: 0.135 },
  SE: { contribuinte: 0.0514, naoContribuinte: 0.135 },
  TO: { contribuinte: 0.0514, naoContribuinte: 0.117 },
  RO: { contribuinte: 0.0514, naoContribuinte: 0.117 },
  AC: { contribuinte: 0.0514, naoContribuinte: 0.117 },
  AP: { contribuinte: 0.0514, naoContribuinte: 0.135 },
  RR: { contribuinte: 0.0514, naoContribuinte: 0.135 },
  EXPORT: { contribuinte: 0, naoContribuinte: 0 },
};

export type PricingInput = {
  /** MP + MO + instalação */
  custo: number;
  margem: number;
  comissao: number;
  assistencia?: number;
  icms: number;
  pisCofins: number;
  ipi?: number;
  irpj?: number;
  csll?: number;
  custoFixoPct?: number;
  fretePct?: number;
  /** desconto máximo embutido no preço (liberado conforme a condição) */
  descontoEmbutido?: number;
  entrada: Entrada;
  parcelas: number;
  descontoComercial: number;
  /** desconto bancado pela comissão do vendedor */
  descontoComissao?: number;
  fatorPiorCenario: number;
  fatorCondicao: number;
};

/** gross-up do IR/CSLL sobre a margem: margem/(1−(IR+CSLL)) − margem */
export function irpjPercent(margem: number, irpj = 0, csll = 0) {
  const t = irpj + csll;
  if (t <= 0 || t >= 1) return 0;
  return margem / (1 - t) - margem;
}

/** Composição de preço por divisor somado (padrão da planilha 109001). */
export function calcular(i: PricingInput) {
  const ipi = i.ipi ?? 0;
  const assistencia = i.assistencia ?? 0;
  const descontoEmbutido = i.descontoEmbutido ?? 0;
  const descontoComissao = i.descontoComissao ?? 0;
  const irPct = irpjPercent(i.margem, i.irpj, i.csll);

  const soma =
    (i.custoFixoPct ?? 0) +
    (i.fretePct ?? 0) +
    i.comissao +
    assistencia +
    i.margem +
    irPct +
    ipi +
    i.icms +
    i.pisCofins +
    descontoEmbutido;

  const base = soma < 1 ? i.custo / (1 - soma) : Number.POSITIVE_INFINITY;

  const fatorPior = i.fatorPiorCenario;
  const precoTabela = base * fatorPior;

  const fatorCondicao = i.fatorCondicao;
  const descontoFinanceiro = fatorPior > 0 ? 1 - fatorCondicao / fatorPior : 0;

  const precoCondicao = precoTabela * (1 - descontoFinanceiro);
  /** preço antes do desconto bancado pela comissão do vendedor */
  const precoAntesComissao =
    precoCondicao * (1 - Math.min(0.99, i.descontoComercial));
  const precoFinal = precoAntesComissao * (1 - Math.min(0.99, descontoComissao));
  const descontoTotal = precoCondicao > 0 ? 1 - precoFinal / precoCondicao : 0;

  const parcelas = Math.max(1, i.parcelas);
  const valorEntrada = precoFinal * (i.entrada / 100);
  const valorParcela = (precoFinal - valorEntrada) / parcelas;

  /** percentuais sobre o preço, exceto comissão (tratada em valor) */
  const pctOutros =
    assistencia +
    i.icms +
    i.pisCofins +
    ipi +
    (i.custoFixoPct ?? 0) +
    (i.fretePct ?? 0);

  /**
   * O desconto bancado pela comissão sai do bolso do vendedor: a fábrica paga
   * menos comissão exatamente no valor do desconto, então o lucro não muda.
   */
  const comissaoValor = Math.max(
    0,
    precoAntesComissao * i.comissao - (precoAntesComissao - precoFinal),
  );
  const lucroAntesIR = precoFinal * (1 - pctOutros) - comissaoValor - i.custo;
  const margemAntesIR = precoAntesComissao > 0 ? lucroAntesIR / precoAntesComissao : 0;
  const margemLiquida = margemAntesIR * (1 - ((i.irpj ?? 0) + (i.csll ?? 0)));

  return {
    soma,
    irPct,
    base,
    precoTabela,
    fatorCondicao,
    descontoFinanceiro,
    precoCondicao,
    descontoTotal,
    precoFinal,
    precoAntesComissao,
    comissaoValor,
    valorEntrada,
    valorParcela,
    margemAntesIR,
    margemLiquida,
  };
}


/**
 * Teto de desconto comercial conforme a condição de pagamento:
 * à vista/faturamento libera o máximo; cada parcela consome `passo` do teto.
 */
export function limiteDescontoComercial(opts: {
  descontoMax: number;
  parcelas: number;
  passo: number;
}) {
  return Math.max(0, opts.descontoMax - Math.max(0, opts.parcelas) * opts.passo);
}


export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const pct = (v: number) =>
  (v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";

/**
 * Frete e instalação não recebem margem/comissão: entram no preço apenas com
 * gross-up dos tributos sobre a venda (ICMS + PIS/COFINS).
 */
export function adicionaisComTributos(opts: {
  frete: number;
  instalacao: number;
  icms: number;
  pisCofins: number;
}) {
  const bruto = Math.max(0, opts.frete) + Math.max(0, opts.instalacao);
  const t = opts.icms + opts.pisCofins;
  const divisor = t < 1 ? 1 - t : 1;
  const frete = Math.max(0, opts.frete) / divisor;
  const instalacao = Math.max(0, opts.instalacao) / divisor;
  return { bruto, frete, instalacao, total: frete + instalacao };
}

/** Regiões do Brasil por UF (usado nos filtros de relatório) */
export const REGIAO_UF: Record<string, string> = {
  SP: "Sudeste", RJ: "Sudeste", MG: "Sudeste", ES: "Sudeste",
  PR: "Sul", SC: "Sul", RS: "Sul",
  MT: "Centro-Oeste", MS: "Centro-Oeste", GO: "Centro-Oeste", DF: "Centro-Oeste",
  BA: "Nordeste", PE: "Nordeste", CE: "Nordeste", MA: "Nordeste", PI: "Nordeste",
  RN: "Nordeste", PB: "Nordeste", AL: "Nordeste", SE: "Nordeste",
  PA: "Norte", AM: "Norte", RO: "Norte", AC: "Norte", AP: "Norte", RR: "Norte", TO: "Norte",
  EXPORT: "Exportação",
};

export function regiaoDaUf(uf: string) {
  return REGIAO_UF[uf] ?? "—";
}

export type ComposicaoInput = {
  /** preço final do produto (sem frete e instalação) */
  precoProduto: number;
  precoTabela: number;
  precoCondicao: number;
  mp: number;
  mo: number;
  custoFixoPct: number;
  assistenciaPct: number;
  icms: number;
  pisCofins: number;
  ipi: number;
  comissaoValor: number;
  frete: number;
  instalacao: number;
};

/**
 * Abre o preço em valores (R$) para auditoria. A margem é o resíduo: tudo que
 * sobra depois de custos, tributos, assistência e comissão.
 */
export function composicao(i: ComposicaoInput) {
  const custoAdm = i.precoProduto * i.custoFixoPct;
  const custoBase = i.mp + i.mo + custoAdm;
  const assistencia = i.precoProduto * i.assistenciaPct;
  const tributos = i.precoProduto * (i.icms + i.pisCofins + i.ipi);
  const comissao = i.comissaoValor;
  const margem = i.precoProduto - custoBase - assistencia - tributos - comissao;
  const financeiro = i.precoCondicao - i.precoTabela; // negativo = desconto financeiro
  const comercial = i.precoProduto - i.precoCondicao; // negativo = desconto comercial
  return {
    mp: i.mp,
    mo: i.mo,
    custoAdm,
    custoBase,
    assistencia,
    tributos,
    comissao,
    margem,
    financeiro,
    comercial,
    precoProduto: i.precoProduto,
    frete: i.frete,
    instalacao: i.instalacao,
    total: i.precoProduto + i.frete + i.instalacao,
  };
}
```


---

## `src/lib/db-store.ts`

Cadastro (produtos, condições, tributos, parâmetros) com persistência na nuvem

```typescript
import { useEffect, useState } from "react";
import { ICMS_UF, PIS_COFINS } from "./pricing";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type Produto = {
  codigo: string;
  descricao: string;
  ncm: string;
  valorMp: number; // matéria-prima (já inclui opcionais)
  valorMo: number; // mão de obra
  custoFixo: number; // percentual (0.08 = 8%)
  frete: number; // valor absoluto ou percentual, conforme freteTipo
  freteTipo: "valor" | "percentual";
  instalacao: number; // valor absoluto
  comissao: number; // 0.05 = 5%
  assistencia: number; // 0.01 = 1%
  margemLucro: number; // 0.12 = 12%
  ipi: number; // 0.00 = 0%
};

export type Condicao = {
  entrada: number; // % de entrada
  taxaAnual: number; // 0.164 = 16,4% a.a.
};

/** Tributação por UF + NCM */
export type TributoRow = {
  uf: string;
  ncm: string;
  contribuinte: number;
  naoContribuinte: number;
  pisCofins: number;
};

export type Parametros = {
  irpj: number;
  csll: number;
  ipiPadrao: number;
  /** desconto máximo embutido no preço, liberado à vista/faturamento */
  descontoComercialMax: number;
  /** quanto do teto de desconto cada parcela consome */
  passoDescontoParcela: number;
  /** comissão base do vendedor (o que ele enxerga e recebe) */
  comissaoBase: number;
  /** quanto da própria comissão o vendedor pode dar de desconto */
  descontoMaxComissao: number;
};

export type DbData = {
  pisCofins: number; // fallback global
  condicoes: Condicao[];
  icms: TributoRow[];
  produtos: Produto[];
  params: Parametros;
};

export const DEFAULT_PARAMS: Parametros = {
  irpj: 0.25,
  csll: 0.09,
  ipiPadrao: 0,
  descontoComercialMax: 0.03,
  passoDescontoParcela: 0.01,
  comissaoBase: 0.05,
  descontoMaxComissao: 0.01,
};


export const NCM_PADRAO = "PADRAO";

export const DEFAULT_DB: DbData = {
  pisCofins: PIS_COFINS,
  condicoes: [
    { entrada: 50, taxaAnual: 0.14 },
    { entrada: 30, taxaAnual: 0.164 },
  ],
  icms: Object.entries(ICMS_UF).map(([uf, v]) => ({
    uf,
    ncm: NCM_PADRAO,
    ...v,
    pisCofins: uf === "EXPORT" ? 0 : PIS_COFINS,
  })),
  produtos: [],
  params: DEFAULT_PARAMS,
};

/** frete em valor absoluto (converte percentual sobre MP+MO quando for o caso) */
export function freteValor(p: Produto): number {
  return p.freteTipo === "percentual" ? (p.valorMp + p.valorMo) * p.frete : p.frete;
}

/** custo direto: MP + MO + instalação */
export function custoDireto(p: Produto): number {
  return p.valorMp + p.valorMo + p.instalacao;
}

/** busca a tributação pela UF e NCM (cai no NCM padrão / primeira linha da UF) */
export function findTributo(rows: TributoRow[], uf: string, ncm: string): TributoRow | undefined {
  const doUf = rows.filter((r) => r.uf === uf);
  return (
    doUf.find((r) => r.ncm.trim() === ncm.trim() && ncm.trim() !== "") ??
    doUf.find((r) => r.ncm === NCM_PADRAO) ??
    doUf[0]
  );
}

export function ncmsCadastradas(rows: TributoRow[]): string[] {
  return Array.from(new Set(rows.map((r) => r.ncm).filter(Boolean)));
}

export function normalizeProduto(p: Partial<Produto>): Produto {
  return {
    codigo: "",
    descricao: "",
    ncm: NCM_PADRAO,
    valorMp: 0,
    valorMo: 0,
    custoFixo: 0.08,
    frete: 0,
    freteTipo: "valor",
    instalacao: 0,
    comissao: 0.05,
    assistencia: 0.01,
    margemLucro: 0.12,
    ipi: 0,
    ...p,
  };
}

const KEY = "configurador-db-v2";
const CLOUD_ID = "principal";
let cache: DbData | null = null;
const listeners = new Set<() => void>();

function normalizeDb(parsed: Partial<DbData>): DbData {
  return {
    ...DEFAULT_DB,
    ...parsed,
    params: { ...DEFAULT_PARAMS, ...(parsed.params ?? {}) },
    condicoes: (parsed.condicoes ?? DEFAULT_DB.condicoes).map((c) => ({
      entrada: Number(c.entrada) || 0,
      taxaAnual: Number(c.taxaAnual) || 0,
    })),
    icms: (parsed.icms ?? DEFAULT_DB.icms).map((r) => ({
      uf: r.uf,
      ncm: r.ncm || NCM_PADRAO,
      contribuinte: r.contribuinte ?? 0,
      naoContribuinte: r.naoContribuinte ?? 0,
      pisCofins: r.pisCofins ?? (parsed.pisCofins ?? PIS_COFINS),
    })),
    produtos: (parsed.produtos ?? []).map(normalizeProduto),
  };
}

export function loadDb(): DbData {
  if (cache) return cache;
  if (typeof window === "undefined") return DEFAULT_DB;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<DbData>) : {};
    cache = normalizeDb(parsed);
  } catch {
    cache = DEFAULT_DB;
  }
  return cache;
}

export function saveDb(data: DbData) {
  cache = data;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
  void supabase
    .from("configurador_dados")
    .upsert({ id: CLOUD_ID, dados: data as unknown as Json }, { onConflict: "id" })
    .then(({ error }) => {
      if (error) console.error("Não foi possível salvar o cadastro permanente:", error.message);
    });
}

async function loadCloudDb(): Promise<void> {
  const { data, error } = await supabase
    .from("configurador_dados")
    .select("dados")
    .eq("id", CLOUD_ID)
    .maybeSingle();

  if (error) {
    console.error("Não foi possível carregar o cadastro permanente:", error.message);
    return;
  }

  if (data) {
    const cloudData = normalizeDb(data.dados as Partial<DbData>);
    cache = cloudData;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(cloudData));
    } catch {
      /* armazenamento local é apenas cópia de segurança */
    }
    listeners.forEach((l) => l());
    return;
  }

  const localData = loadDb();
  const { error: saveError } = await supabase
    .from("configurador_dados")
    .upsert({ id: CLOUD_ID, dados: localData as unknown as Json }, { onConflict: "id" });
  if (saveError) console.error("Não foi possível migrar o cadastro existente:", saveError.message);
}

export function useDb(): [DbData, (d: DbData) => void] {
  const [data, setData] = useState<DbData>(DEFAULT_DB);
  useEffect(() => {
    setData(loadDb());
    const l = () => setData({ ...loadDb() });
    listeners.add(l);
    void loadCloudDb();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return [data, saveDb];
}
```


---

## `src/lib/precificacoes.ts`

Histórico de precificações (salvar/listar/excluir + tributos do faturamento)

```typescript
import { supabase } from "@/integrations/supabase/client";

export type Precificacao = {
  id: string;
  criado_em: string;
  data: string;
  cliente: string;
  vendedor: string;
  uf: string;
  regiao: string;
  produto_codigo: string;
  produto_descricao: string;
  ncm: string;
  condicao: string;
  entrada: number;
  parcelas: number;
  faturamento: number;
  preco_produto: number;
  mp: number;
  mo: number;
  custo_adm: number;
  frete: number;
  instalacao: number;
  assistencia: number;
  tributos: number;
  comissao: number;
  margem: number;
  desconto_comercial: number;
  desconto_financeiro: number;
  detalhes: Record<string, unknown>;
};

export type NovaPrecificacao = Omit<Precificacao, "id" | "criado_em">;

export async function listarPrecificacoes(): Promise<Precificacao[]> {
  const { data, error } = await supabase
    .from("precificacoes")
    .select("*")
    .order("criado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Precificacao[];
}

export async function salvarPrecificacao(p: NovaPrecificacao) {
  const { error } = await supabase.from("precificacoes").insert(p as never);
  if (error) throw new Error(error.message);
}

export async function excluirPrecificacao(id: string) {
  const { error } = await supabase.from("precificacoes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export type Aliquotas = { icms: number; pisCofins: number; ipi: number };

/** alíquotas usadas na precificação (gravadas em detalhes); usa fallback da tabela UF+NCM quando ausentes */
export const aliquotas = (r: Precificacao, fb?: (r: Precificacao) => Aliquotas): Aliquotas => {
  const d = (r.detalhes ?? {}) as Record<string, unknown>;
  const has = (v: unknown) => typeof v === "number" && isFinite(v);
  const num = (v: unknown) => (has(v) ? (v as number) : 0);
  if (has(d["icms"]) || has(d["pisCofins"])) {
    return { icms: num(d["icms"]), pisCofins: num(d["pisCofins"]), ipi: num(d["ipi"]) };
  }
  return fb ? fb(r) : { icms: 0, pisCofins: 0, ipi: 0 };
};

/** tributos devidos sobre o valor total da nota (faturamento) */
export const tributosNota = (r: Precificacao, fb?: (r: Precificacao) => Aliquotas) => {
  const a = aliquotas(r, fb);
  const base = Number(r.faturamento);
  const icms = base * a.icms;
  const pisCofins = base * a.pisCofins;
  const ipi = base * a.ipi;
  return { base, icms, pisCofins, ipi, total: icms + pisCofins + ipi };
};

export const somaCampos = (rows: Precificacao[], fb?: (r: Precificacao) => Aliquotas) => ({
  faturamento: rows.reduce((s, r) => s + Number(r.faturamento), 0),
  mp: rows.reduce((s, r) => s + Number(r.mp), 0),
  mo: rows.reduce((s, r) => s + Number(r.mo), 0),
  custoAdm: rows.reduce((s, r) => s + Number(r.custo_adm), 0),
  frete: rows.reduce((s, r) => s + Number(r.frete), 0),
  instalacao: rows.reduce((s, r) => s + Number(r.instalacao), 0),
  assistencia: rows.reduce((s, r) => s + Number(r.assistencia), 0),
  comissao: rows.reduce((s, r) => s + Number(r.comissao), 0),
  margem: rows.reduce((s, r) => s + Number(r.margem), 0),
  tributos: rows.reduce((s, r) => s + tributosNota(r, fb).total, 0),
  icms: rows.reduce((s, r) => s + tributosNota(r, fb).icms, 0),
  pisCofins: rows.reduce((s, r) => s + tributosNota(r, fb).pisCofins, 0),
  ipi: rows.reduce((s, r) => s + tributosNota(r, fb).ipi, 0),
});
```


---

## `src/components/NumberField.tsx`

Campo numérico estilo Excel (vírgula, sem zero à frente)

```tsx
import { useEffect, useState } from "react";

type Props = {
  value: number;
  onChange: (v: number) => void;
  /** multiplica na exibição e divide ao salvar (ex.: 100 para percentuais) */
  scale?: number;
  decimals?: number;
  className?: string;
  placeholder?: string;
};

const format = (v: number, scale: number, decimals: number) => {
  const n = v * scale;
  if (!Number.isFinite(n)) return "";
  const s = Number(n.toFixed(decimals)).toString();
  return s.replace(".", ",");
};

const parse = (s: string) => {
  const n = Number(s.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Campo numérico estilo Excel: mostra o número limpo (sem "0" à frente),
 * aceita vírgula e converte internamente para o formato usado nos cálculos.
 */
export function NumberField({
  value,
  onChange,
  scale = 1,
  decimals = 4,
  className,
  placeholder,
}: Props) {
  const [text, setText] = useState(() => format(value, scale, decimals));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(format(value, scale, decimals));
  }, [value, scale, decimals, focused]);

  return (
    <input
      className={className}
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={text}
      onFocus={(e) => {
        setFocused(true);
        e.currentTarget.select();
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9.,-]/g, "");
        setText(raw);
        onChange(raw === "" || raw === "-" ? 0 : parse(raw) / scale);
      }}
      onBlur={() => {
        setFocused(false);
        setText(format(value, scale, decimals));
      }}
    />
  );
}
```


---

## `src/routes/index.tsx`

Tela do simulador

```tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  PARCELAS,
  fatoresCondicao,
  calcular,
  limiteDescontoComercial,
  adicionaisComTributos,
  composicao,
  regiaoDaUf,
  brl,
  pct,
} from "@/lib/pricing";
import { useDb, freteValor, findTributo, ncmsCadastradas } from "@/lib/db-store";
import { salvarPrecificacao } from "@/lib/precificacoes";
import { NumberField } from "@/components/NumberField";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Simulador de Preço e Condições de Pagamento" },
      {
        name: "description",
        content:
          "Simule preço de tabela, desconto financeiro por entrada e parcelas, e preço final por UF e NCM.",
      },
      { property: "og:title", content: "Simulador de Preço e Condições de Pagamento" },
      {
        property: "og:description",
        content: "Matriz de fatores por condição de pagamento com cadeia completa de preço.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Simulador,
});

const field =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

function Simulador() {
  const [db] = useDb();
  const [produtoCodigo, setProdutoCodigo] = useState("");
  const [valorMp, setValorMp] = useState(34430);
  const [valorMo, setValorMo] = useState(0);
  const [custoFixoPct, setCustoFixoPct] = useState(0);
  const [frete, setFrete] = useState(0);
  const [instalacao, setInstalacao] = useState(0);
  const [margem, setMargem] = useState(14.5);
  const [comissao, setComissao] = useState(2);
  const [assistencia, setAssistencia] = useState(0);
  const [ipi, setIpi] = useState(0);
  const [uf, setUf] = useState("SP");
  const [ncm, setNcm] = useState("");
  const [contribuinte, setContribuinte] = useState(true);
  const [condIdx, setCondIdx] = useState(0);
  const [parcelas, setParcelas] = useState(0); // 0 = à vista / faturamento
  const [descontoComercial, setDescontoComercial] = useState(0);
  const [descontoComissao, setDescontoComissao] = useState(0);
  const [cliente, setCliente] = useState("");
  const [vendedor, setVendedor] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [statusSalvar, setStatusSalvar] = useState("");



  const ufs = useMemo(() => Array.from(new Set(db.icms.map((i) => i.uf))), [db.icms]);
  const ncms = useMemo(() => ncmsCadastradas(db.icms), [db.icms]);

  const tributo = findTributo(db.icms, uf, ncm);
  const icms = tributo ? (contribuinte ? tributo.contribuinte : tributo.naoContribuinte) : 0;
  const pisCofins = tributo ? tributo.pisCofins : db.pisCofins;

  /** o produto é precificado sem frete e sem instalação */
  const custo = valorMp + valorMo;

  const condicoes = db.condicoes;
  const cond = condicoes[Math.min(condIdx, condicoes.length - 1)];
  const entrada = cond?.entrada ?? 30;

  const matriz = useMemo(
    () => condicoes.map((c) => fatoresCondicao(c.entrada, c.taxaAnual)),
    [condicoes],
  );
  const fatorPior = useMemo(
    () => Math.max(1, ...matriz.map((row) => row[row.length - 1] ?? 1)),
    [matriz],
  );
  /** parcelas = 0 → à vista / faturamento, sem juros */
  const fatorDe = (ci: number, p: number) =>
    p <= 0 ? 1 : (matriz[ci]?.[Math.min(p, 12) - 1] ?? 1);

  const maxDesconto = limiteDescontoComercial({
    descontoMax: db.params.descontoComercialMax,
    parcelas,
    passo: db.params.passoDescontoParcela,
  });
  const descontoExcedido = descontoComercial / 100 > maxDesconto + 1e-9;
  const maxDescontoComissao = db.params.descontoMaxComissao;
  const descontoComissaoExcedido = descontoComissao / 100 > maxDescontoComissao + 1e-9;
  const bloqueado = descontoExcedido || descontoComissaoExcedido;


  const r = useMemo(
    () =>
      calcular({
        custo,
        margem: margem / 100,
        comissao: comissao / 100,
        assistencia: assistencia / 100,
        icms,
        pisCofins,
        ipi: ipi / 100,
        irpj: db.params.irpj,
        csll: db.params.csll,
        custoFixoPct: custoFixoPct / 100,
        fretePct: 0,
        descontoEmbutido: 0,
        entrada,
        parcelas,
        descontoComercial: descontoComercial / 100,
        descontoComissao: descontoComissao / 100,
        fatorPiorCenario: fatorPior,
        fatorCondicao: fatorDe(condIdx, parcelas),
      }),
    [
      custo,
      margem,
      comissao,
      assistencia,
      ipi,
      icms,
      pisCofins,
      custoFixoPct,
      entrada,
      condIdx,
      parcelas,
      descontoComercial,
      descontoComissao,
      fatorPior,
      matriz,
      db.params,
    ],
  );

  const margemAbaixo = r.margemLiquida < margem / 100 - 1e-9;

  const adicionais = adicionaisComTributos({ frete, instalacao, icms, pisCofins });
  const cif = adicionais.bruto > 0;
  /** frete/instalação acompanham só o desconto financeiro (nunca o comercial) */
  const adicionaisCondicao = adicionais.total * (1 - r.descontoFinanceiro);
  const precoTotal = r.precoFinal + adicionaisCondicao;
  const valorEntradaTotal = precoTotal * (entrada / 100);
  const valorParcelaTotal = (precoTotal - valorEntradaTotal) / Math.max(1, parcelas);


  // comissão do vendedor: só sobre o produto (sem frete e sem instalação)
  const baseComissao = Math.max(0, r.precoFinal);
  const comissaoVendedorPct = Math.max(0, db.params.comissaoBase - descontoComissao / 100);
  const comissaoVendedorValor = baseComissao * comissaoVendedorPct;
  const comissaoCheia = baseComissao * db.params.comissaoBase;

  const comp = composicao({
    precoProduto: r.precoFinal,
    precoTabela: r.precoTabela,
    precoCondicao: r.precoCondicao,
    mp: valorMp,
    mo: valorMo,
    custoFixoPct: custoFixoPct / 100,
    assistenciaPct: assistencia / 100,
    icms,
    pisCofins,
    ipi: ipi / 100,
    comissaoValor: r.comissaoValor,
    frete: adicionais.total > 0 ? adicionais.frete * (1 - r.descontoFinanceiro) : 0,
    instalacao: adicionais.total > 0 ? adicionais.instalacao * (1 - r.descontoFinanceiro) : 0,
  });

  const produtoSel = db.produtos.find((x) => x.codigo === produtoCodigo);
  const condicaoLabel = `${entrada}% entrada · ${parcelas === 0 ? "à vista/faturamento" : `${parcelas}x`}`;

  async function salvar() {
    setSalvando(true);
    setStatusSalvar("");
    try {
      await salvarPrecificacao({
        data: new Date().toISOString().slice(0, 10),
        cliente: cliente || "Sem cliente",
        vendedor: vendedor || "Sem vendedor",
        uf,
        regiao: regiaoDaUf(uf),
        produto_codigo: produtoCodigo || "MANUAL",
        produto_descricao: produtoSel?.descricao ?? "Cálculo manual",
        ncm: ncm || "PADRAO",
        condicao: condicaoLabel,
        entrada,
        parcelas,
        faturamento: precoTotal,
        preco_produto: r.precoFinal,
        mp: comp.mp,
        mo: comp.mo,
        custo_adm: comp.custoAdm,
        frete: comp.frete,
        instalacao: comp.instalacao,
        assistencia: comp.assistencia,
        tributos: comp.tributos,
        comissao: comissaoVendedorValor,
        margem: comp.margem,
        desconto_comercial: descontoComercial / 100,
        desconto_financeiro: r.descontoFinanceiro,
        detalhes: {
          margemAlvo: margem / 100,
          margemAntesIR: r.margemAntesIR,
          margemLiquida: r.margemLiquida,
          comissaoFabrica: comp.comissao,
          descontoComissao: descontoComissao / 100,
          precoTabela: r.precoTabela,
          precoCondicao: r.precoCondicao,
          icms,
          pisCofins,
          ipi: ipi / 100,
          custoFixoPct: custoFixoPct / 100,
        },
      });
      setStatusSalvar("Precificação salva no histórico.");
    } catch (e) {
      setStatusSalvar(`Erro ao salvar: ${(e as Error).message}`);
    } finally {
      setSalvando(false);
    }
  }


  function aplicarProduto(codigo: string) {
    setProdutoCodigo(codigo);
    const p = db.produtos.find((x) => x.codigo === codigo);
    if (!p) return;
    setValorMp(p.valorMp);
    setValorMo(p.valorMo);
    setNcm(p.ncm);
    setCustoFixoPct(p.custoFixo * 100);
    setFrete(freteValor(p));
    setInstalacao(p.instalacao);
    setMargem(p.margemLucro * 100);
    setComissao(p.comissao * 100);
    setAssistencia(p.assistencia * 100);
    setIpi(p.ipi * 100);
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Simulador de Preço &amp; Condições de Pagamento
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Preço de tabela na condição mais longa e liberação automática de desconto conforme a
              condição de pagamento escolhida.
            </p>

          </div>
          <nav className="flex flex-wrap gap-2">
            <Link
              to="/historico"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Histórico
            </Link>
            <Link
              to="/relatorios"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Relatórios
            </Link>
            <Link
              to="/database"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Banco de dados
            </Link>
          </nav>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Produto, custos e impostos
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block text-muted-foreground">Produto cadastrado</span>
                <select
                  className={field}
                  value={produtoCodigo}
                  onChange={(e) => aplicarProduto(e.target.value)}
                >
                  <option value="">Manual</option>
                  {db.produtos.map((p) => (
                    <option key={p.codigo} value={p.codigo}>
                      {p.codigo} {p.descricao}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Valor MP (R$)</span>
                <NumberField className={field} value={valorMp} decimals={2} onChange={setValorMp} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Valor MO (R$)</span>
                <NumberField className={field} value={valorMo} decimals={2} onChange={setValorMo} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Custo fixo (%)</span>
                <NumberField
                  className={field}
                  value={custoFixoPct}
                  decimals={2}
                  onChange={setCustoFixoPct}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Margem alvo MG (%)</span>
                <NumberField className={field} value={margem} decimals={2} onChange={setMargem} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Comissão (%)</span>
                <NumberField className={field} value={comissao} decimals={2} onChange={setComissao} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Assistência (%)</span>
                <NumberField
                  className={field}
                  value={assistencia}
                  decimals={2}
                  onChange={setAssistencia}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">IPI (%)</span>
                <NumberField className={field} value={ipi} decimals={2} onChange={setIpi} />
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">UF</span>
                <select className={field} value={uf} onChange={(e) => setUf(e.target.value)}>
                  {ufs.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">NCM</span>
                <select className={field} value={ncm} onChange={(e) => setNcm(e.target.value)}>
                  <option value="">Automático (padrão da UF)</option>
                  {ncms.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={contribuinte}
                  onChange={(e) => setContribuinte(e.target.checked)}
                />
                <span className="text-muted-foreground">
                  Cliente contribuinte de ICMS — alíquota aplicada: {pct(icms)} · PIS/COFINS{" "}
                  {pct(pisCofins)}
                  {tributo ? ` (NCM ${tributo.ncm})` : " — UF/NCM sem cadastro"}
                </span>
              </label>
              <div className="text-sm text-muted-foreground sm:col-span-2">
                Custo considerado: <span className="font-medium text-foreground">{brl(custo)}</span>{" "}
                (MP + MO; frete e instalação são somados depois, sem margem)
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Condição de pagamento
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Condição (entrada)</span>
                <select
                  className={field}
                  value={condIdx}
                  onChange={(e) => setCondIdx(Number(e.target.value))}
                >
                  {condicoes.map((c, i) => (
                    <option key={i} value={i}>
                      {c.entrada}% de entrada
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Saldo</span>
                <select
                  className={field}
                  value={parcelas}
                  onChange={(e) => setParcelas(Number(e.target.value))}
                >
                  <option value={0}>À vista / faturamento</option>
                  {PARCELAS.map((p) => (
                    <option key={p} value={p}>
                      {p}x
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block text-muted-foreground">
                  Desconto comercial (%) — permitido até{" "}
                  {(maxDesconto * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%
                </span>
                <NumberField
                  className={`${field} ${descontoExcedido ? "border-destructive ring-1 ring-destructive" : ""}`}
                  value={descontoComercial}
                  decimals={2}
                  onChange={setDescontoComercial}
                />
                {descontoExcedido && (
                  <span className="mt-1 block text-xs font-medium text-destructive">
                    Desconto excedido: nesta condição o máximo é {pct(maxDesconto)}.
                  </span>
                )}
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block text-muted-foreground">
                  Desconto da comissão do vendedor (%) — até {pct(maxDescontoComissao)}
                </span>
                <NumberField
                  className={`${field} ${descontoComissaoExcedido ? "border-destructive ring-1 ring-destructive" : ""}`}
                  value={descontoComissao}
                  decimals={2}
                  onChange={setDescontoComissao}
                />
                {descontoComissaoExcedido && (
                  <span className="mt-1 block text-xs font-medium text-destructive">
                    Máximo de {pct(maxDescontoComissao)} da própria comissão.
                  </span>
                )}
              </label>
            </div>

            <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
              <Row label="Comissão base do vendedor" value={pct(db.params.comissaoBase)} />
              <Row
                label={`Comissão da venda (${pct(comissaoVendedorPct)})`}
                value={brl(comissaoVendedorValor)}
                strong
              />
              {descontoComissao > 0 && (
                <Row
                  label="Comissão cheia (sem desconto)"
                  value={brl(comissaoCheia)}
                />
              )}
              <Row label="Desconto financeiro" value={pct(r.descontoFinanceiro)} />
              <Row label="Teto de desconto comercial" value={pct(maxDesconto)} />
            </dl>

            <div className="mt-4 border-t border-border pt-4 text-sm">
              <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold uppercase tracking-wide text-foreground">
                {cif ? "CIF" : "FOB"}
              </span>
              <dl className="mt-2 space-y-1">
                <Row label="Frete" value={brl(frete)} />
                <Row label="Instalação" value={brl(instalacao)} />
              </dl>
            </div>


            <div
              className={`mt-4 rounded-md border p-3 text-sm ${
                bloqueado
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : "border-border bg-muted text-muted-foreground"
              }`}
            >
              {bloqueado
                ? "Proposta bloqueada — desconto excedido para a condição escolhida."
                : "Proposta liberada — descontos dentro do limite permitido."}
            </div>

          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Composição do preço (auditoria)
          </h2>
          <dl className="space-y-2 text-sm">
            <Row label="MP (matéria-prima)" value={brl(comp.mp)} />
            <Row label="MO (mão de obra)" value={brl(comp.mo)} />
            <Row label={`Custo ADM (${pct(custoFixoPct / 100)})`} value={brl(comp.custoAdm)} />
            <div className="border-t border-border pt-2">
              <Row label="Custo base" value={brl(comp.custoBase)} strong />
            </div>
            <Row label={`Assistência (${pct(assistencia / 100)})`} value={brl(comp.assistencia)} />
            <Row
              label={`Tributos (ICMS ${pct(icms)} + PIS/COFINS ${pct(pisCofins)}${ipi > 0 ? ` + IPI ${pct(ipi / 100)}` : ""})`}
              value={brl(comp.tributos)}
            />
            <Row label="Comissão (fábrica)" value={brl(comp.comissao)} />
            <Row label="Margem (inclui IRPJ/CSLL)" value={brl(comp.margem)} />
            <Row
              label={`Financeiro (desconto ${pct(r.descontoFinanceiro)})`}
              value={brl(comp.financeiro)}
            />
            <Row
              label={`Desconto comercial (${pct(descontoComercial / 100)}) + comissão (${pct(descontoComissao / 100)})`}
              value={brl(comp.comercial)}
            />
            <div className="border-t border-border pt-2">
              <Row label="Preço do produto" value={brl(comp.precoProduto)} strong />
            </div>
            <Row label="Frete" value={brl(comp.frete)} />
            <Row label="Instalação" value={brl(comp.instalacao)} />
            <div className="border-t border-border pt-2">
              <Row label="Valor total" value={brl(comp.total)} strong />
            </div>
          </dl>

          <div className="mt-5 grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Cliente</span>
              <input
                className={field}
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Nome do cliente"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Vendedor</span>
              <input
                className={field}
                value={vendedor}
                onChange={(e) => setVendedor(e.target.value)}
                placeholder="Nome do vendedor"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                disabled={salvando || bloqueado}
                onClick={() => void salvar()}
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {salvando ? "Salvando..." : "Salvar no histórico"}
              </button>
            </div>
          </div>
          {statusSalvar && (
            <p className="mt-3 text-sm text-muted-foreground">{statusSalvar}</p>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">

          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Cadeia de cálculo
          </h2>
          <dl className="space-y-2 text-sm">
            <Row label="Custo" value={brl(custo)} />
            <Row label="IRPJ/CSLL sobre a margem (gross-up)" value={pct(r.irPct)} />
            <Row label="Σ percentuais do divisor" value={pct(r.soma)} />
            <Row label="÷ (1 − Σ percentuais)" value={brl(r.base)} strong />
            <Row label="Preço de tabela (12x)" value={brl(r.precoTabela + adicionais.total)} strong />
            <Row
              label={`× (1 − desconto financeiro ${pct(r.descontoFinanceiro)})`}
              value={brl(r.precoCondicao + adicionaisCondicao)}
            />
            <Row
              label={`× (1 − desconto comercial ${pct(descontoComercial / 100)} + comissão ${pct(descontoComissao / 100)})`}
              value={brl(precoTotal)}
              strong
            />

          </dl>

          <div className="mt-5 grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
            <Stat label={`Preço final (${cif ? "CIF" : "FOB"})`} value={brl(precoTotal)} />
            <Stat label={`Entrada (${entrada}%)`} value={brl(valorEntradaTotal)} />
            <Stat
              label={parcelas === 0 ? "Saldo no faturamento" : `${parcelas}x de`}
              value={brl(parcelas === 0 ? precoTotal - valorEntradaTotal : valorParcelaTotal)}
            />
          </div>
        </section>


        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Validação de margem
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Margem alvo" value={pct(margem / 100)} />
            <Stat label="Margem antes do IR" value={pct(r.margemAntesIR)} />
            <Stat label="Margem líquida (após IR/CSLL)" value={pct(r.margemLiquida)} />
          </div>
          <p
            className={`mt-4 rounded-md border p-3 text-sm ${
              margemAbaixo
                ? "border-destructive bg-destructive/10 text-destructive"
                : "border-border bg-muted text-muted-foreground"
            }`}
          >
            {margemAbaixo
              ? `Atenção: a margem líquida (${pct(r.margemLiquida)}) está abaixo da margem alvo (${pct(margem / 100)}).`
              : "Margem líquida dentro (ou acima) da margem alvo cadastrada."}
          </p>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Preço por condição de pagamento
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="p-2 text-left font-medium">Entrada</th>
                  <th className="p-2 text-right font-medium">À vista</th>
                  {PARCELAS.map((p) => (
                    <th key={p} className="p-2 text-right font-medium">
                      {p}x
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {condicoes.map((c, ci) => (
                  <tr key={ci} className="border-b border-border/60">
                    <td className="p-2 font-medium text-foreground">{c.entrada}%</td>
                    {[0, ...PARCELAS].map((p) => {
                      const selected = ci === condIdx && p === parcelas;
                      const teto = limiteDescontoComercial({
                        descontoMax: db.params.descontoComercialMax,
                        parcelas: p,
                        passo: db.params.passoDescontoParcela,
                      });
                      return (
                        <td
                          key={p}
                          className={`p-2 text-right tabular-nums ${
                            selected
                              ? "bg-primary/10 font-semibold text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          <div>
                            {brl(
                              r.precoTabela *
                                (fatorDe(ci, p) / fatorPior) *
                                (1 - Math.min(descontoComercial / 100, teto)) +
                                adicionais.total * (fatorDe(ci, p) / fatorPior),
                            )}

                          </div>
                          <div className="text-[10px]">desc. até {pct(teto)}</div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            O preço de tabela já contempla o custo financeiro máximo (12x) e o desconto comercial
            máximo embutido; condições mais curtas liberam desconto financeiro e comercial.
          </p>

        </section>
      </div>
    </main>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-semibold text-foreground" : "text-foreground"}`}>
        {value}
      </dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums text-foreground">{value}</div>
    </div>
  );
}
```


---

## `src/routes/database.tsx`

Tela do banco de dados (import/export Excel)

```tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  useDb,
  custoDireto,
  freteValor,
  normalizeProduto,
  DEFAULT_DB,
  NCM_PADRAO,
  ncmsCadastradas,
  type Produto,
  type DbData,
  type TributoRow,
} from "@/lib/db-store";
import { brl } from "@/lib/pricing";
import { NumberField } from "@/components/NumberField";

export const Route = createFileRoute("/database")({
  head: () => ({
    meta: [
      { title: "Banco de Dados — Parâmetros e Produtos" },
      {
        name: "description",
        content:
          "Edite taxas de juros, condições de pagamento, tributação por UF e NCM, parâmetros globais e custos/margens por modelo, com importação e exportação em Excel.",
      },
      { property: "og:title", content: "Banco de Dados — Parâmetros e Produtos" },
      {
        property: "og:description",
        content: "Manutenção de parâmetros de precificação e cadastro de produtos por modelo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Database,
});

const field =
  "w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

type ColKind = "text" | "num" | "pct" | "freteTipo";

const COLS: { key: keyof Produto; label: string; kind: ColKind }[] = [
  { key: "codigo", label: "CODIGO", kind: "text" },
  { key: "descricao", label: "DESCRICAO", kind: "text" },
  { key: "ncm", label: "NCM", kind: "text" },
  { key: "valorMp", label: "VALOR MP", kind: "num" },
  { key: "valorMo", label: "VALOR MO", kind: "num" },
  { key: "custoFixo", label: "CUSTO FIXO", kind: "pct" },
  { key: "freteTipo", label: "FRETE EM", kind: "freteTipo" },
  { key: "frete", label: "FRETE", kind: "num" },
  { key: "instalacao", label: "INSTALACAO", kind: "num" },
  { key: "comissao", label: "COMISSAO", kind: "pct" },
  { key: "assistencia", label: "ASSISTENCIA", kind: "pct" },
  { key: "ipi", label: "IPI", kind: "pct" },
  { key: "margemLucro", label: "MARGEM LUCRO", kind: "pct" },
];

const num = (v: unknown) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v ?? "").trim();
  const norm = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(norm);
  return Number.isFinite(n) ? n : 0;
};

// Percentuais: aceita tanto 8 (=8%) quanto 0,08 (=8%) na importação.
const pctNum = (v: unknown) => {
  const n = num(v);
  return Math.abs(n) > 1 ? n / 100 : n;
};

function Database() {
  const [db, setDb] = useDb();
  const [tab, setTab] = useState<"produtos" | "condicoes" | "impostos" | "parametros">("produtos");
  const [novaNcm, setNovaNcm] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const patch = (p: Partial<DbData>) => setDb({ ...db, ...p });
  const patchParams = (p: Partial<DbData["params"]>) =>
    setDb({ ...db, params: { ...db.params, ...p } });

  function exportar() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        db.produtos.map((p) => ({
          CODIGO: p.codigo,
          DESCRICAO: p.descricao,
          NCM: p.ncm,
          "VALOR MP": p.valorMp,
          "VALOR MO": p.valorMo,
          "CUSTO FIXO %": p.custoFixo * 100,
          "FRETE TIPO": p.freteTipo,
          FRETE: p.freteTipo === "percentual" ? p.frete * 100 : p.frete,
          INSTALACAO: p.instalacao,
          "COMISSAO %": p.comissao * 100,
          "ASSISTENCIA %": p.assistencia * 100,
          "IPI %": p.ipi * 100,
          "MARGEM LUCRO %": p.margemLucro * 100,
        })),
      ),
      "Produtos",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        db.condicoes.map((c) => ({
          "ENTRADA %": c.entrada,
          "TAXA ANUAL %": c.taxaAnual * 100,
        })),
      ),
      "Condicoes",
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        db.icms.map((i) => ({
          UF: i.uf,
          NCM: i.ncm,
          "CONTRIBUINTE %": i.contribuinte * 100,
          "NAO CONTRIBUINTE %": i.naoContribuinte * 100,
          "PIS COFINS %": i.pisCofins * 100,
        })),
      ),
      "Impostos",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        {
          "IRPJ %": db.params.irpj * 100,
          "CSLL %": db.params.csll * 100,
          "IPI PADRAO %": db.params.ipiPadrao * 100,
          "DESCONTO COMERCIAL MAX %": db.params.descontoComercialMax * 100,
          "PASSO DESCONTO POR PARCELA %": db.params.passoDescontoParcela * 100,
          "COMISSAO BASE %": db.params.comissaoBase * 100,
          "DESCONTO MAX COMISSAO %": db.params.descontoMaxComissao * 100,
        },
      ]),
      "Parametros",
    );

    XLSX.writeFile(wb, "banco-de-dados-precificacao.xlsx");
  }

  async function importar(file: File) {
    const wb = XLSX.read(await file.arrayBuffer());
    const next: DbData = { ...db };

    const prodSheet = wb.Sheets["Produtos"] ?? wb.Sheets[wb.SheetNames[0] as string];
    if (prodSheet) {
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(prodSheet, { defval: "" });
      const produtos: Produto[] = rows
        .filter((r) => String(r["CODIGO"] ?? "").trim() !== "")
        .map((r) => {
          const freteTipo = String(r["FRETE TIPO"] ?? "")
            .toLowerCase()
            .startsWith("perc")
            ? "percentual"
            : "valor";
          return normalizeProduto({
            codigo: String(r["CODIGO"]).replace(/\.0$/, ""),
            descricao: String(r["DESCRICAO"] ?? ""),
            ncm: String(r["NCM"] ?? NCM_PADRAO).trim() || NCM_PADRAO,
            valorMp: num(r["VALOR MP"]),
            valorMo: num(r["VALOR MO"]),
            custoFixo: pctNum(r["CUSTO FIXO %"] ?? r["CUSTO FIXO"]),
            freteTipo,
            frete: freteTipo === "percentual" ? pctNum(r["FRETE"]) : num(r["FRETE"]),
            instalacao: num(r["INSTALACAO"]),
            comissao: pctNum(r["COMISSAO %"] ?? r["COMISSAO"]),
            assistencia: pctNum(r["ASSISTENCIA %"] ?? r["ASSISTENCIA"]),
            ipi: pctNum(r["IPI %"] ?? r["IPI"]),
            margemLucro: pctNum(r["MARGEM LUCRO %"] ?? r["MARGEM LUCRO"]),
          });
        });
      if (produtos.length) next.produtos = produtos;
    }

    if (wb.Sheets["Condicoes"]) {
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets["Condicoes"]);
      if (rows.length)
        next.condicoes = rows.map((r) => ({
          entrada: num(r["ENTRADA %"] ?? r["ENTRADA"]),
          taxaAnual: pctNum(r["TAXA ANUAL %"] ?? r["TAXA ANUAL"]),
        }));
    }

    const impSheet = wb.Sheets["Impostos"] ?? wb.Sheets["ICMS"];
    if (impSheet) {
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(impSheet);
      if (rows.length)
        next.icms = rows.map((r) => ({
          uf: String(r["UF"] ?? "").toUpperCase(),
          ncm: String(r["NCM"] ?? NCM_PADRAO).trim() || NCM_PADRAO,
          contribuinte: pctNum(r["CONTRIBUINTE %"] ?? r["CONTRIBUINTE"]),
          naoContribuinte: pctNum(r["NAO CONTRIBUINTE %"] ?? r["NAO CONTRIBUINTE"]),
          pisCofins: pctNum(r["PIS COFINS %"] ?? r["PIS COFINS"] ?? db.pisCofins),
        }));
    }

    if (wb.Sheets["Parametros"]) {
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets["Parametros"]);
      const r0 = rows[0];
      if (r0) {
        next.params = {
          ...next.params,
          irpj: pctNum(r0["IRPJ %"] ?? next.params.irpj),
          csll: pctNum(r0["CSLL %"] ?? next.params.csll),
          ipiPadrao: pctNum(r0["IPI PADRAO %"] ?? next.params.ipiPadrao),
          descontoComercialMax: pctNum(
            r0["DESCONTO COMERCIAL MAX %"] ?? next.params.descontoComercialMax,
          ),
          passoDescontoParcela: pctNum(
            r0["PASSO DESCONTO POR PARCELA %"] ?? next.params.passoDescontoParcela,
          ),
          comissaoBase: pctNum(r0["COMISSAO BASE %"] ?? next.params.comissaoBase),
          descontoMaxComissao: pctNum(
            r0["DESCONTO MAX COMISSAO %"] ?? next.params.descontoMaxComissao,
          ),

        };
      }
    }

    setDb(next);
  }

  function duplicarParaNcm() {
    const ncm = novaNcm.trim();
    if (!ncm) return;
    const ufs = Array.from(new Set(db.icms.map((r) => r.uf)));
    const existentes = new Set(db.icms.filter((r) => r.ncm === ncm).map((r) => r.uf));
    const novas: TributoRow[] = ufs
      .filter((uf) => !existentes.has(uf))
      .map((uf) => {
        const base = db.icms.find((r) => r.uf === uf)!;
        return { ...base, ncm };
      });
    if (novas.length) patch({ icms: [...db.icms, ...novas] });
    setNovaNcm("");
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Banco de dados</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Parâmetros usados pelo simulador: taxas, condições de pagamento, tributação por UF e
              NCM, parâmetros globais e custos/margens por modelo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importar(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Importar Excel
            </button>
            <button
              onClick={exportar}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Exportar Excel
            </button>
            <Link
              to="/"
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Simulador
            </Link>
          </div>
        </header>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["produtos", "Produtos"],
              ["condicoes", "Condições de pagamento"],
              ["impostos", "Impostos por UF"],
              ["parametros", "Parâmetros"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                tab === k
                  ? "bg-primary text-primary-foreground"
                  : "border border-input text-foreground hover:bg-accent"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "produtos" && (
          <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Percentuais em número inteiro/decimal (8 = 8%). Preço = (MP + MO + instalação) ÷ (1 −
                Σ percentuais). Opcionais já somados no MP. A NCM define a tributação buscada por UF.
              </p>
              <button
                onClick={() =>
                  patch({
                    produtos: [...db.produtos, normalizeProduto({ ipi: db.params.ipiPadrao })],
                  })
                }
                className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent"
              >
                + Linha
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1280px] text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    {COLS.map((c) => (
                      <th key={c.key} className="p-2 text-left text-xs font-medium">
                        {c.label}
                        {c.kind === "pct" ? " (%)" : ""}
                      </th>
                    ))}
                    <th className="p-2 text-right text-xs font-medium">CUSTO</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {db.produtos.map((p, idx) => {
                    const upd = (v: Partial<Produto>) => {
                      const produtos = [...db.produtos];
                      produtos[idx] = { ...p, ...v };
                      patch({ produtos });
                    };
                    return (
                      <tr key={idx} className="border-b border-border/60">
                        {COLS.map((c) => (
                          <td key={c.key} className="p-1">
                            {c.kind === "text" ? (
                              <input
                                className={field}
                                type="text"
                                value={p[c.key] as string}
                                onChange={(e) =>
                                  upd({ [c.key]: e.target.value } as Partial<Produto>)
                                }
                              />
                            ) : c.kind === "freteTipo" ? (
                              <select
                                className={field}
                                value={p.freteTipo}
                                onChange={(e) =>
                                  upd({ freteTipo: e.target.value as Produto["freteTipo"] })
                                }
                              >
                                <option value="valor">R$</option>
                                <option value="percentual">%</option>
                              </select>
                            ) : (
                              <NumberField
                                className={field}
                                value={p[c.key] as number}
                                scale={
                                  c.kind === "pct" ||
                                  (c.key === "frete" && p.freteTipo === "percentual")
                                    ? 100
                                    : 1
                                }
                                decimals={2}
                                onChange={(v) => upd({ [c.key]: v } as Partial<Produto>)}
                              />
                            )}
                          </td>
                        ))}
                        <td className="p-2 text-right tabular-nums text-foreground">
                          {brl(custoDireto(p))}
                          {p.freteTipo === "percentual" && (
                            <div className="text-[10px] text-muted-foreground">
                              frete {brl(freteValor(p))}
                            </div>
                          )}
                        </td>
                        <td className="p-1 text-right">
                          <button
                            onClick={() =>
                              patch({ produtos: db.produtos.filter((_, i) => i !== idx) })
                            }
                            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {db.produtos.length === 0 && (
                    <tr>
                      <td colSpan={COLS.length + 2} className="p-6 text-center text-muted-foreground">
                        Nenhum produto cadastrado. Importe a planilha ou adicione uma linha.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "condicoes" && (
          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Informe a entrada e a taxa de juros anual. O custo financeiro é calculado
                internamente e aplicado no preço conforme a condição escolhida no simulador.
              </p>
              <button
                onClick={() => patch({ condicoes: [...db.condicoes, { entrada: 0, taxaAnual: 0.14 }] })}
                className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent"
              >
                + Condição
              </button>
            </div>
            <div className="space-y-4">
              {db.condicoes.map((c, idx) => {
                const upd = (v: Partial<typeof c>) => {
                  const condicoes = [...db.condicoes];
                  condicoes[idx] = { ...c, ...v };
                  patch({ condicoes });
                };
                return (
                  <div key={idx} className="rounded-md border border-border p-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="text-sm">
                        <span className="mb-1 block text-muted-foreground">Entrada (%)</span>
                        <NumberField
                          className={field}
                          value={c.entrada}
                          decimals={2}
                          onChange={(v) => upd({ entrada: v })}
                        />
                      </label>
                      <label className="text-sm">
                        <span className="mb-1 block text-muted-foreground">
                          Taxa de juros a.a. (%)
                        </span>
                        <NumberField
                          className={field}
                          value={c.taxaAnual}
                          scale={100}
                          decimals={2}
                          onChange={(v) => upd({ taxaAnual: v })}
                        />
                      </label>
                      <div className="flex items-end">
                        <button
                          onClick={() =>
                            patch({ condicoes: db.condicoes.filter((_, i) => i !== idx) })
                          }
                          className="rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
                        >
                          Excluir condição
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}


        {tab === "impostos" && (
          <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                ICMS e PIS/COFINS por UF e NCM. O simulador busca a linha pela NCM do produto e,
                quando não encontra, usa a linha {NCM_PADRAO} da UF. NCMs cadastradas:{" "}
                {ncmsCadastradas(db.icms).join(", ") || "—"}
              </p>
              <div className="flex gap-2">
                <input
                  className={field + " w-40"}
                  placeholder="Nova NCM"
                  value={novaNcm}
                  onChange={(e) => setNovaNcm(e.target.value)}
                />
                <button
                  onClick={duplicarParaNcm}
                  className="whitespace-nowrap rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent"
                >
                  Criar NCM p/ todas as UFs
                </button>
                <button
                  onClick={() =>
                    patch({
                      icms: [
                        ...db.icms,
                        {
                          uf: "SP",
                          ncm: NCM_PADRAO,
                          contribuinte: 0,
                          naoContribuinte: 0,
                          pisCofins: db.pisCofins,
                        },
                      ],
                    })
                  }
                  className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent"
                >
                  + Linha
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="p-2 text-left text-xs font-medium">UF</th>
                    <th className="p-2 text-left text-xs font-medium">NCM</th>
                    <th className="p-2 text-left text-xs font-medium">ICMS contribuinte (%)</th>
                    <th className="p-2 text-left text-xs font-medium">ICMS não contribuinte (%)</th>
                    <th className="p-2 text-left text-xs font-medium">PIS/COFINS (%)</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {db.icms.map((row, idx) => {
                    const upd = (v: Partial<TributoRow>) => {
                      const icms = [...db.icms];
                      icms[idx] = { ...row, ...v };
                      patch({ icms });
                    };
                    return (
                      <tr key={idx} className="border-b border-border/60">
                        <td className="p-1">
                          <input
                            className={field}
                            value={row.uf}
                            onChange={(e) => upd({ uf: e.target.value.toUpperCase() })}
                          />
                        </td>
                        <td className="p-1">
                          <input
                            className={field}
                            value={row.ncm}
                            onChange={(e) => upd({ ncm: e.target.value })}
                          />
                        </td>
                        {(["contribuinte", "naoContribuinte", "pisCofins"] as const).map((k) => (
                          <td key={k} className="p-1">
                            <NumberField
                              className={field}
                              value={row[k]}
                              scale={100}
                              decimals={2}
                              onChange={(v) => upd({ [k]: v } as Partial<TributoRow>)}
                            />
                          </td>
                        ))}
                        <td className="p-1 text-right">
                          <button
                            onClick={() => patch({ icms: db.icms.filter((_, i) => i !== idx) })}
                            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "parametros" && (
          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <p className="mb-4 text-xs text-muted-foreground">
              Parâmetros globais usados na composição de preço e nas travas de desconto.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ["irpj", "IRPJ (%)", 100],
                  ["csll", "CSLL (%)", 100],
                  ["ipiPadrao", "IPI padrão (%)", 100],
                  ["descontoComercialMax", "Desconto comercial máx. embutido (%)", 100],
                  ["passoDescontoParcela", "Redução do desconto por parcela (%)", 100],
                  ["comissaoBase", "Comissão base do vendedor (%)", 100],
                  ["descontoMaxComissao", "Desconto máx. da comissão do vendedor (%)", 100],

                ] as const
              ).map(([key, label, scale]) => (
                <label key={key} className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{label}</span>
                  <NumberField
                    className={field}
                    value={db.params[key]}
                    scale={scale}
                    decimals={2}
                    onChange={(v) => patchParams({ [key]: v })}
                  />
                </label>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Gross-up do imposto de renda: IRPJ% = margem ÷ (1 − (IRPJ + CSLL)) − margem.
            </p>
          </section>
        )}

        <div>
          <button
            onClick={() => setDb({ ...DEFAULT_DB, produtos: db.produtos })}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Restaurar parâmetros padrão (mantém produtos)
          </button>
        </div>
      </div>
    </main>
  );
}
```


---

## `src/routes/historico.tsx`

Tela de histórico

```tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { brl, pct } from "@/lib/pricing";
import {
  listarPrecificacoes,
  excluirPrecificacao,
  type Precificacao,
} from "@/lib/precificacoes";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de precificações" },
      {
        name: "description",
        content:
          "Precificações salvas com composição completa de custo, tributos, comissão e margem.",
      },
      { property: "og:title", content: "Histórico de precificações" },
      {
        property: "og:description",
        content: "Auditoria de cada preço salvo: MP, MO, ADM, tributos, comissão e margem.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Historico,
});

function Historico() {
  const [rows, setRows] = useState<Precificacao[]>([]);
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);

  async function carregar() {
    try {
      setRows(await listarPrecificacoes());
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Histórico</h1>
          <nav className="flex gap-2">
            <Link
              to="/"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Simulador
            </Link>
            <Link
              to="/relatorios"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Relatórios
            </Link>
          </nav>
        </header>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="p-3 text-left font-medium">Data</th>
                <th className="p-3 text-left font-medium">Cliente</th>
                <th className="p-3 text-left font-medium">Vendedor</th>
                <th className="p-3 text-left font-medium">Produto</th>
                <th className="p-3 text-left font-medium">UF</th>
                <th className="p-3 text-left font-medium">Condição</th>
                <th className="p-3 text-right font-medium">Faturamento</th>
                <th className="p-3 text-right font-medium">Margem</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-muted-foreground">
                    Nenhuma precificação salva ainda.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <>
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="p-3">{new Date(r.data).toLocaleDateString("pt-BR")}</td>
                    <td className="p-3">{r.cliente}</td>
                    <td className="p-3">{r.vendedor}</td>
                    <td className="p-3">
                      {r.produto_codigo} {r.produto_descricao}
                    </td>
                    <td className="p-3">{r.uf}</td>
                    <td className="p-3">{r.condicao}</td>
                    <td className="p-3 text-right tabular-nums">{brl(Number(r.faturamento))}</td>
                    <td className="p-3 text-right tabular-nums">{brl(Number(r.margem))}</td>
                    <td className="p-3 text-right">
                      <button
                        className="mr-2 text-xs font-medium text-primary hover:underline"
                        onClick={() => setAberto(aberto === r.id ? null : r.id)}
                      >
                        {aberto === r.id ? "Fechar" : "Composição"}
                      </button>
                      <button
                        className="text-xs font-medium text-destructive hover:underline"
                        onClick={async () => {
                          await excluirPrecificacao(r.id);
                          void carregar();
                        }}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                  {aberto === r.id && (
                    <tr key={`${r.id}-comp`} className="border-b border-border/60 bg-muted/40">
                      <td colSpan={9} className="p-4">
                        <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          <Item label="MP" value={brl(Number(r.mp))} />
                          <Item label="MO" value={brl(Number(r.mo))} />
                          <Item label="Custo ADM" value={brl(Number(r.custo_adm))} />
                          <Item label="Assistência" value={brl(Number(r.assistencia))} />
                          <Item label="Tributos" value={brl(Number(r.tributos))} />
                          <Item label="Comissão do vendedor" value={brl(Number(r.comissao))} />
                          <Item label="Margem" value={brl(Number(r.margem))} />
                          <Item label="Frete" value={brl(Number(r.frete))} />
                          <Item label="Instalação" value={brl(Number(r.instalacao))} />
                          <Item label="Preço do produto" value={brl(Number(r.preco_produto))} />
                          <Item
                            label="Desconto comercial"
                            value={pct(Number(r.desconto_comercial))}
                          />
                          <Item
                            label="Desconto financeiro"
                            value={pct(Number(r.desconto_financeiro))}
                          />
                          <Item label="Entrada" value={`${Number(r.entrada)}%`} />
                          <Item
                            label="Parcelas"
                            value={r.parcelas === 0 ? "À vista / faturamento" : `${r.parcelas}x`}
                          />
                          <Item label="Região" value={r.regiao} />
                        </dl>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-md bg-background px-3 py-2">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
```


---

## `src/routes/relatorios.tsx`

Tela de relatórios e filtros

```tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { brl, pct } from "@/lib/pricing";
import {
  listarPrecificacoes,
  somaCampos,
  tributosNota,
  aliquotas,
  type Precificacao,
  type Aliquotas,
} from "@/lib/precificacoes";
import { useDb, findTributo } from "@/lib/db-store";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios de faturamento e margem" },
      {
        name: "description",
        content:
          "Some faturamento, MP, MO, custo ADM, frete, instalação, assistência, comissão e margem por período, produto, vendedor, cliente, UF, região e condição.",
      },
      { property: "og:title", content: "Relatórios de faturamento e margem" },
      {
        property: "og:description",
        content: "Análise das precificações confirmadas com filtros e somatórios.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Relatorios,
});

const field =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

function Relatorios() {
  const [db] = useDb();
  const [rows, setRows] = useState<Precificacao[]>([]);
  const [erro, setErro] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [produto, setProduto] = useState("");
  const [vendedor, setVendedor] = useState("");
  const [cliente, setCliente] = useState("");
  const [uf, setUf] = useState("");
  const [regiao, setRegiao] = useState("");
  const [condicao, setCondicao] = useState("");

  useEffect(() => {
    listarPrecificacoes()
      .then(setRows)
      .catch((e: Error) => setErro(e.message));
  }, []);

  const opcoes = (key: keyof Precificacao) =>
    Array.from(new Set(rows.map((r) => String(r[key])).filter(Boolean))).sort();

  const filtradas = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!de || r.data >= de) &&
          (!ate || r.data <= ate) &&
          (!produto || r.produto_codigo === produto) &&
          (!vendedor || r.vendedor === vendedor) &&
          (!cliente || r.cliente === cliente) &&
          (!uf || r.uf === uf) &&
          (!regiao || r.regiao === regiao) &&
          (!condicao || r.condicao === condicao),
      ),
    [rows, de, ate, produto, vendedor, cliente, uf, regiao, condicao],
  );

  const fallback = useMemo(
    () =>
      (r: Precificacao): Aliquotas => {
        const linha = findTributo(db.icms, r.uf, r.ncm);
        return {
          icms: linha?.contribuinte ?? 0,
          pisCofins: linha?.pisCofins ?? db.pisCofins,
          ipi: 0,
        };
      },
    [db],
  );

  const t = somaCampos(filtradas, fallback);

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Relatórios</h1>
          <nav className="flex gap-2">
            <Link
              to="/"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Simulador
            </Link>
            <Link
              to="/historico"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Histórico
            </Link>
          </nav>
        </header>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <section className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">De</span>
            <input type="date" className={field} value={de} onChange={(e) => setDe(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Até</span>
            <input
              type="date"
              className={field}
              value={ate}
              onChange={(e) => setAte(e.target.value)}
            />
          </label>
          <Select label="Produto" value={produto} onChange={setProduto} options={opcoes("produto_codigo")} />
          <Select label="Vendedor" value={vendedor} onChange={setVendedor} options={opcoes("vendedor")} />
          <Select label="Cliente" value={cliente} onChange={setCliente} options={opcoes("cliente")} />
          <Select label="UF" value={uf} onChange={setUf} options={opcoes("uf")} />
          <Select label="Região" value={regiao} onChange={setRegiao} options={opcoes("regiao")} />
          <Select
            label="Condição de pagamento"
            value={condicao}
            onChange={setCondicao}
            options={opcoes("condicao")}
          />
        </section>

        <section className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <Stat label="Faturamento total" value={brl(t.faturamento)} />
          <Stat label="MP total" value={brl(t.mp)} />
          <Stat label="MO total" value={brl(t.mo)} />
          <Stat label="Custo ADM total" value={brl(t.custoAdm)} />
          <Stat label="Frete total" value={brl(t.frete)} />
          <Stat label="Instalação total" value={brl(t.instalacao)} />
          <Stat label="Assistência total" value={brl(t.assistencia)} />
          <Stat label="ICMS a pagar (s/ NF)" value={brl(t.icms)} />
          <Stat label="PIS/COFINS a pagar (s/ NF)" value={brl(t.pisCofins)} />
          {t.ipi > 0 && <Stat label="IPI a pagar (s/ NF)" value={brl(t.ipi)} />}
          <Stat label="Tributos totais (s/ NF)" value={brl(t.tributos)} />
          <Stat label="Comissões totais" value={brl(t.comissao)} />
          <Stat label="Margem total" value={brl(t.margem)} />
          <Stat label="Precificações" value={String(filtradas.length)} />
        </section>

        <p className="text-xs text-muted-foreground">
          Tributos calculados sobre o valor total da nota (faturamento, incluindo frete e
          instalação), com as mesmas alíquotas usadas na precificação de cada venda.
        </p>


        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="p-3 text-left font-medium">Data</th>
                <th className="p-3 text-left font-medium">Cliente</th>
                <th className="p-3 text-left font-medium">Vendedor</th>
                <th className="p-3 text-left font-medium">Produto</th>
                <th className="p-3 text-left font-medium">UF</th>
                <th className="p-3 text-left font-medium">Condição</th>
                <th className="p-3 text-right font-medium">Faturamento</th>
                <th className="p-3 text-right font-medium">ICMS</th>
                <th className="p-3 text-right font-medium">PIS/COFINS</th>
                <th className="p-3 text-right font-medium">Comissão</th>
                <th className="p-3 text-right font-medium">Margem</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((r) => {
                const tr = tributosNota(r, fallback);
                const al = aliquotas(r, fallback);
                return (
                <tr key={r.id} className="border-b border-border/60">
                  <td className="p-3">{new Date(r.data).toLocaleDateString("pt-BR")}</td>
                  <td className="p-3">{r.cliente}</td>
                  <td className="p-3">{r.vendedor}</td>
                  <td className="p-3">
                    {r.produto_codigo} {r.produto_descricao}
                  </td>
                  <td className="p-3">{r.uf}</td>
                  <td className="p-3">{r.condicao}</td>
                  <td className="p-3 text-right tabular-nums">{brl(Number(r.faturamento))}</td>
                  <td className="p-3 text-right tabular-nums">
                    {brl(tr.icms)}
                    <span className="ml-1 text-xs text-muted-foreground">{pct(al.icms)}</span>
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {brl(tr.pisCofins)}
                    <span className="ml-1 text-xs text-muted-foreground">{pct(al.pisCofins)}</span>
                  </td>
                  <td className="p-3 text-right tabular-nums">{brl(Number(r.comissao))}</td>
                  <td className="p-3 text-right tabular-nums">{brl(Number(r.margem))}</td>
                </tr>
                );
              })}

            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      <select className={field} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Todos</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold tabular-nums text-foreground">{value}</div>
    </div>
  );
}
```


---

## `src/routes/__root.tsx`

Layout raiz

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
      { title: "Lovable App" },
      { name: "description", content: "Lovable Generated Project" },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Lovable App" },
      { property: "og:description", content: "Lovable Generated Project" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
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
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
```


---

## `src/integrations/supabase/client.ts`

Cliente do banco (gerado)

```typescript
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

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
      storage: typeof window !== 'undefined' ? localStorage : undefined,
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

## SQL — schema do banco


### `20260818141111_2e507be2-b8b1-4af5-9405-1aee319c35aa.sql`

```sql
CREATE TABLE public.configurador_dados (
  id text PRIMARY KEY DEFAULT 'principal' CHECK (id = 'principal'),
  dados jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.configurador_dados TO anon;
GRANT SELECT, INSERT, UPDATE ON public.configurador_dados TO authenticated;
GRANT ALL ON public.configurador_dados TO service_role;

ALTER TABLE public.configurador_dados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cadastro compartilhado pode ser consultado"
ON public.configurador_dados
FOR SELECT
TO anon, authenticated
USING (id = 'principal');

CREATE POLICY "Cadastro compartilhado pode ser criado"
ON public.configurador_dados
FOR INSERT
TO anon, authenticated
WITH CHECK (id = 'principal');

CREATE POLICY "Cadastro compartilhado pode ser atualizado"
ON public.configurador_dados
FOR UPDATE
TO anon, authenticated
USING (id = 'principal')
WITH CHECK (id = 'principal');

CREATE OR REPLACE FUNCTION public.atualizar_updated_at_configurador()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER atualizar_configurador_dados_updated_at
BEFORE UPDATE ON public.configurador_dados
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_updated_at_configurador();
```


### `20260818143924_08dc5af8-5e51-4cbe-82c9-2c9c2f95c6c0.sql`

```sql
CREATE TABLE public.precificacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  criado_em timestamptz NOT NULL DEFAULT now(),
  data date NOT NULL DEFAULT current_date,
  cliente text NOT NULL DEFAULT '',
  vendedor text NOT NULL DEFAULT '',
  uf text NOT NULL DEFAULT '',
  regiao text NOT NULL DEFAULT '',
  produto_codigo text NOT NULL DEFAULT '',
  produto_descricao text NOT NULL DEFAULT '',
  ncm text NOT NULL DEFAULT '',
  condicao text NOT NULL DEFAULT '',
  entrada numeric NOT NULL DEFAULT 0,
  parcelas integer NOT NULL DEFAULT 0,
  faturamento numeric NOT NULL DEFAULT 0,
  preco_produto numeric NOT NULL DEFAULT 0,
  mp numeric NOT NULL DEFAULT 0,
  mo numeric NOT NULL DEFAULT 0,
  custo_adm numeric NOT NULL DEFAULT 0,
  frete numeric NOT NULL DEFAULT 0,
  instalacao numeric NOT NULL DEFAULT 0,
  assistencia numeric NOT NULL DEFAULT 0,
  tributos numeric NOT NULL DEFAULT 0,
  comissao numeric NOT NULL DEFAULT 0,
  margem numeric NOT NULL DEFAULT 0,
  desconto_comercial numeric NOT NULL DEFAULT 0,
  desconto_financeiro numeric NOT NULL DEFAULT 0,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.precificacoes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.precificacoes TO authenticated;
GRANT ALL ON public.precificacoes TO service_role;

ALTER TABLE public.precificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Precificacoes compartilhadas podem ser consultadas" ON public.precificacoes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Precificacoes compartilhadas podem ser criadas" ON public.precificacoes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Precificacoes compartilhadas podem ser atualizadas" ON public.precificacoes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Precificacoes compartilhadas podem ser removidas" ON public.precificacoes FOR DELETE TO anon, authenticated USING (true);
```
