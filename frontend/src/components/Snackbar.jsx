import React from 'react';
import '../styles/Snackbar.css';

function Snackbar({ message, variant = 'info', onClose }) {
  if (!message) return null;

  return (
    <div className={`snackbar snackbar-${variant}`} role="status" aria-live="polite">
      <span>{message}</span>
      {onClose && (
        <button type="button" className="snackbar-close" onClick={onClose} aria-label="Dismiss notification">
          ×
        </button>
      )}
    </div>
  );
}

export default Snackbar;
