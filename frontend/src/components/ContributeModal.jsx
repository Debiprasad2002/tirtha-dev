import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import imageCompression from 'browser-image-compression';
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isGsiReady, setIsGsiReady] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [previewFilter, setPreviewFilter] = useState('all');
  const [selectedPreviewImage, setSelectedPreviewImage] = useState(null);

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

  // Initialize Google Identity Services when modal opens
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

    setIsAuthLoading(true);
    setAuthMessage('');
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
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsAuthLoading(true);
    try {
      const API_BASE = getApiBaseUrl();
      await fetch(`${API_BASE}/api/auth/logout/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken() || '',
        },
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setContributor({ status: 'anonymous', info: null });
      setAuthMessage('Successfully signed out.');
      addToast('Successfully signed out.', 'success');
      setIsAuthLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (isGsiReady && !isAuthLoading && (!contributor || !contributor.info)) {
      if (googleButtonRef.current && window.google && window.google.accounts && window.google.accounts.id) {
        try {
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
          });
        } catch (err) {
          console.error('Error rendering Google button:', err);
        }
      }
    }
  }, [isOpen, isGsiReady, isAuthLoading, contributor]);

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
        setIsGsiReady(true);
      } catch {
        setAuthMessage('Unable to initialize Google sign-in.');
      }
    } else {
      setAuthMessage('Google Identity Services is unavailable in this browser.');
    }
  };

  const handleGoogleSignIn = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setAuthMessage('Missing Google client ID (VITE_GOOGLE_CLIENT_ID).');
      return;
    }

    if (!isGsiReady) {
      await initGsi();
    }

    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.prompt();
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
    setPreviewFilter('all');
    setSelectedPreviewImage(null);
    setUploadProgress(0);
    setUploadStatus('');
    setSequentialOrder(false);
    setAllowFullResolution(false);
    setShowUploadOptions(false);
    setShowChecklist(false);
    setTermsAccepted(false);
    setError('');
  };

  const handleModalClose = () => {
    handleClear();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      revokePreviewUrls(selectedFiles);
      setSelectedFiles([]);
      setPreviewFilter('all');
      setSelectedPreviewImage(null);
      setSequentialOrder(false);
      setAllowFullResolution(false);
      setShowUploadOptions(false);
      setShowChecklist(false);
      setTermsAccepted(false);
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
    try {
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
        const displayFile = validation.convertedFile || file;
        const previewUrl = URL.createObjectURL(displayFile);
        
        const exif = validation.exif;
        const parseExifDate = (val) => {
          if (!val) return null;
          if (val instanceof Date) return val.toLocaleString();
          try {
            const d = new Date(String(val).replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'));
            return isNaN(d.getTime()) ? String(val) : d.toLocaleString();
          } catch {
            return String(val);
          }
        };

        const convertDMSToDecimal = (dms, ref) => {
          if (!dms || dms.length < 3) return null;
          const parseVal = (val) => {
            if (typeof val === 'number') return val;
            if (val && typeof val === 'object' && val.numerator !== undefined) {
              return val.numerator / (val.denominator || 1);
            }
            return parseFloat(val) || 0;
          };
          const degrees = parseVal(dms[0]);
          const minutes = parseVal(dms[1]);
          const seconds = parseVal(dms[2]);
          let decimal = degrees + minutes / 60.0 + seconds / 3600.0;
          if (ref === 'S' || ref === 'W') {
            decimal = -decimal;
          }
          return decimal;
        };

        let latitude = exif?.latitude !== undefined && exif?.latitude !== null ? exif.latitude : null;
        let longitude = exif?.longitude !== undefined && exif?.longitude !== null ? exif.longitude : null;

        if (exif && latitude === null && exif.GPSLatitude && exif.GPSLatitudeRef) {
          latitude = convertDMSToDecimal(exif.GPSLatitude, exif.GPSLatitudeRef);
        }
        if (exif && longitude === null && exif.GPSLongitude && exif.GPSLongitudeRef) {
          longitude = convertDMSToDecimal(exif.GPSLongitude, exif.GPSLongitudeRef);
        }

        let altitude = null;
        if (exif && exif.GPSAltitude !== undefined && exif.GPSAltitude !== null) {
          if (typeof exif.GPSAltitude === 'number') {
            altitude = exif.GPSAltitude;
          } else if (Array.isArray(exif.GPSAltitude)) {
            altitude = exif.GPSAltitude[0] / (exif.GPSAltitude[1] || 1);
          } else if (typeof exif.GPSAltitude === 'object' && exif.GPSAltitude.numerator !== undefined) {
            altitude = exif.GPSAltitude.numerator / (exif.GPSAltitude.denominator || 1);
          } else {
            altitude = parseFloat(exif.GPSAltitude);
          }
          if (altitude !== null && exif.GPSAltitudeRef === 1) {
            altitude = -altitude;
          }
        }

        const metadata = exif ? {
          cameraMake: exif.Make || null,
          cameraModel: exif.Model || null,
          dateTaken: parseExifDate(exif.DateTimeOriginal || exif.DateTime),
          focalLength: exif.FocalLength ? `${exif.FocalLength} mm` : null,
          gpsStatus: (latitude !== null && longitude !== null) ? 'GPS available' : 'GPS: Not Available',
          latitude: latitude,
          longitude: longitude,
          altitude: altitude,
        } : {
          cameraMake: null,
          cameraModel: null,
          dateTaken: null,
          focalLength: null,
          gpsStatus: 'GPS: Not Available',
          latitude: null,
          longitude: null,
          altitude: null,
        };

        let compressedFile = null;
        let compressedSize = null;
        let isCompressed = false;

        if (validation.severity !== 'invalid' && validation.fileType !== 'video') {
          try {
            const options = {
              maxSizeMB: 1.5,
              maxWidthOrHeight: 4096,
              useWebWorker: true,
              initialQuality: 0.8,
            };
            const compressedBlob = await imageCompression(displayFile, options);
            compressedFile = new File([compressedBlob], displayFile.name, {
              type: displayFile.type,
              lastModified: Date.now(),
            });
            compressedSize = compressedFile.size;
            isCompressed = compressedFile.size < file.size;
          } catch (err) {
            console.error('Compression failed, using original file:', err);
            compressedFile = file;
            compressedSize = file.size;
            isCompressed = false;
          }
        }

        nextFiles.push({
          id: fileKey,
          file: isCompressed ? compressedFile : file,
          originalFile: file,
          compressedFile: compressedFile || file,
          previewUrl,
          validation,
          metadata,
          isCompressed,
          originalSize: file.size,
          compressedSize: compressedSize || file.size,
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
    } catch (error) {
      console.error('Error during file handling/validation:', error);
      addToast('An error occurred during file validation.', 'error');
    } finally {
      setIsValidationBusy(false);
    }
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
  
  const totalOriginalSize = uploadableFiles.reduce((acc, item) => acc + (item.originalSize || item.file.size), 0);
  const totalCompressedSize = uploadableFiles.reduce((acc, item) => acc + (item.compressedSize || item.file.size), 0);
  const totalSavedPercent = totalOriginalSize > 0 ? Math.round(((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100) : 0;
  const hasHeicFile = uploadableFiles.some(
    (item) =>
      (item.file?.name || '').match(/\.(heic|heif|heics|heifs)$/i) ||
      (item.originalFile?.name || '').match(/\.(heic|heif|heics|heifs)$/i)
  );

  const formatBytes = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadButtonLabel = uploadableFiles.length > 0
    ? `Upload ${uploadableFiles.length} Image${uploadableFiles.length > 1 ? 's' : ''}`
    : 'Upload';
  const filteredPreviewFiles = selectedFiles.filter((item) => {
    if (previewFilter === 'all') return true;
    if (previewFilter === 'ready') return item.validation?.severity === 'valid';
    if (previewFilter === 'warning') return item.validation?.severity === 'warning';
    if (previewFilter === 'invalid') return item.validation?.severity === 'invalid';
    return true;
  });
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

      const filesToUpload = uploadableFiles.map((item) => {
        const file = allowFullResolution ? item.originalFile : item.file;
        return {
          file,
          name: file.name,
          original_filename: item.originalFile.name,
          original_file_size: item.originalFile.size,
          is_compressed: !allowFullResolution && item.isCompressed,
        };
      });

      filesToUpload.forEach((item) => {
        formData.append('images', item.file, item.name);
      });

      const metadataJson = JSON.stringify(filesToUpload.map((item) => ({
        name: item.name,
        original_filename: item.original_filename,
        original_file_size: item.original_file_size,
        is_compressed: item.is_compressed,
      })));
      formData.append('metadata_json', metadataJson);

      const csrfToken = getCsrfToken();
      const headers = {};
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }

      const totalFiles = uploadableFiles.length;
      setUploadProgress(0);
      setUploadStatus(`Uploading 0/${totalFiles} images…`);

      const response = await axios.post(`${API_BASE}/api/contributions/upload/`, formData, {
        withCredentials: true,
        headers,
        onUploadProgress: (progressEvent) => {
          const { loaded, total } = progressEvent;
          const percent = total ? Math.round((loaded / total) * 100) : 0;
          const currentFile = total && totalFiles ? Math.min(totalFiles, Math.max(1, Math.ceil((loaded / total) * totalFiles))) : 0;
          setUploadProgress(percent);
          setUploadStatus(`Uploading ${currentFile}/${totalFiles} images…`);
        },
      });

      const data = response.data;
      if (response.status < 200 || response.status >= 300) {
        const msg = data?.message || 'Upload failed.';
        setUploadStatus('Upload failed');
        setError(msg);
        addToast(msg, 'error');
        setIsUploadBusy(false);
        return;
      }

      if (import.meta.env.DEV) {
        console.log('Upload response:', data);
      }

      const uploadedCount = data?.batch?.total_images ?? (Array.isArray(data?.images) ? data.images.length : uploadableFiles.length);
      const successCount = Number.isFinite(uploadedCount) ? uploadedCount : uploadableFiles.length;
      const successMessage = `${successCount} image${successCount !== 1 ? 's' : ''} uploaded successfully.`;
      const successStatus = invalidCount > 0
        ? `${successMessage} (${invalidCount} invalid skipped)`
        : successMessage;

      setUploadProgress(100);
      setUploadStatus(successStatus);
      addToast(successMessage, 'success', 3000);

      if (invalidCount > 0) {
        addToast(`Skipped ${invalidCount} invalid image${invalidCount > 1 ? 's' : ''}.`, 'warning', 4000);
      }

      setTimeout(() => {
        handleClear();
        onClose();
      }, 3200);
    } catch (uploadError) {
      console.error(uploadError);
      const msg = uploadError?.response?.data?.message || 'Upload failed. Please try again.';
      setUploadProgress(0);
      setUploadStatus('Upload failed');
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setIsUploadBusy(false);
    }
  };

  const submitDisabled = uploadableFiles.length === 0 || !termsAccepted || !siteId || !(contributor && contributor.status === 'approved') || isUploadBusy || isValidationBusy;

  if (!isOpen) return null;

  return (
    <div className="contribute-modal-overlay" onClick={handleModalClose}>
      <div className="contribute-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={handleModalClose} aria-label="Close modal">
          <span className="material-icons">close</span>
        </button>

        <div className="contribute-header">
          <h2>Contribute to {contributionTarget}</h2>
          {siteName && <p className="site-target-note">Selected site: {siteName}</p>}
          {isAuthLoading ? (
            <div className="auth-loading-spinner-container">
              <div className="auth-loading-spinner" />
              <span className="auth-loading-text">Signing in...</span>
            </div>
          ) : contributor && contributor.info ? (
            <div className="contributor-profile">
              {contributor.info.profile_picture ? (
                <img
                  src={contributor.info.profile_picture}
                  alt={contributor.info.name || 'User'}
                  className="contributor-avatar"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="contributor-avatar-fallback">
                  {contributor.info.name ? contributor.info.name[0].toUpperCase() : 'U'}
                </div>
              )}
              <div className="contributor-details">
                <span className="contributor-name">{contributor.info.name || 'Contributor'}</span>
                <span className="contributor-email">{contributor.info.email}</span>
              </div>
              <button
                type="button"
                className="switch-account-btn"
                onClick={handleSignOut}
              >
                <span className="material-icons">logout</span>
                Sign Out
              </button>
            </div>
          ) : (
            <div ref={googleButtonRef} className="google-signin-container" />
          )}
        </div>

        {selectedPreviewImage && (
          <div className="image-lightbox-overlay" onClick={() => setSelectedPreviewImage(null)}>
            <div className="image-lightbox-content" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="lightbox-close-btn"
                onClick={() => setSelectedPreviewImage(null)}
                aria-label="Close preview"
              >
                <span className="material-icons">close</span>
              </button>
              {selectedPreviewImage.validation?.fileType === 'video' ? (
                <video
                  className="lightbox-video"
                  src={selectedPreviewImage.previewUrl}
                  controls
                  autoPlay
                />
              ) : selectedPreviewImage.file.name.match(/\.(heic|heif|heics|heifs)$/i) && !selectedPreviewImage.validation?.convertedFile ? (
                <div className="lightbox-heic-fallback">
                  <span className="material-icons fallback-icon">image</span>
                  <span className="fallback-text">HEIC Image Preview Unavailable</span>
                  <span className="fallback-subtext">This image will be converted to JPEG automatically when uploaded.</span>
                </div>
              ) : (
                <img
                  className="lightbox-img"
                  src={selectedPreviewImage.previewUrl}
                  alt={selectedPreviewImage.file.name}
                />
              )}
              <div className="lightbox-caption">
                <div className="lightbox-caption-header">
                  <strong>{selectedPreviewImage.file.name}</strong>
                  <span>{getFileSizeLabel(selectedPreviewImage.file.size)}</span>
                </div>
                <div className="lightbox-exif">
                  <div><strong>Camera:</strong> {selectedPreviewImage.metadata?.cameraMake || ''} {selectedPreviewImage.metadata?.cameraModel || 'Unknown'}</div>
                  <div><strong>Focal Length:</strong> {selectedPreviewImage.metadata?.focalLength || 'Unknown'}</div>
                  <div><strong>Date Taken:</strong> {selectedPreviewImage.metadata?.dateTaken || 'Unknown'}</div>
                  {selectedPreviewImage.metadata?.latitude !== null && selectedPreviewImage.metadata?.longitude !== null ? (
                    <>
                      <div><strong>Latitude:</strong> {parseFloat(selectedPreviewImage.metadata.latitude).toFixed(4)}</div>
                      <div><strong>Longitude:</strong> {parseFloat(selectedPreviewImage.metadata.longitude).toFixed(4)}</div>
                      {selectedPreviewImage.metadata.altitude !== null && (
                        <div><strong>Altitude:</strong> {parseFloat(selectedPreviewImage.metadata.altitude).toFixed(1)} m</div>
                      )}
                    </>
                  ) : (
                    <div><strong>GPS:</strong> Not Available</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {authMessage && (
          <div className="auth-banner auth-info">
            {authMessage}
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
                    {readyCount} valid image{readyCount !== 1 ? 's' : ''} ready for upload. {invalidCount} invalid image{invalidCount !== 1 ? 's' : ''} will be skipped.
                  </p>
                </div>
                <button type="button" className="preview-clear-btn" onClick={handleClear}>
                  Clear all
                </button>
              </div>

              <div className="preview-tab-row">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'ready', label: 'Ready' },
                  { id: 'warning', label: 'Warning' },
                  { id: 'invalid', label: 'Invalid' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`preview-tab ${previewFilter === tab.id ? 'active' : ''}`}
                    onClick={() => setPreviewFilter(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="upload-preview-summary">
                <span className="summary-pill valid">{readyCount} ready</span>
                <span className="summary-pill warning">{warningCount} warning</span>
                <span className="summary-pill invalid">{invalidCount} invalid</span>
              </div>

              <div className="compression-batch-summary">
                {allowFullResolution ? (
                  <div className="summary-details">
                    <span><strong>Total Size:</strong> {formatBytes(totalOriginalSize)}</span>
                    <span className="mode-badge full-res">Full Resolution Upload</span>
                  </div>
                ) : (
                  <div className="summary-details">
                    <span><strong>Original:</strong> {formatBytes(totalOriginalSize)}</span>
                    <span><strong>Compressed:</strong> {formatBytes(totalCompressedSize)}</span>
                    <span className="savings-badge">Saved {totalSavedPercent}%</span>
                  </div>
                )}
              </div>

              {hasHeicFile && !allowFullResolution && (
                <div className="heic-compression-note">
                  <span className="material-icons note-icon">info</span>
                  <span className="note-text">
                    HEIC/HEIF images are already highly compressed; additional client-side compression may provide little or no size reduction.
                  </span>
                </div>
              )}

              {uploadStatus && (
                <div className="upload-progress-wrapper">
                  <div className="upload-progress-top">
                    <span className="upload-progress-text">{uploadStatus}</span>
                    <span className="upload-progress-percent">{uploadProgress}%</span>
                  </div>
                  <div className="upload-progress-track">
                    <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <div className="preview-card-row">
                {filteredPreviewFiles.map((item) => (
                  <div
                    key={item.id}
                    className={`preview-card ${item.validation?.severity || 'invalid'}`}
                    onClick={() => setSelectedPreviewImage(item)}
                  >
                    <button
                      type="button"
                      className="preview-remove-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemoveFile(item.id);
                      }}
                      aria-label={`Remove ${item.file.name}`}
                    >
                      <span className="material-icons">close</span>
                    </button>
                    <div className="preview-image-wrapper">
                      {item.validation?.fileType === 'video' ? (
                        <video src={item.previewUrl} controls className="preview-video" />
                      ) : item.file.name.match(/\.(heic|heif|heics|heifs)$/i) && !item.validation?.convertedFile ? (
                        <div className="preview-heic-fallback">
                          <span className="material-icons fallback-icon">image</span>
                          <span className="fallback-text">HEIC</span>
                        </div>
                      ) : (
                        <img src={item.previewUrl} alt={item.file.name} />
                      )}
                    </div>
                      <div className="preview-card-body">
                      <div className="preview-filename">{item.file.name}</div>
                      <div className="preview-meta">
                        {allowFullResolution ? (
                          <span>{getFileSizeLabel(item.originalSize)} (Full Res)</span>
                        ) : item.isCompressed ? (
                          <>
                            <span className="original-size-strike">{getFileSizeLabel(item.originalSize)}</span>
                            <span className="compressed-size-label"> → {getFileSizeLabel(item.compressedSize)}</span>
                            <span className="savings-badge-small"> (-{Math.round(((item.originalSize - item.compressedSize) / item.originalSize) * 100)}%)</span>
                          </>
                        ) : (
                          getFileSizeLabel(item.originalSize)
                        )}
                      </div>
                      
                      <div className="preview-exif-info">
                        <div><strong>Model:</strong> {item.metadata?.cameraModel || 'Unknown'}</div>
                        <div><strong>Focal Length:</strong> {item.metadata?.focalLength || 'Unknown'}</div>
                        <div><strong>Date:</strong> {item.metadata?.dateTaken || 'Unknown'}</div>
                        {item.metadata?.latitude !== null && item.metadata?.longitude !== null ? (
                          <>
                            <div><strong>Latitude:</strong> {parseFloat(item.metadata.latitude).toFixed(4)}</div>
                            <div><strong>Longitude:</strong> {parseFloat(item.metadata.longitude).toFixed(4)}</div>
                          </>
                        ) : (
                          <div><strong>GPS:</strong> Not Available</div>
                        )}
                      </div>

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
