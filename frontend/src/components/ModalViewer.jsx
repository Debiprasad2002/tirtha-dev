import React, { useEffect, lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchSiteStats } from '../services/sites.service';
import { buildGoogleMapsSearchUrl } from '../utils/geocoding';
import '../styles/ModalViewer.css';

const ModelViewer3D = lazy(() => import('./ModelViewer3D'));
const DETAILS_PREVIEW_LENGTH = 220;

function ModalViewer({ isOpen, onClose, temple, onContributeClick }) {
  const { t } = useTranslation(['common']);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 720px)').matches : false
  );
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [openSections, setOpenSections] = useState({
    description: true,
    details: true,
    coordinates: true,
    contributors: true,
  });
  const [siteStats, setSiteStats] = useState({
    total_images: 0,
    total_contributors: 0,
    top_contributors: [],
  });
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState('');

  const modelPath = temple?.modelPath || '/models/ram-mandir.glb';

  const templeInfo = {
    title: temple?.name || 'Ram Mandir',
    location: temple?.location || 'Ayodhya, Uttar Pradesh',
    coordinates: {
      lat: temple?.position?.[0] || 26.7956,
      lng: temple?.position?.[1] || 82.1947,
    },
    description: temple?.description || `Explore the virtual 3D view of ${temple?.name || 'Ram Mandir'}.`,
    details: temple?.details || [
      'This is a demo model preview for the selected temple.',
      'Click to explore the 3D model in detail.',
      'Information is currently placeholder content for demo purposes.',
    ],
  };
  const mapsUrl = buildGoogleMapsSearchUrl({
    placeName: temple?.resolvedLocationName || templeInfo.title,
    location: templeInfo.location,
    coordinates: templeInfo.coordinates,
  });
  const detailsText = typeof temple?.details === 'string' ? temple.details.trim() : '';
  const detailsList = Array.isArray(temple?.details)
    ? temple.details.filter((detail) => (typeof detail === 'string' ? detail.trim() : Boolean(detail)))
    : [];
  const hasExpandableDetails = detailsText.length > DETAILS_PREVIEW_LENGTH;
  const detailsPreview = hasExpandableDetails
    ? `${detailsText.slice(0, DETAILS_PREVIEW_LENGTH).trimEnd()}...`
    : detailsText;
  const rankIcons = ['🥇', '🥈', '🥉'];

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia('(max-width: 720px)');

    const handleViewportChange = (event) => {
      setIsMobile(event.matches);
    };

    /* eslint-disable react-hooks/set-state-in-effect */
    setIsMobile(mediaQuery.matches);
    /* eslint-enable react-hooks/set-state-in-effect */

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleViewportChange);
      return () => mediaQuery.removeEventListener('change', handleViewportChange);
    }

    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!isOpen) {
      setIsDetailsExpanded(false);
      setOpenSections({
        description: true,
        details: true,
        coordinates: true,
        contributors: true,
      });
      return;
    }

    // On mobile, keep only high-priority content open initially to reduce vertical clutter.
    if (isMobile) {
      setOpenSections({
        description: true,
        details: false,
        coordinates: false,
        contributors: false,
      });
      return;
    }

    setOpenSections({
      description: true,
      details: true,
      coordinates: true,
      contributors: true,
    });
    setIsDetailsExpanded(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen, isMobile]);

  useEffect(() => {
    if (!isOpen || !temple?.id) {
      return undefined;
    }

    const controller = new AbortController();
    let active = true;

    /* eslint-disable react-hooks/set-state-in-effect */
    setIsStatsLoading(true);
    setStatsError('');
    /* eslint-enable react-hooks/set-state-in-effect */

    fetchSiteStats(temple.id, controller.signal)
      .then((data) => {
        if (!active) return;
        setSiteStats({
          total_images: Number(data.total_images) || 0,
          total_contributors: Number(data.total_contributors) || 0,
          top_contributors: Array.isArray(data.top_contributors) ? data.top_contributors : [],
        });
      })
      .catch((error) => {
        if (!active) return;
        setSiteStats({
          total_images: 0,
          total_contributors: 0,
          top_contributors: [],
        });
        setStatsError('Contribution stats unavailable.');
        if (import.meta.env.DEV) {
          console.error('Failed to load site stats:', error);
        }
      })
      .finally(() => {
        if (active) setIsStatsLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [isOpen, temple?.id]);

  const toggleSection = (sectionKey) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const renderSection = (key, title, content) => {
    const isOpenSection = openSections[key];

    if (!isMobile) {
      return (
        <div className="info-section" key={key}>
          <h4>{title}</h4>
          {content}
        </div>
      );
    }

    return (
      <div className="info-section info-accordion" key={key}>
        <button
          type="button"
          className="info-accordion-header"
          onClick={() => toggleSection(key)}
          aria-expanded={isOpenSection}
        >
          <span>{title}</span>
          <span className={`info-accordion-icon ${isOpenSection ? 'open' : ''}`}>▼</span>
        </button>
        {isOpenSection && <div className="info-accordion-content">{content}</div>}
      </div>
    );
  };

  const renderDetailsContent = () => {
    if (detailsList.length > 0) {
      return (
        <ul>
          {detailsList.map((detail, idx) => (
            <li key={idx}>{detail}</li>
          ))}
        </ul>
      );
    }

    if (!detailsText) {
      return <p>Detailed information will be available soon for this temple.</p>;
    }

    return (
      <div className="details-copy">
        <p className={`details-text ${hasExpandableDetails && !isDetailsExpanded ? 'collapsed' : ''}`}>
          {hasExpandableDetails && !isDetailsExpanded ? detailsPreview : detailsText}
        </p>
        {hasExpandableDetails && (
          <button
            type="button"
            className="details-toggle-btn"
            onClick={() => setIsDetailsExpanded((prev) => !prev)}
            aria-expanded={isDetailsExpanded}
          >
            {isDetailsExpanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <button 
          className="modal-close-btn"
          onClick={onClose}
          title="Close (ESC)"
          aria-label="Close modal"
        >
          <span className="close-icon">✕</span>
        </button>
        
        <div className="modal-content">
          {temple ? (
            <>
              {/* Left Sidebar - Temple Info */}
              <aside className="modal-sidebar">
                <div className="sidebar-header">
                  <h2>About {templeInfo.title}</h2>
                </div>
                
                <div className="sidebar-body">
                  <div className="info-section">
                    <p className="location">
                      📍 {templeInfo.location}
                      <a 
                        href={mapsUrl}
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
                    </p>
                  </div>


                  {renderSection('description', 'Description', <p>{templeInfo.description}</p>)}

                  {renderSection('details', 'Details', renderDetailsContent())}

                  {renderSection(
                    'coordinates',
                    'Geo Coordinates',
                    <p className="coordinates">
                      Latitude: {templeInfo.coordinates.lat}°<br />
                      Longitude: {templeInfo.coordinates.lng}°
                    </p>
                  )}

                  {renderSection(
                    'contributors',
                    'Contribution Stats',
                    <div className="contribution-stats-section">
                      <div className="stats-grid">
                        <div className="stats-card">
                          <span className="stats-label">📸 Total Images</span>
                          <strong className="stats-value">{siteStats.total_images}</strong>
                        </div>
                        <div className="stats-card">
                          <span className="stats-label">👤 Total Contributors</span>
                          <strong className="stats-value">{siteStats.total_contributors}</strong>
                        </div>
                      </div>

                      {isStatsLoading ? (
                        <p className="stats-loading">Loading contribution stats…</p>
                      ) : statsError ? (
                        <p className="stats-error">{statsError}</p>
                      ) : siteStats.top_contributors.length > 0 ? (
                        <div className="top-contributor-section">
                          <ul className="top-contributors-list">
                            {siteStats.top_contributors.map((contributor, index) => (
                              <li key={contributor.id}>
                                <span className="rank-icon">{rankIcons[index] || `#${index + 1}`}</span>
                                <span className="contributor-name">{contributor.name}</span>
                                <span className="contributor-meta">{contributor.uploads} uploads</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="no-contributions">No contributions yet.</p>
                      )}
                    </div>
                  )}
                </div>
              </aside>

              {/* Right Side - 3D Viewer */}
              <div className="modal-viewer-section">
                <Suspense fallback={<div className="model-loading-placeholder">Loading 3D viewer...</div>}>
                  <ModelViewer3D modelPath={modelPath} />
                </Suspense>
              </div>
            </>
          ) : (
            <div className="viewer-placeholder">
              <p>Loading temple data...</p>
            </div>
          )}
        </div>

        {/* Bottom Action Buttons */}
        <div className="modal-footer">
          <button 
            className="btn btn-primary" 
            onClick={onContributeClick}
          >
            {t('common:buttons.contribute')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(ModalViewer);
