import React, { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

function computeBbox(geojson) {
  if (!geojson?.features?.length) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const processCoord = ([x, y]) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };

  const processRing = (ring) => ring.forEach(processCoord);
  const processPolygon = (polygon) => polygon.forEach(processRing);
  const processMultiPolygon = (mp) => mp.forEach(processPolygon);

  for (const feature of geojson.features) {
    const geom = feature.geometry;
    if (!geom) continue;
    if (geom.type === 'Polygon') processPolygon(geom.coordinates);
    else if (geom.type === 'MultiPolygon') processMultiPolygon(geom.coordinates);
  }

  if (!Number.isFinite(minX)) return null;
  return [
    [minX, minY],
    [maxX, maxY],
  ];
}

function findFeatureByUF(geojson, uf) {
  const target = uf.toUpperCase();
  return geojson.features.find(
    (f) => (f.properties?.sigla_uf || '').toUpperCase() === target
  );
}

function formatUfLabel(uf) {
  return uf.toUpperCase();
}

const DEFAULT_COLORS = {
  background: '#f4f6f8',
  stateFill: 'rgba(203, 213, 225, 0.55)',
  stateFillHover: 'rgba(255, 193, 7, 0.65)',
  stateLine: '#64748b',
  stateSelected: 'rgba(255, 193, 7, 0.75)',
  municipioFill: 'rgba(226, 232, 240, 0.25)',
  municipioFillHover: 'rgba(255, 193, 7, 0.45)',
  municipioLine: 'rgba(100, 116, 139, 0.55)',
  areaOutline: 'rgba(255, 255, 255, 0.35)',
};

