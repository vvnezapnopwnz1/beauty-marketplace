import { rtkApi } from '@shared/api/rtkApi';
import type { ChatMessage, ChatRoom, SendMessageInput, CreateInquiryInput } from '../model/types';

interface ListMessagesArg {
    roomId: string;
    accessToken?: string;
    limit?: number;
    offset?: number;
}

interface ListSalonInquiriesArg {
    salonId: string;
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
        createInquiryRoom: builder.mutation<ChatRoom, CreateInquiryInput>({
            query: (body) => ({
                url: '/api/v1/chat/inquiry/rooms',
                method: 'POST',
                body,
            }),
        }),
        listSalonInquiryRooms: builder.query<ChatRoom[], ListSalonInquiriesArg>({
            query: ({ salonId, limit = 50, offset = 0 }) => ({
                url: `/api/v1/chat/salons/${salonId}/inquiry-rooms?limit=${limit}&offset=${offset}`,
            }),
            providesTags: (res) =>
                res
                    ? [...res.map((r) => ({ type: 'ChatRoom' as const, id: r.id })), 'ChatRoom']
                    : ['ChatRoom'],
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
        getUnreadCounts: builder.query<Record<string, number>, string[]>({
            query: (roomIds) => {
                const params = new URLSearchParams();
                roomIds.forEach((id) => params.append('roomIds', id));
                return { url: `/api/v1/chat/unread-counts?${params.toString()}` };
            },
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
        requestAppointment: builder.mutation<ChatMessage, string>({
            query: (roomId) => ({
                url: `/api/v1/chat/rooms/${roomId}/request-appointment`,
                method: 'POST',
            }),
        }),
    }),
});

export const {
    useGetRoomForAppointmentQuery,
    useGetRoomByTokenQuery,
    useCreateInquiryRoomMutation,
    useListSalonInquiryRoomsQuery,
    useListMessagesQuery,
    useGetUnreadCountsQuery,
    useSendMessageMutation,
    useMarkRoomReadMutation,
    useRequestAppointmentMutation,
} = chatApi;
