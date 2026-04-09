import React, { useEffect, lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/ModalViewer.css';

const ModelViewer3D = lazy(() => import('./ModelViewer3D'));

function ModalViewer({ isOpen, onClose, temple, onContributeClick }) {
  const { t } = useTranslation(['common']);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 720px)').matches : false
  );
  const [openSections, setOpenSections] = useState({
    description: true,
    details: true,
    coordinates: true,
    contributors: true,
  });

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

  // Debug logging
  useEffect(() => {
    if (isOpen) {
      console.log('ModalViewer opened');
      console.log('Temple data:', temple);
      console.log('Model path:', modelPath);
    }
  }, [isOpen, temple, modelPath]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia('(max-width: 720px)');

    const handleViewportChange = (event) => {
      setIsMobile(event.matches);
    };

    setIsMobile(mediaQuery.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleViewportChange);
      return () => mediaQuery.removeEventListener('change', handleViewportChange);
    }

    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  useEffect(() => {
    if (!isOpen) {
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
  }, [isOpen, isMobile]);

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
                    <p className="location">📍 {templeInfo.location}</p>
                  </div>

                  {renderSection('description', 'Description', <p>{templeInfo.description}</p>)}

                  {renderSection(
                    'details',
                    'Details',
                    Array.isArray(templeInfo.details) && templeInfo.details.length > 0 ? (
                      <ul>
                        {templeInfo.details.map((detail, idx) => (
                          <li key={idx}>{detail}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>Detailed information will be available soon for this temple.</p>
                    )
                  )}

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
                    'Top Contributors',
                    <div className="top-contributor-section">
                      <ul className="top-contributors-list">
                        <li>
                          <span className="rank">1</span>
                          <span className="contributor-name">User 1</span>
                          <span className="contributor-meta">🏆</span>
                        </li>
                        <li>
                          <span className="rank">2</span>
                          <span className="contributor-name">User 2</span>
                          <span className="contributor-meta">⭐</span>
                        </li>
                        <li>
                          <span className="rank">3</span>
                          <span className="contributor-name">User 3</span>
                          <span className="contributor-meta">✨</span>
                        </li>
                      </ul>
                      <small>Ranking is placeholder; backend will provide final data</small>
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

export default ModalViewer;
