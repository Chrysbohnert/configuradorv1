import React from 'react';
import { Painel } from './MapFilters.jsx';

export function MapLegend({ itens, cores, focusUf, areaDe }) {
  return (
    <Painel titulo="Legenda dinamica">
      {itens.length ? (
        <ul className="mapa-legend-list">
          {itens.map((p) => (
            <li key={p.id} className="mapa-legend-item">
              <span className="mapa-legend-dot" style={{ backgroundColor: cores.get(p.id) }} />
              <span className="mapa-legend-name">{p.nome}</span>
              <span className="mapa-legend-count">{areaDe(p.id)} mun.</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mapa-empty-text">
          Nenhuma area ativa {focusUf ? `em ${focusUf}` : ''}.
        </p>
      )}
    </Painel>
  );
}
