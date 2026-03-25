import React, { useEffect, useMemo, useState } from 'react';
import FileUploadBox from './FileUploadBox';
import '../styles/ContributeModal.css';

function ContributeModal({ isOpen, onClose }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleClear = () => {
    setSelectedFile(null);
    setTermsAccepted(false);
    setError('');
  };

  const handleUpload = () => {
    if (!selectedFile) {
      setError('Please select a file before uploading.');
      return;
    }
    if (!termsAccepted) {
      setError('Please accept the terms of use and privacy policy.');
      return;
    }

    setError('');
    alert(`Uploading ${selectedFile.name} ... (demo)`);
    handleClear();
    onClose();
  };

  const submitDisabled = useMemo(() => !selectedFile || !termsAccepted, [selectedFile, termsAccepted]);

  if (!isOpen) return null;

  return (
    <div className="contribute-modal-overlay" onClick={onClose}>
      <div className="contribute-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose} aria-label="Close modal">
          <span className="material-icons">close</span>
        </button>

        <div className="contribute-header">
          <h2>Contribute to Tirtha</h2>
          <button type="button" className="switch-account-btn">
            <span className="material-icons">account_circle</span>
            Google SignIn
          </button>
        </div>
        <div className="section">
          <h3>Model Upload</h3>
          <FileUploadBox selectedFile={selectedFile} onFileChange={setSelectedFile} />
        </div>

        <div className="section terms-section">
          <label className="terms-label">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            I agree to the&nbsp;
            <a href="https://smlab.niser.ac.in/project/tirtha/#terms" target="_blank" rel="noopener noreferrer">Terms of Use</a>
            &nbsp;and&nbsp;
            <a href="https://smlab.niser.ac.in/project/tirtha/#privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
          </label>
          <p className="license-text">
            All contributions licensed under&nbsp;
            <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener noreferrer">
              CC BY-NC-SA 4.0
            </a>
          </p>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn clear-btn" onClick={handleClear}>Clear</button>
          <button
            type="button"
            className="btn upload-btn"
            onClick={handleUpload}
            disabled={submitDisabled}
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}

export default ContributeModal;
