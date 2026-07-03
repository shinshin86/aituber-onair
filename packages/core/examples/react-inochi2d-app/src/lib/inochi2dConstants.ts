const rawManifestUrl = import.meta.env.VITE_INOCHI2D_MANIFEST_URL;
const rawDebugEnabled = import.meta.env.VITE_INOCHI2D_DEBUG;

export const INOCHI2D_MANIFEST_URL =
  typeof rawManifestUrl === 'string' && rawManifestUrl.trim().length > 0
    ? rawManifestUrl.trim()
    : '/inochi2d/manifest.json';

export const INOCHI2D_DEBUG_ENABLED =
  rawDebugEnabled === '1' || rawDebugEnabled === 'true';

export const INOCHI2D_MANIFEST_VERSION = 1;
export const INOCHI2D_LOG_PREFIX = '[Inochi2D]';
export const INOCHI2D_DEFAULT_CAMERA_SCALE = 0.15;
export const INOCHI2D_MIN_CAMERA_SCALE = 0.05;
export const INOCHI2D_MAX_CAMERA_SCALE = 2.0;
