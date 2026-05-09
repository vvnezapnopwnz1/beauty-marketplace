/**
 * Returns input only if it is a same-origin relative path that starts with a
 * single "/". Otherwise returns the fallback. Guards against open-redirect:
 *   - "//evil.com"     → fallback (protocol-relative)
 *   - "http://..."     → fallback
 *   - "javascript:..." → fallback
 *   - "" / null        → fallback
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
  if (decoded.startsWith('//')) return fallback
  if (decoded.startsWith('/\\')) return fallback
  return decoded
}
