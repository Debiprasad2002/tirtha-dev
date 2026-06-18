import exifr from 'exifr';

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const MIN_IMAGE_DIMENSION = 640;
const WARNING_IMAGE_DIMENSION = 1080;

const VALID_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.bmp',
  '.tif',
  '.tiff',
];

const SUPPORTED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
]);

export function isSupportedImageFile(file) {
  if (!file) return false;
  const fileType = (file.type || '').toLowerCase();
  if (SUPPORTED_IMAGE_TYPES.has(fileType)) {
    return true;
  }

  const fileName = file.name || '';
  const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  return VALID_IMAGE_EXTENSIONS.includes(extension);
}

export function getFileExtension(file) {
  const fileName = file.name || '';
  return fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
}

function loadImageSize(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.width, height: image.height });
    };
    image.onerror = (error) => {
      URL.revokeObjectURL(url);
      reject(error);
    };
    image.src = url;
  });
}

function checkExif(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const resultArray = new Uint8Array(e.target.result);
      const exifMarker = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00];

      for (let i = 0; i < resultArray.length - exifMarker.length; i += 1) {
        let found = true;
        for (let j = 0; j < exifMarker.length; j += 1) {
          if (resultArray[i + j] !== exifMarker[j]) {
            found = false;
            break;
          }
        }
        if (found) {
          resolve(true);
          return;
        }
      }
      resolve(false);
    };
    reader.onerror = () => resolve(false);
    reader.readAsArrayBuffer(file);
  });
}

export async function validateImageFile(file, options = {}) {
  const { minDimension = MIN_IMAGE_DIMENSION, warningDimension = WARNING_IMAGE_DIMENSION } = options;

  if (!file) {
    return {
      valid: false,
      severity: 'invalid',
      reason: 'No file provided.',
    };
  }

  if (!isSupportedImageFile(file)) {
    return {
      valid: false,
      severity: 'invalid',
      reason: 'Unsupported image type. Accepted files are JPG, PNG, WEBP, GIF, BMP, TIFF.',
    };
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return {
      valid: false,
      severity: 'invalid',
      reason: 'Oversized file. Image must be 10 MB or smaller.',
    };
  }

  const hasExif = await checkExif(file);
  let exifData = null;

  if (hasExif) {
    try {
      exifData = await exifr.parse(file);
    } catch (err) {
      return {
        valid: false,
        severity: 'invalid',
        reason: 'Corrupted EXIF metadata. Image EXIF is unreadable.',
      };
    }
  }

  try {
    const size = await loadImageSize(file);
    const shortSide = Math.min(size.width, size.height);
    if (shortSide < minDimension) {
      return {
        valid: false,
        severity: 'invalid',
        reason: `Image dimensions are too small (${size.width}×${size.height}). Minimum size is ${minDimension}px on the shorter side.`,
      };
    }

    if (!hasExif) {
      return {
        valid: true,
        severity: 'warning',
        reason: 'Missing EXIF metadata. Images without EXIF might lack capture details.',
        exif: null,
      };
    }

    if (shortSide < warningDimension) {
      return {
        valid: true,
        severity: 'warning',
        reason: `Low resolution (${size.width}×${size.height}). Images under ${warningDimension}px may be less useful.`,
        exif: exifData,
      };
    }
  } catch {
    return {
      valid: false,
      severity: 'invalid',
      reason: 'Unable to read image dimensions. Please try another file.',
    };
  }

  return {
    valid: true,
    severity: 'valid',
    reason: 'Ready',
    exif: exifData,
  };
}
