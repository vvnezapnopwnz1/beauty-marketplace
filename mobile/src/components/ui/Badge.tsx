import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../theme';

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  bg?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({ children, color, bg, style, textStyle }) => {
  const { colors, typography } = useTheme();

  return (
    <View style={[
      styles.container,
      { backgroundColor: bg || colors.accentLight },
      style
    ]}>
      <Text style={[
        styles.text,
        { color: color || colors.accent, fontFamily: typography.fonts.bold },
        textStyle
      ]}>
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
  },
});
