/**
 * Базовый URL бэкенда в браузере (origin без пути).
 * Пусто — относительные пути `/api/...` (прокси Vite dev).
 *
 * Если в Network нет запросов к API или 502/504 на `/api`, задайте в окружении фронта:
 * `VITE_API_URL=http://localhost:8080` (порт из docker-compose для backend).
 */
export function publicApiOrigin(): string {
  const base = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE ?? ''
  return String(base).replace(/\/$/, '')
}

/** Полный URL для fetch: при пустом origin — тот же origin что у страницы (прокси). */
export function publicApiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  const o = publicApiOrigin()
  return o ? `${o}${p}` : p
}
