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
// Default framing for every model (manifest models and local files): a
// bust-up shot roughly matching the react-vrm-app example. x/y are in model
// space (screen pixels divided by camera scale); positive y moves the model
// down on screen so the face sits near the stage center. Models with a very
// different unit scale can override this via the manifest `camera` entry.
export const INOCHI2D_DEFAULT_CAMERA_SCALE = 0.32;
export const INOCHI2D_DEFAULT_CAMERA_X = 0;
export const INOCHI2D_DEFAULT_CAMERA_Y = 1450;
export const INOCHI2D_MIN_CAMERA_SCALE = 0.05;
export const INOCHI2D_MAX_CAMERA_SCALE = 2.0;
