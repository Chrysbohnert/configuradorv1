/**
 * TerritorialMap.jsx — Core SVG map component.
 * 900x700 viewBox, d3 geoIdentity reflectY fitExtent, k1..40, wheel zoom,
 * pointer pan/clamp, reset on focus change, constant strokes, macro state
 * interaction, municipality interaction only selectable or focusUF, tooltip,
 * inverse-scale pins, loading badge, controls.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { geoIdentity, geoPath } from 'd3-geo';
import { MAP_W, MAP_H, MIN_K, MAX_K, ufByCode } from './constants.js';
import { centroidOf, ufOfMunicipio } from './utils.js';
import { useStatesGeo, useMunicipiosGeo, useMunicipioNames } from './hooks.js';
import { MapMarker } from './MapMarker.jsx';
import { MapPopup } from './MapPopup.jsx';

const W = MAP_W;
const H = MAP_H;

function clampView(v) {
  const k = Math.min(MAX_K, Math.max(MIN_K, v.k));
  return {
    k,
    x: Math.min(0, Math.max(W - W * k, v.x)),
    y: Math.min(0, Math.max(H - H * k, v.y)),
  };
}

function zoomBy(v, f) {
  const k = Math.min(MAX_K, Math.max(MIN_K, v.k * f));
  const cx = W / 2, cy = H / 2;
  return clampView({ k, x: cx - ((cx - v.x) / v.k) * k, y: cy - ((cy - v.y) / v.k) * k });
}

export function TerritorialMap({
  focusUf,
  onFocusUf,
  paint,           // Map<municipioId, { color, parceiroId, parceiroNome }>
  owners,          // Map<municipioId, { color, parceiroId, parceiroNome }>
  pins = [],
  onSelectRegion,
  extraUfs = [],
  selectable = false,
  selected,        // string[]
  onToggleMunicipio,
}) {
  const boxRef = useRef(null);
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const [hover, setHover] = useState(null);
  const [hoverMuni, setHoverMuni] = useState(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const [panning, setPanning] = useState(false);

  const selectedSet = useMemo(() => new Set(selected || []), [selected]);

  const { states, loadingStates, statesError } = useStatesGeo();
  const { geoByUf, loadGeo, loadingGeo, geoError } = useMunicipiosGeo();

  // Determine which UFs need municipality data
  const ufsToLoad = useMemo(() => {
    const s = new Set(extraUfs.filter(Boolean).map((u) => u.toUpperCase()));
    if (focusUf) s.add(focusUf.toUpperCase());
    return [...s];
  }, [extraUfs, focusUf]);

  // Load municipality geo data for needed UFs
  useEffect(() => {
    ufsToLoad.forEach((uf) => loadGeo(uf));
  }, [ufsToLoad.join(',')]);

  // Municipality names for tooltips
  const { names, namesError } = useMunicipioNames(ufsToLoad);

  const stateFeatures = useMemo(() => states?.features || [], [states]);

  const projection = useMemo(() => {
    if (!stateFeatures.length) return null;
    const target = focusUf
      ? stateFeatures.filter((f) => {
          const code = f.properties?.codarea || f.properties?.codigo_ibge || String(f.id || '');
          const uf = ufByCode.get(code.slice(0, 2));
          return uf?.sigla === focusUf;
        })
      : stateFeatures;
    if (!target.length) return null;
    return geoIdentity().reflectY(true).fitExtent([[24, 24], [W - 24, H - 24]], {
      type: 'FeatureCollection', features: target,
    });
  }, [stateFeatures, focusUf]);

  const path = useMemo(() => projection ? geoPath(projection) : null, [projection]);

  // Reset zoom/pan when focus changes
  useEffect(() => { setView({ k: 1, x: 0, y: 0 }); }, [focusUf]);

  // Wheel zoom (non-passive)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * W;
      const py = ((e.clientY - rect.top) / rect.height) * H;
      setView((v) => {
        const k = Math.min(MAX_K, Math.max(MIN_K, v.k * Math.pow(2, -e.deltaY / 400)));
        if (k === v.k) return v;
        return clampView({ k, x: px - ((px - v.x) / v.k) * k, y: py - ((py - v.y) / v.k) * k });
      });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  // Gather all municipality features from loaded geo
  const muniFeatures = useMemo(() => {
    const out = [];
    const seen = new Set();
    Object.values(geoByUf).forEach((geo) => {
      (geo?.features || []).forEach((f) => {
        const code = String(f.properties?.codarea || f.properties?.codigo_ibge || f.id || '');
        if (code && !seen.has(code)) { seen.add(code); out.push({ ...f, _code: code }); }
      });
    });
    return out;
  }, [geoByUf]);

  // Filter visible municipalities
  const visibleMunis = useMemo(() => {
    if (!path) return [];
    return muniFeatures.filter((f) => {
      const uf = ufOfMunicipio(f._code);
      if (focusUf) return uf === focusUf;
      return paint.has(f._code) || selectedSet.has(f._code);
    });
  }, [muniFeatures, focusUf, paint, path, selectedSet]);

  // Pin screen positions
  const pinPoints = useMemo(() => {
    if (!projection) return [];
    const byCode = new Map(muniFeatures.map((f) => [f._code, f]));
    return pins
      .filter((p) => (focusUf ? ufOfMunicipio(p.municipioId) === focusUf : true))
      .map((p) => {
        const f = byCode.get(p.municipioId);
        if (!f) return null;
        const c = centroidOf(f);
        if (!c) return null;
        const xy = projection(c);
        if (!xy) return null;
        return { ...p, x: xy[0], y: xy[1] };
      })
      .filter(Boolean);
  }, [pins, muniFeatures, projection, focusUf]);

  const loading = loadingStates || loadingGeo;
  const error = statesError || geoError || namesError;

  function moveTip(e, text, sub) {
    const rect = boxRef.current?.getBoundingClientRect();
    if (rect) setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, text, sub });
  }

  function onPointerDown(e) {
    if (e.button !== 0) return;
    dragRef.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
    setPanning(true);
    e.target.setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e) {
    const d = dragRef.current;
    if (!d) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = ((e.clientX - d.x) / rect.width) * W;
    const dy = ((e.clientY - d.y) / rect.height) * H;
    if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 3) d.moved = true;
    setView((v) => clampView({ k: v.k, x: d.vx + dx, y: d.vy + dy }));
  }

  function endPan(e) {
    e.target.releasePointerCapture?.(e.pointerId);
    setPanning(false);
    setTimeout(() => { dragRef.current = null; }, 0);
  }

  const dragged = () => dragRef.current?.moved === true;
  const sw = (n) => n / view.k;

  function codeOf(f) {
    return f._code || String(f.properties?.codarea || f.properties?.codigo_ibge || f.id || '');
  }

  function ufOfState(f) {
    const code = String(f.properties?.codarea || f.properties?.codigo_ibge || f.id || '');
    return ufByCode.get(code.slice(0, 2));
  }

  return (
    <div ref={boxRef} className="map-territorial-canvas">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="map-territorial-svg"
        style={{ cursor: panning ? 'grabbing' : 'grab' }}
        role="img"
        aria-label="Mapa do Brasil"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        <rect width={W} height={H} fill="#f0f4f7" />
        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          {/* States */}
          {path && stateFeatures.map((f) => {
            const uf = ufOfState(f);
            const isFocus = uf?.sigla === focusUf;
            if (focusUf && !isFocus) return null;
            return (
              <path
                key={codeOf(f)}
                d={path(f) || ''}
                fill={isFocus ? '#e5eceb' : '#eef1f3'}
                stroke="#475569"
                strokeWidth={sw(1.4)}
                strokeLinejoin="round"
                style={{ cursor: 'pointer' }}
                onMouseMove={(e) => moveTip(e, uf?.nome || '', focusUf ? undefined : 'Clique para ampliar')}
                onMouseLeave={() => setHover(null)}
                onClick={() => {
                  if (dragged()) return;
                  if (uf) onFocusUf(isFocus ? null : uf.sigla);
                }}
              />
            );
          })}

          {/* Municipalities */}
          {path && visibleMunis.map((f) => {
            const code = codeOf(f);
            const p = paint.get(code);
            const owner = p || (owners ? owners.get(code) : null);
            const isHover = hoverMuni === code;
            const isSel = selectable && selectedSet.has(code);
            const interactive = selectable || !!focusUf;

            const fill = isSel
              ? 'var(--erp-primary, #ffc928)'
              : p ? p.color
              : isHover ? '#dbe9e5' : 'transparent';

            const fillOpacity = isSel
              ? (isHover ? 0.95 : 0.75)
              : p ? (isHover ? 0.95 : 0.7)
              : isHover ? 1 : 0;

            return (
              <path
                key={code}
                d={path(f) || ''}
                fill={fill}
                fillOpacity={fillOpacity}
                stroke="#334155"
                strokeWidth={sw(isHover ? 2 : 1.2)}
                strokeLinejoin="round"
                style={{
                  cursor: selectable || owner ? 'pointer' : 'inherit',
                  pointerEvents: interactive ? 'auto' : 'none',
                }}
                onMouseMove={(e) => {
                  setHoverMuni(code);
                  moveTip(
                    e,
                    names.get(code) || `Municipio ${code}`,
                    selectable
                      ? (isSel ? 'Clique para remover' : 'Clique para adicionar')
                      : owner?.parceiroNome,
                  );
                }}
                onMouseLeave={() => { setHoverMuni((c) => c === code ? null : c); setHover(null); }}
                onClick={(e) => {
                  if (dragged()) return;
                  if (selectable) { e.stopPropagation(); onToggleMunicipio?.(code); return; }
                  if (!owner) return;
                  e.stopPropagation();
                  onSelectRegion(owner.parceiroId, code);
                }}
              />
            );
          })}

          {/* Pins */}
          {pinPoints.map((p) => (
            <MapMarker
              key={`${p.kind}-${p.id}`}
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
        <div className="map-loading-badge">Carregando malha do IBGE...</div>
      )}
      {error && <div className="map-error-badge">{error}</div>}

      <div className="map-controls">
        <button type="button" aria-label="Aproximar" title="Aproximar" onClick={() => setView((v) => zoomBy(v, 1.6))}>+</button>
        <button type="button" aria-label="Afastar" title="Afastar" onClick={() => setView((v) => zoomBy(v, 1 / 1.6))}>-</button>
        {view.k > 1 && (
          <button type="button" className="map-reset-btn" onClick={() => setView({ k: 1, x: 0, y: 0 })}>Redefinir zoom</button>
        )}
      </div>

      {focusUf && (
        <button type="button" className="map-back-btn" onClick={() => onFocusUf(null)}>
          &larr; Voltar ao Brasil
        </button>
      )}
    </div>
  );
}
