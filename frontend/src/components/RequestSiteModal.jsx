import React, { useState } from 'react';
import { getApiBaseUrl } from '../utils/apiConfig';

// Inline styles for modern, responsive modal
const modalStyles = `
.tirtha-modal-overlay {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.35); z-index: 1000; display: flex; align-items: center; justify-content: center;
}
.tirtha-modal-card {
  background: #fff; border-radius: 18px; box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  max-width: 700px; width: 90vw; padding: 2.2rem 2.2rem 1.7rem 2.2rem; position: relative;
  font-family: 'Segoe UI', Arial, sans-serif;
  max-height: 90vh; overflow-y: auto;
}
@media (max-width: 480px) {
  .tirtha-modal-card { width: 95vw; padding: 1.5rem 1rem; max-height: 85vh; }
  .tirtha-modal-title { font-size: 1.1rem; }
  .tirtha-modal-hint { font-size: 0.85rem; }
  .tirtha-modal-form .wide-input, .tirtha-modal-form .medium-input, .tirtha-modal-form .small-input {
    width: 100% !important;
  }
}
.tirtha-modal-close {
  position: absolute; top: 18px; right: 18px; background: none; border: none; font-size: 1.5rem; cursor: pointer;
}
.tirtha-modal-title {
  font-size: 1.35rem; font-weight: 700; margin-bottom: 0.5rem; text-align: center;
}
.tirtha-modal-hint {
  font-size: 0.98rem; color: #555; margin-bottom: 1.1rem; text-align: center;
}
.tirtha-modal-form label {
  display: block; margin-bottom: 0.7rem; font-size: 1rem;
}
.tirtha-modal-form .wide-input {
  width: 100%; height: 48px; padding: 0.7rem 1.2rem; border: 1.5px solid #bbb; border-radius: 8px; font-size: 1.13rem; margin-top: 0.3rem;
  margin-bottom: 0.7rem; background: #fafbfc; box-sizing: border-box;
}
.tirtha-modal-form .medium-input {
  width: 70%; height: 40px; padding: 0.6rem 1rem; border: 1.5px solid #bbb; border-radius: 8px; font-size: 1.05rem; margin-top: 0.3rem;
  margin-bottom: 0.7rem; background: #fafbfc; box-sizing: border-box;
}
.tirtha-modal-form .small-input {
  width: 55%; height: 36px; padding: 0.5rem 0.8rem; border: 1.5px solid #bbb; border-radius: 8px; font-size: 1rem; margin-top: 0.3rem;
  margin-bottom: 0.7rem; background: #fafbfc; box-sizing: border-box;
}
.tirtha-modal-form textarea {
  width: 100%; min-height: 90px; max-height: 200px; padding: 0.7rem 1rem; border: 1.5px solid #bbb; border-radius: 8px; font-size: 1.08rem; margin-top: 0.3rem;
  margin-bottom: 0.7rem; background: #fafbfc; resize: vertical; box-sizing: border-box;
}
.tirtha-modal-form textarea {
  width: 100%; min-height: 90px; max-height: 200px; padding: 0.7rem 1rem; border: 1.5px solid #bbb; border-radius: 8px; font-size: 1.08rem; margin-top: 0.3rem;
  margin-bottom: 0.7rem; background: #fafbfc; resize: vertical; box-sizing: border-box;
}
.tirtha-modal-form input[type="file"] {
  margin-top: 0.2rem; font-size: 0.98rem;
}
.tirtha-modal-form .tirtha-image-preview {
  display: flex; justify-content: center; margin: 0.7rem 0 0.5rem 0;
}
.tirtha-modal-form .tirtha-image-preview img {
  max-width: 220px; max-height: 140px; border-radius: 8px; border: 1px solid #eee;
}
.tirtha-modal-form .tirtha-checkbox-row {
  display: flex; align-items: center; margin-bottom: 0.5rem;
}
.tirtha-modal-form .tirtha-checkbox-row input[type="checkbox"] {
  margin-right: 0.5rem; accent-color: #1e88e5;
}
.tirtha-modal-form .tirtha-checkbox-row a {
  color: #1e88e5; text-decoration: underline; margin-left: 0.2rem;
}
.tirtha-modal-form .tirtha-error {
  color: #d32f2f; font-size: 0.98rem; margin-bottom: 0.5rem; text-align: center;
}
.tirtha-modal-form .tirtha-success {
  color: #388e3c; font-size: 1rem; margin-bottom: 0.5rem; text-align: center;
}
.tirtha-modal-form .tirtha-modal-actions {
  display: flex; gap: 0.7rem; margin-top: 1.2rem; justify-content: center;
}
.tirtha-modal-form button[type="submit"] {
  background: #1e88e5; color: #fff; border: none; border-radius: 7px; padding: 0.6rem 1.3rem; font-size: 1rem; font-weight: 600; cursor: pointer;
  transition: background 0.18s;
}
.tirtha-modal-form button[type="submit"]:disabled {
  background: #b3c6e0; color: #fff; cursor: not-allowed;
}
.tirtha-modal-form button[type="button"] {
  background: #eee; color: #222; border: none; border-radius: 7px; padding: 0.6rem 1.3rem; font-size: 1rem; font-weight: 600; cursor: pointer;
  transition: background 0.18s;
}
@media (max-width: 600px) {
  .tirtha-modal-card { padding: 1.1rem 0.5rem 1rem 0.5rem; }
  .tirtha-modal-title { font-size: 1.1rem; }
}
`;

