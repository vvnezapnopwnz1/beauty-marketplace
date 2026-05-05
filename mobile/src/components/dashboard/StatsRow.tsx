import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

interface StatItemProps {
  value: string;
  label: string;
  color: string;
}

const StatItem: React.FC<StatItemProps> = ({ value, label, color }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
    </View>
  );
};

export const StatsRow: React.FC = () => {
  const { colors } = useTheme();

  const stats = [
    { value: '6', label: 'Сегодня', color: colors.accent },
    { value: '₽ 8 400', label: 'Доход', color: colors.green },
    { value: '94%', label: 'Явка', color: colors.yellow },
  ];

  return (
    <View style={styles.container}>
      {stats.map((stat, index) => (
        <StatItem 
          key={index} 
          value={stat.value} 
          label={stat.label} 
          color={stat.color} 
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 8,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
  },
  label: {
    fontSize: 11,
    marginTop: 1,
  },
});
