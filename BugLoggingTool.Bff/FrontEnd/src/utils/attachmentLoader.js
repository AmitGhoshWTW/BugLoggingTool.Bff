// src/utils/attachmentLoader.js
// Simple cache of object URLs to avoid recreating URLs repeatedly.
const urlCache = new Map();

export function makeObjectURL(id, blob) {
  // If same blob instance already cached => reuse
  const cached = urlCache.get(id);
  if (cached) return cached;
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

export function revokeObjectURL(id) {
  const u = urlCache.get(id);
  if (u) {
    URL.revokeObjectURL(u);
    urlCache.delete(id);
  }
}

export function clearAll() {
  for (const [id, u] of urlCache.entries()) {
    URL.revokeObjectURL(u);
  }
  urlCache.clear();
}
