import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { chatApi } from '../api/chatApi';
import type { ChatMessage } from '../model/types';

export interface ChatStreamPayload {
    roomId: string;
    messageId: string;
    senderRole: ChatMessage['senderRole'];
    body: string;
    isSystem: boolean;
    createdAt: string;
}

export interface UseChatStreamOptions {
    roomId: string | undefined;
    accessToken?: string;
    /** Origin for SSE. Defaults to current origin. Authenticated users share the
     * same /notifications/stream as notifications; the JWT cookie/header is sent
     * automatically by the browser. */
    streamUrl?: string;
}

export function useChatStream({ roomId, accessToken, streamUrl }: UseChatStreamOptions) {
    const dispatch = useDispatch();

    useEffect(() => {
        if (!roomId) return;
        const url = streamUrl ?? '/api/v1/notifications/stream';
        let es: EventSource;
        try {
            es = new EventSource(url, { withCredentials: true });
        } catch {
            return;
        }

        const onMessage = (ev: MessageEvent) => {
            try {
                const payload = JSON.parse(ev.data) as ChatStreamPayload;
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
                                senderUserId: null,
                            });
                        },
                    ),
                );
            } catch {
                // ignore malformed events
            }
        };

        es.addEventListener('chat.message', onMessage as EventListener);
        return () => {
            es.removeEventListener('chat.message', onMessage as EventListener);
            es.close();
        };
    }, [roomId, accessToken, streamUrl, dispatch]);
}
