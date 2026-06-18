import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import AccordionItem from './AccordionItem';
import PlatformStatistics from './StatisticsCard';
import LocationCard from './LocationCard';
import { buildGoogleMapsSearchUrl } from '../utils/geocoding';
import '../styles/Sidebar.css';

// Import footer icons
import byNcSa from '../assets/icons/ui/by-nc-sa.svg';
import byNcNd from '../assets/icons/ui/by-nc-nd.svg';
import lfdsLogoDark from '../assets/icons/ui/lfds-logo-dark.webp';
import lfdsLogoLight from '../assets/icons/ui/lfds-logo-light.webp';
import tirthaLogoDark from '../assets/icons/ui/tirtha-logo-dark.webp';
import tirthaLogoLight from '../assets/icons/ui/tirtha-logo-light.webp';

function Sidebar({ isVisible, onMobileClose, selectedTemple = null, onTempleClose, onOpenModel, onContributeClick, onRequestSite }) {
  const { t } = useTranslation(['sidebar', 'common']);
  const { isDark } = useTheme();
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const [closeNonce, setCloseNonce] = useState(0);

  const menuItems = t('sidebar:menuItems', { returnObjects: true });
  const lfdsLogo = isDark ? lfdsLogoDark : lfdsLogoLight;
  const tirthaLogo = isDark ? tirthaLogoDark : tirthaLogoLight;
  
  // Define footer icons with imported images
  const footerIcons = [
    {
      image: byNcSa,
      title: "CC BY-NC-SA License",
      href: "https://creativecommons.org/licenses/by-nc-sa/4.0/"
    },
    {
      image: byNcNd,
      title: "CC BY-NC-ND License",
      href: "https://creativecommons.org/licenses/by-nc-nd/4.0/"
    }
  ];

  // Create accordion ID mapping for internal links
  const getAccordionId = useCallback((title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }, []);

  const visibleMenuItems = useMemo(
    () => menuItems.filter((item) => !['About Meditation Center', 'Top Contributor'].includes(item.title)),
    [menuItems]
  );

  const handleMouseDown = () => {
    setIsResizing(true);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return;
    
    // Constrain width between 250px and 500px
    const newWidth = e.clientX;
    if (newWidth >= 250 && newWidth <= 500) {
      setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  React.useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [handleMouseMove, isResizing]);

  React.useEffect(() => {
    if (!isVisible) {
      // Closing the sidebar should reset all accordion items to collapsed state.
      setCloseNonce((prev) => prev + 1);
    }
  }, [isVisible]);

  const selectedTempleCoordinates = selectedTemple
    ? {
        lat: selectedTemple.position ? selectedTemple.position[0] : selectedTemple.lat,
        lng: selectedTemple.position ? selectedTemple.position[1] : selectedTemple.lng,
      }
    : null;
  const selectedTempleMapsUrl = buildGoogleMapsSearchUrl({
    placeName: selectedTemple?.resolvedLocationName || selectedTemple?.name,
    location: selectedTemple?.location,
    coordinates: selectedTempleCoordinates,
  });

  return (
    <aside 
      className={`sidebar ${isVisible ? 'visible' : 'hidden'}`}
      style={{ width: `${sidebarWidth}px` }}
    >
      <>
        <div className="sidebar-header">
          <img src={tirthaLogo} alt="Project Tirtha" className="sidebar-logo" />
          <div className="sidebar-title-container">
            <h1 className="sidebar-title">Project Tirtha</h1>
            <span className="beta-badge">Beta</span>
          </div>
          <button
            type="button"
            className="sidebar-mobile-close"
            onClick={() => onMobileClose?.()}
            aria-label="Close sidebar"
          >
            <span className="material-icons">chevron_left</span>
          </button>
        </div>
        <div className="sidebar-content">
          {selectedTemple ? (
            selectedTemple.isCustomLocation ? (
              <LocationCard
                selectedLocation={selectedTemple}
                onBack={onTempleClose}
                onRequestSite={onRequestSite}
              />
            ) : (
              <div className="sidebar-temple-details">
              <button 
                type="button" 
                className="temple-details-back-btn" 
                onClick={onTempleClose}
              >
                <span className="material-icons">arrow_back</span>
                Back
              </button>

              <div className="temple-details-img-container">
                <img 
                  className="temple-details-img" 
                  src={`https://via.placeholder.com/300x200?text=${encodeURIComponent(selectedTemple.name)}`} 
                  alt={selectedTemple.name} 
                />
              </div>

              <h2 className="temple-details-name">{selectedTemple.name}</h2>
              
              <div className="temple-details-location">
                <span className="material-icons">location_on</span>
                {selectedTemple.location || 'India'}
                <a 
                  href={selectedTempleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="google-maps-location-link"
                  title="View on Google Maps"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    marginLeft: '6px',
                    color: '#2563eb',
                    textDecoration: 'none',
                    verticalAlign: 'middle'
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '16px' }}>open_in_new</span>
                </a>
              </div>


              {selectedTemple.description && (
                <div className="temple-details-section">
                  <h3 className="temple-details-section-title">Description</h3>
                  <p className="temple-details-description">{selectedTemple.description}</p>
                </div>
              )}

              {selectedTemple.details && (
                <div className="temple-details-section">
                  <h3 className="temple-details-section-title">Details</h3>
                  <div className="temple-details-section-content">
                    {Array.isArray(selectedTemple.details) ? (
                      <ul>
                        {selectedTemple.details.map((detail, idx) => (
                          <li key={idx}>{detail}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>{selectedTemple.details}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="temple-details-section">
                <h3 className="temple-details-section-title">Coordinates</h3>
                <div className="temple-details-coords">
                  Lat: {selectedTemple.position ? selectedTemple.position[0]?.toFixed(5) : selectedTemple.lat?.toFixed(5)}
                  <br />
                  Lng: {selectedTemple.position ? selectedTemple.position[1]?.toFixed(5) : selectedTemple.lng?.toFixed(5)}
                </div>
              </div>

              <div className="temple-details-actions">
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={onOpenModel}
                >
                  <span className="material-icons">view_in_ar</span>
                  View 3D Model
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={onContributeClick}
                >
                  <span className="material-icons">cloud_upload</span>
                  Contribute Images
                </button>
              </div>
            </div>
          )) : (
            <>
              {visibleMenuItems.map((item) => (
                <div key={`${getAccordionId(item.title)}-${closeNonce}`} data-accordion-id={getAccordionId(item.title)}>
                  <AccordionItem
                    title={item.title}
                    content={item.content}
                    isOpen={false}
                    isCelebration={item.isCelebration || false}
                  />
                </div>
              ))}

              <AccordionItem
                title="Project Statistics & Contributors"
                content={<PlatformStatistics />}
                isOpen={false}
              />
            </>
          )}

          <div className="sidebar-footer">
            <div className="footer-icons">
              {footerIcons.map((iconItem, index) => (
                <a 
                  key={index}
                  href={iconItem.href} 
                  target="_blank"
                  rel="noopener noreferrer"
                  title={iconItem.title} 
                  className="icon-link"
                >
                  <img src={iconItem.image} alt={iconItem.title} className="footer-icon-img" />
                </a>
              ))}
            </div>

            <div className="footer-logo">
              <img src={lfdsLogo} alt="Dassault Systèmes La Fondation" />
            </div>

            <div className="copyright">
              <small>
                © 2023-26 Project Tirtha, <a href="https://www.niser.ac.in/~smishra/" target="_blank" rel="noopener noreferrer" className="footer-link">Subhankar Mishra's Lab</a>, <a href="https://www.niser.ac.in/scos/" target="_blank" rel="noopener noreferrer" className="footer-link">School of Computer Sciences</a>, NISER. All rights reserved.
              </small>
            </div>
          </div>
        </div>
      </>
      <div 
        className="sidebar-resize-handle"
        onMouseDown={handleMouseDown}
        title="Drag to resize sidebar"
      />
    </aside>
  );
}

export default React.memo(Sidebar);
