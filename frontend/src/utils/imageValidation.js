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

export async function checkExif(file) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    return false;
  }

  const buffer = await file.arrayBuffer();
  const resultArray = new Uint8Array(buffer);
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
      return true;
    }
  }

  return false;
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

export async function validateImageFile(file, options = {}) {
  const { minDimension = 1080 } = options;

  if (!isSupportedImageFile(file)) {
    return {
      valid: false,
      reason: 'Unsupported image type. Accepted files are JPG, PNG, WEBP, GIF, BMP, TIFF.',
    };
  }

  const hasExif = await checkExif(file);
  if (!hasExif) {
    return {
      valid: false,
      reason: 'No Exif metadata found. Please upload a camera/phone photo with metadata.',
    };
  }

  try {
    const size = await loadImageSize(file);
    if (size.width < minDimension || size.height < minDimension) {
      return {
        valid: false,
        reason: `Image dimensions are too small (${size.width}×${size.height}). Minimum size is ${minDimension}px on the shorter side.`,
      };
    }
  } catch (error) {
    return {
      valid: false,
      reason: 'Unable to read image dimensions. Please try another file.',
    };
  }

  return {
    valid: true,
  };
}
