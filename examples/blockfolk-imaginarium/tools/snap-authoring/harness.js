/* global Image, document, structuredClone, window */
import {
  BLOCK_CALIBRATION,
  calibratedBlockProfile,
  exportCalibration,
  importCalibration
} from './blockCalibration.js';

const ASSET_ROOT = '../../src/assets/blockfolk/';
const COLORS = Object.freeze({ origin: '#f6b73c', edge: '#52b6d7', stack: '#ef6b63', face: '#9a70d5', mount: '#70b85a' });
const elements = Object.fromEntries([
  'assetSelect', 'flipButton', 'resetButton', 'exportButton', 'importButton', 'status',
  'authorCanvas', 'sceneCanvas', 'authorReadout', 'sceneReadout', 'jsonEditor'
].map((id) => [id, document.getElementById(id)]));

let calibration = structuredClone(BLOCK_CALIBRATION);
let flipped = false;
let draggingOrigin = false;
const images = new Map();
const measuredBounds = new Map();

function configureCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const context = canvas.getContext('2d');
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  return { context, width: rect.width, height: rect.height };
}

function measureAlpha(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let left = canvas.width; let top = canvas.height; let right = -1; let bottom = -1;
  for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
    if (data[(y * canvas.width + x) * 4 + 3] === 0) continue;
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  return { left, top, right, bottom };
}

async function loadAssets() {
  await Promise.all(Object.entries(calibration.assets).map(async ([assetId, asset]) => {
    const image = new Image();
    image.src = `${ASSET_ROOT}${asset.filename}`;
    await image.decode();
    images.set(assetId, image);
    measuredBounds.set(assetId, measureAlpha(image));
  }));
}

function equalBounds(a, b) {
  return ['left', 'top', 'right', 'bottom'].every((key) => a[key] === b[key]);
}

function currentAsset() { return calibration.assets[elements.assetSelect.value]; }
function currentProfile() { return calibratedBlockProfile(elements.assetSelect.value, calibration); }

function drawImageAtOrigin(context, image, origin, anchor, renderScale, isFlipped = false, alpha = 1) {
  context.save(); context.globalAlpha = alpha; context.translate(anchor.x, anchor.y);
  context.scale(isFlipped ? -renderScale : renderScale, renderScale);
  const originX = isFlipped ? image.naturalWidth - origin.x : origin.x;
  context.drawImage(image, -originX, -origin.y);
  context.restore();
}

function markerColor(port) {
  if (port.id === 'wallFace') return COLORS.face;
  if (port.id.startsWith('stack')) return COLORS.stack;
  if (port.id === 'cellMount') return COLORS.mount;
  return COLORS.edge;
}

function transformedPoint(point, asset, origin, renderScale, anchor, isFlipped) {
  const sourceX = isFlipped ? asset.sourceSize.width - point.x : point.x;
  const originX = isFlipped ? asset.sourceSize.width - origin.x : origin.x;
  return { x: anchor.x + (sourceX - originX) * renderScale, y: anchor.y + (point.y - origin.y) * renderScale };
}

