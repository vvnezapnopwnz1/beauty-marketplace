import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../src/theme';
import { ServiceCard, Service } from '../../src/components/services/ServiceCard';

const SERVICES: Service[] = [
  { id: '1', name: 'Женская стрижка', price: '2 500 ₽', duration: '1ч 15м', category: 'Стрижки', isActive: true },
  { id: '2', name: 'Окрашивание в один тон', price: '4 800 ₽', duration: '2ч 0м', category: 'Окрашивание', isActive: true },
  { id: '3', name: 'Сложное окрашивание (Airtouch)', price: '8 500 ₽', duration: '3ч 30м', category: 'Окрашивание', isActive: true },
  { id: '4', name: 'Укладка вечерняя', price: '3 000 ₽', duration: '1ч 0м', category: 'Укладки', isActive: false },
  { id: '5', name: 'Коррекция челки', price: '500 ₽', duration: '15м', category: 'Стрижки', isActive: true },
];

export default function ServicesScreen() {
  const { colors, typography } = useTheme();
  const [services, setServices] = useState(SERVICES);

  const toggleService = (id: string) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text, fontFamily: typography.fonts.serif }]}>Услуги</Text>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {services.map((item) => (
            <ServiceCard key={item.id} item={item} onToggle={toggleService} />
          ))}
          <View style={styles.spacer} />
        </ScrollView>
      </View>

      {/* FAB */}
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
  container: {
    flex: 1,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    paddingHorizontal: 18,
    marginBottom: 16,
  },
  list: {
    flex: 1,
    paddingHorizontal: 18,
  },
  spacer: {
    height: 80,
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
