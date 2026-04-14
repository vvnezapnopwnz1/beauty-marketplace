/**
 * Базовый URL бэкенда в браузере.
 * - Пусто — пути вида `/api/v1/...` идут на origin страницы (прокси Vite).
 * - `http://localhost:8080` — прямой бэкенд.
 * - `/api` — только префикс прокси (как `VITE_API_BASE=/api`); путь уже содержит `/api/v1`.
 */
export function publicApiOrigin(): string {
  const base = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE ?? ''
  return String(base).replace(/\/$/, '')
}

/**
 * Собирает URL для fetch. Если база — префикс `/api` или URL, оканчивающийся на `/api`,
 * не дублирует сегмент `/api` в пути (иначе получается `/api/api/v1/...` и 404 на бэкенде).
 */
export function publicApiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  const o = publicApiOrigin()
  if (!o) return p

  const base = o.replace(/\/$/, '')
  const isHttp = base.startsWith('http://') || base.startsWith('https://')
  if (isHttp) {
    if (p.startsWith('/api/') && /\/api$/i.test(base)) {
      return `${base}${p.slice(4)}`
    }
    return `${base}${p}`
  }

  // Относительный префикс, например /api из VITE_API_BASE
  if (p.startsWith('/api/')) {
    return `${base}${p.slice(4)}`
  }
  return `${base}${p}`
}
