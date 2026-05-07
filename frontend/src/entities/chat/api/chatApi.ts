import { rtkApi } from '@shared/api/rtkApi';
import type { ChatMessage, ChatRoom, SendMessageInput } from '../model/types';

interface ListMessagesArg {
    roomId: string;
    accessToken?: string;
    limit?: number;
    offset?: number;
}

export const chatApi = rtkApi.injectEndpoints({
    endpoints: (builder) => ({
        getRoomForAppointment: builder.query<ChatRoom, string>({
            query: (appointmentId) => ({
                url: `/api/v1/chat/appointments/${appointmentId}/room`,
            }),
            providesTags: (room) => (room ? [{ type: 'ChatRoom', id: room.id }] : []),
        }),
        getRoomByToken: builder.query<ChatRoom, string>({
            query: (token) => ({ url: `/api/v1/chat/external/rooms/${token}` }),
        }),
        listMessages: builder.query<{ messages: ChatMessage[] }, ListMessagesArg>({
            query: ({ roomId, accessToken, limit = 100, offset = 0 }) => {
                const params = new URLSearchParams();
                params.set('limit', String(limit));
                params.set('offset', String(offset));
                if (accessToken) params.set('accessToken', accessToken);
                return { url: `/api/v1/chat/rooms/${roomId}/messages?${params.toString()}` };
            },
            providesTags: (_res, _err, arg) => [{ type: 'ChatMessages', id: arg.roomId }],
        }),
        sendMessage: builder.mutation<ChatMessage, SendMessageInput>({
            query: ({ roomId, body, accessToken }) => ({
                url: `/api/v1/chat/rooms/${roomId}/messages`,
                method: 'POST',
                body: { body, accessToken },
            }),
            async onQueryStarted({ roomId, accessToken }, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    dispatch(
                        chatApi.util.updateQueryData(
                            'listMessages',
                            { roomId, accessToken },
                            (draft) => {
                                if (!draft.messages.some((m) => m.id === data.id)) {
                                    draft.messages.push(data);
                                }
                            },
                        ),
                    );
                } catch {
                    // RTK Query keeps cache untouched on error
                }
            },
        }),
        markRoomRead: builder.mutation<void, string>({
            query: (roomId) => ({ url: `/api/v1/chat/rooms/${roomId}/read`, method: 'POST' }),
            invalidatesTags: (_res, _err, roomId) => [{ type: 'ChatMessages', id: roomId }],
        }),
    }),
});

export const {
    useGetRoomForAppointmentQuery,
    useGetRoomByTokenQuery,
    useListMessagesQuery,
    useSendMessageMutation,
    useMarkRoomReadMutation,
} = chatApi;
