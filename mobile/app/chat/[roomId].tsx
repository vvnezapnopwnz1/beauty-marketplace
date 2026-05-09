import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { ChatScreen } from '../../src/components/chat/ChatScreen';
import { useAuthStore } from '../../src/stores/authStore';

export default function ChatRoomRoute() {
  const { roomId, title } = useLocalSearchParams<{ roomId: string; title?: string }>();
  const userId = useAuthStore((s) => s.user?.id);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: title || 'Чат' }} />
      {roomId ? (
        <ChatScreen roomId={roomId} currentUserId={userId ?? null} />
      ) : null}
    </View>
  );
}
