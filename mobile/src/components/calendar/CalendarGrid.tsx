import React from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useTheme } from '../../theme';
import { CalendarEvent, CalendarEventData } from './CalendarEvent';

const HOUR_HEIGHT = 60;
const HOURS = ['9', '10', '11', '12', '13', '14', '15', '16', '17', '18'];
const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'];

export const CalendarGrid: React.FC = () => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  // Calculate column width: (TotalWidth - LeftPadding) / NumDays
  const colWidth = (width - 30) / 5;

  // Mock events from the mockup
  const events: CalendarEventData[] = [
    { day: 0, startH: 10, durH: 1.25, name: 'Мария С.', label: 'Стрижка', color: '#5A9467' },
    { day: 0, startH: 11.5, durH: 2, name: 'Ольга К.', label: 'Окрашивание', color: colors.accent },
    { day: 1, startH: 9, durH: 1, name: 'Дарья М.', label: 'Укладка', color: '#5A9467' },
    { day: 2, startH: 10, durH: 1.25, name: 'Мария С.', label: 'Стрижка', color: '#5A9467' },
    { day: 2, startH: 14, durH: 2, name: 'Анна К.', label: 'Окрашивание', color: colors.accent },
    { day: 2, startH: 15.5, durH: 0.75, name: 'Ольга В.', label: 'Укладка', color: '#8A78A8' },
    { day: 3, startH: 13, durH: 1, name: 'Свободно', label: '', color: colors.border },
    { day: 4, startH: 10, durH: 1, name: 'Юлия П.', label: 'Стрижка', color: '#5A9467' },
    { day: 4, startH: 15, durH: 1.5, name: 'Анастасия', label: 'Airtouch', color: colors.accent },
  ];

  // Mock "Now" position (11:15)
  const nowHour = 11;
  const nowMinute = 15;
  const nowTop = (nowHour - 9 + nowMinute / 60) * HOUR_HEIGHT;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.gridContainer}>
        {/* Hour markers and grid lines */}
        {HOURS.map((hour, index) => (
          <View key={hour} style={[styles.hourRow, { height: HOUR_HEIGHT }]}>
            <View style={styles.timeLabelContainer}>
              <Text style={[styles.timeLabel, { color: colors.muted }]}>{hour}</Text>
            </View>
            <View style={styles.dayColumnsContainer}>
              {DAYS.map((_, dayIndex) => (
                <View 
                  key={dayIndex} 
                  style={[
                    styles.columnCell, 
                    { 
                      borderColor: colors.borderLight,
                      backgroundColor: index % 2 === 0 ? 'transparent' : `${colors.surface}44`
                    }
                  ]} 
                />
              ))}
            </View>
          </View>
        ))}

        {/* NowLine */}
        <View style={[styles.nowLine, { top: nowTop, backgroundColor: colors.red }]}>
          <View style={[styles.nowLineDot, { backgroundColor: colors.red }]} />
        </View>

        {/* Events */}
        {events.map((ev, i) => (
          <CalendarEvent 
            key={i} 
            event={ev} 
            hourHeight={HOUR_HEIGHT} 
            columnWidth={colWidth} 
          />
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gridContainer: {
    paddingLeft: 30,
    position: 'relative',
    paddingBottom: 40,
  },
  hourRow: {
    flexDirection: 'row',
    position: 'relative',
  },
  timeLabelContainer: {
    position: 'absolute',
    left: -30,
    width: 28,
    paddingTop: 4,
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'right',
  },
  dayColumnsContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  columnCell: {
    flex: 1,
    borderBottomWidth: 1,
    borderRightWidth: 1,
  },
  nowLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    zIndex: 10,
  },
  nowLineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    left: -4,
    top: -3,
  },
});
