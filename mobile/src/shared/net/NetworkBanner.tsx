import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNetworkStatus } from './useNetworkStatus';

function formatLastOnline(lastOnlineAt: Date | null): string {
  if (!lastOnlineAt) return 'нет данных';
  return lastOnlineAt.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NetworkBanner() {
  const { isOnline, lastOnlineAt } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Нет сети</Text>
      <Text style={styles.subtitle}>Последний онлайн: {formatLastOnline(lastOnlineAt)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#2d2d2d',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  title: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    color: '#e6e6e6',
    fontSize: 12,
    marginTop: 2,
  },
});
