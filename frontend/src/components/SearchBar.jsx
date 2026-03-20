import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/SearchBar.css';

function SearchBar() {
  const { t } = useTranslation('common');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    console.log('Search for:', searchQuery);
    // Add search logic here
  };

  return (
    <div className="search-bar-container">
      <form onSubmit={handleSearch} className="search-bar">
        <input
          type="text"
          placeholder={t('common:placeholders.searchModels')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="search-button">
          <span className="material-icons">search</span>
        </button>
      </form>
    </div>
  );
}

export default SearchBar;
