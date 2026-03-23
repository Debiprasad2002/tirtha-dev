import React, { useEffect } from 'react';
import ModelViewer3D from './ModelViewer3D';
import '../styles/ModalViewer.css';

function ModalViewer({ isOpen, onClose, temple }) {
  // Map temple IDs to model paths
  const modelMap = {
    'ram-mandir': '/models/ram-mandir.glb',
  };

  const modelPath = modelMap[temple?.id] || modelMap['ram-mandir'];

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
            <ModelViewer3D modelPath={modelPath} />
          ) : (
            <div className="viewer-placeholder">
              <p>Loading temple data...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ModalViewer;
