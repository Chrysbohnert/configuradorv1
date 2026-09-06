import React, { useEffect, useMemo, useState } from 'react';
import { getOccupiedAreas } from '../../api/areas';
import { TerritorialMap } from './TerritorialMap.jsx';
import { colorOf, UFS } from './constants.js';
import { useMunicipioNames } from './hooks.js';
import { ufOfMunicipio } from './utils.js';
import './AreaSelector.css';

export default function AreaSelector({ tipo, entidadeId = null, areas, onChange, disabled = false, allowSelectAll = true }) {
  const [selectedUF, setSelectedUF] = useState('');
  const [occupied, setOccupied] = useState([]);
  const [occupiedError, setOccupiedError] = useState('');

  useEffect(() => {
    let active = true;
    setOccupiedError('');
    getOccupiedAreas(tipo, entidadeId)
      .then((data) => active && setOccupied(data || []))
      .catch((error) => active && setOccupiedError(error.message || 'Erro ao carregar áreas ocupadas.'));
    return () => { active = false; };
  }, [tipo, entidadeId]);

  useEffect(() => {
    const firstUF = areas?.find((area) => area.uf)?.uf?.toUpperCase();
    if (!selectedUF && firstUF) setSelectedUF(firstUF);
  }, [areas, selectedUF]);

  const selected = useMemo(() => (areas || []).map((area) => String(area.codigo_ibge)), [areas]);
  const selectedUfs = useMemo(() => [...new Set(selected.map(ufOfMunicipio).filter(Boolean))], [selected]);
  const { names } = useMunicipioNames(selectedUfs);

  const owners = useMemo(() => {
    const result = new Map();
    occupied.forEach((area) => {
      const id = String(area.entidade_id);
      if (!result.has(id)) result.set(id, {
        id,
        nome: area.owner?.nome || `Entidade ${id}`,
        color: area.cor || colorOf(result.size),
        municipios: [],
      });
      result.get(id).municipios.push(String(area.codigo_ibge));
    });
    return [...result.values()];
  }, [occupied]);

  const paint = useMemo(() => {
    const result = new Map();
    owners.forEach((owner) => owner.municipios.forEach((code) => result.set(code, {
      color: owner.color,
      parceiroId: owner.id,
      parceiroNome: owner.nome,
    })));
    return result;
  }, [owners]);

  const toggle = (code) => {
    if (disabled) return;
    const key = String(code);
    const current = new Map((areas || []).map((area) => [String(area.codigo_ibge), area]));
    if (current.has(key)) current.delete(key);
    else current.set(key, { codigo_ibge: key, nome: names.get(key) || key, uf: ufOfMunicipio(key) });
    onChange([...current.values()]);
  };

  const toggleAll = async () => {
    if (!selectedUF || disabled) return;
    const { fetchMunicipiosList } = await import('./utils.js');
    const municipios = await fetchMunicipiosList(selectedUF);
    const current = new Map((areas || []).map((area) => [String(area.codigo_ibge), area]));
    const allSelected = municipios.every((municipio) => current.has(String(municipio.id)));
    municipios.forEach((municipio) => {
      const code = String(municipio.id);
      if (allSelected) current.delete(code);
      else current.set(code, { codigo_ibge: code, nome: municipio.nome, uf: selectedUF });
    });
    onChange([...current.values()]);
  };

  return <div className="area-selector">
    <div className="area-selector-header">
      <div><h4>Área de atuação</h4><p>Escolha uma UF e clique nos municípios para montar a área.</p></div>
      <span className="area-selector-count"><strong>{selected.length}</strong> selecionados</span>
    </div>
    <div className="area-selector-toolbar">
      <label>Estado em foco
        <select value={selectedUF} onChange={(event) => setSelectedUF(event.target.value)} disabled={disabled}>
          <option value="">Visão do Brasil</option>
          {UFS.map((uf) => <option key={uf.sigla} value={uf.sigla}>{uf.sigla}</option>)}
        </select>
      </label>
      {allowSelectAll && selectedUF && <button type="button" onClick={toggleAll} disabled={disabled}>Selecionar/desmarcar toda a UF</button>}
    </div>
    {occupiedError && <div className="area-selector-error">{occupiedError}</div>}
    <div className="area-selector-map">
      <TerritorialMap focusUf={selectedUF || null} onFocusUf={(uf) => setSelectedUF(uf || '')} paint={paint}
        owners={paint} pins={[]} onSelectRegion={() => {}} extraUfs={[...selectedUfs, ...occupied.map((area) => area.uf)]}
        selectable selected={selected} onToggleMunicipio={toggle} />
    </div>
    <div className="area-selector-basket">
      <div className="area-selector-basket-title"><strong>Municípios selecionados</strong><span>{selected.length}</span></div>
      {selected.length ? <div className="area-selector-chips">{(areas || []).map((area) => <span key={area.codigo_ibge}>
        {area.nome || names.get(String(area.codigo_ibge)) || area.codigo_ibge}/{area.uf || ufOfMunicipio(String(area.codigo_ibge))}
        {!disabled && <button type="button" aria-label={`Remover ${area.nome || area.codigo_ibge}`} onClick={() => toggle(area.codigo_ibge)}>×</button>}
      </span>)}</div> : <p>Nenhum município selecionado.</p>}
    </div>
    <div className="area-selector-legend">
      <strong>Legenda</strong><span><i style={{ background: 'var(--erp-primary, #ffc928)' }} />Seleção atual</span>
      {owners.map((owner) => <span key={owner.id}><i style={{ background: owner.color }} />{owner.nome} ({owner.municipios.length})</span>)}
      {!owners.length && <small>Nenhuma área ocupada por outra entidade deste tipo.</small>}
    </div>
    <small className="area-selector-help">Áreas coloridas pertencem a outras entidades e exigirão confirmação para transferência.</small>
  </div>;
}
