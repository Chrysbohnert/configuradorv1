import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { DESCRICOES_OPCIONAIS } from '../config/codigosGuindaste';

const SERIE_LABELS = { GSI: 'GUINDASTE INTERNO', GSE: 'GUINDASTE EXTERNO' };

export const TIPO_LABELS = {
  todos: 'Todos',
  canivete: 'Canivete (C)',
  trave: 'Trave (T)',
  tradicional: 'Tradicional'
};

function extractBase(subgrupo) {
  return (subgrupo || '').replace(/^(Guindaste\s+)+/i, '').split(' ').slice(0, 2).join(' ');
}

function extractOpts(subgrupo) {
  const clean = (subgrupo || '').replace(/^(Guindaste\s+)+/i, '');
  return clean.split(' ').slice(2).join(' ').trim();
}

export function variantLabel(optStr) {
  if (!optStr) return 'Configuração Base — Sem Opcionais';
  if (DESCRICOES_OPCIONAIS[optStr]) return DESCRICOES_OPCIONAIS[optStr];
  if (optStr.includes('Caminhão 3/4')) {
    const rest = optStr.replace('Caminhão 3/4', '').trim();
    const parts = ['Caminhão 3/4', ...(rest ? [rest] : [])];
    return parts.map(p => DESCRICOES_OPCIONAIS[p] || p).join(' + ');
  }
  return optStr.split('/').map(p => DESCRICOES_OPCIONAIS[p.trim()] || p.trim()).join(' + ');
}

export function isValidImageUrl(url) {
  return typeof url === 'string' && url.trim() !== '' &&
    url !== 'null' && url !== 'undefined' && url.length > 10;
}

function parsePreco(preco) {
  if (preco == null || preco === '') return null;
  const valor = typeof preco === 'number' ? preco : parseFloat(preco);
  return Number.isFinite(valor) ? valor : null;
}

export function buildGroups(guindastes) {
  const map = new Map();
  (guindastes || []).forEach(g => {
    const base = extractBase(g.subgrupo);
    if (!base) return;
    const serie = base.split(' ')[0];
    if (serie !== 'GSI' && serie !== 'GSE') return;
    const optStr = extractOpts(g.subgrupo);
    if (!map.has(base)) map.set(base, { model: base, serie, variants: [] });
    const grp = map.get(base);
    grp.variants.push({ ...g, _optStr: optStr });
  });
  return [...map.values()].sort((a, b) => {
    const na = parseFloat(a.model.replace(/[^0-9.]/g, '')) || 0;
    const nb = parseFloat(b.model.replace(/[^0-9.]/g, '')) || 0;
    return na !== nb ? na - nb : a.model.localeCompare(b.model);
  });
}

export function getTipoModelo(model) {
  if (model.endsWith('C')) return 'canivete';
  if (model.endsWith('T')) return 'trave';
  return 'tradicional';
}

