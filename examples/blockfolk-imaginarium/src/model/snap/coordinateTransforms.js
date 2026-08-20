function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function rotateVector(vector, degrees = 0) {
  const radians = finite(degrees) * Math.PI / 180;
  const cosine = Math.cos(radians); const sine = Math.sin(radians);
  return Object.freeze({
    x: finite(vector?.x) * cosine - finite(vector?.y) * sine,
    y: finite(vector?.x) * sine + finite(vector?.y) * cosine
  });
}

export function normalizeVector(vector) {
  const length = Math.hypot(finite(vector?.x), finite(vector?.y));
  if (length <= Number.EPSILON) return Object.freeze({ x: 0, y: 0 });
  return Object.freeze({ x: finite(vector.x) / length, y: finite(vector.y) / length });
}

export function sourceArtPointToStickerLocal(profile, sourcePoint) {
  if (!profile?.sourceSize || !sourcePoint) return null;
  return Object.freeze({
    x: finite(sourcePoint.x) - finite(profile.sourceSize.width) / 2,
    y: finite(sourcePoint.y) - finite(profile.sourceSize.height) / 2
  });
}

export function stickerLocalPointToWorld(object, localPoint) {
  if (!object || !localPoint) return null;
  const scaleX = Math.abs(finite(object.scaleX, 1)) * (object.flipX ? -1 : 1);
  const scaleY = Math.abs(finite(object.scaleY, 1)) * (object.flipY ? -1 : 1);
  const rotated = rotateVector({ x: finite(localPoint.x) * scaleX, y: finite(localPoint.y) * scaleY }, finite(object.angle));
  return Object.freeze({
    x: finite(object.x, finite(object.left)) + rotated.x,
    y: finite(object.y, finite(object.top)) + rotated.y
  });
}

export function sourceArtPointToWorld(profile, object, sourcePoint) {
  return stickerLocalPointToWorld(object, sourceArtPointToStickerLocal(profile, sourcePoint));
}

export function localNormalToWorld(object, localNormal) {
  if (!object || !localNormal) return null;
  const flipped = {
    x: finite(localNormal.x) * (object.flipX ? -1 : 1),
    y: finite(localNormal.y) * (object.flipY ? -1 : 1)
  };
  return normalizeVector(rotateVector(flipped, finite(object.angle)));
}

export function resolveConstructionPlane(profile, port, object) {
  const plane = port?.plane || null;
  if (!plane) return null;
  return object?.flipX ? (profile?.flipPlaneMap?.[plane] || plane) : plane;
}

export function worldPointToViewport(point, viewportTransform) {
  if (!point) return null;
  if (Array.isArray(viewportTransform)) {
    return Object.freeze({
      x: finite(viewportTransform[0], 1) * point.x + finite(viewportTransform[2]) * point.y + finite(viewportTransform[4]),
      y: finite(viewportTransform[1]) * point.x + finite(viewportTransform[3], 1) * point.y + finite(viewportTransform[5])
    });
  }
  const scale = finite(viewportTransform?.scale, 1);
  return Object.freeze({
    x: point.x * scale + finite(viewportTransform?.offsetX),
    y: point.y * scale + finite(viewportTransform?.offsetY)
  });
}

export function constructionScaleMultiplier(profile, object) {
  const explicit = Number(object?.constructionScaleMultiplier);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const canonical = Number(profile?.canonicalInsertScale);
  const scaleX = Math.abs(finite(object?.scaleX, 1)); const scaleY = Math.abs(finite(object?.scaleY, 1));
  const uniform = (scaleX + scaleY) / 2;
  return Number.isFinite(canonical) && canonical > 0 ? uniform / canonical : uniform;
}

export function supportedObjectOrientation(profile, object, epsilon = 1e-6) {
  const supported = profile?.supportedAngles;
  if (!Array.isArray(supported) || !supported.length) return false;
  const angle = ((finite(object?.angle) % 360) + 360) % 360;
  return supported.some((value) => {
    const normalized = ((finite(value) % 360) + 360) % 360;
    const difference = Math.abs(angle - normalized);
    return Math.min(difference, 360 - difference) <= epsilon;
  });
}
