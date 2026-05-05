import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { Tag } from '../ui/Tag';

export interface Client {
  id: string;
  name: string;
  phone: string;
  lastVisit?: string;
  totalSpent?: string;
  tags: string[];
  color: string;
}

interface ClientCardProps {
  item: Client;
}

export const ClientCard: React.FC<ClientCardProps> = ({ item }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
    >
      <View style={[styles.avatar, { backgroundColor: `${item.color}14` }]}>
        <Text style={[styles.avatarText, { color: item.color }]}>
          {item.name.charAt(0)}
        </Text>
      </View>
      
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
          <View style={styles.tags}>
            {item.tags.map(tag => (
              <Tag key={tag} color={colors.accent} bg={`${colors.accent}10`}>{tag}</Tag>
            ))}
          </View>
        </View>
        <Text style={[styles.phone, { color: colors.muted }]}>{item.phone}</Text>
        
        <View style={styles.meta}>
          <Text style={[styles.metaText, { color: colors.textSoft }]}>
            Визитов: 12 · <Text style={{ fontWeight: '700' }}>{item.totalSpent || '0 ₽'}</Text>
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  info: {
    flex: 1,
    marginLeft: 14,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
  },
  tags: {
    flexDirection: 'row',
    gap: 4,
  },
  phone: {
    fontSize: 12,
    marginBottom: 6,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
  },
});
