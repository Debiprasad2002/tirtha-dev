import React, { useEffect, useState } from 'react';
import '../styles/MapLegend.css';

function MapLegend() {
  const storageKey = 'mapLegendCollapsed';

  const getInitialCollapsedState = () => {
    if (typeof window === 'undefined') return false;

    const savedState = window.localStorage.getItem(storageKey);
    if (savedState !== null) {
      return savedState === 'true';
    }

    return window.matchMedia('(max-width: 768px)').matches;
  };

  const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsedState);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, String(isCollapsed));
    }
  }, [isCollapsed]);

  const legendItems = [
    {
      color: '#27ae60',
      label: 'Complete - 3D model available',
      className: 'legend-item-complete'
    },
    {
      color: '#f39c12',
      label: 'Partial - Building in progress',
      className: 'legend-item-partial'
    },
    {
      color: '#3498db',
      label: 'Incomplete - Planning phase',
      className: 'legend-item-incomplete'
    }
  ];

  return (
    <div className={`map-legend ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="legend-header">
        <div className="legend-title">Legend</div>
        <button
          type="button"
          className="legend-toggle"
          onClick={() => setIsCollapsed((prev) => !prev)}
          aria-expanded={!isCollapsed}
          aria-controls="map-legend-content"
        >
          {isCollapsed ? 'Show' : 'Hide'}
        </button>
      </div>

      <div
        id="map-legend-content"
        className={`legend-content ${isCollapsed ? 'collapsed' : ''}`}
        aria-hidden={isCollapsed}
      >
        <div className="legend-items">
          {legendItems.map((item) => (
            <div key={item.label} className={`legend-item ${item.className}`}>
              <div className="legend-color-marker"></div>
              <span className="legend-label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MapLegend;
