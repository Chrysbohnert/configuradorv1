import { useEffect, useState, useCallback } from 'react';

const LOCAL_STATES_KEY = 'mapa_territorial_estados_v1';
const LOCAL_MUNICIPIOS_KEY = (uf) => `mapa_territorial_municipios_${uf.toLowerCase()}_v1`;

const IBGE_MALHAS_BASE = 'https://servicodados.ibge.gov.br/api/v4/malhas';
const IBGE_LOCALIDADES_BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades';

async function fetchJson(url, label) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Erro ao carregar ${label}: HTTP ${res.status}`);
  return res.json();
}

function readLocal(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignora erros de quota excedida
  }
}

function normalizeFeatureProperties(geojson, { defaultUF = '' } = {}) {
  for (const feature of geojson.features) {
    const props = feature.properties || {};
    const rawId = String(
      props.codigo_ibge ?? props.id ?? feature.id ?? props.codarea ?? ''
    );

    feature.properties = {
      codigo_ibge: rawId,
      nome: props.nome || props.NOME || props.name || 'Desconhecido',
      sigla_uf: props.sigla_uf || props.uf || props.UF || props.sigla || defaultUF,
    };
  }
  return geojson;
}

async function loadStatesFromIbge() {
  const [geojson, statesMeta] = await Promise.all([
    fetchJson(
      `${IBGE_MALHAS_BASE}/paises/BR?formato=application/vnd.geo+json&intrarregiao=UF&resolucao=2`,
      'estados (IBGE)'
    ),
    fetchJson(`${IBGE_LOCALIDADES_BASE}/estados`, 'metadados dos estados (IBGE)'),
  ]);

  const metaById = new Map(statesMeta.map((s) => [String(s.id), s]));

  for (const feature of geojson.features) {
    const rawId = String(
      feature.properties?.id ?? feature.id ?? feature.properties?.codarea ?? ''
    );
    const meta = metaById.get(rawId) || {};

    feature.properties = {
      codigo_ibge: rawId,
      nome: meta.nome || feature.properties?.nome || 'Desconhecido',
      sigla_uf: meta.sigla || feature.properties?.sigla || '',
    };
  }

  return geojson;
}

async function loadMunicipiosFromIbge(uf) {
  const [geojson, municipiosMeta] = await Promise.all([
    fetchJson(
      `${IBGE_MALHAS_BASE}/estados/${uf}?formato=application/vnd.geo+json&intrarregiao=municipio&resolucao=3`,
      `municípios de ${uf} (IBGE)`
    ),
    fetchJson(
      `${IBGE_LOCALIDADES_BASE}/estados/${uf}/municipios`,
      `metadados dos municípios de ${uf} (IBGE)`
    ),
  ]);

  const metaById = new Map(municipiosMeta.map((m) => [String(m.id), m]));

  for (const feature of geojson.features) {
    const rawId = String(
      feature.properties?.id ?? feature.id ?? feature.properties?.codarea ?? ''
    );
    const meta = metaById.get(rawId) || {};

    feature.properties = {
      codigo_ibge: rawId,
      nome: meta.nome || feature.properties?.nome || 'Desconhecido',
      sigla_uf: uf,
    };
  }

  return geojson;
}

async function fetchWithFallback(path, label, fallback) {
  try {
    const res = await fetch(path, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[Mapa] ${label} não encontrado localmente (${err.message}). Usando fallback online...`);
    return fallback();
  }
}

export function useMapData() {
  const [states, setStates] = useState(null);
  const [municipiosByUF, setMunicipiosByUF] = useState({});
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingStates(true);
      setError(null);
      try {
        let data = readLocal(LOCAL_STATES_KEY);
        if (!data) {
          data = await fetchWithFallback(
            '/data/mapa/br-states.json',
            'Malha dos estados',
            loadStatesFromIbge
          );
          writeLocal(LOCAL_STATES_KEY, data);
        }
        if (!cancelled) setStates(normalizeFeatureProperties(data));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoadingStates(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMunicipios = useCallback(async (uf) => {
    const key = uf.toUpperCase();
    if (municipiosByUF[key]) return municipiosByUF[key];

    setLoadingMunicipios(true);
    try {
      let data = readLocal(LOCAL_MUNICIPIOS_KEY(key));
      if (!data) {
        data = await fetchWithFallback(
          `/data/mapa/br-municipios/${key.toLowerCase()}.json`,
          `Municípios de ${key}`,
          () => loadMunicipiosFromIbge(key)
        );
        writeLocal(LOCAL_MUNICIPIOS_KEY(key), data);
      }

      const normalized = normalizeFeatureProperties(data, { defaultUF: key });
      setMunicipiosByUF((prev) => ({ ...prev, [key]: normalized }));
      return normalized;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoadingMunicipios(false);
    }
  }, [municipiosByUF]);

  return {
    states,
    loadMunicipios,
    municipiosByUF,
    loadingStates,
    loadingMunicipios,
    error,
  };
}
