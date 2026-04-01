import React, { useEffect, useMemo, useState } from 'react';
import '../styles/RequestSiteModal.css';

function RequestSiteModal({ isOpen, onClose, initialEmail = '', mapCoordinates = null }) {
  const [email, setEmail] = useState(initialEmail);
  const [useEmailForResponse, setUseEmailForResponse] = useState(true);
  const [name, setName] = useState('');
  const [affiliation, setAffiliation] = useState('');

  const [siteName, setSiteName] = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('');
  const [country, setCountry] = useState('');
  const [sourceLink, setSourceLink] = useState('');
  const [mapsLink, setMapsLink] = useState('');

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageError, setImageError] = useState('');

  const [restrictedLocation, setRestrictedLocation] = useState('No');
  const [orgType, setOrgType] = useState('ASI');
  const [additionalInfo, setAdditionalInfo] = useState('');

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    setEmail(initialEmail || '');
  }, [initialEmail]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(imageFile);
  }, [imageFile]);

  const isValidURL = (value) => {
    if (!value) return true;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  };

  const isSubmitDisabled = useMemo(() => {
    if (!name.trim() || !affiliation.trim()) return true;
    if (!siteName.trim() || !district.trim() || !stateName.trim() || !country.trim()) return true;
    if (!agreeTerms || !agreePrivacy) return true;
    if (!isValidURL(sourceLink) || !isValidURL(mapsLink)) return true;
    return false;
  }, [name, affiliation, siteName, district, stateName, country, agreeTerms, agreePrivacy, sourceLink, mapsLink]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setImageFile(null);
      setImageError('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setImageError('Please upload a valid image file.');
      setImageFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setImageError('Image size must be 10MB or less.');
      setImageFile(null);
      return;
    }

    setImageError('');
    setImageFile(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isSubmitDisabled) {
      setErrorMessage('Please complete required fields and agree to policies.');
      return;
    }

    const formData = {
      email,
      useEmailForResponse,
      name,
      affiliation,
      siteName,
      district,
      state: stateName,
      country,
      sourceLink,
      mapsLink,
      mapCoordinates,
      imageFile,
      restrictedLocation,
      orgType,
      additionalInfo,
      agreeTerms,
      agreePrivacy,
      submittedAt: new Date().toISOString(),
    };

    console.log('Request site form data:', formData);
    setErrorMessage('');

    // In future, integrate with backend / API call here.

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="request-site-modal-overlay" onClick={onClose}>
      <div className="request-site-modal" onClick={(e) => e.stopPropagation()}>
        <button className="request-site-close" onClick={onClose} aria-label="Close modal">✕</button>

        <h2>Request Site Submission</h2>

        <div className="request-site-hint">
          {mapCoordinates
            ? `Last selected map coordinates: ${mapCoordinates.lat.toFixed(6)}, ${mapCoordinates.lng.toFixed(6)}`
            : 'Click the map first to auto-capture coordinates (optional).'}
        </div>

        <form className="request-site-form" onSubmit={handleSubmit}>
          <section>
            <h3>1. User Details</h3>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={useEmailForResponse} onChange={(e) => setUseEmailForResponse(e.target.checked)} />
              Use this email for response
            </label>
            <label>
              Name <span>*</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              Affiliation <span>*</span>
              <input type="text" value={affiliation} onChange={(e) => setAffiliation(e.target.value)} required />
            </label>
          </section>

          <section>
            <h3>2. Site Details</h3>
            <label>
              Site Name <span>*</span>
              <input type="text" value={siteName} onChange={(e) => setSiteName(e.target.value)} required />
            </label>
            <label>
              District <span>*</span>
              <input type="text" value={district} onChange={(e) => setDistrict(e.target.value)} required />
            </label>
            <label>
              State <span>*</span>
              <input type="text" value={stateName} onChange={(e) => setStateName(e.target.value)} required />
            </label>
            <label>
              Country <span>*</span>
              <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} required />
            </label>
            <label>
              Link to known source (URL)
              <input type="url" value={sourceLink} onChange={(e) => setSourceLink(e.target.value)} placeholder="https://" />
            </label>
            <label>
              Google Maps location link (URL)
              <input type="url" value={mapsLink} onChange={(e) => setMapsLink(e.target.value)} placeholder="https://goo.gl/maps/..." />
            </label>
            <input type="hidden" name="latitude" value={mapCoordinates?.lat || ''} />
            <input type="hidden" name="longitude" value={mapCoordinates?.lng || ''} />
          </section>

          <section>
            <h3>3. Image Upload</h3>
            <label className="file-input-label">
              Upload Image (max 10MB)
              <input type="file" accept="image/*" onChange={handleFileChange} />
            </label>
            {imageError && <p className="field-error">{imageError}</p>}
            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Upload preview" />
              </div>
            )}
          </section>

          <section>
            <h3>4. Permissions</h3>
            <div className="radio-group">
              <label>
                <input type="radio" name="restrictedLocation" value="Yes" checked={restrictedLocation === 'Yes'} onChange={(e) => setRestrictedLocation(e.target.value)} />
                Yes
              </label>
              <label>
                <input type="radio" name="restrictedLocation" value="No" checked={restrictedLocation === 'No'} onChange={(e) => setRestrictedLocation(e.target.value)} />
                No
              </label>
            </div>
          </section>

          <section>
            <h3>5. Optional Info</h3>
            <div className="radio-group">
              <label>
                <input type="radio" name="orgType" value="ASI" checked={orgType === 'ASI'} onChange={(e) => setOrgType(e.target.value)} />
                Archaeological Survey of India
              </label>
              <label>
                <input type="radio" name="orgType" value="State Archaeology" checked={orgType === 'State Archaeology'} onChange={(e) => setOrgType(e.target.value)} />
                State Archaeology
              </label>
              <label>
                <input type="radio" name="orgType" value="Other" checked={orgType === 'Other'} onChange={(e) => setOrgType(e.target.value)} />
                Other
              </label>
            </div>
            <label>
              Additional info
              <textarea value={additionalInfo} onChange={(e) => setAdditionalInfo(e.target.value)} rows={4} />
            </label>
          </section>

          <section>
            <h3>6. Legal Agreements</h3>
            <label className="checkbox-label">
              <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
              I agree to the <a href="https://smlab.niser.ac.in/project/tirtha/#terms" target="_blank" rel="noreferrer">Terms of Use</a> <span>*</span>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} />
              I agree to the <a href="https://smlab.niser.ac.in/project/tirtha/#privacy" target="_blank" rel="noreferrer">Privacy Policy</a> <span>*</span>
            </label>
          </section>

          {errorMessage && <p className="form-error">{errorMessage}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-tertiary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitDisabled}>Submit Request</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RequestSiteModal;
