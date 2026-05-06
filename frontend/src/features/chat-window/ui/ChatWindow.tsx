import { Box, CircularProgress, Typography } from '@mui/material';
import { useEffect, useMemo, useRef } from 'react';
import {
    useChatStream,
    useGetRoomForAppointmentQuery,
    useListMessagesQuery,
    useMarkRoomReadMutation,
    useSendMessageMutation,
} from '@entities/chat';
import { ChatBubble } from './ChatBubble';
import { ChatComposer } from './ChatComposer';

export interface ChatWindowProps {
    appointmentId?: string;
    currentUserId?: string | null;
    /** Anonymous mode: when provided, room is fetched by token (caller must
     * pass roomId via getRoomByToken upstream and forward it via room prop). */
    accessToken?: string;
    /** Pre-resolved room id (used by GuestChatPage which fetches by token). */
    roomIdOverride?: string;
    /** Pre-resolved room status (used in anon mode). */
    roomStatusOverride?: 'active' | 'readonly' | 'archived';
    /** Pre-resolved lock state (anon mode). */
    lockedOverride?: boolean;
}

export function ChatWindow({
    appointmentId,
    currentUserId,
    accessToken,
    roomIdOverride,
    roomStatusOverride,
    lockedOverride,
}: ChatWindowProps) {
    const skipRoomQuery = !appointmentId || Boolean(roomIdOverride);
    const room = useGetRoomForAppointmentQuery(appointmentId ?? '', {
        skip: skipRoomQuery,
    });

    const roomId = roomIdOverride ?? room.data?.id;
    const roomStatus = roomStatusOverride ?? room.data?.status;
    const locked = lockedOverride ?? room.data?.lockedUntilFirstReply ?? false;

    const messages = useListMessagesQuery(
        { roomId: roomId ?? '', accessToken },
        { skip: !roomId },
    );

    const [send] = useSendMessageMutation();
    const [markRead] = useMarkRoomReadMutation();

    useChatStream({ roomId, accessToken });

    const listRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    }, [messages.data?.messages.length]);

    useEffect(() => {
        if (roomId && currentUserId) void markRead(roomId);
    }, [roomId, currentUserId, markRead]);

    const isReadonly = roomStatus === 'readonly' || roomStatus === 'archived';
    const isAnonGuest = !currentUserId && Boolean(accessToken);
    const guestLocked = useMemo(() => {
        if (!isAnonGuest || !locked) return false;
        return (messages.data?.messages ?? []).some((m) => m.senderRole === 'guest');
    }, [isAnonGuest, locked, messages.data]);

    const composerDisabled = isReadonly || guestLocked;

    if (!roomId || messages.isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box
                ref={listRef}
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    p: 1,
                }}
            >
                {(messages.data?.messages ?? []).map((m) => (
                    <ChatBubble
                        key={m.id}
                        msg={m}
                        isOwn={Boolean(currentUserId) && m.senderUserId === currentUserId}
                    />
                ))}
            </Box>
            {isReadonly && (
                <Typography
                    variant="caption"
                    sx={{ p: 1, color: 'text.secondary', textAlign: 'center' }}
                >
                    Чат закрыт.
                </Typography>
            )}
            {guestLocked && !isReadonly && (
                <Typography
                    variant="caption"
                    sx={{ p: 1, color: 'text.secondary', textAlign: 'center' }}
                >
                    Сообщение отправлено мастеру. Дождитесь ответа, чтобы продолжить диалог.
                </Typography>
            )}
            <ChatComposer
                disabled={composerDisabled}
                placeholder={
                    isAnonGuest && locked
                        ? 'Можно отправить одно сообщение мастеру'
                        : 'Сообщение…'
                }
                onSubmit={async (body) => {
                    await send({ roomId, body, accessToken }).unwrap();
                }}
            />
        </Box>
    );
}
