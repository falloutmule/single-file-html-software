export const WORLD_SIZE = 4096;
export const WORLD_BACKGROUND_ID = 'blockfolk-valley';
export const CAMERA_MIN_ZOOM = 1;
export const CAMERA_MAX_ZOOM = 8;
export const DEFAULT_CAMERA = Object.freeze({ centerX: 2048, centerY: 2240, zoom: 2.15 });

export const STARTING_LOCATIONS = Object.freeze([
  Object.freeze({ id: 'coast', title: 'Coast', centerX: 760, centerY: 1120, zoom: 2.35 }),
  Object.freeze({ id: 'mountain-source', title: 'Mountain Source', centerX: 3280, centerY: 780, zoom: 2.5 }),
  Object.freeze({ id: 'forest-river', title: 'Forest River', centerX: 3160, centerY: 2760, zoom: 2.35 }),
  Object.freeze({ id: 'plains-bend', title: 'Plains Bend', centerX: 1180, centerY: 3030, zoom: 2.25 }),
  Object.freeze({ id: 'world-center', title: 'World Center', centerX: 2048, centerY: 2048, zoom: 1.35 })
]);

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

const svgNamespace = ['http:', '', 'www.w3.org', '2000', 'svg'].join('/');
const debugWorldSvg = `<svg xmlns="${svgNamespace}" width="4096" height="4096" viewBox="0 0 4096 4096"><rect width="4096" height="4096" fill="#9fd36b"/><path d="M0 0H1690L1270 410L1020 820L560 1290L0 1540Z" fill="#42a9d6"/><path d="M0 1280L520 1110L920 1360L650 1630L0 1850Z" fill="#ead08b"/><path d="M2550 0H4096V1880L3690 1580L3330 1720L3010 1180L2680 920Z" fill="#7f8c8d"/><path d="M2740 850L3030 180L3290 780L3550 110L3820 880L4096 440V1730L3370 1870Z" fill="#66757c"/><path d="M3000 2250Q3500 1960 4096 2170V4096H2200Q2470 3450 3000 2250Z" fill="#397b4f"/><g fill="#245c3d"><circle cx="3240" cy="2620" r="190"/><circle cx="3630" cy="2490" r="230"/><circle cx="3830" cy="3030" r="210"/><circle cx="2850" cy="3260" r="240"/><circle cx="3350" cy="3570" r="210"/></g><path d="M0 2350Q900 2020 1840 2400T2680 4096H0Z" fill="#badb72"/><path d="M3370 620C3200 1080 3400 1530 3160 1980C2940 2410 2610 2730 2210 2920C1750 3140 1390 3000 1100 2700C760 2340 870 1880 520 1450" fill="none" stroke="#4ab5df" stroke-width="250" stroke-linecap="round"/><path d="M3370 620C3200 1080 3400 1530 3160 1980C2940 2410 2610 2730 2210 2920C1750 3140 1390 3000 1100 2700C760 2340 870 1880 520 1450" fill="none" stroke="#8bdcf0" stroke-width="108" stroke-linecap="round"/><g fill="#fff8d8" stroke="#334b3d" stroke-width="18" font-family="system-ui,sans-serif" font-size="108" font-weight="800" text-anchor="middle"><text x="700" y="640">OCEAN BAY</text><text x="3340" y="1070">MOUNTAIN SOURCE</text><text x="3330" y="3350">FOREST RIVER</text><text x="1050" y="3490">PLAINS BEND</text></g><g fill="#5a2818"><rect x="0" y="1900" width="4096" height="190" opacity=".18"/><rect x="1900" y="0" width="190" height="4096" opacity=".18"/></g><rect x="42" y="42" width="4012" height="4012" fill="none" stroke="#fff3a6" stroke-width="84" stroke-dasharray="34 34"/><g font-family="system-ui,sans-serif" text-anchor="middle"><text x="2048" y="1900" fill="#fff" stroke="#3b2b20" stroke-width="28" paint-order="stroke" font-size="190" font-weight="900">BLOCKFOLK VALLEY</text><text x="2048" y="2120" fill="#ffd75b" stroke="#3b2b20" stroke-width="20" paint-order="stroke" font-size="124" font-weight="900">DEBUG WORLD • NOT PRODUCTION</text></g></svg>`;

export const DEBUG_WORLD_ASSET = Object.freeze({ id: WORLD_BACKGROUND_ID, name: 'BlockFolk Valley — Debug World', alt: 'Engineering-only square BlockFolk Valley camera test world', kind: 'background', builtIn: true, debug: true, width: WORLD_SIZE, height: WORLD_SIZE, dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(debugWorldSvg)}` });
