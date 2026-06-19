const DEFAULT_API_BASE = 'http://localhost:9000';

export function getApiBaseUrl() {
	return (import.meta.env.VITE_API_BASE || DEFAULT_API_BASE).replace(/\/$/, '');
}

export function logApiCall(endpoint, method, details = null) {
	if (!import.meta.env.DEV) {
		return;
	}

	if (details) {
		console.log(`[api] ${method} ${endpoint}`, details);
		return;
	}

	console.log(`[api] ${method} ${endpoint}`);
}