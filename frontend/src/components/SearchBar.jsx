import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/SearchBar.css';

const SAMPLE_PLACEHOLDERS = [
  'Search Jagannath Temple',
  'Search Ram Mandir',
  'Search Kanaka Durga Temple',
  'Search Ram Mandir',
  'Search Jagannath Temple',
];

function SearchBar({ templeList = [], onSearchSelect, variant = 'default' }) {
  const { t } = useTranslation('common');
  const isMapSearch = variant === 'map';
  const containerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [placeholderText, setPlaceholderText] = useState(t('common:placeholders.searchModels'));
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const queryRef = useRef('');

  // Close suggestions when clicking outside the search container
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsFocused(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside, { passive: true });
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('templeSearchHistory');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error('Error loading search history:', e);
        }
      }
    }
  }, []);

  useEffect(() => {
    queryRef.current = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    let currentIndex = 0;
    setPlaceholderText(SAMPLE_PLACEHOLDERS[currentIndex]);

    const interval = setInterval(() => {
      if (queryRef.current) return;
      currentIndex = (currentIndex + 1) % SAMPLE_PLACEHOLDERS.length;
      setPlaceholderText(SAMPLE_PLACEHOLDERS[currentIndex]);
    }, 2600);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedQuery(searchQuery.trim().toLowerCase());
    }, 200);

    return () => window.clearTimeout(timerId);
  }, [searchQuery]);

  const filteredSuggestions = useMemo(() => {
    if (!debouncedQuery) return [];

    return templeList
      .filter((temple) =>
        temple.name.toLowerCase().includes(debouncedQuery) ||
        temple.location.toLowerCase().includes(debouncedQuery)
      )
      .slice(0, 8);
  }, [debouncedQuery, templeList]);

  useEffect(() => {
    setActiveIndex(filteredSuggestions.length > 0 ? 0 : -1);
  }, [filteredSuggestions.length]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (activeIndex >= 0 && activeIndex < filteredSuggestions.length) {
      handleSuggestionClick(filteredSuggestions[activeIndex]);
    } else if (filteredSuggestions.length > 0) {
      handleSuggestionClick(filteredSuggestions[0]);
    }
  };

  const handleSuggestionClick = useCallback((temple) => {
    // Save to search history
    const newHistory = [
      { name: temple.name, location: temple.location, lat: temple.lat, lng: temple.lng },
      ...recentSearches.filter(t => t.name !== temple.name),
    ].slice(0, 5);
    
    setRecentSearches(newHistory);
    localStorage.setItem('templeSearchHistory', JSON.stringify(newHistory));
    
    setSearchQuery('');
    setIsFocused(false);
    onSearchSelect?.(temple);
  }, [onSearchSelect, recentSearches]);

  const handleRecentClick = (recentTemple) => {
    const temple = templeList.find(t => t.name === recentTemple.name);
    if (temple) {
      handleSuggestionClick(temple);
    }
  };

  const handleKeyDown = (e) => {
    if (!filteredSuggestions.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, filteredSuggestions.length - 1));
      setIsFocused(true);
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      setIsFocused(true);
    }

    if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < filteredSuggestions.length) {
      e.preventDefault();
      handleSuggestionClick(filteredSuggestions[activeIndex]);
    }
  };

  const handleClearHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem('templeSearchHistory');
  };

  return (
    <div className={`search-bar-container ${isMapSearch ? 'search-bar-container--map' : ''}`} ref={containerRef}>
      <form onSubmit={handleSearch} className={`search-bar ${isMapSearch ? 'search-bar--map' : ''}`} autoComplete="off">
        <div className={`search-input-wrapper ${isMapSearch ? 'search-input-wrapper--map' : ''}`}>
          <input
            type="text"
            placeholder={isMapSearch ? '' : placeholderText}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsFocused(true);
            }}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            className={`search-input ${isMapSearch ? 'search-input--map' : ''}`}
          />
          {isMapSearch && !searchQuery && (
            <div className="search-placeholder">{placeholderText}</div>
          )}
          <button type="submit" className="search-input-action" title="Search" aria-label="Search">
            <span className="material-icons">search</span>
          </button>
        </div>
      </form>

      {isFocused && (
        <div className="search-dropdown">
          {searchQuery.trim() && filteredSuggestions.length > 0 ? (
            <div className="search-suggestions">
              {filteredSuggestions.map((temple, index) => (
                <button
                  key={temple.name}
                  type="button"
                  className={`suggestion-item ${index === activeIndex ? 'active' : ''}`}
                  onClick={() => handleSuggestionClick(temple)}
                >
                  <span className="suggestion-icon">📍</span>
                  <span className="suggestion-text">
                    <span className="suggestion-name">{temple.name}</span>
                    <span className="suggestion-location">{temple.location}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : !searchQuery.trim() && recentSearches.length > 0 ? (
            <div className="recent-searches">
              <div className="recent-header">
                <span className="recent-title">Recent Searches</span>
                <button 
                  type="button"
                  className="clear-history-btn" 
                  onClick={handleClearHistory}
                  title="Clear search history"
                >
                  ✕
                </button>
              </div>
              {recentSearches.map((recentTemple) => (
                <button
                  key={recentTemple.name}
                  type="button"
                  className="recent-item"
                  onClick={() => handleRecentClick(recentTemple)}
                >
                  <span className="recent-icon">🕐</span>
                  <span className="recent-text">
                    <span className="recent-name">{recentTemple.name}</span>
                    <span className="recent-location">{recentTemple.location}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default React.memo(SearchBar);

