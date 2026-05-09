import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { listSalonInquiryRooms } from '../../api/chat';
import { useMeQuery } from '../../entities/me/api';
import { useTheme } from '../../shared/theme/useTheme';

export function InquiriesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data: me } = useMeQuery();
  const salonId = me?.effectiveRoles?.salonMemberships?.[0]?.salonId;

  const { data: rooms, isLoading, refetch } = useQuery({
    queryKey: ['inquiries', salonId],
    queryFn: () => (salonId ? listSalonInquiryRooms(salonId) : []),
    enabled: !!salonId,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!salonId) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.muted }}>Нет доступа к управлению салоном</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        onRefresh={refetch}
        refreshing={isLoading}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, { borderBottomColor: colors.border }]}
            onPress={() => router.push({
              pathname: `/chat/${item.id}`,
              params: { title: item.guestName || 'Запрос' }
            })}
          >
            <View style={styles.row}>
              <Text style={[styles.name, { color: colors.text }]}>
                {item.guestName || 'Анонимный гость'}
              </Text>
              {(item.unreadCount ?? 0) > 0 ? (
                <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                  <Text style={styles.badgeText}>{item.unreadCount}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.lastMsg, { color: colors.muted }]} numberOfLines={1}>
              {item.lastMessage || 'Нет сообщений'}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: colors.muted }}>Запросов пока нет</Text>
          </View>
        }
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  item: { padding: 16, borderBottomWidth: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '600' },
  lastMsg: { fontSize: 14 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
});
