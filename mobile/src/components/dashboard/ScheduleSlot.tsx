import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { Badge } from '../ui/Badge';

export interface ScheduleItem {
  time: string;
  name: string;
  service: string;
  dur: string;
  status: 'confirmed' | 'pending' | 'free';
  color: string;
}

interface ScheduleSlotProps {
  item: ScheduleItem;
}

export const ScheduleSlot: React.FC<ScheduleSlotProps> = ({ item }) => {
  const { colors } = useTheme();

  const isFree = item.status === 'free';

  return (
    <View style={[styles.container, { opacity: isFree ? 0.55 : 1 }]}>
      <View style={styles.timeContainer}>
        <Text style={[styles.timeText, { color: colors.textSoft }]}>{item.time}</Text>
      </View>
      
      <View style={[styles.statusStripe, { backgroundColor: item.color }]} />
      
      <View style={[
        styles.card,
        {
          backgroundColor: isFree ? 'transparent' : colors.card,
          borderColor: colors.borderLight,
          borderWidth: isFree ? 0 : 1,
          paddingVertical: isFree ? 8 : 10,
        }
      ]}>
        {isFree ? (
          <Text style={[styles.freeText, { color: colors.muted }]}>— Свободно</Text>
        ) : (
          <>
            <View style={styles.cardHeader}>
              <Text style={[styles.nameText, { color: colors.text }]}>{item.name}</Text>
              <Badge 
                color={item.color} 
                bg={`${item.color}14`}
                textStyle={{ fontSize: 10 }}
              >
                {item.status === 'pending' ? 'Ожидает' : 'Подтв.'}
              </Badge>
            </View>
            <Text style={[styles.serviceText, { color: colors.muted }]}>
              {item.service} · {item.dur}
            </Text>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 12,
  },
  timeContainer: {
    width: 44,
    textAlign: 'right',
    paddingTop: 2,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  statusStripe: {
    width: 3,
    borderRadius: 3,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  freeText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameText: {
    fontSize: 13,
    fontWeight: '700',
  },
  serviceText: {
    fontSize: 12,
    marginTop: 2,
  },
});
