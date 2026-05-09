export type ChatSenderRole = 'guest' | 'master' | 'owner' | 'receptionist' | 'system';
export type ChatRoomStatus = 'active' | 'readonly' | 'archived';
export type ChatRoomType = 'external' | 'internal' | 'inquiry';

export interface ChatRoom {
    id: string;
    type: ChatRoomType;
    appointmentId?: string | null;
    salonId?: string | null;
    masterProfileId?: string | null;
    status: ChatRoomStatus;
    lockedUntilFirstReply: boolean;
    readonlyAt?: string | null;
    createdAt: string;
    updatedAt: string;
    accessToken?: string;
}

export interface ChatMessage {
    id: string;
    roomId: string;
    senderUserId?: string | null;
    senderRole: ChatSenderRole;
    body: string;
    isSystem: boolean;
    type?: string;
    data?: any;
    createdAt: string;
}

export interface SendMessageInput {
    roomId: string;
    body: string;
    accessToken?: string;
}

export interface CreateInquiryInput {
    salonId: string;
    masterProfileId?: string;
}
