import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../theme';

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  onPress, 
  variant = 'primary', 
  style, 
  textStyle,
  disabled 
}) => {
  const { colors, typography } = useTheme();

  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.container,
        {
          backgroundColor: isPrimary ? colors.accent : 'transparent',
          borderWidth: isPrimary ? 0 : 1.5,
          borderColor: isPrimary ? 'transparent' : colors.accentBorder,
          paddingVertical: isPrimary ? 13 : 11,
          opacity: disabled ? 0.5 : 1,
        },
        style
      ]}
    >
      <Text style={[
        styles.text,
        {
          color: isPrimary ? '#FFFFFF' : colors.accent,
          fontFamily: typography.fonts.bold,
        },
        textStyle
      ]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
  },
});
