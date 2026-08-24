import { worldAssetUrl } from './worldAssetRegistry.js';

export const WORLD_SIZE = 4096;
export const WORLD_BACKGROUND_ID = 'blockfolk-valley';
const LEGACY_CLASSIC_WORLD_BACKGROUND_ID = 'blockfolk-valley-classic';
export const CAMERA_MIN_ZOOM = 1;
export const CAMERA_MAX_ZOOM = 8;
export const DEFAULT_CAMERA = Object.freeze({ centerX: 1940, centerY: 2180, zoom: 2.15 });

function finite(value, fallback) { return Number.isFinite(value) ? value : fallback; }
function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }

export function normalizeCamera(value = DEFAULT_CAMERA) {
  return {
    centerX: clamp(finite(value?.centerX, DEFAULT_CAMERA.centerX), 0, WORLD_SIZE),
    centerY: clamp(finite(value?.centerY, DEFAULT_CAMERA.centerY), 0, WORLD_SIZE),
    zoom: clamp(finite(value?.zoom, DEFAULT_CAMERA.zoom), CAMERA_MIN_ZOOM, CAMERA_MAX_ZOOM)
  };
}

export function cameraMetrics(camera, viewportWidth, viewportHeight) {
  const width = Math.max(1, finite(viewportWidth, 1));
  const height = Math.max(1, finite(viewportHeight, 1));
  const normalized = normalizeCamera(camera);
  const fitScale = Math.min(width / WORLD_SIZE, height / WORLD_SIZE);
  return { width, height, fitScale, scale: fitScale * normalized.zoom };
}

export function clampCamera(camera, viewportWidth, viewportHeight) {
  const normalized = normalizeCamera(camera);
  const { width, height, scale } = cameraMetrics(normalized, viewportWidth, viewportHeight);
  const halfWorldWidth = width / (2 * scale); const halfWorldHeight = height / (2 * scale);
  const centerX = halfWorldWidth >= WORLD_SIZE / 2 ? WORLD_SIZE / 2 : clamp(normalized.centerX, halfWorldWidth, WORLD_SIZE - halfWorldWidth);
  const centerY = halfWorldHeight >= WORLD_SIZE / 2 ? WORLD_SIZE / 2 : clamp(normalized.centerY, halfWorldHeight, WORLD_SIZE - halfWorldHeight);
  return { ...normalized, centerX, centerY };
}

export function cameraTransform(camera, viewportWidth, viewportHeight) {
  const clamped = clampCamera(camera, viewportWidth, viewportHeight);
  const { width, height, scale, fitScale } = cameraMetrics(clamped, viewportWidth, viewportHeight);
  return { camera: clamped, width, height, fitScale, scale, transform: [scale, 0, 0, scale, width / 2 - clamped.centerX * scale, height / 2 - clamped.centerY * scale] };
}

export function screenToWorld(camera, viewportWidth, viewportHeight, screenX, screenY) {
  const metrics = cameraTransform(camera, viewportWidth, viewportHeight);
  return { x: metrics.camera.centerX + (screenX - metrics.width / 2) / metrics.scale, y: metrics.camera.centerY + (screenY - metrics.height / 2) / metrics.scale };
}

export function panCamera(camera, deltaScreenX, deltaScreenY, viewportWidth, viewportHeight) {
  const { scale } = cameraMetrics(camera, viewportWidth, viewportHeight);
  return clampCamera({ ...camera, centerX: camera.centerX - deltaScreenX / scale, centerY: camera.centerY - deltaScreenY / scale }, viewportWidth, viewportHeight);
}

export function zoomCameraAt(camera, nextZoom, screenX, screenY, viewportWidth, viewportHeight) {
  const before = screenToWorld(camera, viewportWidth, viewportHeight, screenX, screenY);
  const candidate = normalizeCamera({ ...camera, zoom: nextZoom });
  const { width, height, scale } = cameraMetrics(candidate, viewportWidth, viewportHeight);
  return clampCamera({ ...candidate, centerX: before.x - (screenX - width / 2) / scale, centerY: before.y - (screenY - height / 2) / scale }, viewportWidth, viewportHeight);
}

export const BLOCKFOLK_VALLEY_ASSET = Object.freeze({
  id: WORLD_BACKGROUND_ID,
  name: 'Classic BlockFolk Valley',
  alt: 'Original isometric BlockFolk Valley with grassy terraces, trees, paths, waterfall, and ponds',
  kind: 'background',
  builtIn: true,
  production: true,
  classic: true,
  debug: false,
  width: 1448,
  height: 1086,
  presentation: 'contain',
  get dataUrl() { return worldAssetUrl(WORLD_BACKGROUND_ID); }
});

export function normalizeWorldBackgroundId(id) {
  return id === WORLD_BACKGROUND_ID || id === LEGACY_CLASSIC_WORLD_BACKGROUND_ID ? WORLD_BACKGROUND_ID : null;
}
