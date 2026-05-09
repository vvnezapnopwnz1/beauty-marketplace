import client from './client';
import { CHAT } from './endpoints';

export type ChatSenderRole =
  | 'guest'
  | 'master'
  | 'owner'
  | 'receptionist'
  | 'system';

export interface ChatMessage {
  id: string;
  roomId: string;
  senderUserId?: string | null;
  senderRole: ChatSenderRole;
  body: string;
  type?: 'text' | 'appointment_request';
  data?: any;
  isSystem: boolean;
  createdAt: string;
}

export interface ChatRoom {
  id: string;
  type: 'external' | 'internal' | 'inquiry';
  appointmentId?: string | null;
  salonId?: string | null;
  guestName?: string;
  lastMessage?: string;
  unreadCount?: number;
  status: 'active' | 'readonly' | 'archived';
  lockedUntilFirstReply: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getRoomForAppointment(
  appointmentId: string,
): Promise<ChatRoom> {
  const { data } = await client.get<ChatRoom>(
    CHAT.roomForAppointment(appointmentId),
  );
  return data;
}

export async function getRoomById(roomId: string): Promise<ChatRoom> {
  const { data } = await client.get<ChatRoom>(`${CHAT.messages(roomId)}/room`);
  return data;
}

export async function listSalonInquiryRooms(
  salonId: string,
): Promise<ChatRoom[]> {
  const { data } = await client.get<ChatRoom[]>(CHAT.salonInquiryRooms(salonId));
  return data;
}

export async function listMessages(roomId: string): Promise<ChatMessage[]> {
  const { data } = await client.get<{ messages: ChatMessage[] }>(
    `${CHAT.messages(roomId)}?limit=100`,
  );
  return data.messages;
}

export async function sendMessage(
  roomId: string,
  body: string,
): Promise<ChatMessage> {
  const { data } = await client.post<ChatMessage>(CHAT.messages(roomId), {
    body,
  });
  return data;
}

export async function markRoomRead(roomId: string): Promise<void> {
  await client.post(CHAT.read(roomId));
}

export async function requestAppointment(roomId: string): Promise<ChatMessage> {
  const { data } = await client.post<ChatMessage>(
    CHAT.requestAppointment(roomId),
  );
  return data;
}
