import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, GeoJSON, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';

const selectionMarkerIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
import '../styles/MapView.css';
import RamMandiTooltip from './RamMandiTooltip';
import SearchBar from './SearchBar';
import MapLegend from './MapLegend';
import MapBranding from './MapBranding';

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

function MapClickHandler({ onMapClick, isSelectingLocation, selectedPosition, onSelectionPositionChange }) {
  useMapEvents({
    click: (e) => {
      const newLatLng = { lat: e.latlng.lat, lng: e.latlng.lng };
      if (isSelectingLocation) {
        if (onSelectionPositionChange) onSelectionPositionChange(newLatLng);
      } else if (onMapClick) {
        onMapClick(newLatLng);
      }
    },
  });
  return null;
}

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function FlyToTarget({ target }) {
  const map = useMap();

  useEffect(() => {
    if (!target?.position) return;
    map.flyTo(target.position, target.zoom || 12, { duration: 1.2 });
  }, [target, map]);

  return null;
}

const markerIconMap = {
  complete: L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    status: 'complete',
  }),
  partial: L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    status: 'partial',
  }),
  incomplete: L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    status: 'incomplete',
  }),
};

function getCompletionStatus(temple) {
  if (temple.status) return temple.status;
  const location = (temple.location || '').toLowerCase();
  const indianKeywords = [
    'uttar pradesh', 'maharashtra', 'karnataka', 'tamil nadu', 'andhra pradesh',
    'west bengal', 'odisha', 'rajasthan', 'gujarat', 'kerala', 'assam',
    'himachal pradesh', 'uttarakhand', 'new delhi', 'delhi', 'mumbai',
    'kolkata', 'madurai', 'puri', 'jaipur', 'hyderabad', 'thiruvananthapuram',
    'varanasi', 'ayodhya', 'india', 'bengaluru', 'bangalore',
  ];

  return indianKeywords.some((keyword) => location.includes(keyword)) ? 'complete' : 'partial';
}

