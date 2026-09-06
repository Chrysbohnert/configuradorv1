/**
 * hooks.js — React hooks for map geodata and municipality resolution.
 * Replaces useMapData.js and the Lovable reference useMunicipioResolver.
 * No TanStack Query — uses plain React state + fetch caches from utils.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchStatesGeo, fetchMunicipiosGeo, fetchMunicipiosList, normalizeCidade } from './utils.js';

// ---------- useStatesGeo ----------

export function useStatesGeo() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchStatesGeo()
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { states: data, loadingStates: loading, statesError: error };
}

// ---------- useMunicipiosGeo ----------

export function useMunicipiosGeo() {
  const [geoByUf, setGeoByUf] = useState({});
  const [loadingByUf, setLoadingByUf] = useState({});
  const [errorsByUf, setErrorsByUf] = useState({});

  const loadGeo = useCallback((uf) => {
    const key = uf.toUpperCase();
    if (geoByUf[key] || loadingByUf[key]) return;
    setLoadingByUf((prev) => ({ ...prev, [key]: true }));
    setErrorsByUf((prev) => ({ ...prev, [key]: null }));
    fetchMunicipiosGeo(key)
      .then((d) => setGeoByUf((prev) => ({ ...prev, [key]: d })))
      .catch((e) => setErrorsByUf((prev) => ({ ...prev, [key]: e.message })))
      .finally(() => setLoadingByUf((prev) => ({ ...prev, [key]: false })));
  }, [geoByUf, loadingByUf]);

  return {
    geoByUf,
    loadGeo,
    loadingGeo: Object.values(loadingByUf).some(Boolean),
    geoError: Object.values(errorsByUf).find(Boolean) || null,
  };
}

// ---------- useMunicipioLists ----------

export function useMunicipioLists() {
  const [listByUf, setListByUf] = useState({});
  const [loadingByUf, setLoadingByUf] = useState({});
  const [errorsByUf, setErrorsByUf] = useState({});

  const loadList = useCallback((uf) => {
    const key = uf.toUpperCase();
    if (listByUf[key] || loadingByUf[key]) return;
    setLoadingByUf((prev) => ({ ...prev, [key]: true }));
    setErrorsByUf((prev) => ({ ...prev, [key]: null }));
    fetchMunicipiosList(key)
      .then((d) => setListByUf((prev) => ({ ...prev, [key]: d })))
      .catch((e) => setErrorsByUf((prev) => ({ ...prev, [key]: e.message })))
      .finally(() => setLoadingByUf((prev) => ({ ...prev, [key]: false })));
  }, [listByUf, loadingByUf]);

  return {
    listByUf,
    loadList,
    loadingList: Object.values(loadingByUf).some(Boolean),
    listError: Object.values(errorsByUf).find(Boolean) || null,
  };
}

// ---------- useMunicipioResolver ----------

/**
 * Resolves { cidade, uf } -> municipioId (IBGE code).
 * Pass an array of LocalMapa-shaped objects.
 */
export function useMunicipioResolver(locais) {
  const ufs = useMemo(() => {
    const s = new Set();
    (locais || []).forEach((l) => {
      if (!l.municipioId && l.uf && l.cidade) s.add(l.uf.toUpperCase());
    });
    return [...s];
  }, [locais]);

  const [index, setIndex] = useState(new Map());

  useEffect(() => {
    let cancelled = false;
    if (!ufs.length) return;
    Promise.all(ufs.map((uf) => fetchMunicipiosList(uf).then((list) => ({ uf, list }))))
      .then((results) => {
        if (cancelled) return;
        const m = new Map();
        results.forEach(({ uf, list }) => {
          list.forEach((mun) => m.set(`${uf}|${normalizeCidade(mun.nome)}`, String(mun.id)));
        });
        setIndex(m);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [ufs.join(',')]);

  const resolve = useCallback((local) => {
    if (local.municipioId) return local.municipioId;
    if (!local.cidade || !local.uf) return null;
    return index.get(`${local.uf.toUpperCase()}|${normalizeCidade(local.cidade)}`) ?? null;
  }, [index]);

  return { resolve };
}

// ---------- useMunicipioNames ----------

/**
 * Returns a Map<string,string> (code -> nome) for the given UFs.
 */
export function useMunicipioNames(ufs) {
  const [names, setNames] = useState(new Map());
  const [namesError, setNamesError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const uniqueUfs = [...new Set((ufs || []).filter(Boolean).map((u) => u.toUpperCase()))];
    if (!uniqueUfs.length) {
      setNames(new Map());
      setNamesError(null);
      return undefined;
    }
    setNamesError(null);
    Promise.all(uniqueUfs.map((uf) => fetchMunicipiosList(uf)))
      .then((lists) => {
        if (cancelled) return;
        const m = new Map();
        lists.forEach((list) => list.forEach((mun) => m.set(String(mun.id), mun.nome)));
        setNames(m);
      })
      .catch((error) => { if (!cancelled) setNamesError(error.message); });
    return () => { cancelled = true; };
  }, [JSON.stringify(ufs)]);

  return { names, namesError };
}
