import React from 'react';
import '../styles/TempleDetails.css';

function TempleDetails({ temple, onClose }) {
  return (
    <div className="temple-details">
      <button 
        className="temple-details-close"
        onClick={onClose}
        aria-label="Close temple details"
        title="Close"
      >
        ← Back
      </button>

      <img 
        src="/images/vikram-chouhan-udaipur-web-designer-vPfKQsSgf04-unsplash.jpg"
        alt={temple.name}
        className="temple-details-image"
        onError={(e) => {
          e.target.src = 'https://via.placeholder.com/300x200?text=' + temple.name;
        }}
      />

      <h2 className="temple-details-title">{temple.name}</h2>
      
      <p className="temple-details-location">
        📍 {temple.location || 'Ayodhya, Uttar Pradesh'}
      </p>

      <div className="temple-details-content">
        <p className="temple-details-description">
          {temple.description || `Explore the architectural and spiritual marvel of ${temple.name}.`}
        </p>

        <div className="temple-details-info">
          <h3>About This Temple</h3>
          <ul>
            <li><strong>Religious significance:</strong> One of the most sacred temples in Hindu tradition</li>
            <li><strong>Architecture:</strong> Ancient Hindu temple architecture at its finest</li>
            <li><strong>Visitor info:</strong> Open year-round for pilgrims and tourists</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default TempleDetails;
