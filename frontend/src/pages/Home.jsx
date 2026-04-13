import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import SearchBar from '../components/SearchBar';
import ModelCard from '../components/ModelCard';
import MapView from '../components/MapView';
import ModalViewer from '../components/ModalViewer';
import ContributeModal from '../components/ContributeModal';
import RequestSiteModal from '../components/RequestSiteModal';
import { TEMPLE_LOCATIONS } from '../constants/templeLocations';
import '../styles/Home.css';

const DEFAULT_CONTRIBUTE_TARGET = { title: 'Tirtha', siteName: null };
const DEFAULT_POSITION = { lat: 20.5937, lng: 78.9629 };

function Home() {
  const { t } = useTranslation(['home', 'common']);
  const temples = t('home:temples', { returnObjects: true });
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [selectedTemple, setSelectedTemple] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [contributeTarget, setContributeTarget] = useState(DEFAULT_CONTRIBUTE_TARGET);
  const [isRequestSiteOpen, setIsRequestSiteOpen] = useState(false);
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(DEFAULT_POSITION);
  const [mapCoordinates, setMapCoordinates] = useState(null);
  const [searchTarget, setSearchTarget] = useState(null);

  const isMobileViewport = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  };
  const showSidebar = isMobileViewport() ? sidebarVisible : (!isFullscreen || sidebarVisible);

  useEffect(() => {
    if (!isFullscreen && !isMobileViewport()) {
      setSidebarVisible(true);
    }
  }, [isFullscreen]);

  const handleOpenModel = (templeId) => {
    if (import.meta.env.DEV) {
      console.log('Opening model for temple:', templeId);
    }
    // TODO: Implement 3D model viewer
  };

  const handleMarkerClick = (temple) => {
    if (import.meta.env.DEV) {
      console.log('Marker clicked:', temple);
    }
    setSelectedTemple(temple);
    setIsModalOpen(true);
  };

  const handleSearchSelect = (temple) => {
    if (!temple) return;
    const templeWithPosition = {
      ...temple,
      position: [temple.lat, temple.lng],
      fromSearch: true,
    };
    setSelectedTemple(templeWithPosition);
    setSearchTarget({ position: [temple.lat, temple.lng], zoom: 12 });
    setIsModalOpen(false);
    setSidebarVisible(false);
  };

  const openGeneralContribute = () => {
    setContributeTarget(DEFAULT_CONTRIBUTE_TARGET);
    setIsContributeOpen(true);
  };

  const openTempleContribute = (temple) => {
    setIsModalOpen(false);
    setSidebarVisible(false);
    setContributeTarget({ title: temple?.name || 'Tirtha', siteName: temple?.name || null });
    setIsContributeOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSidebarVisible(false);
    setSelectedTemple(null);
  };

  const resetRequestSelection = () => {
    setIsSelectingLocation(false);
    setSelectedPosition(DEFAULT_POSITION);
  };

  const handleStartLocationSelection = () => {
    const initial = mapCoordinates || DEFAULT_POSITION;
    setSelectedPosition(initial);
    setIsSelectingLocation(true);
    setIsRequestSiteOpen(false);
  };

  const handleConfirmLocation = () => {
    const finalPosition = selectedPosition || DEFAULT_POSITION;
    setMapCoordinates(finalPosition);
    setSelectedPosition(finalPosition);
    setIsSelectingLocation(false);
    setIsRequestSiteOpen(true);
  };

  const handleCloseRequestSite = () => {
    setIsRequestSiteOpen(false);
    resetRequestSelection();
    setMapCoordinates(null);
  };

  const handleCancelLocationSelection = () => {
    resetRequestSelection();
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
        if (!isMobileViewport()) {
          setSidebarVisible(!nextFullscreen);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, isModalOpen]);

  return (
    <div className={`home-container ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      {showSidebar && (
        <button
          type="button"
          className="mobile-sidebar-backdrop"
          onClick={() => setSidebarVisible(false)}
          aria-label="Close sidebar"
        />
      )}

      {!isModalOpen && (
        <button
          type="button"
          className="mobile-sidebar-toggle"
          onClick={() => setSidebarVisible((prev) => !prev)}
          aria-label={sidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
          aria-expanded={sidebarVisible}
        >
          <span className="material-icons">menu</span>
        </button>
      )}

      <Sidebar 
        isVisible={showSidebar}
        onMobileClose={() => setSidebarVisible(false)}
      />
      <div className="main-content">
        {!isFullscreen && (
          <SearchBar templeList={TEMPLE_LOCATIONS} onSearchSelect={handleSearchSelect} />
        )}
        <div className="content-area">
          <div className="hero-section">
            {/* Map component - replaces placeholder */}
            <MapView 
              templeList={TEMPLE_LOCATIONS}
              onMarkerClick={handleMarkerClick}
              onSearchSelect={handleSearchSelect}
              showMapSearch={isFullscreen}
              onMapClick={setMapCoordinates}
              isSelectingLocation={isSelectingLocation}
              selectedPosition={selectedPosition}
              onSelectionPositionChange={setSelectedPosition}
              onConfirmLocation={handleConfirmLocation}
              onCancelLocationSelection={handleCancelLocationSelection}
              searchTarget={searchTarget}
            />
            
            <button 
              className="btn-fullscreen-toggle"
              onClick={(e) => {
                e.stopPropagation();
                const nextFullscreen = !isFullscreen;
                setIsFullscreen(nextFullscreen);
                if (!isMobileViewport()) {
                  setSidebarVisible(!nextFullscreen);
                }
              }}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              <span className="material-icons">
                {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
              </span>
            </button>
            
            {(isFullscreen || isMobileViewport()) && (
              <>
                <button
                  className="btn btn-tertiary request-bottom-right"
                  onClick={handleStartLocationSelection}
                >
                  {t('common:buttons.requestSite')}
                </button>
              </>
            )}
          </div>

          <div className="action-buttons" style={{ display: (isFullscreen || isMobileViewport()) ? 'none' : 'flex' }}>
            <button className="btn btn-tertiary" onClick={handleStartLocationSelection}>
              {t('common:buttons.requestSite')}
            </button>
          </div>

          <div className="models-section" style={{ display: isFullscreen ? 'none' : 'flex' }}>
            <h2>{t('home:sections.featuredTemples')}</h2>
            <div className="models-grid">
              {temples.map((temple) => (
                <ModelCard
                  key={temple.id}
                  image={`https://via.placeholder.com/300x200?text=${encodeURIComponent(temple.title)}`}
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
        onContributeClick={() => openTempleContribute(selectedTemple)}
      />

      {/* Contribution modal */}
      <ContributeModal
        isOpen={isContributeOpen}
        onClose={() => setIsContributeOpen(false)}
        targetName={contributeTarget.title}
        siteName={contributeTarget.siteName}
      />

      <RequestSiteModal
        isOpen={isRequestSiteOpen}
        onClose={handleCloseRequestSite}
        initialEmail=""
        mapCoordinates={mapCoordinates}
      />
    </div>
  );
}

export default Home;