export function useGuindasteConfigurador({
  guindastes = [],
  getPreco,
  getImagem,
  precoContextKey = '',
  initialBaseModel = null,
  initialVariantId = null,
  onConfirm,
}) {
  const [activeSerie, setActiveSerie] = useState(() => {
    if (initialBaseModel) {
      const serie = initialBaseModel.split(' ')[0];
      return serie === 'GSI' || serie === 'GSE' ? serie : 'GSI';
    }
    return 'GSI';
  });

  const initialTipo = initialBaseModel ? getTipoModelo(initialBaseModel) : 'todos';
  const [activeTipo, setActiveTipo] = useState(initialTipo);

  const allGroups = useMemo(() => buildGroups(guindastes), [guindastes]);

  const initialGroup = useMemo(() => {
    if (!initialBaseModel) return null;
    return allGroups.find(g => g.model === initialBaseModel) || null;
  }, [allGroups, initialBaseModel]);

  const [selectedGroup, setSelectedGroup] = useState(initialGroup);
  const [selectedGuindaste, setSelectedGuindaste] = useState(() => {
    if (!initialGroup) return null;
    if (initialVariantId) {
      return initialGroup.variants.find(v => String(v.id) === String(initialVariantId)) || initialGroup.variants[0] || null;
    }
    // Seleciona automaticamente a primeira configuração base/standard (sem opcionais)
    // usando a ordenação já existente das variantes.
    const baseVariant = [...initialGroup.variants].sort((a, b) => {
      if (!a._optStr) return -1;
      if (!b._optStr) return 1;
      return a._optStr.localeCompare(b._optStr);
    })[0];
    return baseVariant || null;
  });
  const [precoExibido, setPrecoExibido] = useState(null);
  const [loadingPreco, setLoadingPreco] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const getPrecoRef = useRef(getPreco);
  const getImagemRef = useRef(getImagem);
  const precoContextKeyRef = useRef(precoContextKey);
  getPrecoRef.current = getPreco;
  getImagemRef.current = getImagem;
  precoContextKeyRef.current = precoContextKey;

  const currentGroups = useMemo(
    () => allGroups.filter(g => g.serie === activeSerie),
    [allGroups, activeSerie]
  );

  const filteredGroups = useMemo(() => {
    return currentGroups.filter(g => {
      if (activeTipo === 'todos') return true;
      const tipo = getTipoModelo(g.model);
      return tipo === activeTipo;
    });
  }, [currentGroups, activeTipo]);

  const sortedVariants = useMemo(() => {
    if (!selectedGroup) return [];
    return [...selectedGroup.variants].sort((a, b) => {
      if (!a._optStr) return -1;
      if (!b._optStr) return 1;
      return a._optStr.localeCompare(b._optStr);
    });
  }, [selectedGroup]);

  const activeVariantIdRef = useRef(null);
  activeVariantIdRef.current = selectedGuindaste?.id ?? null;

  // Atualiza grupo selecionado se o conjunto de grupos mudar (ex: novos dados)
  useEffect(() => {
    if (!selectedGroup?.model) return;
    const refreshed = allGroups.find(
      g => g.model === selectedGroup.model && g.serie === selectedGroup.serie
    );
    if (refreshed && refreshed !== selectedGroup) {
      setSelectedGroup(refreshed);
    }
  }, [allGroups, selectedGroup]);

  useEffect(() => {
    const variantId = selectedGuindaste?.id;
    if (variantId == null || variantId === '') {
      setPrecoExibido(null);
      setLoadingPreco(false);
      return;
    }

    const variant =
      sortedVariants.find((v) => String(v.id) === String(variantId)) || selectedGuindaste;
    if (!variant?.id) return;

    const fetchPreco = getPrecoRef.current;
    if (!fetchPreco) return;

    const guindasteId = variant.id;
    const regiaoLabel = (precoContextKeyRef.current || '').trim();
    if (!regiaoLabel) {
      setPrecoExibido(null);
      setLoadingPreco(false);
      return;
    }

    let cancelled = false;

    const carregarPreco = async () => {
      setLoadingPreco(true);
      setPrecoExibido(null);

      try {
        const preco = await fetchPreco(guindasteId, regiaoLabel);
        if (cancelled || String(activeVariantIdRef.current) !== String(guindasteId)) return;

        const valor = parsePreco(preco);

        if (valor == null || valor <= 0) {
          setPrecoExibido(0);
          setSelectedGuindaste((prev) =>
            prev && String(prev.id) === String(guindasteId)
              ? { ...prev, ...variant, preco: 0 }
              : prev
          );
        } else {
          setPrecoExibido(valor);
          setSelectedGuindaste((prev) =>
            prev && String(prev.id) === String(guindasteId)
              ? { ...prev, ...variant, preco: valor }
              : prev
          );
        }
      } catch {
        if (cancelled || String(activeVariantIdRef.current) !== String(guindasteId)) return;
        setPrecoExibido(null);
      } finally {
        if (!cancelled && String(activeVariantIdRef.current) === String(guindasteId)) {
          setLoadingPreco(false);
        }
      }
    };

    carregarPreco();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGuindaste?.id, precoContextKey, sortedVariants]);

  useEffect(() => {
    const variant = selectedGuindaste;
    if (!variant?.id) {
      setPreviewImageUrl(null);
      setLoadingPreview(false);
      return;
    }

    const variantId = variant.id;

    if (isValidImageUrl(variant.imagem_url)) {
      setPreviewImageUrl(variant.imagem_url);
      setLoadingPreview(false);
      return;
    }

    const fetchImagem = getImagemRef.current;
    if (!fetchImagem) {
      setPreviewImageUrl(null);
      setLoadingPreview(false);
      return;
    }

    let cancelled = false;
    setLoadingPreview(true);
    setPreviewImageUrl(null);

    fetchImagem(variantId)
      .then(url => {
        if (cancelled || String(activeVariantIdRef.current) !== String(variantId)) return;
        setPreviewImageUrl(isValidImageUrl(url) ? url : null);
        setLoadingPreview(false);
      })
      .catch(() => {
        if (cancelled || String(activeVariantIdRef.current) !== String(variantId)) return;
        setPreviewImageUrl(null);
        setLoadingPreview(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGuindaste?.id]);

  const resetSelecaoVariante = useCallback(() => {
    setSelectedGuindaste(null);
    setPrecoExibido(null);
    setLoadingPreco(false);
    setPreviewImageUrl(null);
    setLoadingPreview(false);
  }, []);

  const handleGroupSelect = useCallback((group) => {
    setSelectedGroup(group);
    resetSelecaoVariante();
  }, [resetSelecaoVariante]);

  const handleSerie = useCallback((serie) => {
    setActiveSerie(serie);
    setSelectedGroup(null);
    resetSelecaoVariante();
  }, [resetSelecaoVariante]);

  const handleTipo = useCallback((tipo) => {
    setActiveTipo(tipo);
    setSelectedGroup(null);
    resetSelecaoVariante();
  }, [resetSelecaoVariante]);

  const handleVariantSelect = useCallback((variant) => {
    if (!variant?.id) return;
    setSelectedGuindaste({ ...variant, preco: undefined });
    setPrecoExibido(null);
    setLoadingPreco(true);
    setPreviewImageUrl(null);
    setLoadingPreview(true);
  }, []);

  const handleConfirmar = useCallback(() => {
    if (!selectedGuindaste?.id || loadingPreco) return;
    const precoFinal = precoExibido ?? selectedGuindaste.preco;
    if (precoFinal == null || precoFinal <= 0) return;
    if (onConfirm) {
      onConfirm({
        ...selectedGuindaste,
        preco: precoFinal,
      });
    }
  }, [selectedGuindaste, loadingPreco, precoExibido, onConfirm]);

  return {
    // Constantes
    SERIE_LABELS,
    TIPO_LABELS,

    // Grupos / modelos
    allGroups,
    currentGroups,
    filteredGroups,

    // Variantes
    selectedGroup,
    sortedVariants,

    // Seleção
    activeSerie,
    activeTipo,
    selectedGuindaste,

    // Preço / imagem
    precoExibido,
    loadingPreco,
    previewImageUrl,
    loadingPreview,

    // Setters / handlers
    setActiveSerie,
    setActiveTipo,
    setSelectedGroup,
    setSelectedGuindaste,
    handleGroupSelect,
    handleSerie,
    handleTipo,
    handleVariantSelect,
    handleConfirmar,

    // Helpers expostos
    variantLabel,
    isValidImageUrl,
  };
}
