import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';

export interface CalendarEventData {
  day: number; // 0-4 (Пн-Пт)
  startH: number; // e.g. 10.5 for 10:30
  durH: number;
  name: string;
  label: string;
  color: string;
}

interface CalendarEventProps {
  event: CalendarEventData;
  hourHeight: number;
  columnWidth: number;
}

export const CalendarEvent: React.FC<CalendarEventProps> = ({ event, hourHeight, columnWidth }) => {
  const { colors } = useTheme();

  const top = (event.startH - 9) * hourHeight;
  const height = event.durH * hourHeight - 3;
  const left = event.day * columnWidth + 1;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        styles.container,
        {
          top,
          left,
          width: columnWidth - 2,
          height,
          backgroundColor: `${event.color}18`,
          borderLeftColor: event.color,
        }
      ]}
    >
      <Text numberOfLines={1} style={[styles.name, { color: event.color }]}>
        {event.name}
      </Text>
      {event.label ? (
        <Text numberOfLines={1} style={[styles.label, { color: colors.textSoft }]}>
          {event.label}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    borderRadius: 8,
    borderLeftWidth: 3,
    paddingVertical: 3,
    paddingHorizontal: 5,
    zIndex: 5,
    overflow: 'hidden',
  },
  name: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  label: {
    fontSize: 9,
    marginTop: 1,
  },
});
