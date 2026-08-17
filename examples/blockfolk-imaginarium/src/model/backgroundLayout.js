function clampUnit(value, fallback = 0.5) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}

export function computeBackgroundLayout(asset, targetWidth, targetHeight) {
  const width = Number(asset?.width) || targetWidth;
  const height = Number(asset?.height) || targetHeight;
  if (asset?.fit !== 'cover') {
    return { left: 0, top: 0, scaleX: targetWidth / width, scaleY: targetHeight / height };
  }
  const scale = Math.max(targetWidth / width, targetHeight / height);
  const renderedWidth = width * scale;
  const renderedHeight = height * scale;
  return {
    left: (targetWidth - renderedWidth) * clampUnit(asset.positionX),
    top: (targetHeight - renderedHeight) * clampUnit(asset.positionY),
    scaleX: scale,
    scaleY: scale
  };
}
