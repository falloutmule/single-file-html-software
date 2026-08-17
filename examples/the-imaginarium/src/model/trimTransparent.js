/* global Image, document */
import { ASSET_LIMITS } from './assetModel.js';

export function findAlphaBounds(imageData, threshold = ASSET_LIMITS.alphaThreshold) {
  const { data, width, height } = imageData;
  let left = width; let top = height; let right = -1; let bottom = -1;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (data[(y * width + x) * 4 + 3] >= threshold) {
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) return null;
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not decode this sticker.'));
    image.src = dataUrl;
  });
}

export async function trimDataUrl(dataUrl, threshold = ASSET_LIMITS.alphaThreshold) {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const bounds = findAlphaBounds(context.getImageData(0, 0, canvas.width, canvas.height), threshold);
  if (!bounds) return { status: 'empty', originalWidth: canvas.width, originalHeight: canvas.height };
  if (bounds.left === 0 && bounds.top === 0 && bounds.width === canvas.width && bounds.height === canvas.height) return { status: 'unchanged', dataUrl, bounds, width: canvas.width, height: canvas.height };
  const cropped = document.createElement('canvas');
  cropped.width = bounds.width; cropped.height = bounds.height;
  cropped.getContext('2d').drawImage(canvas, bounds.left, bounds.top, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);
  const result = cropped.toDataURL('image/png');
  return { status: 'trimmed', dataUrl: result, bounds, width: cropped.width, height: cropped.height };
}
