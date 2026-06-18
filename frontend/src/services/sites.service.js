import { getApiBaseUrl, logApiCall } from '../utils/apiConfig';

const SITES_API_PATH = '/api/sites/';

function normalizeSite(site) {
  const lat = Number(site.latitude);
  const lng = Number(site.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const location = site.location || [site.state, site.country].filter(Boolean).join(', ') || 'India';

  return {
    id: site.id,
    name: site.name || `Site ${site.id}`,
    lat,
    lng,
    location,
    state: site.state,
    country: site.country,
    status: site.status,
    modelPath: site.modelPath,
    description: site.description,
    details: site.details,
  };
}

export async function fetchSites(signal) {
  const endpoint = `${getApiBaseUrl()}${SITES_API_PATH}`;
  
  logApiCall(endpoint, 'GET');

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal,
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const payload = await response.json();
    const sites = Array.isArray(payload) ? payload : payload?.results;

    if (!Array.isArray(sites)) {
      throw new Error('Unexpected API response format for sites');
    }

    logApiCall(endpoint, 'GET', { success: true, count: sites.length });

    return sites.map(normalizeSite).filter(Boolean);
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    logApiCall(endpoint, 'GET', { error: error.message });
    throw new Error(`Failed to load sites: ${error.message}`);
  }
}

export async function fetchSiteStats(siteId, signal) {
  const endpoint = `${getApiBaseUrl()}${SITES_API_PATH}${encodeURIComponent(siteId)}/stats/`;
  logApiCall(endpoint, 'GET');

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal,
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const payload = await response.json();
    if (!payload || typeof payload !== 'object') {
      throw new Error('Unexpected API response format for site stats');
    }

    logApiCall(endpoint, 'GET', { success: true, siteId });
    return payload;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    logApiCall(endpoint, 'GET', { error: error.message, siteId });
    throw new Error(`Failed to load site stats: ${error.message}`);
  }
}
