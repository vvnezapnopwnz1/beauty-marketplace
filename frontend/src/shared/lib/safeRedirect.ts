/**
 * Returns input only if it is a same-origin relative path that starts with "/".
 * Otherwise returns the fallback. Guards against open-redirect:
 *   - Paths that remain protocol-relative after normalization → fallback
 *   - "http://..."     → fallback
 *   - "javascript:..." → fallback
 *   - "" / null        → fallback
 *
 * Collapses repeated slashes in the path (e.g. `//master-onboarding/start` →
 * `/master-onboarding/start`) so accidental double slashes do not force fallback.
 */
export function safeRelativePath(input: string | null | undefined, fallback: string): string {
  if (typeof input !== 'string' || input.length === 0) return fallback
  let decoded: string
  try {
    decoded = decodeURIComponent(input)
  } catch {
    return fallback
  }
  if (!decoded.startsWith('/')) return fallback
  // Collapse duplicate slashes (e.g. user or server opened `//master-onboarding/start`)
  // so we do not treat the path as a protocol-relative URL and drop to fallback.
  const [rawPath, rawQuery = ''] = decoded.split('?', 2)
  const path = rawPath.replace(/\/{2,}/g, '/')
  decoded = rawQuery ? `${path}?${rawQuery}` : path
  if (decoded.startsWith('//')) return fallback
  if (decoded.startsWith('/\\')) return fallback
  return decoded
}
