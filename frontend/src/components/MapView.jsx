import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/MapView.css';
import RamMandiTooltip from './RamMandiTooltip';

function IndiaBoundary({ data }) {
  const map = useMap();

  useEffect(() => {
    if (!data || !data.features || data.features.length === 0) return;

    const bounds = L.geoJSON(data).getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [data, map]);

  return (
    <GeoJSON
      data={data}
      style={{
        color: '#0056b3',
        weight: 1.5,
        opacity: 0.88,
        fill: true,
        fillColor: 'rgba(0, 86, 179, 0.06)',
        fillOpacity: 0.06,
      }}
      onEachFeature={(feature, layer) => {
        layer.bindTooltip(feature.properties.STNAME || feature.properties.name || 'India boundary');
      }}
    />
  );
}

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function MapView({ onMarkerClick, selectedTemple }) {
  const [indiaBoundary, setIndiaBoundary] = useState(null);

  useEffect(() => {
    if (selectedTemple?.position) {
      // Optional: preserve selected temple highlight in future
      console.debug('Selected temple', selectedTemple.name);
    }
  }, [selectedTemple]);
  
  // Default center: India
  const center = [20.5937, 78.9629];
  const zoom = 5;

  // Load India boundary GeoJSON on mount
  useEffect(() => {
    const fetchIndiaBoundary = async () => {
      try {
        console.log('Loading India boundary from local file...');
        const response = await fetch('/India/INDIA_STATES.geojson');
        const data = await response.json();

        // Use the local multi-state GeoJSON dataset directly
        const indiaData = {
          type: 'FeatureCollection',
          features: data.features,
        };

        console.log('India boundary loaded:', indiaData.features.length, 'features');
        setIndiaBoundary(indiaData);
      } catch (error) {
        console.error('Could not load India boundary:', error);
        setIndiaBoundary(null);
      }
    };

    fetchIndiaBoundary();
  }, []);

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
        
        {/* India Boundary Overlay - Shows proper political boundaries */}
        {indiaBoundary && (
          <IndiaBoundary data={indiaBoundary} />
        )}
        
        {/* Ram Mandir Marker */}
        <Marker
          position={ramMandir.position}
          eventHandlers={{
            click: () => {
              if (onMarkerClick) {
                onMarkerClick(ramMandir);
              }
            },
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
