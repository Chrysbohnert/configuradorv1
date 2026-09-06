import React from 'react';

/** Pin (drop shape) rendered on the map, with inverse scale to zoom. */
export function MapMarker({ pin, x, y, k, onHover, onLeave }) {
  const fillClass = pin.kind === 'instaladora' ? 'map-pin-install'
    : pin.kind === 'venda' ? 'map-pin-sale'
    : pin.kind === 'cliente' ? 'map-pin-cliente'
    : 'map-pin-install';

  return (
    <g
      transform={`translate(${x},${y}) scale(${1 / k})`}
      onMouseMove={(e) => onHover(e, pin.label, pin.sub)}
      onMouseLeave={onLeave}
      style={{ cursor: 'pointer' }}
    >
      <path
        d="M0,0 C-7,-9 -9,-12 -9,-16 A9,9 0 1 1 9,-16 C9,-12 7,-9 0,0 Z"
        className={fillClass}
        stroke="white"
        strokeWidth={1.2}
      />
      <circle cy={-16} r={3.2} fill="white" />
    </g>
  );
}