export default function BrazilMap({
  states,
  selectedUF,
  onSelectUF,
  municipiosGeoJson,
  selectedMunicipios,
  areaLayers = [],
  onToggleMunicipio,
  currentColor,
  markers = [],
  onMarkerClick,
  mode = 'default',
  onSelectSede,
  stateColors = new Map(),
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const popupRef = useRef(null);
  const hoveredStateRef = useRef(null);
  const hoveredMunicipioRef = useRef(null);

  const [isMapReady, setIsMapReady] = useState(false);
  const markersRef = useRef([]);
  const areaLayerIdsRef = useRef([]);

  const selectedStateFeature = useMemo(() => {
    if (!selectedUF || !states) return null;
    return findFeatureByUF(states, selectedUF);
  }, [selectedUF, states]);

  // Inicializa o mapa uma única vez
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [],
        glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
      },
      center: [-54, -14],
      zoom: 3.2,
      minZoom: 2,
      maxZoom: 12,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });

    map.on('load', () => {
      if (mapContainerRef.current) {
        mapContainerRef.current.style.backgroundColor = DEFAULT_COLORS.background;
      }
      mapRef.current = map;
      popupRef.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 12,
        className: 'map-territorial-popup',
      });
      setIsMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Adiciona/atualiza camada dos estados
  useEffect(() => {
    const map = mapRef.current;
    if (!isMapReady || !map || !states) return;

    const sourceId = 'states-source';
    const entityStateLayerId = 'entity-states-fill';
    const hasSource = map.getSource(sourceId);

    if (!hasSource) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: states,
        promoteId: 'codigo_ibge',
        generateId: false,
      });

      // Preenchimento das entidades no Brasil (visão nacional)
      map.addLayer({
        id: entityStateLayerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': [
            'match',
            ['get', 'sigla_uf'],
            ...Array.from(stateColors.entries()).flat(),
            'transparent',
          ],
          'fill-opacity': ['case', ['==', selectedUF || '', ''], 0.6, 0],
          'fill-outline-color': 'transparent',
        },
      });

      map.addLayer({
        id: 'states-fill',
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            DEFAULT_COLORS.stateFillHover,
            ['==', ['get', 'sigla_uf'], selectedUF || ''],
            DEFAULT_COLORS.stateSelected,
            DEFAULT_COLORS.stateFill,
          ],
          'fill-opacity': [
            'case',
            ['==', selectedUF || '', ''], 0.2,
            ['==', ['get', 'sigla_uf'], selectedUF || ''],
            0.05,
            0,
          ],
          'fill-outline-color': 'transparent',
        },
      });

      map.addLayer({
        id: 'states-line',
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': DEFAULT_COLORS.stateLine,
          'line-width': ['case', ['==', ['get', 'sigla_uf'], selectedUF || ''], 2.2, 0.8],
          'line-opacity': ['case', ['==', ['get', 'sigla_uf'], selectedUF || ''], 0.9, 0.2],
        },
      });

      map.on('mousemove', 'states-fill', (e) => {
        if (e.features?.length) {
          map.getCanvas().style.cursor = 'pointer';
          const feature = e.features[0];
          if (hoveredStateRef.current !== feature.id) {
            if (hoveredStateRef.current !== null) {
              map.setFeatureState(
                { source: sourceId, id: hoveredStateRef.current },
                { hover: false }
              );
            }
            hoveredStateRef.current = feature.id;
            map.setFeatureState(
              { source: sourceId, id: feature.id },
              { hover: true }
            );

            const { nome, sigla_uf } = feature.properties || {};
            const html = `<div class="map-popup-title">${nome || 'Estado'}</div><div class="map-popup-sub">${formatUfLabel(sigla_uf || '')}</div>`;
            popupRef.current
              .setHTML(html)
              .setLngLat(e.lngLat)
              .addTo(map);
          } else {
            popupRef.current.setLngLat(e.lngLat);
          }
        }
      });

      map.on('mouseleave', 'states-fill', () => {
        map.getCanvas().style.cursor = '';
        if (hoveredStateRef.current !== null) {
          map.setFeatureState(
            { source: sourceId, id: hoveredStateRef.current },
            { hover: false }
          );
          hoveredStateRef.current = null;
          popupRef.current.remove();
        }
      });

      map.on('click', 'states-fill', (e) => {
        const feature = e.features?.[0];
        if (feature?.properties?.sigla_uf) {
          onSelectUF(feature.properties.sigla_uf);
        }
      });
    } else {
      map.getSource(sourceId).setData(states);
    }

    map.setPaintProperty(entityStateLayerId, 'fill-color', [
      'match',
      ['get', 'sigla_uf'],
      ...Array.from(stateColors.entries()).flat(),
      'transparent',
    ]);
    map.setPaintProperty(entityStateLayerId, 'fill-opacity', ['case', ['==', selectedUF || '', ''], 0.6, 0]);

    map.setPaintProperty('states-fill', 'fill-color', [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      DEFAULT_COLORS.stateFillHover,
      ['==', ['get', 'sigla_uf'], selectedUF || ''],
      DEFAULT_COLORS.stateSelected,
      DEFAULT_COLORS.stateFill,
    ]);
    map.setPaintProperty('states-fill', 'fill-opacity', [
      'case',
      ['==', selectedUF || '', ''],
      0.2,
      ['==', ['get', 'sigla_uf'], selectedUF || ''],
      0.05,
      0,
    ]);
    map.setPaintProperty('states-line', 'line-width', [
      'case',
      ['==', ['get', 'sigla_uf'], selectedUF || ''],
      2.2,
      0.8,
    ]);
    map.setPaintProperty('states-line', 'line-opacity', [
      'case',
      ['==', ['get', 'sigla_uf'], selectedUF || ''],
      0.9,
      0.2,
    ]);
  }, [isMapReady, states, selectedUF, onSelectUF, stateColors]);

  // Ajusta o viewport (Brasil ou estado selecionado)
  useEffect(() => {
    const map = mapRef.current;
    if (!isMapReady || !map || !states) return;

    let bbox = null;
    let padding = { top: 40, right: 40, bottom: 40, left: 40 };

    if (selectedUF && selectedStateFeature) {
      bbox = computeBbox({ type: 'FeatureCollection', features: [selectedStateFeature] });
      // desconta a largura da sidebar lateral + gap
      padding = { top: 80, right: 420, bottom: 80, left: 80 };
    } else {
      bbox = computeBbox(states);
    }

    if (bbox) {
      map.fitBounds(bbox, {
        padding,
        duration: 900,
        easing: (t) => t * (2 - t),
      });
    }
  }, [isMapReady, selectedUF, selectedStateFeature, states]);

  // Adiciona/remove camada de municípios conforme a UF selecionada
  useEffect(() => {
    const map = mapRef.current;
    if (!isMapReady || !map) return;

    const municipioSourceId = 'municipios-source';
    const municipioBaseId = 'municipios-base';
    const municipioHoverId = 'municipios-hover';
    const municipioLineId = 'municipios-line';

    const cleanupAreaLayers = () => {
      areaLayerIdsRef.current.forEach((id) => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      areaLayerIdsRef.current = [];
    };

    const cleanupMunicipioLayers = () => {
      cleanupAreaLayers();
      [municipioHoverId, municipioBaseId, municipioLineId].forEach((id) => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      if (map.getSource(municipioSourceId)) map.removeSource(municipioSourceId);
    };

    if (!selectedUF || !municipiosGeoJson) {
      cleanupMunicipioLayers();
      return;
    }

    if (!map.getSource(municipioSourceId)) {
      map.addSource(municipioSourceId, {
        type: 'geojson',
        data: municipiosGeoJson,
        promoteId: 'codigo_ibge',
        generateId: false,
      });

      // Bordas finas dos municípios
      map.addLayer({
        id: municipioLineId,
        type: 'line',
        source: municipioSourceId,
        paint: {
          'line-color': DEFAULT_COLORS.municipioLine,
          'line-width': 0.65,
          'line-opacity': 0.75,
        },
      });

      // Preenchimento base dos municípios (neutro, para destacar camadas de área)
      map.addLayer({
        id: municipioBaseId,
        type: 'fill',
        source: municipioSourceId,
        paint: {
          'fill-color': DEFAULT_COLORS.municipioFill,
          'fill-opacity': 0.12,
          'fill-outline-color': 'transparent',
        },
      });

      // Camada de hover (acima de tudo)
      map.addLayer({
        id: municipioHoverId,
        type: 'fill',
        source: municipioSourceId,
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            DEFAULT_COLORS.municipioFillHover,
            'rgba(0,0,0,0)',
          ],
          'fill-opacity': 0.7,
          'fill-outline-color': 'transparent',
        },
      });

      map.on('mousemove', municipioHoverId, (e) => {
        if (e.features?.length) {
          const feature = e.features[0];
          if (hoveredMunicipioRef.current !== feature.id) {
            if (hoveredMunicipioRef.current !== null) {
              map.setFeatureState(
                { source: municipioSourceId, id: hoveredMunicipioRef.current },
                { hover: false }
              );
            }
            hoveredMunicipioRef.current = feature.id;
            map.setFeatureState(
              { source: municipioSourceId, id: feature.id },
              { hover: true }
            );

            const { nome, sigla_uf } = feature.properties || {};
            popupRef.current
              .setHTML(`<div class="map-popup-title">${nome || 'Município'}</div><div class="map-popup-sub">${formatUfLabel(sigla_uf || '')}</div>`)
              .setLngLat(e.lngLat)
              .addTo(map);
          } else {
            popupRef.current.setLngLat(e.lngLat);
          }
        }
      });

      map.on('mouseleave', municipioHoverId, () => {
        if (hoveredMunicipioRef.current !== null) {
          map.setFeatureState(
            { source: municipioSourceId, id: hoveredMunicipioRef.current },
            { hover: false }
          );
          hoveredMunicipioRef.current = null;
          popupRef.current.remove();
        }
      });

      map.on('click', municipioHoverId, (e) => {
        const feature = e.features?.[0];
        if (!feature?.properties) return;
        const { codigo_ibge, nome, sigla_uf } = feature.properties;
        if (mode === 'selectSede' && onSelectSede) {
          onSelectSede(String(codigo_ibge), nome, sigla_uf);
          return;
        }
        if (onToggleMunicipio) {
          onToggleMunicipio(String(codigo_ibge), nome, sigla_uf);
        }
      });
    } else {
      map.getSource(municipioSourceId).setData(municipiosGeoJson);
    }

    // Atualiza camadas de área de acordo com as entidades exibidas
    cleanupAreaLayers();

    const layersToRender = areaLayers.length > 0
      ? areaLayers
      : (selectedMunicipios.size > 0
          ? [{ id: 'default', color: currentColor, municipios: selectedMunicipios, selected: true }]
          : []);

    layersToRender.forEach((layer) => {
      const stops = [];
      (layer.municipios || new Map()).forEach((data, codigo) => {
        stops.push(codigo, data.cor || layer.color || currentColor);
      });

      const layerId = `municipios-area-${String(layer.id).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
      const lineId = `${layerId}-line`;
      areaLayerIdsRef.current.push(layerId, lineId);

      map.addLayer({
        id: layerId,
        type: 'fill',
        source: municipioSourceId,
        paint: {
          'fill-color': stops.length > 0 ? ['match', ['get', 'codigo_ibge'], ...stops, 'transparent'] : 'transparent',
          'fill-opacity': layer.selected ? 0.78 : 0.52,
          'fill-outline-color': DEFAULT_COLORS.areaOutline,
        },
      });

      map.addLayer({
        id: lineId,
        type: 'line',
        source: municipioSourceId,
        paint: {
          'line-color': ['match', ['get', 'codigo_ibge'], ...stops, 'transparent'],
          'line-width': 1.2,
          'line-opacity': 0.85,
        },
      });
    });
  }, [isMapReady, selectedUF, municipiosGeoJson, areaLayers, selectedMunicipios, currentColor, onToggleMunicipio, mode, onSelectSede]);

  // Gerencia marcadores de sede/instaladoras
  useEffect(() => {
    const map = mapRef.current;
    if (!isMapReady || !map) return;

    // limpa marcadores anteriores
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    markers.forEach((marker) => {
      const entity = marker.entity;
      const popupHtml = `
        <div class="map-territorial-popup-card">
          <div class="map-territorial-popup-dot" style="background-color:${marker.color || '#ffc107'}"></div>
          <div class="map-territorial-popup-body">
            <div class="map-territorial-popup-name">${marker.label || entity?.name || 'Entidade'}</div>
            ${entity?.cidade ? `<div class="map-territorial-popup-meta">${entity.cidade}/${entity.uf || ''}</div>` : ''}
            ${entity?.raw?.endereco ? `<div class="map-territorial-popup-address">${entity.raw.endereco}</div>` : ''}
            ${entity?.raw?.tipo ? `<div class="map-territorial-popup-type">${entity.raw.tipo}</div>` : ''}
          </div>
        </div>
      `;

      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 18,
        className: 'map-territorial-popup map-territorial-marker-popup',
      }).setHTML(popupHtml);

      const el = document.createElement('div');
      el.className = 'map-territorial-marker';
      el.style.backgroundColor = marker.color || '#ffc107';

      const m = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([marker.lng, marker.lat])
        .setPopup(popup)
        .addTo(map);

      if (onMarkerClick) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => onMarkerClick(marker));
      }

      // Hover mostra popup, sai esconde
      el.addEventListener('mouseenter', () => {
        popup.setLngLat([marker.lng, marker.lat]).addTo(map);
      });
      el.addEventListener('mouseleave', () => {
        popup.remove();
      });

      markersRef.current.push(m);
    });
  }, [isMapReady, markers, onMarkerClick]);

  // Limpa tudo ao desmontar
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, []);

  return (
    <div className="map-territorial-canvas" ref={mapContainerRef}>
      {!isMapReady && (
        <div className="map-territorial-loading">
          <div className="map-spinner" />
          <span>Carregando mapa...</span>
        </div>
      )}
    </div>
  );
}
