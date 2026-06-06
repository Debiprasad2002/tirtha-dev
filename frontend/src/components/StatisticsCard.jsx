import React, { useState, useEffect } from 'react';
import { fetchPlatformStatistics } from '../services/platform.service';
import '../styles/StatisticsCard.css';

function PlatformStatistics() {
  const [stats, setStats] = useState({
    total_sites: 0,
    total_contributors: 0,
    total_images: 0,
    top_contributors: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const loadStats = async () => {
      try {
        const data = await fetchPlatformStatistics(controller.signal);
        if (active) {
          setStats({
            total_sites: Number(data.total_sites) || 0,
            total_contributors: Number(data.total_contributors) || 0,
            total_images: Number(data.total_images) || 0,
            top_contributors: Array.isArray(data.top_contributors) ? data.top_contributors : [],
          });
          setError('');
        }
      } catch (err) {
        if (!active) return;
        if (err?.name !== 'AbortError') {
          setError('Could not load statistics');
          if (import.meta.env.DEV) {
            console.error('Failed to load platform statistics:', err);
          }
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadStats();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const rankEmojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

  return (
    <div className="platform-statistics">
      {isLoading ? (
        <div className="platform-statistics-loading">
          <p>Loading...</p>
        </div>
      ) : error ? (
        <div className="platform-statistics-error">
          <p>{error}</p>
        </div>
      ) : (
        <div className="platform-statistics-content">
          <div className="platform-stats-list">
            <div className="platform-stat-row">
              <span className="platform-stat-label">Total Sites</span>
              <span className="platform-stat-value">{stats.total_sites}</span>
            </div>
            <div className="platform-stat-row">
              <span className="platform-stat-label">Total Contributors</span>
              <span className="platform-stat-value">{stats.total_contributors}</span>
            </div>
            <div className="platform-stat-row">
              <span className="platform-stat-label">Total Images</span>
              <span className="platform-stat-value">{stats.total_images}</span>
            </div>
          </div>

          {stats.top_contributors.length > 0 && (
            <div className="platform-top-contributors">
              <h4>Top Contributors</h4>
              <ul>
                {stats.top_contributors.map((contributor, index) => (
                  <li key={contributor.id} className="platform-contributor-row">
                    <span className="platform-contributor-rank">{rankEmojis[index] || `#${index + 1}`}</span>
                    <span className="platform-contributor-name">{contributor.name}</span>
                    <span className="platform-contributor-count">{contributor.uploads} uploads</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PlatformStatistics;
