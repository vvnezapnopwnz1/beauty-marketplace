import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../theme';

interface TagProps {
  children: React.ReactNode;
  color?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Tag: React.FC<TagProps> = ({ children, color, style, textStyle }) => {
  const { colors, typography } = useTheme();

  const activeColor = color || colors.accent;

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: `${activeColor}18`, // Hex opacity
        borderColor: `${activeColor}30`,
      },
      style
    ]}>
      <Text style={[
        styles.text,
        {
          color: activeColor,
          fontFamily: typography.fonts.medium,
        },
        textStyle
      ]}>
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    borderWidth: 1,
    marginRight: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
