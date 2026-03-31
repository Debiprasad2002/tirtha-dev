import React from 'react';
import '../styles/RamMandiTooltip.css';

function RamMandiTooltip({ temple }) {
  const name = temple?.name || 'Ram Mandir';
  const gifUrl = temple?.gifUrl || '/gifs/Rama Jai Shree Ram GIF.gif';
  const location = temple?.location || 'Ayodhya, Uttar Pradesh';

  return (
    <div className="temple-tooltip">
      <h4 className="tooltip-temple-name">{name}</h4>
      <img
        src={gifUrl}
        alt={name}
        className="tooltip-gif"
        onError={(e) => {
          e.target.style.display = 'none';
        }}
      />
      <p className="tooltip-location">{location}</p>
    </div>
  );
}

export default RamMandiTooltip;
