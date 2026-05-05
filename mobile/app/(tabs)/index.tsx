import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme';
import { StatsRow } from '../../src/components/dashboard/StatsRow';
import { DateStrip } from '../../src/components/dashboard/DateStrip';
import { TodaySchedule } from '../../src/components/dashboard/TodaySchedule';

export default function DashboardScreen() {
  const { colors, typography } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerSubtitle, { color: colors.muted }]}>Кабинет мастера</Text>
            <Text style={[styles.headerTitle, { color: colors.text, fontFamily: typography.fonts.serif }]}>
              Анна Волкова
            </Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={styles.avatarText}>А</Text>
          </View>
        </View>

        {/* Date Strip */}
        <DateStrip />

        {/* Stats Row */}
        <StatsRow />

        {/* Today's Schedule Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Расписание на сегодня</Text>
          <Text style={[styles.sectionDate, { color: colors.accent }]}>Среда, 7 мая</Text>
        </View>
        
        {/* Today's Schedule */}
        <TodaySchedule />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 18,
    paddingTop: 16,
    paddingBottom: 80, // Space for tab bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerSubtitle: {
    fontSize: 12,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionDate: {
    fontSize: 12,
    fontWeight: '600',
  },
});