function renderAuthor() {
  const { context, width, height } = configureCanvas(elements.authorCanvas);
  context.clearRect(0, 0, width, height);
  const asset = currentAsset(); const profile = currentProfile(); const image = images.get(elements.assetSelect.value);
  const renderScale = Math.min((width - 70) / asset.sourceSize.width, (height - 55) / asset.sourceSize.height, 1);
  const anchor = { x: width / 2, y: height / 2 + 12 };
  drawImageAtOrigin(context, image, asset.constructionOrigin, anchor, renderScale, flipped);
  const bounds = asset.alphaBounds;
  const p1 = transformedPoint({ x: bounds.left, y: bounds.top }, asset, asset.constructionOrigin, renderScale, anchor, flipped);
  const p2 = transformedPoint({ x: bounds.right, y: bounds.bottom }, asset, asset.constructionOrigin, renderScale, anchor, flipped);
  context.strokeStyle = '#3a433e'; context.setLineDash([5, 4]); context.strokeRect(Math.min(p1.x, p2.x), p1.y, Math.abs(p2.x - p1.x), p2.y - p1.y); context.setLineDash([]);
  for (const port of profile.ports) {
    const point = transformedPoint(port.localPoint, asset, asset.constructionOrigin, renderScale, anchor, flipped);
    context.fillStyle = markerColor(port); context.strokeStyle = '#fff'; context.lineWidth = 2;
    context.beginPath(); context.arc(point.x, point.y, 6, 0, Math.PI * 2); context.fill(); context.stroke();
    context.fillStyle = '#1f241f'; context.font = '700 11px system-ui'; context.fillText(port.id, point.x + 8, point.y - 6);
  }
  context.strokeStyle = COLORS.origin; context.lineWidth = 3; context.beginPath(); context.arc(anchor.x, anchor.y, 10, 0, Math.PI * 2); context.stroke();
  context.beginPath(); context.moveTo(anchor.x - 14, anchor.y); context.lineTo(anchor.x + 14, anchor.y); context.moveTo(anchor.x, anchor.y - 14); context.lineTo(anchor.x, anchor.y + 14); context.stroke();
  elements.authorCanvas.dataset.originScreenX = String(anchor.x); elements.authorCanvas.dataset.originScreenY = String(anchor.y); elements.authorCanvas.dataset.renderScale = String(renderScale);
  const measured = measuredBounds.get(elements.assetSelect.value);
  const boundsOk = equalBounds(measured, asset.alphaBounds);
  elements.authorReadout.textContent = `alpha measured ${JSON.stringify(measured)} ${boundsOk ? 'MATCH' : 'MISMATCH'}\norigin ${JSON.stringify(asset.constructionOrigin)} · scale ${asset.canonicalInsertScale.toFixed(9)} · ${flipped ? 'wall-iso-b' : 'wall-iso-a'}\nprofiles are productionEnabled=false`;
}

function worldSceneToScreen(point, center, zoom) { return { x: center.x + point.x * zoom, y: center.y + point.y * zoom }; }

function drawWorldAsset(context, image, asset, worldAnchor, center, zoom, isFlipped = false, alpha = 1) {
  const anchor = worldSceneToScreen(worldAnchor, center, zoom);
  drawImageAtOrigin(context, image, asset.constructionOrigin, anchor, asset.canonicalInsertScale * zoom, isFlipped, alpha);
}

function label(context, text, x, y) { context.fillStyle = '#22251f'; context.font = '750 12px system-ui'; context.fillText(text, x, y); }

function renderScenes() {
  const { context, width, height } = configureCanvas(elements.sceneCanvas);
  context.clearRect(0, 0, width, height);
  const asset = currentAsset(); const image = images.get(elements.assetSelect.value);
  const column = { ...calibration.plane.columnWorld }; if (flipped) column.x *= -1;
  const tier = calibration.plane.tierWorld;
  const zoom = Math.min(width / 420, height / 260) * 1.35;
  const centers = [
    { x: width * .25, y: height * .35 }, { x: width * .73, y: height * .35 },
    { x: width * .25, y: height * .78 }, { x: width * .73, y: height * .78 }
  ];
  drawWorldAsset(context, image, asset, { x: -column.x / 2, y: -column.y / 2 }, centers[0], zoom, flipped);
  drawWorldAsset(context, image, asset, { x: column.x / 2, y: column.y / 2 }, centers[0], zoom, flipped);
  label(context, 'adjacent cells', centers[0].x - 45, 18);
  drawWorldAsset(context, image, asset, { x: -tier.x / 2, y: -tier.y / 2 }, centers[1], zoom, flipped);
  drawWorldAsset(context, image, asset, { x: tier.x / 2, y: tier.y / 2 }, centers[1], zoom, flipped);
  label(context, 'stacked tiers', centers[1].x - 38, 18);
  drawWorldAsset(context, image, asset, { x: 0, y: 0 }, centers[2], zoom, flipped);
  const face = currentProfile().ports.find((port) => port.id === 'wallFace').localPoint;
  const faceOffset = { x: (face.x - asset.constructionOrigin.x) * asset.canonicalInsertScale * (flipped ? -1 : 1), y: (face.y - asset.constructionOrigin.y) * asset.canonicalInsertScale };
  const facePoint = worldSceneToScreen(faceOffset, centers[2], zoom);
  context.fillStyle = COLORS.face; context.beginPath(); context.arc(facePoint.x, facePoint.y, 8, 0, Math.PI * 2); context.fill();
  label(context, 'capacity-1 wallFace', centers[2].x - 58, height - 8);
  drawWorldAsset(context, image, asset, { x: -column.x / 2, y: -column.y / 2 }, centers[3], zoom, flipped, .8);
  drawWorldAsset(context, image, asset, { x: column.x / 2, y: column.y / 2 }, centers[3], zoom, !flipped, .8);
  label(context, 'plane comparison', centers[3].x - 48, height - 8);
  elements.sceneReadout.textContent = `column world (${column.x.toFixed(1)}, ${column.y.toFixed(1)}) · tier world (${tier.x.toFixed(1)}, ${tier.y.toFixed(1)})\nFlip changes active plane; no free-rotation construction in v1.`;
}

