let fallbackCounter = 0;

export function createStableId(prefix = 'item') {
  fallbackCounter += 1;
  const random = globalThis.crypto?.randomUUID?.().replace(/-/g, '').slice(0, 12);
  const suffix = random || `${Date.now().toString(36)}${fallbackCounter.toString(36)}`;
  return `${prefix}-${suffix}`;
}

export function resetIdCounterForTests() {
  fallbackCounter = 0;
}
