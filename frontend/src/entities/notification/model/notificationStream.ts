import { authFetch } from '@shared/api/authApi'
import type { NotificationItem } from './types'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

type StreamHandlers = {
  onNotification: (notification: NotificationItem) => void
  onError?: (error: unknown) => void
}

function tryParseEventBlock(block: string): NotificationItem | null {
  const lines = block.split('\n')
  let eventType = ''
  const dataLines: string[] = []
  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventType = line.slice(6).trim()
      continue
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim())
    }
  }
  if (eventType !== 'notification' || dataLines.length === 0) {
    return null
  }
  try {
    return JSON.parse(dataLines.join('\n')) as NotificationItem
  } catch {
    return null
  }
}

export function connectNotificationStream(handlers: StreamHandlers): () => void {
  let stopped = false
  let controller: AbortController | null = null
  let reconnectTimer: number | null = null
  let attempt = 0

  const clearTimer = () => {
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  const scheduleReconnect = () => {
    if (stopped) return
    clearTimer()
    const delayMs = Math.min(30000, 1000 * (attempt + 1))
    reconnectTimer = window.setTimeout(() => {
      attempt += 1
      void start()
    }, delayMs)
  }

  const start = async () => {
    controller?.abort()
    controller = new AbortController()

    try {
      const res = await authFetch(`${API_BASE}/api/v1/notifications/stream`, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
        },
        signal: controller.signal,
      })
      if (!res.ok || !res.body) {
        throw new Error(`SSE failed: HTTP ${res.status}`)
      }

      attempt = 0
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (!stopped) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const blocks = buffer.split('\n\n')
        buffer = blocks.pop() ?? ''
        for (const block of blocks) {
          const parsed = tryParseEventBlock(block)
          if (parsed) {
            handlers.onNotification(parsed)
          }
        }
      }
      scheduleReconnect()
    } catch (error) {
      if (!stopped) {
        handlers.onError?.(error)
        scheduleReconnect()
      }
    }
  }

  void start()

  return () => {
    stopped = true
    clearTimer()
    controller?.abort()
  }
}
