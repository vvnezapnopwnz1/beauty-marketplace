import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useTheme } from "../../theme";

interface InputProps {
  label?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "phone-pad" | "number-pad" | "email-address";
  autoFocus?: boolean;
  maxLength?: number;
  textContentType?: "none" | "oneTimeCode" | "telephoneNumber";
  editable?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  autoFocus,
  maxLength,
  textContentType,
  editable,
  style,
  inputStyle,
  labelStyle,
}) => {
  const { colors, typography } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text
          style={[
            styles.label,
            { color: colors.muted, fontFamily: typography.fonts.bold },
            labelStyle,
          ]}
        >
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            minHeight: multiline ? 72 : 48,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          multiline={multiline}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          maxLength={maxLength}
          textContentType={textContentType}
          editable={editable}
          style={[
            styles.input,
            {
              color: colors.text,
              fontFamily: typography.fonts.regular,
              textAlignVertical: multiline ? "top" : "center",
            },
            inputStyle,
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
    width: "100%",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 5,
  },
  inputContainer: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  input: {
    fontSize: 14,
    paddingVertical: 12,
    lineHeight: 19.6, // 1.4 * 14
  },
});
