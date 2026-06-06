import { getApiBaseUrl, logApiCall } from '../utils/apiConfig';

const PLATFORM_STATISTICS_API_PATH = '/api/platform/statistics/';

export async function fetchPlatformStatistics(signal) {
  const endpoint = `${getApiBaseUrl()}${PLATFORM_STATISTICS_API_PATH}`;
  
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
      throw new Error('Unexpected API response format for platform statistics');
    }

    logApiCall(endpoint, 'GET', { success: true });
    return payload;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    logApiCall(endpoint, 'GET', { error: error.message });
    throw new Error(`Failed to load platform statistics: ${error.message}`);
  }
}
