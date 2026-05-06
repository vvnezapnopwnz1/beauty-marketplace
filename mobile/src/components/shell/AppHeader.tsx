import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/theme/useTheme';

type Props = {
  title: string;
};

export function AppHeader({ title }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, typography } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 10),
          backgroundColor: colors.navBg,
          borderBottomColor: colors.borderLight,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.text, fontFamily: typography.fonts.serif }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 22,
  },
});
