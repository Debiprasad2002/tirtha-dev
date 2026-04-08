import React, { useEffect, useState } from 'react';
import FileUploadBox from './FileUploadBox';
import '../styles/ContributeModal.css';

function ContributeModal({ isOpen, onClose, targetName = 'Tirtha', siteName = null }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [sequentialOrder, setSequentialOrder] = useState(false);
  const [allowFullResolution, setAllowFullResolution] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
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
    setSelectedFiles([]);
    setSequentialOrder(false);
    setAllowFullResolution(false);
    setShowUploadOptions(false);
    setShowChecklist(false);
    setTermsAccepted(false);
    setError('');
  };

  const contributionTarget = siteName || targetName;
  const fileCount = selectedFiles.length;
  const fileNames = selectedFiles.map((file) => file.name).join(', ');

  const handleUpload = () => {
    if (!fileCount) {
      setError('Please select at least one file before uploading.');
      return;
    }
    if (!termsAccepted) {
      setError('Please accept the terms of use and privacy policy.');
      return;
    }

    setError('');
    console.log('Upload metadata:', {
      target: contributionTarget,
      fileCount,
      isSequential: sequentialOrder,
      allowFullResolution,
      fileNames,
    });

    alert(`Uploading ${fileCount} image${fileCount > 1 ? 's' : ''} to ${contributionTarget}... (demo)`);
    handleClear();
    onClose();
  };

  const submitDisabled = !fileCount || !termsAccepted;

  if (!isOpen) return null;

  return (
    <div className="contribute-modal-overlay" onClick={onClose}>
      <div className="contribute-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose} aria-label="Close modal">
          <span className="material-icons">close</span>
        </button>

        <div className="contribute-header">
          <h2>Contribute to {contributionTarget}</h2>
          {siteName && <p className="site-target-note">Selected site: {siteName}</p>}
          <button type="button" className="switch-account-btn">
            <span className="material-icons">account_circle</span>
            Google SignIn
          </button>
        </div>
        <div className="section">
          <h3>Model Upload</h3>
          <FileUploadBox selectedFiles={selectedFiles} onFilesChange={setSelectedFiles} />
          <p className="upload-summary">{fileCount ? `${fileCount} file${fileCount > 1 ? 's' : ''} selected` : 'No files selected yet.'}</p>
        </div>

        <div className="section upload-options collapsible-section">
          <button
            type="button"
            className="section-toggle"
            onClick={() => setShowUploadOptions((prev) => !prev)}
            aria-expanded={showUploadOptions}
            aria-controls="upload-options-content"
          >
            <h3>Upload Preferences</h3>
            <span className="material-icons section-toggle-icon">
              {showUploadOptions ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {showUploadOptions && (
            <div id="upload-options-content" className="section-collapsible-content">
              <label className="option-label">
                <input
                  type="checkbox"
                  checked={sequentialOrder}
                  onChange={(e) => setSequentialOrder(e.target.checked)}
                />
                My uploaded images are sequential frames / in order
              </label>
              <label className="option-label">
                <input
                  type="checkbox"
                  checked={allowFullResolution}
                  onChange={(e) => setAllowFullResolution(e.target.checked)}
                />
                Allow full resolution uploads (skip compression/resizing)
              </label>
              <p className="option-help">
                Use full resolution only when you need maximum detail. If unchecked, the upload may use optimized resizing for speed.
              </p>
            </div>
          )}
        </div>

        <div className="section checklist-section collapsible-section">
          <button
            type="button"
            className="section-toggle"
            onClick={() => setShowChecklist((prev) => !prev)}
            aria-expanded={showChecklist}
            aria-controls="upload-checklist-content"
          >
            <h3>Upload Checklist</h3>
            <span className="material-icons section-toggle-icon">
              {showChecklist ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {showChecklist && (
            <ul id="upload-checklist-content" className="upload-checklist section-collapsible-content">
              <li>Upload clear, well-lit images with good focus.</li>
              <li>Use multiple images for larger sites rather than a single frame.</li>
              <li>If images are from a video or frame sequence, enable ordered uploads.</li>
              <li>If you need original quality, enable full resolution uploads.</li>
              <li>Avoid screenshots and highly compressed photos.</li>
              <li>Prefer one site per upload to keep contributions organized.</li>
            </ul>
          )}
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
