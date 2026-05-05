import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { ScheduleSlot, ScheduleItem } from './ScheduleSlot';

export const TodaySchedule: React.FC = () => {
  const { colors } = useTheme();

  // Mock data matching the beautica-master-dashboard.jsx
  const schedule: ScheduleItem[] = [
    { time: '10:00', name: 'Мария С.', service: 'Стрижка + укладка', dur: '75 мин', status: 'confirmed', color: colors.green },
    { time: '11:30', name: 'Ольга К.', service: 'Окрашивание Airtouch', dur: '120 мин', status: 'confirmed', color: colors.green },
    { time: '14:00', name: 'Свободно', service: '', dur: '60 мин', status: 'free', color: colors.muted },
    { time: '15:30', name: 'Анастасия В.', service: 'Укладка', dur: '45 мин', status: 'pending', color: colors.yellow },
    { time: '17:00', name: 'Екатерина М.', service: 'Стрижка', dur: '60 мин', status: 'confirmed', color: colors.green },
  ];

  return (
    <View style={styles.container}>
      {schedule.map((item, index) => (
        <ScheduleSlot key={index} item={item} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },
});
