import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { ChatScreen } from '../../src/components/chat/ChatScreen';
import { useAuthStore } from '../../src/stores/authStore';

export default function ChatRoute() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const userId = useAuthStore((s) => s.user?.id);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Чат' }} />
      {appointmentId ? (
        <ChatScreen appointmentId={appointmentId} currentUserId={userId ?? null} />
      ) : null}
    </View>
  );
}
