import React from 'react';
import '../styles/MapLegend.css';

function MapLegend() {
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
    <div className="map-legend">
      <div className="legend-title">Legend</div>
      <div className="legend-items">
        {legendItems.map((item) => (
          <div key={item.label} className={`legend-item ${item.className}`}>
            <div className="legend-color-marker"></div>
            <span className="legend-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MapLegend;
