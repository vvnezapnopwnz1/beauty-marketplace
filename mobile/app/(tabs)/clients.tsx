import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../../src/theme';
import { ClientCard, Client } from '../../src/components/clients/ClientCard';

const CATEGORIES = ['Все', 'Постоянные', 'Новые', 'VIP'];

const CLIENTS: Client[] = [
  { id: '1', name: 'Мария Сидорова', phone: '+7 (900) 123-45-67', totalSpent: '15 400 ₽', tags: ['Постоянный'], color: '#5A9467' },
  { id: '2', name: 'Ольга Кузнецова', phone: '+7 (900) 987-65-43', totalSpent: '4 800 ₽', tags: ['Новый'], color: '#C8A27E' },
  { id: '3', name: 'Анна Котова', phone: '+7 (900) 555-44-33', totalSpent: '42 000 ₽', tags: ['VIP'], color: '#B24C4C' },
  { id: '4', name: 'Дарья Морозова', phone: '+7 (900) 111-22-33', totalSpent: '8 200 ₽', tags: ['Постоянный'], color: '#8A78A8' },
  { id: '5', name: 'Елена Белова', phone: '+7 (900) 444-55-66', totalSpent: '2 100 ₽', tags: ['Новый'], color: '#4A6D8C' },
];

export default function ClientsScreen() {
  const { colors, typography } = useTheme();
  const [activeCat, setActiveCat] = useState(0);
  const [search, setSearch] = useState('');

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text, fontFamily: typography.fonts.serif }]}>Клиенты</Text>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.searchIcon, { color: colors.muted }]}>🔍</Text>
            <TextInput
              placeholder="Поиск по имени или телефону"
              placeholderTextColor={colors.muted}
              style={[styles.searchInput, { color: colors.text }]}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {/* Categories */}
        <View style={styles.chipsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
            {CATEGORIES.map((cat, idx) => {
              const isActive = activeCat === idx;
              return (
                <TouchableOpacity
                  key={cat}
                  activeOpacity={0.7}
                  onPress={() => setActiveCat(idx)}
                  style={[
                    styles.chip,
                    { 
                      backgroundColor: isActive ? colors.accent : colors.surface,
                      borderColor: isActive ? colors.accent : colors.borderLight,
                    }
                  ]}
                >
                  <Text style={[
                    styles.chipText,
                    { color: isActive ? '#FFFFFF' : colors.textSoft }
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* List */}
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {CLIENTS.map((item) => (
            <ClientCard key={item.id} item={item} />
          ))}
          <View style={styles.spacer} />
        </ScrollView>
      </View>

      {/* FAB Placeholder */}
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
  searchContainer: {
    paddingHorizontal: 18,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  chipsWrapper: {
    marginBottom: 16,
  },
  chipsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
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
