import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { Badge } from '../ui/Badge';

export interface Appointment {
  time: string;
  name: string;
  phone: string;
  service: string;
  price: string;
  dur: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
}

interface AppointmentCardProps {
  item: Appointment;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({ item }) => {
  const { colors } = useTheme();

  const statusColors = {
    confirmed: colors.green,
    pending: colors.yellow,
    completed: colors.muted,
    cancelled: colors.red,
  };

  const statusLabels = {
    confirmed: 'Подтверждена',
    pending: 'Ожидает',
    completed: 'Завершена',
    cancelled: 'Отмена',
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
      {/* Status stripe */}
      <View style={[styles.statusStripe, { backgroundColor: statusColors[item.status] }]} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.timeNameRow}>
            <Text style={[styles.timeText, { color: colors.text }]}>{item.time}</Text>
            <Text style={[styles.nameText, { color: colors.text }]}>{item.name}</Text>
          </View>
          <Badge color={statusColors[item.status]} bg={`${statusColors[item.status]}14`}>
            {statusLabels[item.status]}
          </Badge>
        </View>

        <Text style={[styles.serviceText, { color: colors.textSoft }]}>
          {item.service} · {item.dur}
        </Text>

        <View style={styles.footer}>
          <Text style={[styles.phoneText, { color: colors.muted }]}>{item.phone}</Text>
          <Text style={[styles.priceText, { color: colors.accent }]}>{item.price}</Text>
        </View>

        {/* Quick actions */}
        <View style={styles.actions}>
          {item.status === 'pending' ? (
            <>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.greenLight, borderColor: `${colors.green}25` }]}>
                <Text style={[styles.actionText, { color: colors.green }]}>✓ Подтвердить</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.redLight, borderColor: `${colors.red}25` }]}>
                <Text style={[styles.actionText, { color: colors.red }]}>✗ Отменить</Text>
              </TouchableOpacity>
            </>
          ) : item.status === 'confirmed' ? (
            <>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.accentLight, borderColor: colors.accentBorder }]}>
                <Text style={[styles.actionText, { color: colors.accent }]}>Детали</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.actionText, { color: colors.textSoft }]}>Позвонить</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  statusStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  content: {
    paddingLeft: 12,
    paddingRight: 14,
    paddingVertical: 13,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  timeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  nameText: {
    fontSize: 14,
    fontWeight: '600',
  },
  serviceText: {
    fontSize: 12,
    marginBottom: 6,
    marginLeft: 4, // Align with name/time start
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 4,
  },
  phoneText: {
    fontSize: 12,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    marginLeft: 4,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
