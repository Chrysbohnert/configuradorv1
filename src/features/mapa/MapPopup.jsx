import React from 'react';

/** Tooltip that follows cursor over the map. */
export function MapPopup({ x, y, text, sub }) {
  return (
    <div className="map-popup" style={{ left: x, top: y }}>
      <div className="map-popup-text">{text}</div>
      {sub && <div className="map-popup-sub">{sub}</div>}
    </div>
  );
}
