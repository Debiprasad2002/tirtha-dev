import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/MapView.css';
import RamMandiTooltip from './RamMandiTooltip';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function MapView({ onMarkerClick, selectedTemple }) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Default center: India
  const center = [20.5937, 78.9629];
  const zoom = 5;

  // Ram Mandir coordinates
  const ramMandir = {
    id: 'ram-mandir',
    name: 'Ram Mandir',
    position: [26.7956, 82.1943],
  };

  return (
    <div className="map-view-container">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="map-instance"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Ram Mandir Marker */}
        <Marker
          position={ramMandir.position}
          eventHandlers={{
            click: () => {
              if (onMarkerClick) {
                onMarkerClick(ramMandir);
              }
            },
            mouseover: () => setShowTooltip(true),
            mouseout: () => setShowTooltip(false),
          }}
        >
          {/* Tooltip for hover - shows custom content */}
          <Tooltip 
            direction="top"
            offset={[0, -10]}
            opacity={1}
            className="custom-tooltip"
            permanent={false}
          >
            <RamMandiTooltip />
          </Tooltip>
        </Marker>
      </MapContainer>
    </div>
  );
}

export default MapView;
