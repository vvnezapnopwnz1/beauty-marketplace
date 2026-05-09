import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { authFetch } from '@shared/api/authApi';
import { chatApi } from '../api/chatApi';
import type { ChatMessage } from '../model/types';

export interface ChatStreamPayload {
    roomId: string;
    messageId: string;
    senderRole: ChatMessage['senderRole'];
    body: string;
    isSystem: boolean;
    createdAt: string;
    messageType?: string;
    data?: any;
}

export interface UseChatStreamOptions {
    roomId: string | undefined;
    accessToken?: string;
    /** Origin for SSE. Defaults to current origin. */
    streamUrl?: string;
}

export function useChatStream({ roomId, accessToken, streamUrl }: UseChatStreamOptions) {
    const dispatch = useDispatch();

    useEffect(() => {
        if (!roomId) return;
        const isGuest = Boolean(accessToken);
        const url =
            streamUrl ??
            (isGuest
                ? `/api/v1/chat/external/rooms/${accessToken}/stream`
                : '/api/v1/notifications/stream');
        const controller = new AbortController();
        let stopped = false;

        const handleChatMessage = (payload: ChatStreamPayload) => {
            try {
                if (payload.roomId !== roomId) return;
                dispatch(
                    chatApi.util.updateQueryData(
                        'listMessages',
                        { roomId, accessToken },
                        (draft) => {
                            if (draft.messages.some((m) => m.id === payload.messageId)) return;
                            draft.messages.push({
                                id: payload.messageId,
                                roomId: payload.roomId,
                                senderRole: payload.senderRole,
                                body: payload.body,
                                isSystem: payload.isSystem,
                                createdAt: payload.createdAt,
                                type: payload.messageType || 'text',
                                data: payload.data,
                                senderUserId: null,
                            });
                        },
                    ),
                );
            } catch {
                // ignore malformed events
            }
        };

        const start = async () => {
            try {
                const res = isGuest
                    ? await fetch(url, {
                          method: 'GET',
                          headers: { Accept: 'text/event-stream' },
                          signal: controller.signal,
                      })
                    : await authFetch(url, {
                          method: 'GET',
                          headers: { Accept: 'text/event-stream' },
                          signal: controller.signal,
                      });
                if (!res.ok || !res.body) return;

                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (!stopped) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });

                    const blocks = buffer.split('\n\n');
                    buffer = blocks.pop() ?? '';
                    for (const block of blocks) {
                        const lines = block.split('\n');
                        let eventType = '';
                        const dataLines: string[] = [];
                        for (const line of lines) {
                            if (line.startsWith('event:')) {
                                eventType = line.slice(6).trim();
                                continue;
                            }
                            if (line.startsWith('data:')) {
                                dataLines.push(line.slice(5).trim());
                            }
                        }
                        if (eventType !== 'chat.message' || dataLines.length === 0) continue;
                        try {
                            handleChatMessage(JSON.parse(dataLines.join('\n')) as ChatStreamPayload);
                        } catch {
                            // ignore malformed events
                        }
                    }
                }
            } catch {
                // silent: stream is best-effort
            }
        };

        void start();
        return () => {
            stopped = true;
            controller.abort();
        };
    }, [roomId, accessToken, streamUrl, dispatch]);
}
