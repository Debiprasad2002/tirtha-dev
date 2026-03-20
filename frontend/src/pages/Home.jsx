import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import SearchBar from '../components/SearchBar';
import ModelCard from '../components/ModelCard';
import '../styles/Home.css';

function Home() {
  const { t } = useTranslation(['home', 'common']);
  const temples = t('home:temples', { returnObjects: true });
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleOpenModel = (templeId) => {
    console.log('Opening model for temple:', templeId);
    // TODO: Implement 3D model viewer
  };

  // Handle ESC key to exit fullscreen and F key to toggle
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
      if ((e.key === 'f' || e.key === 'F') && e.ctrlKey === false && e.altKey === false) {
        setIsFullscreen(!isFullscreen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  return (
    <div className={`home-container ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      <Sidebar isVisible={sidebarVisible && !isFullscreen} />
      <div className="main-content">
        <SearchBar />
        <div className="content-area">
          <div 
            className="hero-section"
            onClick={() => setIsFullscreen(true)}
            role="button"
            tabIndex={0}
            title={isFullscreen ? 'Exit fullscreen (ESC)' : 'Enter fullscreen'}
          >
            {/* 3D Model/Map area will go here */}
            <div className="placeholder-3d">
              <p>{t('home:placeholders.3dModel')}</p>
              {!isFullscreen && <p style={{ fontSize: '12px', marginTop: '10px', opacity: 0.7 }}>Click or press F to expand</p>}
            </div>
            
            <button 
              className="btn-fullscreen-toggle"
              onClick={(e) => {
                e.stopPropagation();
                setIsFullscreen(!isFullscreen);
              }}
              title={isFullscreen ? 'Exit fullscreen (ESC)' : 'Enter fullscreen (F)'}
            >
              <span className="material-icons">
                {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
              </span>
            </button>
            
            {isFullscreen && (
              <div className="floating-action-buttons">
                <button className="btn btn-secondary">{t('common:buttons.hideInfo')}</button>
                <button className="btn btn-primary">{t('common:buttons.contribute')}</button>
                <button className="btn btn-tertiary">{t('common:buttons.requestSite')}</button>
              </div>
            )}
          </div>

          <div className="action-buttons" style={{ display: isFullscreen ? 'none' : 'flex' }}>
            <button className="btn btn-secondary">{t('common:buttons.hideInfo')}</button>
            <button className="btn btn-primary">{t('common:buttons.contribute')}</button>
            <button className="btn btn-tertiary">{t('common:buttons.requestSite')}</button>
          </div>

          <div className="models-section" style={{ display: isFullscreen ? 'none' : 'flex' }}>
            <h2>{t('home:sections.featuredTemples')}</h2>
            <div className="models-grid">
              {temples.map((temple) => (
                <ModelCard
                  key={temple.id}
                  image={`https://via.placeholder.com/300x200?text=${temple.title}`}
                  title={temple.title}
                  description={temple.description}
                  onOpen={() => handleOpenModel(temple.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;