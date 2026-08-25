import { writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import iconv from 'iconv-lite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OUT_DIR = join(__dirname, '..', 'public', 'data', 'mapa');
const MUNICIPIOS_DIR = join(OUT_DIR, 'br-municipios');

const BASE_IBGE_MALHAS = 'https://servicodados.ibge.gov.br/api/v4/malhas';
const BASE_IBGE_LOCALIDADES = 'https://servicodados.ibge.gov.br/api/v1/localidades';

const UFs = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function decodeBuffer(buffer) {
  // Tenta UTF-8; se detectar mojibake típico de Latin-1, redecodifica.
  const utf8 = iconv.decode(Buffer.from(buffer), 'utf-8');
  if (utf8.includes('Ã©') || utf8.includes('Ã§') || utf8.includes('Ã£') || utf8.includes('Ã¡')) {
    return iconv.decode(Buffer.from(buffer), 'iso-8859-1');
  }
  return utf8;
}

async function fetchJson(url, label) {
  console.log(`  ↳ Buscando ${label}...`);
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);

  const contentType = res.headers.get('content-type') || '';
  const charsetMatch = contentType.match(/charset=([^;]+)/i);
  const declaredCharset = charsetMatch ? charsetMatch[1].trim().toLowerCase() : 'utf-8';

  const buffer = await res.arrayBuffer();
  const text = declaredCharset === 'iso-8859-1'
    ? iconv.decode(Buffer.from(buffer), 'iso-8859-1')
    : decodeBuffer(buffer);

  return JSON.parse(text);
}

async function ensureDirs() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(MUNICIPIOS_DIR, { recursive: true });
}

function normalizeStatesGeoJson(geojson, statesMeta) {
  const metaById = new Map(statesMeta.map((s) => [String(s.id), s]));

  for (const feature of geojson.features) {
    const rawId = String(feature.properties?.id ?? feature.id ?? feature.properties?.codarea ?? '');
    const meta = metaById.get(rawId);

    feature.properties = {
      codigo_ibge: rawId,
      nome: meta?.nome || feature.properties?.nome || 'Desconhecido',
      sigla_uf: meta?.sigla || feature.properties?.sigla || feature.properties?.UF || '',
    };
  }

  return geojson;
}

async function downloadStates() {
  console.log('\n📦 Baixando malha dos estados do Brasil (IBGE)...');

  const [geojson, statesMeta] = await Promise.all([
    fetchJson(
      `${BASE_IBGE_MALHAS}/paises/BR?formato=application/vnd.geo+json&intrarregiao=UF&resolucao=2`,
      'GeoJSON dos estados'
    ),
    fetchJson(`${BASE_IBGE_LOCALIDADES}/estados`, 'metadados dos estados'),
  ]);

  const normalized = normalizeStatesGeoJson(geojson, statesMeta);
  const outPath = join(OUT_DIR, 'br-states.json');
  await writeFile(outPath, JSON.stringify(normalized));
  console.log(`  ✅ Estados salvos em ${outPath} (${normalized.features.length} features)`);
}

async function downloadMunicipiosForUF(uf) {
  console.log(`\n🏙️  Processando municípios de ${uf}...`);

  const [geojson, municipiosMeta] = await Promise.all([
    fetchJson(
      `${BASE_IBGE_MALHAS}/estados/${uf}?formato=application/vnd.geo+json&intrarregiao=municipio&resolucao=3`,
      `GeoJSON dos municípios de ${uf}`
    ),
    fetchJson(`${BASE_IBGE_LOCALIDADES}/estados/${uf}/municipios`, `metadados dos municípios de ${uf}`),
  ]);

  const metaById = new Map(municipiosMeta.map((m) => [String(m.id), m]));

  for (const feature of geojson.features) {
    const rawId = String(feature.properties?.id ?? feature.id ?? feature.properties?.codarea ?? '');
    const meta = metaById.get(rawId);

    feature.properties = {
      codigo_ibge: rawId,
      nome: meta?.nome || feature.properties?.nome || 'Desconhecido',
      sigla_uf: uf,
    };
  }

  const outPath = join(MUNICIPIOS_DIR, `${uf.toLowerCase()}.json`);
  await writeFile(outPath, JSON.stringify(geojson));
  console.log(`  ✅ ${uf}: ${geojson.features.length} municípios salvos`);
}

async function main() {
  console.log('🗺️  Preparando dados geográficos para o Mapa Territorial\n');
  await ensureDirs();

  try {
    await downloadStates();

    for (const uf of UFs) {
      try {
        await downloadMunicipiosForUF(uf);
        await sleep(600); // pequeno intervalo para respeitar a API do IBGE
      } catch (err) {
        console.error(`  ❌ Erro ao processar ${uf}: ${err.message}`);
      }
    }

    console.log('\n🎉 Dados geográficos preparados com sucesso!');
    console.log(`   Estados: public/data/mapa/br-states.json`);
    console.log(`   Municípios: public/data/mapa/br-municipios/{uf}.json`);
  } catch (err) {
    console.error('\n❌ Falha na preparação dos dados:', err.message);
    process.exit(1);
  }
}

main();
