import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import SearchBar from '../components/SearchBar';
import ModelCard from '../components/ModelCard';
import MapView from '../components/MapView';
import ModalViewer from '../components/ModalViewer';
import ContributeModal from '../components/ContributeModal';
import RequestSiteModal from '../components/RequestSiteModal';
import '../styles/Home.css';

function Home() {
  const { t } = useTranslation(['home', 'common']);
  const temples = t('home:temples', { returnObjects: true });
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [selectedTemple, setSelectedTemple] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [isRequestSiteOpen, setIsRequestSiteOpen] = useState(false);
  const [mapCoordinates, setMapCoordinates] = useState(null);

  const showSidebar = !isFullscreen || sidebarVisible;

  useEffect(() => {
    if (!isFullscreen) {
      setSidebarVisible(true);
    }
  }, [isFullscreen]);

  const handleOpenModel = (templeId) => {
    console.log('Opening model for temple:', templeId);
    // TODO: Implement 3D model viewer
  };

  const handleMarkerClick = (temple) => {
    console.log('Marker clicked:', temple);
    setSelectedTemple(temple);
    setIsModalOpen(true);
    setSidebarVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSidebarVisible(false);
    setSelectedTemple(null);
  };

  // Handle ESC key to exit fullscreen and F key to toggle
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isModalOpen) {
          handleCloseModal();
        } else if (isFullscreen) {
          setIsFullscreen(false);
        }
      }
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.altKey) {
        const nextFullscreen = !isFullscreen;
        setIsFullscreen(nextFullscreen);
        setSidebarVisible(!nextFullscreen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, isModalOpen]);

  return (
    <div className={`home-container ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      <Sidebar 
        isVisible={showSidebar}
        selectedTemple={selectedTemple}
        onTempleClose={() => {
          setSelectedTemple(null);
          setSidebarVisible(false);
          setIsModalOpen(false);
        }}
      />
      <div className="main-content">
        <SearchBar />
        <div className="content-area">
          <div 
            className="hero-section"
            onClick={() => {
              setIsFullscreen(true);
              setSidebarVisible(false);
            }}
            role="button"
            tabIndex={0}
            title={isFullscreen ? 'Exit fullscreen (ESC)' : 'Enter fullscreen'}
          >
            {/* Map component - replaces placeholder */}
            <MapView 
              onMarkerClick={handleMarkerClick}
              onMapClick={setMapCoordinates}
              selectedTemple={selectedTemple}
            />
            
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
                <button className="btn btn-primary" onClick={() => setIsContributeOpen(true)}>{t('common:buttons.contribute')}</button>
                <button className="btn btn-tertiary" onClick={() => setIsRequestSiteOpen(true)}>
                  {t('common:buttons.requestSite')}
                </button>
              </div>
            )}
          </div>

          <div className="action-buttons" style={{ display: isFullscreen ? 'none' : 'flex' }}>
            <button className="btn btn-primary" onClick={() => setIsContributeOpen(true)}>{t('common:buttons.contribute')}</button>
            <button className="btn btn-tertiary" onClick={() => setIsRequestSiteOpen(true)}>
              {t('common:buttons.requestSite')}
            </button>
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

      {/* 3D Model Viewer Modal */}
      <ModalViewer 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        temple={selectedTemple}
        onContributeClick={() => setIsContributeOpen(true)}
      />

      {/* Contribution modal */}
      <ContributeModal
        isOpen={isContributeOpen}
        onClose={() => setIsContributeOpen(false)}
      />

      <RequestSiteModal
        isOpen={isRequestSiteOpen}
        onClose={() => setIsRequestSiteOpen(false)}
        initialEmail=""
        mapCoordinates={mapCoordinates}
      />
    </div>
  );
}

export default Home;