import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../src/theme';
import { CalendarGrid } from '../../src/components/calendar/CalendarGrid';

const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'];
const DAYS_NUMS = ['5', '6', '7', '8', '9'];

export default function CalendarScreen() {
  const { colors, typography } = useTheme();
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.navBg, borderBottomColor: colors.borderLight }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: colors.text }]}>Май 2026</Text>
          <View style={styles.toggleContainer}>
            {['День', 'Неделя'].map((label, idx) => {
              const mode = idx === 0 ? 'day' : 'week';
              const isActive = viewMode === mode;
              return (
                <TouchableOpacity
                  key={label}
                  activeOpacity={0.7}
                  onPress={() => setViewMode(mode)}
                  style={[
                    styles.toggleBtn,
                    {
                      backgroundColor: isActive ? colors.accent : 'transparent',
                      borderColor: isActive ? 'transparent' : colors.border,
                      borderWidth: isActive ? 0 : 1,
                    }
                  ]}
                >
                  <Text style={[
                    styles.toggleText,
                    { color: isActive ? '#FFFFFF' : colors.muted }
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Day headers */}
        <View style={styles.dayHeaders}>
          {DAYS_SHORT.map((day, i) => (
            <View key={i} style={styles.dayHeaderItem}>
              <Text style={[styles.dayLabel, { color: colors.muted }]}>{day}</Text>
              <View style={[
                styles.dayNumContainer,
                { backgroundColor: i === 2 ? colors.accent : 'transparent' }
              ]}>
                <Text style={[
                  styles.dayNum,
                  { 
                    color: i === 2 ? '#FFFFFF' : colors.text,
                    fontWeight: i === 2 ? '800' : '500'
                  }
                ]}>
                  {DAYS_NUMS[i]}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Grid */}
      <CalendarGrid />

      {/* FAB Placeholder (Task 23) */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.accent, shadowColor: colors.accent }]}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleBtn: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 100,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dayHeaders: {
    flexDirection: 'row',
    paddingLeft: 30,
  },
  dayHeaderItem: {
    flex: 1,
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  dayNumContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: {
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 18,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  fabText: {
    fontSize: 22,
    color: '#FFFFFF',
    marginTop: -2,
  },
});