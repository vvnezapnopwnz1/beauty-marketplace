import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../src/theme';
import { AppointmentCard, Appointment } from '../../src/components/appointments/AppointmentCard';

const TABS = ['Предстоящие', 'Прошедшие', 'Отмененные'];

const DATA: Record<string, Appointment[]> = {
  'Сегодня, 7 мая': [
    { time: '10:00', name: 'Мария С.', phone: '+7 (900) 123-45-67', service: 'Стрижка и укладка', price: '2 500 ₽', dur: '1ч 15м', status: 'confirmed' },
    { time: '12:00', name: 'Ольга К.', phone: '+7 (900) 987-65-43', service: 'Окрашивание в один тон', price: '4 800 ₽', dur: '2ч 0м', status: 'pending' },
  ],
  'Завтра, 8 мая': [
    { time: '14:00', name: 'Анна К.', phone: '+7 (900) 555-44-33', service: 'Сложное окрашивание', price: '7 500 ₽', dur: '3ч 0м', status: 'confirmed' },
  ]
};

export default function AppointmentsScreen() {
  const { colors, typography } = useTheme();
  const [activeTab, setActiveTab] = useState(0);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text, fontFamily: typography.fonts.serif }]}>Записи</Text>

        {/* Tabs */}
        <View style={styles.tabsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
            {TABS.map((tab, idx) => {
              const isActive = activeTab === idx;
              return (
                <TouchableOpacity
                  key={tab}
                  activeOpacity={0.7}
                  onPress={() => setActiveTab(idx)}
                  style={[
                    styles.tab,
                    { borderBottomColor: isActive ? colors.accent : 'transparent' }
                  ]}
                >
                  <Text style={[
                    styles.tabText,
                    { color: isActive ? colors.text : colors.muted, fontWeight: isActive ? '800' : '600' }
                  ]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* List */}
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {Object.entries(DATA).map(([date, appointments]) => (
            <View key={date} style={styles.group}>
              <Text style={[styles.dateHeader, { color: colors.muted }]}>{date}</Text>
              {appointments.map((item, i) => (
                <AppointmentCard key={i} item={item} />
              ))}
            </View>
          ))}
          <View style={styles.spacer} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    paddingHorizontal: 18,
    marginBottom: 16,
  },
  tabsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0', // Slight separation
  },
  tabsContainer: {
    paddingHorizontal: 14,
    gap: 8,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginHorizontal: 4,
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
  },
  list: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  group: {
    marginBottom: 20,
  },
  dateHeader: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  spacer: {
    height: 80,
  },
});