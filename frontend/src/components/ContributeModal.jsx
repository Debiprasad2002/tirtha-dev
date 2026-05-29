import React, { useEffect, useState, useRef } from 'react';
import FileUploadBox from './FileUploadBox';
import Snackbar from './Snackbar';
import { getApiBaseUrl } from '../utils/apiConfig';
import { validateImageFile } from '../utils/imageValidation';
import '../styles/ContributeModal.css';

function ContributeModal({ isOpen, onClose, targetName = 'Tirtha', siteName = null, siteId = null }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [contributor, setContributor] = useState(null);
  const [authMessage, setAuthMessage] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [sequentialOrder, setSequentialOrder] = useState(false);
  const [allowFullResolution, setAllowFullResolution] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [error, setError] = useState('');
  const [toastItems, setToastItems] = useState([]);
  const [isUploadBusy, setIsUploadBusy] = useState(false);
  const [isValidationBusy, setIsValidationBusy] = useState(false);

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
        const API_BASE = getApiBaseUrl();
        const res = await fetch(`${API_BASE}/api/auth/current-contributor/`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.status && data.contributor) {
          setContributor({ status: data.status, info: data.contributor });
        } else if (data && data.status === 'anonymous') {
          setContributor({ status: 'anonymous', info: null });
        }
      } catch {
        // ignore
      }
    };

    fetchCurrent();
  }, [isOpen]);

  // Initialize and render Google Identity Services button when modal opens
  useEffect(() => {
    if (!isOpen) return;
    initGsi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Google Identity Services integration
  const handleCredentialResponse = async (response) => {
    const token = response?.credential;
    if (!token) {
      setAuthMessage('Failed to obtain credential from Google.');
      return;
    }

    try {
      const API_BASE = getApiBaseUrl();
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
    } catch {
      setAuthMessage('Sign-in failed.');
    }
  };

  const loadGsi = () => new Promise((resolve, reject) => {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Google Identity script failed to load'));
    document.head.appendChild(s);
  });

  const initGsi = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setAuthMessage('Missing Google client ID (VITE_GOOGLE_CLIENT_ID).');
      return;
    }

    try {
      await loadGsi();
    } catch {
      setAuthMessage('Unable to load Google Identity Services. Please check your network or browser settings.');
      return;
    }

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
          } catch {
            setAuthMessage('Unable to render Google sign-in button.');
          }
        }
      } catch {
        setAuthMessage('Unable to initialize Google sign-in.');
      }
    } else {
      setAuthMessage('Google Identity Services is unavailable in this browser.');
    }
  };

  const handleAuthRequired = () => {
    // Ask user to sign in and bring attention to the Google button.
    setAuthMessage('Please sign in to upload the images.');
    try {
      if (googleButtonRef?.current && typeof googleButtonRef.current.scrollIntoView === 'function') {
        googleButtonRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch {
      // ignore
    }
  };

  const revokePreviewUrls = (items) => {
    items.forEach((item) => {
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
  };

  const handleClear = () => {
    revokePreviewUrls(selectedFiles);
    setSelectedFiles([]);
    setSequentialOrder(false);
    setAllowFullResolution(false);
    setShowUploadOptions(false);
    setShowChecklist(false);
    setTermsAccepted(false);
    setError('');
  };

  const handleRemoveFile = (fileId) => {
    setSelectedFiles((current) => {
      const updated = current.filter((item) => {
        if (item.id === fileId) {
          if (item.previewUrl) {
            URL.revokeObjectURL(item.previewUrl);
          }
          return false;
        }
        return true;
      });
      return updated;
    });
  };

  const getFileSizeLabel = (size) => {
    if (size > 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.round(size / 1024)} KB`;
  };

  const addToast = (message, variant = 'info', duration = 5000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    setToastItems((current) => [...current, { id, message, variant }]);
    // If duration is provided (number), auto-dismiss; otherwise persist until user click
    if (typeof duration === 'number' && duration > 0) {
      window.setTimeout(() => {
        setToastItems((current) => current.filter((item) => item.id !== id));
      }, duration);
    }
  };

  const dismissToast = (id) => {
    setToastItems((current) => current.filter((item) => item.id !== id));
  };

  // Dismiss all toasts when user clicks anywhere in the document (per UX request)
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleGlobalClick = () => {
      if (toastItems.length > 0) setToastItems([]);
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [isOpen, toastItems]);

  const handleRawFiles = async (files) => {
    if (!files || files.length === 0) {
      return;
    }

    setIsValidationBusy(true);
    const nextFiles = [];
    const existingKeys = new Set(selectedFiles.map((item) => item.id));
    let addedCount = 0;

    for (const file of Array.from(files)) {
      const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
      if (existingKeys.has(fileKey)) {
        addToast(`${file.name} already added.`, 'info', 3000);
        continue;
      }

      const validation = await validateImageFile(file, { minDimension: 640, warningDimension: 1080 });
      const previewUrl = URL.createObjectURL(file);
      nextFiles.push({
        id: fileKey,
        file,
        previewUrl,
        validation,
      });
      existingKeys.add(fileKey);
      addedCount += 1;

      if (validation.severity === 'invalid') {
        addToast(`Ignored ${file.name}: ${validation.reason}`, 'warning', 6000);
      }
    }

    if (nextFiles.length > 0) {
      setSelectedFiles((current) => [...current, ...nextFiles]);
      addToast(`${addedCount} file${addedCount > 1 ? 's' : ''} added to preview.`, 'info');
    }

    setIsValidationBusy(false);
  };

  const checkPreUpload = async () => {
    if (!siteId) {
      return {
        allow_upload: false,
        message: 'No site selected for upload.',
      };
    }

    try {
      const API_BASE = getApiBaseUrl();
      const response = await fetch(`${API_BASE}/api/contributions/upload-check/?site_id=${encodeURIComponent(String(siteId))}`, {
        credentials: 'include',
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        return {
          allow_upload: false,
          message: data?.message || 'Upload validation failed.',
        };
      }
      return {
        allow_upload: data?.allow_upload === true,
        message: data?.message || data?.output || 'Ready to upload.',
      };
    } catch {
      return {
        allow_upload: false,
        message: 'Unable to validate upload permissions. Please try again.',
      };
    }
  };

  const contributionTarget = siteName || targetName;
  const totalSelected = selectedFiles.length;
  const readyCount = selectedFiles.filter((item) => item.validation?.severity === 'valid').length;
  const warningCount = selectedFiles.filter((item) => item.validation?.severity === 'warning').length;
  const invalidCount = selectedFiles.filter((item) => item.validation?.severity === 'invalid').length;
  const uploadableFiles = selectedFiles.filter((item) => item.validation?.severity !== 'invalid');
  const uploadButtonLabel = uploadableFiles.length > 0
    ? `Upload ${uploadableFiles.length} Image${uploadableFiles.length > 1 ? 's' : ''}`
    : 'Upload';
  const googleButtonRef = useRef(null);

  const getCsrfToken = () => {
    const match = document.cookie.match(/(^|;)\s*csrftoken=([^;]+)/);
    return match ? match[2] : null;
  };

  const handleUpload = async () => {
    if (uploadableFiles.length === 0) {
      const msg = 'No valid images available for upload. Remove invalid files or select more images.';
      setError(msg);
      addToast(msg, 'error', 5000);
      return;
    }
    if (!termsAccepted) {
      const msg = 'Please accept the terms of use and privacy policy.';
      setError(msg);
      addToast(msg, 'error', 5000);
      return;
    }
    if (!siteId) {
      const msg = 'No site is selected for this contribution.';
      setError(msg);
      addToast(msg, 'error', 5000);
      return;
    }
    if (!(contributor && contributor.status === 'approved')) {
      const msg = 'You must be signed in and approved before uploading.';
      setError(msg);
      addToast(msg, 'error', 5000);
      return;
    }

    setError('');
    setIsUploadBusy(true);

    const validation = await checkPreUpload();
    if (!validation.allow_upload) {
      const msg = validation.message || 'Upload validation failed.';
      setError(msg);
      addToast(msg, 'error', 5000);
      setIsUploadBusy(false);
      return;
    }

    try {
      const API_BASE = getApiBaseUrl();
      const formData = new FormData();
      formData.append('site_id', String(siteId));
      formData.append('sequential_order', sequentialOrder ? 'true' : 'false');
      formData.append('allow_full_resolution', allowFullResolution ? 'true' : 'false');

      uploadableFiles.forEach((item) => {
        formData.append('images', item.file, item.file.name);
      });

      const csrfToken = getCsrfToken();
      const headers = {};
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }

      const res = await fetch(`${API_BASE}/api/contributions/upload/`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: formData,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data?.message || 'Upload failed.';
        setError(msg);
        addToast(msg, 'error');
        setIsUploadBusy(false);
        return;
      }

      if (import.meta.env.DEV) {
        console.log('Upload response:', data);
      }

      const uploadedCount = data?.batch?.total_images ?? (Array.isArray(data?.images) ? data.images.length : null);
      if (typeof uploadedCount === 'number') {
        addToast(`${uploadedCount} image${uploadedCount > 1 ? 's' : ''} uploaded successfully.`, 'success', 3000);
      } else {
        addToast('Upload completed successfully.', 'success', 3000);
      }

      if (invalidCount > 0) {
        addToast(`Skipped ${invalidCount} invalid image${invalidCount > 1 ? 's' : ''}.`, 'warning', 4000);
      }

      setTimeout(() => {
        handleClear();
        onClose();
      }, 3200);
    } catch {
      const msg = 'Upload failed. Please try again.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setIsUploadBusy(false);
    }
  };

  const submitDisabled = uploadableFiles.length === 0 || !termsAccepted || !siteId || !(contributor && contributor.status === 'approved') || isUploadBusy || isValidationBusy;

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

        {authMessage && (
          <div className="auth-banner auth-info">
            {authMessage}
          </div>
        )}

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
            onFilesChange={handleRawFiles}
            allowOpen={Boolean(contributor && contributor.status === 'approved')}
            onAuthRequired={handleAuthRequired}
          />
          <p className="upload-summary">
            {isValidationBusy
              ? 'Validating selected files...'
              : totalSelected
                ? `${totalSelected} file${totalSelected > 1 ? 's' : ''} selected`
                : 'No files selected yet.'}
          </p>

          {totalSelected > 0 && (
            <div className="upload-preview-section">
              <div className="upload-preview-header">
                <div>
                  <strong>{totalSelected} selected</strong>
                  <p className="preview-help-text">
                    Invalid images will not be uploaded. You can remove them or continue with valid images.
                  </p>
                </div>
                <button type="button" className="preview-clear-btn" onClick={handleClear}>
                  Clear all
                </button>
              </div>

              <div className="upload-preview-summary">
                <span className="summary-pill valid">{readyCount} ready</span>
                <span className="summary-pill warning">{warningCount} warning</span>
                <span className="summary-pill invalid">{invalidCount} invalid</span>
              </div>

              <div className="preview-card-grid">
                {selectedFiles.map((item) => (
                  <div key={item.id} className={`preview-card ${item.validation?.severity || 'invalid'}`}>
                    <button
                      type="button"
                      className="preview-remove-btn"
                      onClick={() => handleRemoveFile(item.id)}
                      aria-label={`Remove ${item.file.name}`}
                    >
                      <span className="material-icons">close</span>
                    </button>
                    <div className="preview-image-wrapper">
                      <img src={item.previewUrl} alt={item.file.name} />
                    </div>
                    <div className="preview-card-body">
                      <div className="preview-filename">{item.file.name}</div>
                      <div className="preview-meta">{getFileSizeLabel(item.file.size)}</div>
                      <span className={`status-badge ${item.validation?.severity || 'invalid'}`}>
                        {item.validation?.severity === 'valid'
                          ? 'Ready'
                          : item.validation?.severity === 'warning'
                            ? 'Low resolution'
                            : 'Invalid'}
                      </span>
                      {item.validation?.severity !== 'valid' && (
                        <p className="preview-reason">{item.validation?.reason}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
        <div className="snackbar-container">
          {toastItems.map((toast) => (
            <Snackbar
              key={toast.id}
              message={toast.message}
              variant={toast.variant}
              onClose={() => dismissToast(toast.id)}
            />
          ))}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn clear-btn" onClick={handleClear}>Clear</button>
          <button
            type="button"
            className="btn upload-btn"
            onClick={handleUpload}
            disabled={submitDisabled}
          >
            {uploadButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ContributeModal;
