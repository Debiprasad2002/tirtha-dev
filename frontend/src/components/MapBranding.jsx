import React from 'react';
import { useTheme } from '../hooks/useTheme';
import tirthaLogoDark from '../assets/icons/ui/tirtha-logo-dark.webp';
import tirthaLogoLight from '../assets/icons/ui/tirtha-logo-light.webp';
import '../styles/MapBranding.css';

function MapBranding() {
  const { isDark } = useTheme();
  const logo = isDark ? tirthaLogoDark : tirthaLogoLight;

  return (
    <div className="map-branding">
      <img src={logo} alt="Project Tirtha Logo" className="branding-logo-img" />
      <div className="branding-text">
        <div className="branding-title">Project Tirtha</div>
        <div className="branding-tagline">Heritage Map</div>
      </div>
    </div>
  );
}

export default MapBranding;
