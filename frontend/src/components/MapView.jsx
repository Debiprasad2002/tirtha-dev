import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, GeoJSON, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
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
      console.debug('Selected temple', selectedTemple.name);
    }
  }, [selectedTemple]);

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

  const baseTempleLocations = useMemo(() => [
    // Uttar Pradesh (Ayodhya cluster)
    { name: 'Ram Mandir', lat: 26.7956, lng: 82.1947 },
    { name: 'Hanuman Garhi', lat: 26.7957, lng: 82.1980 },
    { name: 'Kanak Bhavan', lat: 26.7990, lng: 82.1925 },
    { name: 'Nageshwarnath Temple', lat: 26.7998, lng: 82.1941 },
    { name: 'Treta Ke Thakur', lat: 26.7957, lng: 82.1940 },

    // Maharashtra
    { name: 'Shirdi Sai Baba Temple', lat: 19.7615, lng: 74.4777 },
    { name: 'Trimbakeshwar Temple', lat: 19.9384, lng: 73.5172 },
    { name: 'Siddhivinayak Temple', lat: 19.0176, lng: 72.8570 },

    // Delhi
    { name: 'Akshardham Temple', lat: 28.6127, lng: 77.2773 },
    { name: 'Birla Mandir (Laxminarayan)', lat: 28.6078, lng: 77.2192 },

    // Karnataka
    { name: 'Mysore Chamundeshwari', lat: 12.3051, lng: 76.6589 },
    { name: 'Chamundeshwari Temple', lat: 12.3051, lng: 76.6589 },
    { name: 'Udupi Sri Krishna', lat: 13.3409, lng: 74.7421 },

    // Tamil Nadu
    { name: 'Meenakshi Amman Temple', lat: 9.9198, lng: 78.1196 },
    { name: 'Brihadeeswarar Temple', lat: 10.7868, lng: 79.1311 },

    // Andhra Pradesh
    { name: 'Tirumala Tirupati Temple', lat: 13.6833, lng: 79.3500 },
    { name: 'Kanaka Durga Temple', lat: 16.5098, lng: 80.6458 },

    // West Bengal
    { name: 'Dakshineswar Kali Temple', lat: 22.6530, lng: 88.3699 },

    // Odisha
    { name: 'Jagannath Temple', lat: 19.8167, lng: 85.8245 },

    // Rajasthan
    { name: 'Birla Mandir Jaipur', lat: 26.8340, lng: 75.7937 },
    { name: 'Govind Dev Ji Temple', lat: 26.9239, lng: 75.8267 },

    // Gujarat
    { name: 'Somnath Temple', lat: 20.8907, lng: 70.4033 },

    // Kerala
    { name: 'Sree Padmanabhaswamy Temple', lat: 8.4879, lng: 76.9474 },
    { name: 'Guruvayur Temple', lat: 10.5965, lng: 76.0423 },

    // Assam
    { name: 'Kamakhya Temple', lat: 26.1719, lng: 91.7300 },

    // Himachal Pradesh
    { name: 'Jakhoo Temple', lat: 31.1035, lng: 77.1835 },

    // Uttarakhand
    { name: 'Badrinath Temple', lat: 30.7452, lng: 79.4933 },
  ], []);

  const templeMarkers = useMemo(() => {
    const baseGif = '/gifs/Rama Jai Shree Ram GIF.gif';
    const baseModel = '/models/ram-mandir.glb';

    return baseTempleLocations.map((temple, idx) => ({
      id: `temple-${idx}-${temple.name.replace(/\s+/g, '-').toLowerCase()}`,
      name: temple.name,
      position: [
        temple.lat + (Math.random() - 0.5) * 0.0003,
        temple.lng + (Math.random() - 0.5) * 0.0003,
      ],
      location: 'Ayodhya, Uttar Pradesh',
      gifUrl: baseGif,
      modelPath: baseModel,
    }));
  }, [baseTempleLocations]);

  const clusterIconCreate = (cluster) => {
    const count = cluster.getChildCount();
    return L.divIcon({
      html: `<div class="cluster-icon">${count}</div>`,
      className: 'custom-cluster-icon',
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

        {indiaBoundary && <IndiaBoundary data={indiaBoundary} />}

        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          spiderfyOnMaxZoom
          zoomToBoundsOnClick
          iconCreateFunction={clusterIconCreate}
          onClusterMouseOver={handleClusterMouseOver}
          onClusterMouseOut={handleClusterMouseOut}
          onClusterClick={handleClusterClick}
        >
          {templeMarkers.map((temple) => (
            <Marker
              key={temple.id}
              position={temple.position}
              eventHandlers={{
                click: () => {
                  if (onMarkerClick) onMarkerClick(temple);
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -12]} opacity={1} className="custom-tooltip" permanent={false}>
                <RamMandiTooltip temple={temple} />
              </Tooltip>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}

export default MapView;