function render() {
  if (!images.size) return;
  renderAuthor(); renderScenes();
  elements.flipButton.setAttribute('aria-pressed', String(flipped));
  elements.flipButton.textContent = flipped ? 'Unflip plane' : 'Flip plane';
  elements.jsonEditor.value = exportCalibration(calibration);
  const allBoundsMatch = Object.entries(calibration.assets).every(([id, asset]) => equalBounds(measuredBounds.get(id), asset.alphaBounds));
  elements.status.dataset.ok = String(allBoundsMatch);
  elements.status.textContent = allBoundsMatch ? 'Accepted PNG pixels verified; candidate remains non-shipping.' : 'Alpha-bound mismatch — reject calibration.';
  window.__blockfolkCalibration = { schema: calibration.schema, allBoundsMatch, flipped, assetId: elements.assetSelect.value, profile: currentProfile(), export: elements.jsonEditor.value };
}

elements.authorCanvas.addEventListener('pointerdown', (event) => {
  const canvasBounds = elements.authorCanvas.getBoundingClientRect(); const x = event.clientX - canvasBounds.left; const y = event.clientY - canvasBounds.top;
  const originX = Number(elements.authorCanvas.dataset.originScreenX); const originY = Number(elements.authorCanvas.dataset.originScreenY);
  if (Math.hypot(x - originX, y - originY) > 28) return;
  draggingOrigin = true; elements.authorCanvas.setPointerCapture(event.pointerId);
});
elements.authorCanvas.addEventListener('pointermove', (event) => {
  if (!draggingOrigin) return;
  const scale = Number(elements.authorCanvas.dataset.renderScale);
  const deltaX = (event.movementX || 0) / scale * (flipped ? -1 : 1); const deltaY = (event.movementY || 0) / scale;
  const asset = currentAsset(); asset.constructionOrigin.x = Number((asset.constructionOrigin.x + deltaX).toFixed(3)); asset.constructionOrigin.y = Number((asset.constructionOrigin.y + deltaY).toFixed(3));
  render();
});
elements.authorCanvas.addEventListener('pointerup', (event) => { draggingOrigin = false; if (elements.authorCanvas.hasPointerCapture(event.pointerId)) elements.authorCanvas.releasePointerCapture(event.pointerId); });
elements.authorCanvas.addEventListener('pointercancel', () => { draggingOrigin = false; });
elements.assetSelect.addEventListener('change', render);
elements.flipButton.addEventListener('click', () => { flipped = !flipped; render(); });
elements.resetButton.addEventListener('click', () => { calibration = structuredClone(BLOCK_CALIBRATION); flipped = false; render(); });
elements.exportButton.addEventListener('click', () => { elements.jsonEditor.value = exportCalibration(calibration); elements.jsonEditor.focus(); elements.jsonEditor.select(); });
elements.importButton.addEventListener('click', () => { try { calibration = importCalibration(elements.jsonEditor.value).calibration; render(); } catch (error) { elements.status.dataset.ok = 'false'; elements.status.textContent = error.message; } });
window.addEventListener('resize', render);

try { await loadAssets(); render(); } catch (error) { elements.status.dataset.ok = 'false'; elements.status.textContent = `Harness failed: ${error.message}`; throw error; }