function MapView({ templeList = [], onMarkerClick, onSearchSelect, showMapSearch = true, onMapClick, isSelectingLocation = false, selectedPosition = null, onSelectionPositionChange, onConfirmLocation, onCancelLocationSelection, searchTarget }) {
  const [indiaBoundary, setIndiaBoundary] = useState(null);

  const center = [20.5937, 78.9629];
  const zoom = 5;

  useEffect(() => {
    const fetchIndiaBoundary = async () => {
      try {
        const response = await fetch('/India/INDIA_STATES.geojson');
        const data = await response.json();
        setIndiaBoundary({ type: 'FeatureCollection', features: data.features });
      } catch (error) {
        console.error('Could not load India boundary:', error);
        setIndiaBoundary(null);
      }
    };

    fetchIndiaBoundary();
  }, []);

  const baseTempleLocations = useMemo(() => templeList, [templeList]);

  const templeMarkers = useMemo(() => {
    const baseGif = '/gifs/Rama Jai Shree Ram GIF.gif';
    const baseModel = '/models/ram-mandir.glb';

    // Avoid exact duplicate coordinates so clustering can still expand into separate markers.
    const duplicateCounts = {};

    return baseTempleLocations.map((temple, idx) => {
      const key = `${temple.lat.toFixed(6)}:${temple.lng.toFixed(6)}`;
      duplicateCounts[key] = (duplicateCounts[key] || 0) + 1;
      const duplicateIndex = duplicateCounts[key] - 1;

      const offsetAmount = duplicateIndex * 0.00012; // ~13m at this latitude
      const angle = (duplicateIndex * 60) * (Math.PI / 180);
      const latOffset = offsetAmount * Math.cos(angle);
      const lngOffset = offsetAmount * Math.sin(angle);
      const completionStatus = getCompletionStatus(temple);

      return {
        id: `temple-${idx}-${temple.name.replace(/\s+/g, '-').toLowerCase()}`,
        name: temple.name,
        position: [
          temple.lat + latOffset,
          temple.lng + lngOffset,
        ],
        location: temple.location || 'Ayodhya, Uttar Pradesh',
        gifUrl: baseGif,
        modelPath: temple.modelPath || baseModel,
        completionStatus,
        markerIcon: markerIconMap[completionStatus] || markerIconMap.partial,
      };
    });
  }, [baseTempleLocations]);

  const clusterIconCreate = (cluster) => {
    const count = cluster.getChildCount();
    
    // Count temples by completion status
    let completeCount = 0;
    let partialCount = 0;
    let incompleteCount = 0;
    
    // Get all child markers from the cluster
    const allChildren = cluster.getAllChildMarkers ? cluster.getAllChildMarkers() : [];
    allChildren.forEach((marker) => {
      const status = marker.options?.icon?.options?.status;
      if (status === 'complete') {
        completeCount++;
      } else if (status === 'partial') {
        partialCount++;
      } else if (status === 'incomplete') {
        incompleteCount++;
      } else {
        const iconUrl = marker.options?.icon?.options?.iconUrl || '';
        if (iconUrl.includes('green')) {
          completeCount++;
        } else if (iconUrl.includes('orange')) {
          partialCount++;
        } else {
          incompleteCount++;
        }
      }
    });
    
    // If no status data, use simple count
    if (completeCount === 0 && partialCount === 0 && incompleteCount === 0) {
      partialCount = count;
    }
    
    // Create pie chart SVG
    const createPieChartSVG = () => {
      const size = 40;
      const radius = 16;
      const cx = size / 2;
      const cy = size / 2;
      
      // Calculate angles (percentages)
      const total = completeCount + partialCount + incompleteCount;
      const completePercent = total > 0 ? (completeCount / total) * 100 : 0;
      const partialPercent = total > 0 ? (partialCount / total) * 100 : 0;
      const incompletePercent = 100 - completePercent - partialPercent;
      
      // Convert percentages to radians
      const completeAngle = (completePercent / 100) * 360;
      const partialAngle = (partialPercent / 100) * 360;
      
      // Helper function to create pie slice path or full circle
      const getPieSlice = (startAngle, endAngle, color) => {
        const deltaAngle = endAngle - startAngle;
        if (Math.abs(deltaAngle - 360) < 0.01 || Math.abs(deltaAngle) >= 360) {
          return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${color}" stroke="white" stroke-width="1"/>`;
        }

        const start = startAngle * (Math.PI / 180);
        const end = endAngle * (Math.PI / 180);
        const x1 = cx + radius * Math.cos(start);
        const y1 = cy + radius * Math.sin(start);
        const x2 = cx + radius * Math.cos(end);
        const y2 = cy + radius * Math.sin(end);
        const largeArc = endAngle - startAngle > 180 ? 1 : 0;
        const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
        return `<path d="${path}" fill="${color}" stroke="white" stroke-width="1"/>`;
      };

      // Create SVG pie chart
      let svgPaths = '';
      let currentAngle = -90; // Start at top
      
      // Complete (green)
      if (completePercent > 0) {
        svgPaths += getPieSlice(currentAngle, currentAngle + completeAngle, '#27ae60');
        currentAngle += completeAngle;
      }
      
      // Partial (orange)
      if (partialPercent > 0) {
        svgPaths += getPieSlice(currentAngle, currentAngle + partialAngle, '#f39c12');
        currentAngle += partialAngle;
      }
      
      // Incomplete (blue)
      if (incompletePercent > 0) {
        svgPaths += getPieSlice(currentAngle, 270, '#3498db');
      }
      
      // Center circle with count
      const centerCircle = `<circle cx="${cx}" cy="${cy}" r="10" fill="white" stroke="#e0e0e0" stroke-width="1"/>`;
      const countText = `<text x="${cx}" y="${cy + 0.5}" text-anchor="middle" dominant-baseline="central" alignment-baseline="central" font-size="13" font-weight="bold" fill="#333" font-family="sans-serif">${count}</text>`;
      
      return `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2))">
          ${svgPaths}
          ${centerCircle}
          ${countText}
        </svg>
      `;
    };
    
    return L.divIcon({
      html: createPieChartSVG(),
      className: 'custom-cluster-icon-pie',
      iconSize: L.point(40, 40),
    });
  };

  const handleClusterMouseOver = (e) => {
    const layer = e.layer || e.target;
    const count = layer.getChildCount ? layer.getChildCount() : 0;
    if (layer) {
      layer.bindPopup(`${count} temples in this area`, { closeButton: false, autoClose: false }).openPopup();
    }
  };

  const handleClusterMouseOut = (e) => {
    const layer = e.layer || e.target;
    if (layer) {
      layer.closePopup();
    }
  };

  const handleClusterClick = (e) => {
    const map = e.target._map || e.target._map || null;
    if (!map || !e.layer) return;

    const bounds = e.layer.getBounds();
    map.fitBounds(bounds, { animate: true, maxZoom: map.getZoom() + 3, duration: 0.5 });
  };

  return (
    <div className="map-view-container">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom className="map-instance">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {showMapSearch && (
          <div className="map-search-overlay">
            <SearchBar templeList={templeList} onSearchSelect={onSearchSelect} variant="map" />
          </div>
        )}

        {indiaBoundary && <IndiaBoundary data={indiaBoundary} />}
        {searchTarget?.position && <FlyToTarget target={searchTarget} />}

        <MapClickHandler
          onMapClick={onMapClick}
          isSelectingLocation={isSelectingLocation}
          selectedPosition={selectedPosition}
          onSelectionPositionChange={onSelectionPositionChange}
        />

        {isSelectingLocation && selectedPosition && (
          <Marker
            position={[selectedPosition.lat, selectedPosition.lng]}
            icon={selectionMarkerIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const latLng = e.target.getLatLng();
                if (onSelectionPositionChange) {
                  onSelectionPositionChange({ lat: latLng.lat, lng: latLng.lng });
                }
              },
            }}
          />
        )}

        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          spiderfyOnMaxZoom
          zoomToBoundsOnClick
          disableClusteringAtZoom={17}
          maxClusterRadius={60}
          spiderfyDistanceMultiplier={1.4}
          iconCreateFunction={clusterIconCreate}
          onClusterMouseOver={handleClusterMouseOver}
          onClusterMouseOut={handleClusterMouseOut}
          onClusterClick={handleClusterClick}
        >
          {templeMarkers.map((temple) => (
            <Marker
              key={temple.id}
              position={temple.position}
              icon={temple.markerIcon}
              eventHandlers={{
                click: () => {
                  if (onMarkerClick) onMarkerClick(temple);
                },
              }}
            >
              <Tooltip
                direction="top"
                offset={[0, -48]}
                opacity={1}
                className="custom-tooltip"
                permanent={false}
                interactive={false}
                sticky={false}
              >
                <RamMandiTooltip temple={temple} />
              </Tooltip>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      <MapBranding />

      <MapLegend />

      {isSelectingLocation && selectedPosition && (
        <div className="location-picker-overlay">
          <p>Drag the pin or click on the map to select location.</p>
          <p className="location-picker-coordinates">Selected: {selectedPosition.lat.toFixed(6)}, {selectedPosition.lng.toFixed(6)}</p>
          <div className="location-picker-buttons">
            <button type="button" className="btn btn-primary" onClick={onConfirmLocation}>Confirm Location</button>
            <button type="button" className="btn btn-tertiary" onClick={onCancelLocationSelection}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapView;
