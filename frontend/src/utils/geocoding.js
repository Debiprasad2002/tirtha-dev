export function extractCoordsFromGoogleMapsUrl(url) {
  if (!url) return null;
  
  let decodedUrl = url;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch {
    // ignore
  }

  // Format 1: Query param q=lat,lng
  const qRegex = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/;
  const qMatch = decodedUrl.match(qRegex);
  if (qMatch) {
    return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  }

  // Format 2: @lat,lng
  const atRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
  const atMatch = decodedUrl.match(atRegex);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  }

  // Format 3: Raw coordinates in path like /place/18.497500,73.847500
  const pathRegex = /\/place\/(-?\d+\.\d+),(-?\d+\.\d+)/;
  const pathMatch = decodedUrl.match(pathRegex);
  if (pathMatch) {
    return { lat: parseFloat(pathMatch[1]), lng: parseFloat(pathMatch[2]) };
  }

  // Format 4: Any lat,lng pattern
  const coordRegex = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
  const coordMatch = decodedUrl.match(coordRegex);
  if (coordMatch) {
    return { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]) };
  }

  return null;
}

const geocodeCache = new Map();

export function formatCoordinates(coordinates) {
  if (!coordinates) return '';

  const lat = Number(coordinates.lat);
  const lng = Number(coordinates.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';

  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function isCoordinateLabel(value) {
  if (!value || typeof value !== 'string') return false;

  const clean = value.trim();
  return /^[-+]?\d+(?:\.\d+)?\s*,\s*[-+]?\d+(?:\.\d+)?$/.test(clean) || /°/.test(clean);
}

export function isGenericLocationLabel(value) {
  if (!value || typeof value !== 'string') return true;

  const clean = value.trim().toLowerCase();
  return !clean || clean === 'india' || clean === 'unknown location' || isCoordinateLabel(clean);
}

export function buildGoogleMapsSearchUrl({ placeName, location, coordinates }) {
  const readableParts = [placeName, location]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .filter((part, index, parts) => parts.findIndex((candidate) => candidate.toLowerCase() === part.toLowerCase()) === index)
    .filter((part) => !isCoordinateLabel(part));

  const query = readableParts.length > 0 ? readableParts.join(', ') : formatCoordinates(coordinates);

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export async function reverseGeocode(lat, lng) {
  if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) return null;
  
  const key = `${parseFloat(lat).toFixed(6)},${parseFloat(lng).toFixed(6)}`;
  if (geocodeCache.has(key)) {
    console.log('[DEBUG] [reverseGeocode] Serving from cache for key:', key);
    return geocodeCache.get(key);
  }

  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
  console.log('[DEBUG] [reverseGeocode] Starting fetch to Nominatim:', url);

  try {
    const response = await fetch(
      url,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'Tirtha-Heritage-Explorer/1.0',
        },
      }
    );
    
    console.log('[DEBUG] [reverseGeocode] Response status:', response.status, response.statusText);
    
    const headersObj = {};
    response.headers.forEach((val, key) => {
      headersObj[key] = val;
    });
    console.log('[DEBUG] [reverseGeocode] Response headers:', headersObj);

    if (!response.ok) {
      console.log('[DEBUG] [reverseGeocode] Response not OK');
      return null;
    }
    
    const data = await response.json();
    console.log('[DEBUG] [reverseGeocode] Response body:', data);
    
    geocodeCache.set(key, data);
    return data;
  } catch (error) {
    console.error('[DEBUG] [reverseGeocode] Caught exception during fetch:', error);
    return null;
  }
}

