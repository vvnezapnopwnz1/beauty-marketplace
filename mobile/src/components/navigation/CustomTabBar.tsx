import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';

export const CustomTabBar = () => {
  const { colors, typography } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    { name: 'index', label: 'Обзор', icon: 'view-grid' },
    { name: 'calendar', label: 'Календарь', icon: 'grid' },
    { name: 'appointments', label: 'Записи', icon: 'format-list-bulleted' },
    { name: 'clients', label: 'Клиенты', icon: 'account-group' },
    { name: 'services', label: 'Услуги', icon: 'content-cut' },
  ];

  const navigateToTab = (tabName: string) => {
    if (tabName === 'index') {
      router.push('/(tabs)');
    } else {
      router.push(`/(tabs)/${tabName}`);
    }
  };

  const isTabActive = (tabName: string) => {
    if (tabName === 'index') {
      return pathname === '/(tabs)' || pathname === '/(tabs)/';
    }
    return pathname.includes(`/(tabs)/${tabName}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.navBg, borderTopColor: colors.borderLight }]}>
      {tabs.map((tab) => {
        const active = isTabActive(tab.name);
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={() => navigateToTab(tab.name)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons 
                name={tab.icon as any} 
                size={22} 
                color={active ? colors.accent : colors.muted} 
              />
              {active && <View style={[styles.indicator, { backgroundColor: colors.accent }]} />}
            </View>
            <Text style={[
              styles.label, 
              { 
                color: active ? colors.accent : colors.muted,
                fontFamily: active ? typography.fonts.bold : typography.fonts.medium
              }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 88 : 72,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
  },
  indicator: {
    width: 20,
    height: 2,
    borderRadius: 1,
    position: 'absolute',
    bottom: -10,
  },
});
