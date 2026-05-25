/**
 * Lightweight in-memory cache for portal read APIs.
 * Swap with Redis later without changing portal controllers.
 */
const store = new Map();
const DEFAULT_TTL_MS = 5 * 60 * 1000;

const buildKey = (prefix, parts = {}) => {
  const sorted = Object.keys(parts)
    .sort()
    .map((k) => `${k}=${parts[k] ?? ''}`)
    .join('&');
  return `${prefix}:${sorted}`;
};

const get = (key) => {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
};

const set = (key, value, ttlMs = DEFAULT_TTL_MS) => {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
};

const invalidatePrefix = (prefix) => {
  for (const key of store.keys()) {
    if (key.startsWith(`${prefix}:`)) store.delete(key);
  }
};

module.exports = {
  buildKey,
  get,
  set,
  invalidatePrefix,
  DEFAULT_TTL_MS
};
