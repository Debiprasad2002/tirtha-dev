import React from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/ModelCard.css';

function ModelCard({ image, title, description, onOpen }) {
  const { t } = useTranslation('common');

  return (
    <div className="model-card">
      <div className="model-card-image">
        <img src={image} alt={title} />
        <div className="model-card-overlay">
          <button className="open-button" onClick={onOpen}>
            {t('common:buttons.open')}
          </button>
        </div>
      </div>
      <div className="model-card-content">
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
    </div>
  );
}

export default ModelCard;
