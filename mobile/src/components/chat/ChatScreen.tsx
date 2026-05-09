import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getRoomForAppointment,
  getRoomById,
  requestAppointment,
  listMessages,
  markRoomRead,
  sendMessage,
  type ChatMessage,
  type ChatRoom,
} from '../../api/chat';
import { useChatStream } from '../../lib/chat/useChatStream';
import { ChatBubble } from './ChatBubble';

interface Props {
  appointmentId?: string;
  roomId?: string;
  currentUserId?: string | null;
}

export function ChatScreen({ appointmentId, roomId, currentUserId }: Props) {
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let r: ChatRoom;
        if (roomId) {
          r = await getRoomById(roomId);
        } else if (appointmentId) {
          r = await getRoomForAppointment(appointmentId);
        } else {
          return;
        }

        if (cancelled) return;
        setRoom(r);
        const m = await listMessages(r.id);
        if (cancelled) return;
        setMessages(m);
        await markRoomRead(r.id);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appointmentId, roomId]);

  const onAppend = useCallback((tail: ChatMessage[]) => {
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const fresh = tail.filter((m) => !seen.has(m.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  }, []);
  useChatStream(room?.id, onAppend);

  useEffect(() => {
    if (messages.length) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !room || sending) return;
    setSending(true);
    try {
      const msg = await sendMessage(room.id, body);
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  const readonly = room?.status === 'readonly' || room?.status === 'archived';

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <ChatBubble
            msg={item}
            isOwn={Boolean(currentUserId) && item.senderUserId === currentUserId}
          />
        )}
        contentContainerStyle={{ padding: 12, gap: 4 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />
      {readonly ? (
        <Text style={styles.readonly}>Чат закрыт.</Text>
      ) : (
        <View style={styles.composerWrapper}>
          {room?.type === 'inquiry' && (
            <TouchableOpacity
              onPress={async () => {
                if (!room || sending) return;
                setSending(true);
                try {
                  const msg = await requestAppointment(room.id);
                  setMessages((prev) =>
                    prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
                  );
                } finally {
                  setSending(false);
                }
              }}
              style={styles.requestBtn}
              disabled={sending}
            >
              <Text style={styles.requestBtnText}>Предложить запись</Text>
            </TouchableOpacity>
          )}
          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Сообщение…"
              multiline
              style={styles.input}
              editable={!sending}
            />
            <TouchableOpacity
              onPress={() => void send()}
              style={styles.send}
              disabled={!draft.trim() || sending}
            >
              <Text
                style={[
                  styles.sendText,
                  (!draft.trim() || sending) && styles.sendTextDisabled,
                ]}
              >
                Отпр.
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'white' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  composer: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  input: { flex: 1, paddingHorizontal: 8, paddingVertical: 6, maxHeight: 100 },
  send: { paddingHorizontal: 12, justifyContent: 'center' },
  sendText: { color: '#7c3aed', fontWeight: '600' },
  sendTextDisabled: { color: '#aaa' },
  readonly: { textAlign: 'center', color: '#666', padding: 8 },
  composerWrapper: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  requestBtn: {
    padding: 8,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
  },
  requestBtnText: {
    color: '#7c3aed',
    fontSize: 13,
    fontWeight: '600',
  },
});
