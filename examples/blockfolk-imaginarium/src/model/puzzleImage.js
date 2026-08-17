/* global FileReader, Image */
import { PUZZLE_HEIGHT, PUZZLE_WIDTH } from './puzzleModel.js';

export function fitGeometry(sourceWidth, sourceHeight, targetWidth = PUZZLE_WIDTH, targetHeight = PUZZLE_HEIGHT, zoom = 1, offsetX = 0, offsetY = 0) {
  const baseScale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const scale = baseScale * Math.max(1, Math.min(3, zoom));
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  const limitX = Math.abs(width - targetWidth) / 2;
  const limitY = Math.abs(height - targetHeight) / 2;
  const clampedX = Math.max(-limitX, Math.min(limitX, offsetX));
  const clampedY = Math.max(-limitY, Math.min(limitY, offsetY));
  return { scale, width, height, x: ((targetWidth - width) / 2) + clampedX, y: ((targetHeight - height) / 2) + clampedY, offsetX: clampedX, offsetY: clampedY };
}

export function loadLocalImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('That picture could not be opened. Try another image.'));
    image.src = dataUrl;
  });
}

export function readImageFile(file) {
  if (!file || !String(file.type).startsWith('image/')) return Promise.reject(new Error('Choose a photo or image file.'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('That picture could not be read.'));
    reader.readAsDataURL(file);
  });
}

export function drawFramedImage(context, image, frame, targetWidth = PUZZLE_WIDTH, targetHeight = PUZZLE_HEIGHT) {
  const geometry = fitGeometry(image.naturalWidth || image.width, image.naturalHeight || image.height, targetWidth, targetHeight, frame.zoom, frame.offsetX, frame.offsetY);
  frame.offsetX = geometry.offsetX;
  frame.offsetY = geometry.offsetY;
  context.clearRect(0, 0, targetWidth, targetHeight);
  context.fillStyle = '#d9c7ed';
  context.fillRect(0, 0, targetWidth, targetHeight);
  context.drawImage(image, geometry.x, geometry.y, geometry.width, geometry.height);
  return geometry;
}
