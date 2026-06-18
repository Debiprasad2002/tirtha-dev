import React, { useState, useEffect } from 'react';
import { buildGoogleMapsSearchUrl, reverseGeocode, resolveLocationDetails } from '../utils/geocoding';

function LocationCard({ selectedLocation, onBack, onRequestSite }) {
  const [loading, setLoading] = useState(true);
  const [locationDetails, setLocationDetails] = useState(null);

  useEffect(() => {
    if (!selectedLocation) return;

    let active = true;
    const fetchGeocoding = async () => {
      setLoading(true);
      try {
        const data = await reverseGeocode(selectedLocation.lat, selectedLocation.lng);
        if (!active) return;

        const resolved = resolveLocationDetails(data, {
          lat: selectedLocation.lat,
          lng: selectedLocation.lng
        });
        
        console.log('[DEBUG] [LocationCard] Final title selected by resolveLocationDetails():', resolved.title);
        setLocationDetails(resolved);
      } catch (err) {
        console.error('[DEBUG] [LocationCard] Failed to geocode location:', err);
        if (active) {
          setLocationDetails({
            title: `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`,
            subtitle: '',
            coordinates: selectedLocation,
            isGeocoded: false
          });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      };
    };

    fetchGeocoding();

    return () => {
      active = false;
    };
  }, [selectedLocation.lat, selectedLocation.lng]);

  if (loading) {
    return (
      <div className="sidebar-temple-details location-card-loading" style={{ padding: '20px 0', textAlign: 'center' }}>
        <div className="shimmer-loader" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ height: '35px', width: '80px', borderRadius: '4px', background: 'var(--border-color)', opacity: 0.6 }} />
          <div style={{ height: '180px', borderRadius: '8px', background: 'var(--border-color)', opacity: 0.6 }} />
          <div style={{ height: '28px', width: '70%', borderRadius: '4px', background: 'var(--border-color)', opacity: 0.6, margin: '10px auto 0 auto' }} />
          <div style={{ height: '18px', width: '90%', borderRadius: '4px', background: 'var(--border-color)', opacity: 0.6, margin: '0 auto' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '10px' }}>Resolving location details...</p>
        </div>
      </div>
    );
  }

  const { title, subtitle, coordinates } = locationDetails || {};
  const mapsUrl = buildGoogleMapsSearchUrl({
    placeName: title,
    location: subtitle,
    coordinates,
  });

  return (
    <div className="sidebar-temple-details location-card-container">
      <button 
        type="button" 
        className="temple-details-back-btn" 
        onClick={onBack}
      >
        <span className="material-icons">arrow_back</span>
        Back
      </button>

      <div className="temple-details-img-container" style={{ position: 'relative' }}>
        <img 
          className="temple-details-img" 
          src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=600&q=80" 
          alt="Map Location" 
        />
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(0,0,0,0.5)',
          color: '#fff',
          padding: '8px 12px',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backdropFilter: 'blur(4px)'
        }}>
          <span className="material-icons" style={{ fontSize: '16px' }}>place</span>
          Custom Location Pin
        </div>
      </div>

      <h2 className="temple-details-name" style={{ wordBreak: 'break-word' }}>{title}</h2>
      
      {subtitle && (
        <div className="temple-details-location" style={{ display: 'flex', alignItems: 'flex-start' }}>
          <span className="material-icons" style={{ marginTop: '2px' }}>location_on</span>
          <span>{subtitle}</span>
        </div>
      )}

      {/* Secondary Location Details section */}
      <div className="temple-details-section">
        <h3 className="temple-details-section-title">Location Details</h3>
        <div className="temple-details-coords" style={{ marginTop: '6px', fontSize: '13px', lineHeight: '1.6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Latitude:</span>
            <span style={{ fontWeight: 600 }}>{coordinates.lat.toFixed(6)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Longitude:</span>
            <span style={{ fontWeight: 600 }}>{coordinates.lng.toFixed(6)}</span>
          </div>
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '6px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Map Provider:</span>
            <a 
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="google-maps-location-link"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: '#2563eb',
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              Google Maps
              <span className="material-icons" style={{ fontSize: '14px' }}>open_in_new</span>
            </a>
          </div>
        </div>
      </div>

      <div className="temple-details-actions" style={{ marginTop: '15px' }}>
        <button 
          type="button" 
          className="btn btn-primary" 
          onClick={() => onRequestSite(coordinates)}
          style={{ background: '#10b981' }}
        >
          <span className="material-icons">add_location_alt</span>
          Submit Site Request
        </button>
      </div>
    </div>
  );
}

export default LocationCard;
