import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ModelViewer3D from './ModelViewer3D';
import '../styles/ModalViewer.css';

function ModalViewer({ isOpen, onClose, temple, onContributeClick }) {
  const { t } = useTranslation(['common']);

  // Map temple IDs to model paths
  const modelMap = {
    'ram-mandir': '/models/ram-mandir.glb',
  };

  const modelPath = modelMap[temple?.id] || modelMap['ram-mandir'];

  // Temple details database
  const templeDetails = {
    'ram-mandir': {
      title: 'Ram Mandir',
      location: 'Ayodhya, Uttar Pradesh',
      coordinates: { lat: 26.7956, lng: 82.1943 },
      description: 'Explore the architectural and spiritual marvel of Ram Mandir.',
      details: [
        'Religious significance: One of the most sacred temples in Hindu tradition',
        'Architecture: Ancient Hindu temple architecture at its finest',
        'Visitor info: Open year-round for pilgrims and tourists',
      ],
    },
  };

  const templeInfo = templeDetails[temple?.id] || templeDetails['ram-mandir'];

  // Debug logging
  useEffect(() => {
    if (isOpen) {
      console.log('ModalViewer opened');
      console.log('Temple data:', temple);
      console.log('Model path:', modelPath);
    }
  }, [isOpen, temple, modelPath]);

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

                  <div className="info-section">
                    <h4>Description</h4>
                    <p>{templeInfo.description}</p>
                  </div>

                  <div className="info-section">
                    <h4>Details</h4>
                    <ul>
                      {templeInfo.details.map((detail, idx) => (
                        <li key={idx}>{detail}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="info-section">
                    <h4>Geo Coordinates</h4>
                    <p className="coordinates">
                      Latitude: {templeInfo.coordinates.lat}°<br />
                      Longitude: {templeInfo.coordinates.lng}°
                    </p>
                  </div>

                  <div className="info-section top-contributor-section">
                    <h4>Top Contributors</h4>
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
                </div>
              </aside>

              {/* Right Side - 3D Viewer */}
              <div className="modal-viewer-section">
                <ModelViewer3D modelPath={modelPath} />
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