export function resolveLocationDetails(data, coordinates) {
  if (!data) {
    return {
      title: coordinates ? `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}` : 'Unknown Location',
      subtitle: '',
      coordinates: coordinates,
      isGeocoded: false
    };
  }

  const addr = data.address || {};
  
  // 1. POI / Landmark Name
  const poiKeys = [
    'temple', 'monument', 'historic', 'tourism', 'amenity', 'attraction', 
    'leisure', 'shop', 'hill', 'natural', 'religion', 'place_of_worship',
    'landmark', 'park', 'square', 'common', 'village_green', 'garden'
  ];
  let poiName = '';
  for (const key of poiKeys) {
    if (addr[key]) {
      poiName = addr[key];
      break;
    }
  }

  // 2. Building Name
  const buildingKeys = ['building', 'house', 'office', 'construction'];
  let buildingName = '';
  for (const key of buildingKeys) {
    if (addr[key]) {
      buildingName = addr[key];
      break;
    }
  }

  // 3. Street Address
  const streetName = addr.road || addr.street || addr.footway || addr.path || addr.pedestrian || '';
  const houseNumber = addr.house_number || '';
  const streetAddress = [houseNumber, streetName].filter(Boolean).join(' ');

  // 4. Locality / Neighborhood
  const localityName = addr.neighbourhood || addr.suburb || addr.village || addr.hamlet || addr.subdivision || addr.city_district || addr.subdistrict || '';

  // 5. City, State, Country
  const city = addr.city || addr.town || addr.county || addr.municipality || '';
  const state = addr.state || '';
  const country = addr.country || '';

  // Determine Title according to priority order
  let title = '';
  let subtitleParts = [];

  if (poiName) {
    title = poiName;
  } else if (buildingName) {
    title = buildingName;
  } else if (streetAddress) {
    title = streetAddress;
  } else if (localityName) {
    title = localityName;
  } else {
    // If only City, State, Country is available
    const parts = [city, state, country].filter(Boolean);
    if (parts.length > 0) {
      title = parts[0];
      subtitleParts = parts.slice(1);
    } else if (coordinates) {
      title = `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`;
    } else {
      title = data.display_name || 'Selected Location';
    }
  }

  // Determine Subtitle
  if (subtitleParts.length === 0) {
    // Subtitle should be City, State, Country
    const parts = [city, state, country].filter(Boolean);
    // If the title is one of these, filter it out
    subtitleParts = parts.filter(part => part.toLowerCase() !== title.toLowerCase());
  }

  const subtitle = subtitleParts.join(', ');

  return {
    title: title.trim(),
    subtitle: subtitle.trim(),
    coordinates: coordinates,
    isGeocoded: true,
    rawAddress: addr
  };
}

export function getReadableLocationName(data, coordinates = null) {
  if (!data) return '';

  const details = resolveLocationDetails(data, coordinates);
  if (!details?.isGeocoded || isCoordinateLabel(details.title)) return '';

  return [details.title, details.subtitle]
    .filter(Boolean)
    .filter((part, index, parts) => parts.findIndex((candidate) => candidate.toLowerCase() === part.toLowerCase()) === index)
    .join(', ');
}

export function formatGeocodedAddress(data, fallbackCoords = null) {
  if (!data || !data.address) {
    if (fallbackCoords) {
      return `${fallbackCoords.lat.toFixed(6)}, ${fallbackCoords.lng.toFixed(6)}`;
    }
    return '';
  }

  const addr = data.address;
  const parts = [];

  // 1. POI Name (Point of Interest)
  const poiKeys = [
    'temple', 'monument', 'historic', 'tourism', 'amenity', 'attraction', 
    'building', 'leisure', 'shop', 'hill', 'natural', 'religion', 'place_of_worship'
  ];
  let poiName = '';
  for (const key of poiKeys) {
    if (addr[key]) {
      poiName = addr[key];
      break;
    }
  }

  // 2. Landmark Name
  const landmarkKeys = ['landmark', 'park', 'square', 'common', 'village_green', 'garden'];
  let landmarkName = '';
  for (const key of landmarkKeys) {
    if (addr[key]) {
      landmarkName = addr[key];
      break;
    }
  }

  // 3. Street Address
  const streetName = addr.road || addr.street || addr.footway || addr.path || '';
  const houseNumber = addr.house_number || '';
  const streetAddress = [houseNumber, streetName].filter(Boolean).join(' ');

  // 4. Locality / Neighborhood
  const localityName = addr.neighbourhood || addr.suburb || addr.village || addr.hamlet || addr.subdivision || '';

  // 5. City, State, Country
  const city = addr.city || addr.town || addr.county || addr.municipality || '';
  const state = addr.state || '';
  const country = addr.country || '';

  // Combine them in the preferred display order
  if (poiName) parts.push(poiName);
  if (landmarkName && landmarkName !== poiName) parts.push(landmarkName);
  if (streetAddress) parts.push(streetAddress);
  if (localityName && localityName !== landmarkName && localityName !== poiName) parts.push(localityName);
  
  if (city) parts.push(city);
  if (state) parts.push(state);
  if (country) parts.push(country);

  // Return formatted string, removing duplicate values if any
  const uniqueParts = [];
  parts.forEach(part => {
    const trimmed = part.trim();
    if (trimmed && !uniqueParts.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
      uniqueParts.push(trimmed);
    }
  });

  if (uniqueParts.length === 0) {
    if (fallbackCoords) {
      return `${fallbackCoords.lat.toFixed(6)}, ${fallbackCoords.lng.toFixed(6)}`;
    }
    return data.display_name || '';
  }

  return uniqueParts.join(', ');
}
