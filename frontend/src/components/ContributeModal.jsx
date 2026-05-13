import React, { useEffect, useState, useRef } from 'react';
import FileUploadBox from './FileUploadBox';
import '../styles/ContributeModal.css';

function ContributeModal({ isOpen, onClose, targetName = 'Tirtha', siteName = null }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [contributor, setContributor] = useState(null);
  const [authMessage, setAuthMessage] = useState('');
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
      setAuthMessage('');
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    // Fetch current contributor session from backend
    const fetchCurrent = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
        const res = await fetch(`${API_BASE}/api/auth/current-contributor/`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.status && data.contributor) {
          setContributor({ status: data.status, info: data.contributor });
        } else if (data && data.status === 'anonymous') {
          setContributor({ status: 'anonymous', info: null });
        }
      } catch (err) {
        // ignore
      }
    };

    fetchCurrent();
  }, [isOpen]);

  // Initialize and render Google Identity Services button when modal opens
  useEffect(() => {
    if (!isOpen) return;
    initGsi();
  }, [isOpen]);

  // Google Identity Services integration
  const handleCredentialResponse = async (response) => {
    const token = response?.credential;
    if (!token) {
      setAuthMessage('Failed to obtain credential from Google.');
      return;
    }

    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
      const res = await fetch(`${API_BASE}/api/auth/google-login/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data && data.status) {
        // Normalize messages and behavior: require admin approval to upload
        if (data.status === 'waiting_approval') {
          setAuthMessage('Signed in. Please wait for admin approval before uploading.');
        } else if (data.status === 'approved') {
          setAuthMessage('Signed in and approved. You can now upload images.');
        } else if (data.status === 'banned') {
          setAuthMessage('Your account has been banned. Contact admin.');
        } else if (data.status === 'invalid_token') {
          setAuthMessage('Invalid token. Sign-in failed.');
        } else {
          setAuthMessage(data.message || 'Signed in.');
        }

        if (data.contributor) setContributor({ status: data.status, info: data.contributor });
      } else {
        setAuthMessage('Unexpected server response.');
      }
    } catch (err) {
      setAuthMessage('Sign-in failed.');
    }
  };

  const loadGsi = () => new Promise((resolve) => {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });

  const initGsi = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '115708159411-q1lpeqtjehsfkbtpe3i6jtfog9p7qrdi.apps.googleusercontent.com';
    if (!clientId) {
      setAuthMessage('Missing Google client ID (VITE_GOOGLE_CLIENT_ID).');
      return;
    }
    await loadGsi();
    if (window.google && window.google.accounts && window.google.accounts.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
        });
        // If a container exists, render the official Google button there.
        if (googleButtonRef?.current) {
          try {
            window.google.accounts.id.renderButton(googleButtonRef.current, {
              theme: 'outline',
              size: 'large',
            });
          } catch (err) {
            // ignore render errors
          }
        }
      } catch (err) {
        // ignore
      }
    }
  };

  const handleGoogleSignInClick = async () => {
    setAuthMessage('Signing in with Google...');
    // Ensure GSI is initialized and the button is rendered (user can click it).
    await initGsi();
    // Note: The rendered button will handle the OAuth flow when clicked.
    // We don't call prompt() since it opens off-center; the rendered button is more reliable.
  };

  const handleAuthRequired = () => {
    // Ask user to sign in and bring attention to the Google button.
    setAuthMessage('Please sign in to upload the images.');
    try {
      if (googleButtonRef?.current && typeof googleButtonRef.current.scrollIntoView === 'function') {
        googleButtonRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (err) {
      // ignore
    }
  };

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
  const googleButtonRef = useRef(null);

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
    if (import.meta.env.DEV) {
      console.log('Upload metadata:', {
        target: contributionTarget,
        fileCount,
        isSequential: sequentialOrder,
        allowFullResolution,
        fileNames,
      });
    }

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
          <div ref={googleButtonRef} style={{ display: 'inline-block' }} />
        </div>

        {/* Auth status banner: shows waiting/approved/banned messages */}
        {contributor && contributor.status === 'waiting_approval' && (
          <div className="auth-banner auth-waiting">
            Signed in as {contributor.info?.name || contributor.info?.email}. Please wait for admin approval before uploading.
          </div>
        )}
        {contributor && contributor.status === 'approved' && (
          <div className="auth-banner auth-approved">
            Signed in as {contributor.info?.name || contributor.info?.email}. You are approved to upload images.
          </div>
        )}
        {contributor && contributor.status === 'banned' && (
          <div className="auth-banner auth-banned">
            Your account has been banned. Contact the site admin for assistance.
          </div>
        )}
        <div className="section">
          <h3>Model Upload</h3>
          <FileUploadBox
            selectedFiles={selectedFiles}
            onFilesChange={setSelectedFiles}
            allowOpen={Boolean(contributor && contributor.status === 'approved')}
            onAuthRequired={handleAuthRequired}
          />
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
