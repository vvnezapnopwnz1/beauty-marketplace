import { useCallback, useEffect, useRef } from 'react';
import { listMessages, type ChatMessage } from '../../api/chat';

/**
 * Polls the chat room every 5 seconds and pushes only new messages to the
 * caller. Used as a fallback for SSE on RN until a native EventSource is
 * available.
 */
export function useChatStream(
  roomId: string | undefined,
  onAppend: (msgs: ChatMessage[]) => void,
) {
  const lastID = useRef<string | null>(null);
  const stableOnAppend = useRef(onAppend);
  stableOnAppend.current = onAppend;

  const tick = useCallback(async () => {
    if (!roomId) return;
    try {
      const all = await listMessages(roomId);
      const last = lastID.current;
      if (!last) {
        if (all.length) {
          stableOnAppend.current(all);
          lastID.current = all[all.length - 1]!.id;
        }
        return;
      }
      const idx = all.findIndex((m) => m.id === last);
      const tail = idx >= 0 ? all.slice(idx + 1) : all;
      if (tail.length) {
        stableOnAppend.current(tail);
        lastID.current = tail[tail.length - 1]!.id;
      }
    } catch {
      // swallow transient network errors
    }
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    lastID.current = null;
    void tick();
    const id = setInterval(() => void tick(), 5000);
    return () => clearInterval(id);
  }, [roomId, tick]);
}
