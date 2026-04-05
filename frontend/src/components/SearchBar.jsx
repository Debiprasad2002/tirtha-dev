import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/SearchBar.css';

function SearchBar({ templeList = [], onSearchSelect, variant = 'default' }) {
  const { t } = useTranslation('common');
  const isMapSearch = variant === 'map';
  const containerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [placeholderText, setPlaceholderText] = useState(t('common:placeholders.searchModels'));
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  // Close suggestions when clicking outside the search container
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsFocused(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('templeSearchHistory');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading search history:', e);
      }
    }
  }, []);

  useEffect(() => {
    const samplePlaceholders = [
      'Search Jagannath Temple',
      'Search Ram Mandir',
      'Search Kanaka Durga Temple',
      'Search Ram Mandir',
      'Search Jagannath Temple',
    ];

    let currentIndex = 0;
    setPlaceholderText(samplePlaceholders[currentIndex]);

    const interval = setInterval(() => {
      if (searchQuery) return;
      currentIndex = (currentIndex + 1) % samplePlaceholders.length;
      setPlaceholderText(samplePlaceholders[currentIndex]);
    }, 2600);

    return () => clearInterval(interval);
  }, [searchQuery]);

  // Update suggestions based on search query
  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }

    const filtered = templeList
      .filter((temple) =>
        temple.name.toLowerCase().includes(query) ||
        temple.location.toLowerCase().includes(query)
      )
      .slice(0, 8);

    setSuggestions(filtered);
    setActiveIndex(filtered.length > 0 ? 0 : -1);
  }, [searchQuery, templeList]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (activeIndex >= 0 && activeIndex < suggestions.length) {
      handleSuggestionClick(suggestions[activeIndex]);
    } else if (suggestions.length > 0) {
      handleSuggestionClick(suggestions[0]);
    }
  };

  const handleSuggestionClick = (temple) => {
    // Save to search history
    const newHistory = [
      { name: temple.name, location: temple.location, lat: temple.lat, lng: temple.lng },
      ...recentSearches.filter(t => t.name !== temple.name),
    ].slice(0, 5);
    
    setRecentSearches(newHistory);
    localStorage.setItem('templeSearchHistory', JSON.stringify(newHistory));
    
    setSearchQuery('');
    setSuggestions([]);
    setIsFocused(false);
    onSearchSelect?.(temple);
  };

  const handleRecentClick = (recentTemple) => {
    const temple = templeList.find(t => t.name === recentTemple.name);
    if (temple) {
      handleSuggestionClick(temple);
    }
  };

  const handleKeyDown = (e) => {
    if (!suggestions.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
      setIsFocused(true);
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      setIsFocused(true);
    }

    if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < suggestions.length) {
      e.preventDefault();
      handleSuggestionClick(suggestions[activeIndex]);
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
          {isMapSearch && (
            <button type="submit" className="search-input-action" title="Search">
              <span className="material-icons">search</span>
            </button>
          )}
        </div>
        {!isMapSearch && (
          <button type="submit" className={`search-button ${isMapSearch ? 'search-button--map' : ''}`} title="Search">
            <span className="material-icons">arrow_forward</span>
          </button>
        )}
      </form>

      {isFocused && (
        <div className="search-dropdown">
          {searchQuery.trim() && suggestions.length > 0 ? (
            <div className="search-suggestions">
              {suggestions.map((temple, index) => (
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

export default SearchBar;

