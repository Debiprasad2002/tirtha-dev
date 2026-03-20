import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import '../styles/ThemeToggle.css';

function ThemeToggle() {
  const { t } = useTranslation('theme');
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="theme-toggle-btn"
      onClick={toggleTheme}
      title={t('theme:toggle')}
      aria-label={t('theme:toggle')}
    >
      {theme === 'light' ? (
        <span className="material-icons">dark_mode</span>
      ) : (
        <span className="material-icons">light_mode</span>
      )}
    </button>
  );
}

export default ThemeToggle;
