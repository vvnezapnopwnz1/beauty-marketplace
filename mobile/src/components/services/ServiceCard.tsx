import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';

export interface Service {
  id: string;
  name: string;
  price: string;
  duration: string;
  category: string;
  isActive: boolean;
}

interface ServiceCardProps {
  item: Service;
  onToggle: (id: string) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ item, onToggle }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
          <Switch
            value={item.isActive}
            onValueChange={() => onToggle(item.id)}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={colors.border}
          />
        </View>
        
        <Text style={[styles.category, { color: colors.muted }]}>{item.category}</Text>
        
        <View style={styles.footer}>
          <View style={styles.meta}>
            <Text style={[styles.metaText, { color: colors.textSoft }]}>⏳ {item.duration}</Text>
            <Text style={[styles.metaText, { color: colors.textSoft }]}>💰 {item.price}</Text>
          </View>
          <Text style={[styles.editLink, { color: colors.accent }]}>Изменить</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  category: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '600',
  },
  editLink: {
    fontSize: 13,
    fontWeight: '700',
  },
});
