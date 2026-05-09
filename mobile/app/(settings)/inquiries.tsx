import { Stack } from 'expo-router';
import { InquiriesScreen } from '../../src/features/chat/InquiriesScreen';

export default function InquiriesRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Запросы клиентов' }} />
      <InquiriesScreen />
    </>
  );
}
