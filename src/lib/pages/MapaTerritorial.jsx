import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import UnifiedHeader from '../../components/UnifiedHeader';
import BrazilMap from '../../features/mapa/BrazilMap';
import { useMapData } from '../../features/mapa/useMapData';
import {
  getEntidades,
  getAreas,
  saveAreas,
  getInstaladorasComAreaComum,
} from '../../api/areas';
import '../../styles/MapaTerritorial.css';

const ENTITY_COLORS = [
  '#ffc107', '#3a7bd5', '#10b981', '#ef4444', '#8b5cf6',
  '#f97316', '#06b6d4', '#ec4899', '#6366f1', '#84cc16',
];

function assignColor(index) {
  return ENTITY_COLORS[index % ENTITY_COLORS.length];
}

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function findMunicipioFeature(geojson, cityName) {
  if (!geojson?.features || !cityName) return null;
  const target = normalizeText(cityName);
  return geojson.features.find((f) => normalizeText(f.properties?.nome) === target);
}

function computeCentroid(feature) {
  if (!feature?.geometry) return null;
  let x = 0;
  let y = 0;
  let count = 0;

  const add = ([cx, cy]) => {
    x += cx;
    y += cy;
    count += 1;
  };

  const geom = feature.geometry;
  if (geom.type === 'Polygon') {
    geom.coordinates.forEach((ring) => ring.forEach(add));
  } else if (geom.type === 'MultiPolygon') {
    geom.coordinates.forEach((poly) => poly.forEach((ring) => ring.forEach(add)));
  }

  return count ? [x / count, y / count] : null;
}

const ENTITY_TYPE_LABELS = {
  instaladora: 'Instaladora',
  concessionaria: 'Concessionária',
  representante: 'Representante',
};

const FILTERS = [
  { key: 'todos', label: 'Todos' },
  { key: 'instaladora', label: 'Instaladoras' },
  { key: 'concessionaria', label: 'Concessionárias' },
  { key: 'representante', label: 'Representantes' },
];

function entityKey(entity) {
  return `${entity.tipo}:${entity.id}`;
}

