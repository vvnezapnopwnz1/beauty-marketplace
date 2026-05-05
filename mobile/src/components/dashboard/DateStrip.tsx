import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';

interface DateItemProps {
  day: string;
  num: string;
  isActive: boolean;
  onPress: () => void;
}

const DateItem: React.FC<DateItemProps> = ({ day, num, isActive, onPress }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.item,
        {
          backgroundColor: isActive ? colors.accent : colors.surface,
          borderColor: isActive ? colors.accent : colors.border,
        }
      ]}
    >
      <Text style={[
        styles.dayText,
        { color: isActive ? 'rgba(255,255,255,0.7)' : colors.muted }
      ]}>
        {day}
      </Text>
      <Text style={[
        styles.numText,
        { color: isActive ? '#FFFFFF' : colors.text }
      ]}>
        {num}
      </Text>
      {isActive && <View style={styles.dot} />}
    </TouchableOpacity>
  );
};

export const DateStrip: React.FC = () => {
  const [selectedIdx, setSelectedIdx] = React.useState(2); // Wednesday ( Ср 7 )

  const dates = [
    { day: 'Пн', num: '5' },
    { day: 'Вт', num: '6' },
    { day: 'Ср', num: '7' },
    { day: 'Чт', num: '8' },
    { day: 'Пт', num: '9' },
    { day: 'Сб', num: '10' },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {dates.map((d, i) => (
        <DateItem
          key={i}
          day={d.day}
          num={d.num}
          isActive={i === selectedIdx}
          onPress={() => setSelectedIdx(i)}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
    marginBottom: 20,
    paddingRight: 18,
  },
  item: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 54,
  },
  dayText: {
    fontSize: 10,
    fontWeight: '600',
  },
  numText: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.8)',
    marginTop: 3,
  },
});
