/** Utility functions for the territorial map module. */

import { ufByCode } from './constants.js';

const IBGE_MALHAS = 'https://servicodados.ibge.gov.br/api/v3/malhas';
const IBGE_LOCALIDADES = 'https://servicodados.ibge.gov.br/api/v1/localidades';

/** Code IBGE of municipality -> UF sigla (first 2 digits). */
export function ufOfMunicipio(codMun) {
  return ufByCode.get(String(codMun).slice(0, 2))?.sigla ?? '';
}

/** Format BRL currency (no decimals). */
export function money(v) {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

/** Normalize city name for comparison: no accents, lowercase. */
export function normalizeCidade(nome) {
  return (nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`IBGE fetch failed (${res.status})`);
  return res.json();
}

/** Centroid of a feature (bbox center). */
export function centroidOf(feature) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const visit = (coords) => {
    if (Array.isArray(coords) && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      if (coords[0] < minX) minX = coords[0];
      if (coords[0] > maxX) maxX = coords[0];
      if (coords[1] < minY) minY = coords[1];
      if (coords[1] > maxY) maxY = coords[1];
      return;
    }
    if (Array.isArray(coords)) coords.forEach(visit);
  };
  visit(feature?.geometry?.coordinates);
  return Number.isFinite(minX) ? [(minX + maxX) / 2, (minY + maxY) / 2] : null;
}

// ---------- IBGE data loaders ----------

let statesPromise = null;

export function fetchStatesGeo() {
  if (!statesPromise) {
    statesPromise = getJson(
      `${IBGE_MALHAS}/paises/BR?formato=application/vnd.geo+json&qualidade=intermediaria&intrarregiao=UF`
    ).catch((err) => { statesPromise = null; throw err; });
  }
  return statesPromise;
}

const muniGeoCache = {};
export function fetchMunicipiosGeo(uf) {
  const key = uf.toUpperCase();
  if (!muniGeoCache[key]) {
    muniGeoCache[key] = getJson(
      `${IBGE_MALHAS}/estados/${key}?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio`
    ).catch((err) => { delete muniGeoCache[key]; throw err; });
  }
  return muniGeoCache[key];
}

const muniListCache = {};
export function fetchMunicipiosList(uf) {
  const key = uf.toUpperCase();
  if (!muniListCache[key]) {
    muniListCache[key] = getJson(
      `${IBGE_LOCALIDADES}/estados/${key}/municipios`
    ).then((list) =>
      list.map((m) => ({ id: m.id, nome: m.nome })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    ).catch((err) => { delete muniListCache[key]; throw err; });
  }
  return muniListCache[key];
}
