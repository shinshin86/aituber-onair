export const DEFAULT_FRAMING = { scale: 0.4, x: 0, y: 1800 } as const;
export const DEFAULT_IDLE_ANIMATION = 'original_idle_calm_breath';
export const DEFAULT_ASSET_ROOT = '../react-inochi2d-app/public/inochi2d';
export const REQUIRED_RUNTIME_FILES = [
  'inochi_bridge.js',
  'inochi2d.js',
  'inochi2d_bg.wasm',
  'secondary_motion.js',
] as const;
