const DEFAULT_BACKEND_BASE_URL = 'http://127.0.0.1:8000';
const SITES_API_PATH = '/api/sites/';

function getBackendBaseUrl() {
  const fromEnv = import.meta.env.VITE_BACKEND_BASE_URL;
  const baseUrl = (fromEnv || DEFAULT_BACKEND_BASE_URL).trim();
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

function normalizeSite(site) {
  const lat = Number(site.latitude);
  const lng = Number(site.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    id: site.id,
    name: site.name || `Site ${site.id}`,
    lat,
    lng,
    location: site.location || 'India',
    status: site.status,
    modelPath: site.modelPath,
    description: site.description,
    details: site.details,
  };
}

export async function fetchSites(signal) {
  const endpoint = `${getBackendBaseUrl()}${SITES_API_PATH}`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to load sites (${response.status})`);
  }

  const payload = await response.json();
  const sites = Array.isArray(payload) ? payload : payload?.results;

  if (!Array.isArray(sites)) {
    throw new Error('Unexpected API response format for sites');
  }

  return sites.map(normalizeSite).filter(Boolean);
}