export default function MapaTerritorial() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedFreteId = searchParams.get('freteId');

  const { states, loadMunicipios, municipiosByUF, loadingStates, loadingMunicipios, error } = useMapData();

  const [allEntities, setAllEntities] = useState([]);
  const [filter, setFilter] = useState('todos');
  const [selectedEntityKey, setSelectedEntityKey] = useState(
    preselectedFreteId ? `instaladora:${preselectedFreteId}` : null
  );
  const [mode, setMode] = useState('default');
  const [selectedUF, setSelectedUF] = useState(null);
  const [selectedMunicipios, setSelectedMunicipios] = useState(new Map());
  const [currentColor, setCurrentColor] = useState(ENTITY_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [allAreas, setAllAreas] = useState(new Map()); // key -> Map(codigo_ibge -> data)
  const [relatedInstallers, setRelatedInstallers] = useState([]);

  const entities = useMemo(() => {
    if (filter === 'todos') return allEntities;
    return allEntities.filter((e) => e.tipo === filter);
  }, [allEntities, filter]);

  const selectedEntity = useMemo(
    () => allEntities.find((e) => entityKey(e) === selectedEntityKey) || null,
    [allEntities, selectedEntityKey]
  );

  const municipiosGeoJson = useMemo(
    () => (selectedUF ? municipiosByUF[selectedUF.toUpperCase()] || null : null),
    [selectedUF, municipiosByUF]
  );

  useEffect(() => {
    if (selectedUF) loadMunicipios(selectedUF);
  }, [selectedUF, loadMunicipios]);

  // Carrega todas as entidades territoriais uma única vez
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingEntities(true);
      try {
        const data = await getEntidades();
        const colored = (data || []).map((e, idx) => ({
          id: e.id,
          tipo: e.tipo || 'instaladora',
          name: e.nome || e.oficina || 'Entidade',
          cidade: e.cidade,
          uf: e.uf,
          color: e.cor || assignColor(idx),
          raw: e,
        }));
        if (!cancelled) setAllEntities(colored);
      } catch (err) {
        console.error('Erro ao carregar entidades territoriais:', err);
      } finally {
        if (!cancelled) setLoadingEntities(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Carrega áreas da entidade selecionada
  useEffect(() => {
    if (!selectedEntity) {
      setSelectedMunicipios(new Map());
      setSelectedUF(null);
      setRelatedInstallers([]);
      return;
    }

    setSelectedUF(selectedEntity.uf?.toUpperCase() || null);
    setCurrentColor(selectedEntity.color);

    let cancelled = false;
    async function loadAreasData() {
      try {
        const areas = await getAreas(selectedEntity.tipo, selectedEntity.id);
        const map = new Map();
        (areas || []).forEach((a) => {
          map.set(String(a.codigo_ibge), {
            codigo_ibge: String(a.codigo_ibge),
            nome: a.nome,
            uf: a.uf,
            cor: a.cor || selectedEntity.color,
          });
        });
        if (!cancelled) setSelectedMunicipios(map);
      } catch (err) {
        console.error('Erro ao carregar áreas de atuação:', err);
      }
    }

    async function loadRelated() {
      if (selectedEntity.tipo === 'instaladora') {
        if (!cancelled) setRelatedInstallers([]);
        return;
      }
      try {
        const data = await getInstaladorasComAreaComum(selectedEntity.tipo, selectedEntity.id);
        if (!cancelled) setRelatedInstallers(data || []);
      } catch (err) {
        console.error('Erro ao carregar instaladoras relacionadas:', err);
        if (!cancelled) setRelatedInstallers([]);
      }
    }

    loadAreasData();
    loadRelated();
    return () => { cancelled = true; };
  }, [selectedEntity]);

  // Carrega áreas de todas as entidades quando o filtro é "todos"
  useEffect(() => {
    if (filter !== 'todos' || allEntities.length === 0) {
      setAllAreas(new Map());
      return;
    }

    let cancelled = false;
    async function loadAllAreas() {
      const result = new Map();
      await Promise.all(
        allEntities.map(async (entity) => {
          try {
            const areas = await getAreas(entity.tipo, entity.id);
            const map = new Map();
            (areas || []).forEach((a) => {
              map.set(String(a.codigo_ibge), {
                codigo_ibge: String(a.codigo_ibge),
                nome: a.nome,
                uf: a.uf,
                cor: a.cor || entity.color,
              });
            });
            result.set(entityKey(entity), map);
          } catch (err) {
            console.error(`Erro ao carregar áreas de ${entityKey(entity)}:`, err);
          }
        })
      );
      if (!cancelled) setAllAreas(result);
    }
    loadAllAreas();
    return () => { cancelled = true; };
  }, [filter, allEntities]);

  const handleSelectEntity = useCallback((entity) => {
    setMode('default');
    setFilter(entity.tipo);
    setSelectedEntityKey(entityKey(entity));
  }, []);

  // Se o filtro for alterado para um tipo específico incompatível com a entidade selecionada, limpa a seleção
  useEffect(() => {
    if (!selectedEntity || filter === 'todos') return;
    if (selectedEntity.tipo !== filter) {
      setSelectedEntityKey(null);
      setSelectedMunicipios(new Map());
      setSelectedUF(null);
    }
  }, [filter, selectedEntity]);

  const handleSelectUF = useCallback((uf) => {
    const upper = uf?.toUpperCase() || null;

    if (mode === 'selectSede') {
      setSelectedUF(upper);
      return;
    }

    if (selectedEntity) {
      if (upper && upper !== selectedEntity.uf?.toUpperCase()) return;
      setSelectedUF(selectedEntity.uf?.toUpperCase() || null);
      return;
    }

    setSelectedUF(upper);
  }, [mode, selectedEntity]);

  const handleBackToBrazil = useCallback(() => {
    setSelectedEntityKey(null);
    setSelectedUF(null);
    setSelectedMunicipios(new Map());
    setMode('default');
    setFilter('todos');
  }, []);

  // Aplica nova cor à área da entidade selecionada
  useEffect(() => {
    if (!selectedEntity) return;
    setSelectedMunicipios((prev) => {
      let changed = false;
      const next = new Map();
      prev.forEach((value, key) => {
        if (value.cor !== currentColor) {
          changed = true;
          next.set(key, { ...value, cor: currentColor });
        } else {
          next.set(key, value);
        }
      });
      return changed ? next : prev;
    });
  }, [currentColor, selectedEntity]);

  const handleToggleMunicipio = useCallback((codigoIbge, nome, uf) => {
    if (mode === 'selectSede' || !selectedEntity) return;
    setSelectedMunicipios((prev) => {
      const next = new Map(prev);
      const key = String(codigoIbge);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, { codigo_ibge: key, nome, uf, cor: currentColor });
      }
      return next;
    });
  }, [currentColor, mode, selectedEntity]);

  const handleSelectAll = useCallback(() => {
    if (!municipiosGeoJson) return;
    setSelectedMunicipios((prev) => {
      const next = new Map(prev);
      for (const feature of municipiosGeoJson.features) {
        const { codigo_ibge, nome, sigla_uf } = feature.properties || {};
        const key = String(codigo_ibge);
        if (!next.has(key)) {
          next.set(key, { codigo_ibge: key, nome, uf: sigla_uf, cor: currentColor });
        }
      }
      return next;
    });
  }, [municipiosGeoJson, currentColor]);

  const handleClearSelection = useCallback(() => {
    setSelectedMunicipios(new Map());
  }, []);

  const handleSaveAreas = useCallback(async () => {
    if (!selectedEntity) return;
    setSaving(true);
    try {
      const areas = Array.from(selectedMunicipios.values()).map((m) => ({
        codigo_ibge: m.codigo_ibge,
        nome: m.nome,
        uf: m.uf,
        cor: m.cor,
      }));
      await saveAreas(selectedEntity.tipo, selectedEntity.id, areas);
      alert('Área de atuação salva com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar áreas de atuação:', err);
      alert(err.message || 'Erro ao salvar área de atuação.');
    } finally {
      setSaving(false);
    }
  }, [selectedEntity, selectedMunicipios]);

  const handleStartNewEntity = useCallback(() => {
    setMode('selectSede');
    setSelectedEntityKey(null);
    setSelectedUF(null);
    setSelectedMunicipios(new Map());
  }, []);

  const handleSelectSede = useCallback((codigoIbge, nome, uf) => {
    navigate(`/gerenciar-fretes?cidade=${encodeURIComponent(nome)}&uf=${encodeURIComponent(uf)}`);
  }, [navigate]);

  // Marcadores de sede para todas as entidades visíveis
  const sedeMarkers = useMemo(() => {
    if (!municipiosGeoJson || filter !== 'todos' || selectedEntity) return [];
    const markers = [];
    for (const entity of entities) {
      if (!entity.cidade || !entity.uf) continue;
      const feature = findMunicipioFeature(municipiosGeoJson, entity.cidade);
      if (!feature) continue;
      const centroid = computeCentroid(feature);
      if (!centroid) continue;
      markers.push({
        id: `sede-${entityKey(entity)}`,
        lng: centroid[0],
        lat: centroid[1],
        label: `${entity.name} — ${entity.cidade}/${entity.uf}`,
        color: entity.color,
        entity,
      });
    }
    return markers;
  }, [entities, municipiosGeoJson, filter, selectedEntity]);

  // Marcador da entidade selecionada (sempre visível quando há foco em UF)
  const selectedMarker = useMemo(() => {
    if (!selectedEntity || !municipiosGeoJson) return [];
    const feature = findMunicipioFeature(municipiosGeoJson, selectedEntity.cidade);
    if (!feature) return [];
    const centroid = computeCentroid(feature);
    if (!centroid) return [];
    return [
      {
        id: `sede-${entityKey(selectedEntity)}`,
        lng: centroid[0],
        lat: centroid[1],
        label: `${selectedEntity.name} — ${selectedEntity.cidade}/${selectedEntity.uf}`,
        color: selectedEntity.color,
        entity: selectedEntity,
      },
    ];
  }, [selectedEntity, municipiosGeoJson]);

  const markers = useMemo(
    () => (selectedEntity ? selectedMarker : sedeMarkers),
    [selectedEntity, selectedMarker, sedeMarkers]
  );

  // Camadas de área a serem exibidas no mapa
  const areaLayers = useMemo(() => {
    const layers = [];

    if (filter === 'todos') {
      const selectedKey = selectedEntity ? entityKey(selectedEntity) : null;
      allAreas.forEach((municipios, key) => {
        const entity = allEntities.find((e) => entityKey(e) === key);
        if (!entity || key === selectedKey) return;
        layers.push({
          id: key,
          color: entity.color,
          municipios,
          selected: false,
        });
      });
    }

    if (selectedEntity) {
      layers.push({
        id: entityKey(selectedEntity),
        color: selectedEntity.color,
        municipios: selectedMunicipios,
        selected: true,
      });
    }

    return layers;
  }, [selectedEntity, selectedMunicipios, filter, allAreas, allEntities]);

  const currentMunicipios = useMemo(
    () => Array.from(selectedMunicipios.values()),
    [selectedMunicipios]
  );

  const selectedStateName = useMemo(() => {
    if (!selectedUF || !states) return 'Brasil';
    const feature = states.features.find(
      (f) => (f.properties?.sigla_uf || '').toUpperCase() === selectedUF.toUpperCase()
    );
    return feature?.properties?.nome || selectedUF;
  }, [selectedUF, states]);

  const relatedInstallerKeys = useMemo(
    () => new Set(relatedInstallers.map((i) => `instaladora:${i.id}`)),
    [relatedInstallers]
  );

  if (!user) return null;

  return (
    <div className="mapa-territorial-page">
      <UnifiedHeader title="Mapa Territorial" user={user} />

      <div className="mapa-territorial-container">
        <div className="mapa-territorial-main">
          {(loadingStates || loadingEntities || (selectedUF && loadingMunicipios)) && (
            <div className="mapa-territorial-overlay">
              <div className="mapa-territorial-overlay-content">
                <div className="map-spinner" />
                <span>
                  {loadingStates
                    ? 'Carregando dados do Brasil...'
                    : loadingEntities
                    ? 'Carregando entidades...'
                    : 'Carregando municípios...'}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="mapa-territorial-error">
              <strong>Erro ao carregar dados geográficos:</strong>
              <p>{error}</p>
              <button onClick={() => window.location.reload()}>Tentar novamente</button>
            </div>
          )}

          <BrazilMap
            states={states}
            selectedUF={selectedUF}
            onSelectUF={handleSelectUF}
            municipiosGeoJson={municipiosGeoJson}
            selectedMunicipios={selectedMunicipios}
            areaLayers={areaLayers}
            onToggleMunicipio={handleToggleMunicipio}
            currentColor={currentColor}
            markers={markers}
            onMarkerClick={handleSelectEntity}
            mode={mode}
            onSelectSede={handleSelectSede}
          />
        </div>

        <aside className="mapa-territorial-sidebar">
          <div className="mapa-sidebar-section">
            <h3 className="mapa-sidebar-title">Visão atual</h3>
            <div className="mapa-current-state">
              <span className="mapa-state-label">{selectedStateName}</span>
              {selectedUF && <span className="mapa-state-uf">{selectedUF}</span>}
            </div>
          </div>

          <div className="mapa-sidebar-section">
            <h3 className="mapa-sidebar-title">Exibir</h3>
            <div className="mapa-filter-tabs">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  className={`mapa-filter-tab ${filter === f.key ? 'active' : ''}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mapa-sidebar-section">
            <div className="mapa-sidebar-row">
              <h3 className="mapa-sidebar-title">Entidades</h3>
              {loadingEntities && <span className="mapa-count-badge">...</span>}
              {!loadingEntities && <span className="mapa-count-badge">{entities.length}</span>}
            </div>

            <div className="mapa-entities-list">
              {entities.length === 0 ? (
                <p className="mapa-empty">
                  {filter === 'todos'
                    ? 'Nenhuma entidade territorial cadastrada.'
                    : `Nenhuma ${ENTITY_TYPE_LABELS[filter]?.toLowerCase()} cadastrada.`}
                </p>
              ) : (
                <ul>
                  {entities.map((entity) => (
                    <li
                      key={entityKey(entity)}
                      className={`mapa-entity-item ${selectedEntityKey === entityKey(entity) ? 'active' : ''} ${
                        relatedInstallerKeys.has(entityKey(entity)) ? 'highlight' : ''
                      }`}
                      onClick={() => handleSelectEntity(entity)}
                    >
                      <span
                        className="mapa-entity-dot"
                        style={{ backgroundColor: entity.color }}
                      />
                      <div className="mapa-entity-info">
                        <span className="mapa-entity-name">{entity.name}</span>
                        <span className="mapa-entity-meta">
                          {ENTITY_TYPE_LABELS[entity.tipo]} • {entity.cidade}/{entity.uf}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {filter === 'instaladora' && (
              <button className="mapa-btn mapa-btn-secondary mapa-btn-block" onClick={handleStartNewEntity}>
                + Nova instaladora no mapa
              </button>
            )}
          </div>

          {mode === 'selectSede' && (
            <div className="mapa-sidebar-section mapa-info-box">
              <h3 className="mapa-sidebar-title">Definir sede</h3>
              <p className="mapa-empty">
                Clique em um estado e depois no município que representa a sede da nova instaladora.
              </p>
              <button className="mapa-btn mapa-btn-secondary mapa-btn-block" onClick={handleBackToBrazil}>
                Cancelar
              </button>
            </div>
          )}

          {selectedEntity && mode === 'default' && (
            <div className="mapa-sidebar-section">
              <div className="mapa-sidebar-row">
                <h3 className="mapa-sidebar-title">Área de atuação</h3>
                <span className="mapa-count-badge">{currentMunicipios.length}</span>
              </div>

              <div className="mapa-current-state" style={{ marginBottom: 12 }}>
                <div>
                  <div className="mapa-state-label" style={{ fontSize: 14 }}>
                    {selectedEntity.name}
                  </div>
                  <div className="mapa-entity-meta" style={{ marginTop: 2 }}>
                    {ENTITY_TYPE_LABELS[selectedEntity.tipo]} • Sede: {selectedEntity.cidade}/{selectedEntity.uf}
                  </div>
                </div>
              </div>

              <div className="mapa-color-picker">
                <span className="mapa-color-label">Cor da área</span>
                <div className="mapa-color-options">
                  {ENTITY_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`mapa-color-option ${currentColor === color ? 'active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setCurrentColor(color)}
                      aria-label={`Selecionar cor ${color}`}
                    />
                  ))}
                </div>
              </div>

              <div className="mapa-actions">
                <button className="mapa-btn mapa-btn-secondary" onClick={handleSelectAll}>
                  Todos
                </button>
                <button className="mapa-btn mapa-btn-danger" onClick={handleClearSelection}>
                  Limpar
                </button>
              </div>

              <button
                className="mapa-btn mapa-btn-primary mapa-btn-block"
                onClick={handleSaveAreas}
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar área de atuação'}
              </button>

              <div className="mapa-municipios-list">
                {currentMunicipios.length === 0 ? (
                  <p className="mapa-empty">Nenhum município selecionado.</p>
                ) : (
                  <ul>
                    {currentMunicipios.map((m) => (
                      <li key={m.codigo_ibge} className="mapa-municipio-item">
                        <span
                          className="mapa-municipio-dot"
                          style={{ backgroundColor: m.cor || currentColor }}
                        />
                        <span className="mapa-municipio-name">{m.nome}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {selectedEntity && selectedEntity.tipo !== 'instaladora' && relatedInstallers.length > 0 && (
            <div className="mapa-sidebar-section">
              <h3 className="mapa-sidebar-title">Instaladoras na mesma área</h3>
              <div className="mapa-entities-list">
                <ul>
                  {relatedInstallers.map((i) => (
                    <li key={i.id} className="mapa-entity-item mapa-related-item">
                      <span className="mapa-entity-dot" style={{ backgroundColor: '#10b981' }} />
                      <div className="mapa-entity-info">
                        <span className="mapa-entity-name">{i.nome}</span>
                        <span className="mapa-entity-meta">{i.cidade}/{i.uf}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {(selectedEntity || selectedUF) && (
            <div className="mapa-sidebar-section">
              <button className="mapa-btn mapa-btn-primary mapa-btn-block" onClick={handleBackToBrazil}>
                ← Voltar ao Brasil
              </button>
            </div>
          )}

          <div className="mapa-sidebar-footer">
            <small>Clique no mapa para explorar estados e municípios.</small>
          </div>
        </aside>
      </div>
    </div>
  );
}
