/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 2GIS MapGL JS — публичный ключ (ограничивайте по домену в Platform Manager). */
  readonly VITE_2GIS_MAP_KEY?: string
  /** Origin бэкенда для fetch из браузера (например http://localhost:8080). Пусто — относительные /api через прокси Vite. */
  readonly VITE_API_URL?: string
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
