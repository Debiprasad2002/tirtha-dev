import React from 'react';
import '../styles/RamMandiTooltip.css';

function RamMandiTooltip() {
  return (
    <div className="temple-tooltip">
      <h4 className="tooltip-temple-name">Ram Mandir</h4>
      <img 
        src="/gifs/Rama Jai Shree Ram GIF.gif" 
        alt="Ram Mandir" 
        className="tooltip-gif"
        onError={(e) => {
          e.target.style.display = 'none';
        }}
      />
      <p className="tooltip-location">Ayodhya, Uttar Pradesh</p>
    </div>
  );
}

export default RamMandiTooltip;