function RequestSiteModal({ isOpen, onClose, initialEmail = '', mapCoordinates = null }) {
  // Minimal state for clarity
  const [form, setForm] = useState({
    email: initialEmail,
    name: '',
    siteName: '',
    stateName: '',
    country: '',
    description: '',
    mapsUrl: '',
    agreeTerms: false,
    agreePrivacy: false,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Only render if open
  if (!isOpen) return null;

  // File preview
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  // Form field change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    console.log('handleSubmit fired');

    // Basic validation
    if (!form.name || !form.email || !form.siteName || !form.stateName || !form.country || !form.agreeTerms || !form.agreePrivacy || !mapCoordinates) {
      setErrorMessage('All required fields and agreements must be filled.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('email', form.email);
      formData.append('site_name', form.siteName);
      formData.append('state', form.stateName);
      formData.append('country', form.country);
      if (form.description) formData.append('description', form.description);
      if (form.mapsUrl) formData.append('google_maps_url', form.mapsUrl);
      formData.append('latitude', String(mapCoordinates.lat));
      formData.append('longitude', String(mapCoordinates.lng));
      formData.append('terms_accepted', 'true');
      formData.append('privacy_accepted', 'true');
      if (imageFile) formData.append('image', imageFile);

      console.log('Submitting to API:', getApiBaseUrl() + '/api/site-requests/submit/');
      const response = await fetch(getApiBaseUrl() + '/api/site-requests/submit/', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to submit request.');
      setSuccessMessage('Request Site information submitted successfully!');
      // Reset form after successful submission
      setForm({
        email: initialEmail,
        name: '',
        siteName: '',
        stateName: '',
        country: '',
        description: '',
        mapsUrl: '',
        agreeTerms: false,
        agreePrivacy: false,
      });
      setImageFile(null);
      setImagePreview('');
      // Clear success message after 2 seconds
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>{modalStyles}</style>
      <div className="tirtha-modal-overlay">
        <div className="tirtha-modal-card" onClick={e => e.stopPropagation()}>
          <button className="tirtha-modal-close" onClick={onClose} aria-label="Close modal">✕</button>
          <div className="tirtha-modal-title">Request Site Submission</div>
          <div className="tirtha-modal-hint">
            {mapCoordinates ? `Last selected map coordinates: ${mapCoordinates.lat}, ${mapCoordinates.lng}` : 'Select location on map.'}
          </div>
          <form className="tirtha-modal-form" onSubmit={handleSubmit} autoComplete="off">
            {/* 1. Name (required, wide) */}
            <div style={{marginBottom: '1.1rem'}}>
              <input className="wide-input" name="name" value={form.name} onChange={handleChange} required placeholder="Name*" />
            </div>
            {/* 2. Email (required, small) */}
            <div style={{marginBottom: '1.1rem'}}>
              <input className="small-input" name="email" value={form.email} onChange={handleChange} required type="email" placeholder="Email*" />
            </div>
            {/* 3. Site Name (required, wide) */}
            <div style={{marginBottom: '1.1rem'}}>
              <input className="wide-input" name="siteName" value={form.siteName} onChange={handleChange} required placeholder="Site Name*" />
            </div>
            {/* 4. State (required, wide) */}
            <div style={{marginBottom: '1.1rem'}}>
              <input className="wide-input" name="stateName" value={form.stateName} onChange={handleChange} required placeholder="State*" />
            </div>
            {/* 5. Country (required, wide) */}
            <div style={{marginBottom: '1.1rem'}}>
              <input className="wide-input" name="country" value={form.country} onChange={handleChange} required placeholder="Country*" />
            </div>
            {/* 6. Description (optional, wide textarea, no asterisk) */}
            <div style={{marginBottom: '1.1rem'}}>
              <textarea name="description" value={form.description} onChange={handleChange} placeholder="Description (Details about the site)" />
            </div>
            {/* 7. Google Maps location link (optional, small) */}
            <div style={{marginBottom: '1.1rem'}}>
              <input className="small-input" name="mapsUrl" value={form.mapsUrl} onChange={handleChange} type="url" placeholder="Google Maps location link (URL)" />
            </div>
            {/* 3. Image Upload (optional) */}
            <div style={{marginBottom: '1.1rem'}}>
              <label style={{fontWeight: 600, display: 'block', marginBottom: 4}}>3. Image Upload (optional)</label>
              <span style={{fontSize: '0.98rem'}}>Upload Image (max 10MB)</span><br/>
              <input type="file" accept="image/*" onChange={handleFileChange} />
              {imagePreview && (
                <div className="tirtha-image-preview"><img src={imagePreview} alt="Preview" /></div>
              )}
            </div>

            {/* 6. Legal Agreements */}
            <div style={{marginBottom: '1.1rem'}}>
              <label style={{fontWeight: 600, display: 'block', marginBottom: 4}}>6. Legal Agreements</label>
              <div className="tirtha-checkbox-row">
                <input type="checkbox" name="agreeTerms" checked={form.agreeTerms} onChange={handleChange} />
                agree to the <a href="https://smlab.niser.ac.in/project/tirtha/#terms" target="_blank" rel="noopener noreferrer">Terms of Use</a> <span style={{color: 'red'}}>*</span>
              </div>
              <div className="tirtha-checkbox-row">
                <input type="checkbox" name="agreePrivacy" checked={form.agreePrivacy} onChange={handleChange} />
                agree to the <a href="https://smlab.niser.ac.in/project/tirtha/#privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a> <span style={{color: 'red'}}>*</span>
              </div>
            </div>
            {errorMessage && <div className="tirtha-error">{errorMessage}</div>}
            {successMessage && <div className="tirtha-success">{successMessage}</div>}
            <div className="tirtha-modal-actions">
              <button type="button" onClick={onClose} disabled={isSubmitting} style={{background:'#2196f3', color:'#fff'}}>Cancel</button>
              <button type="submit" disabled={isSubmitting} style={{background:'#43a047', color:'#fff'}}>{isSubmitting ? 'Submitting...' : 'Submit Request'}</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default RequestSiteModal;
