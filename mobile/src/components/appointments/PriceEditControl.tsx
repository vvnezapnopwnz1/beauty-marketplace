import React, { useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  LayoutAnimation,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../shared/theme/useTheme";
import {
  centsToRubInput,
  rubToCents,
} from "../../shared/lib/appointmentPriceForm";

interface PriceEditControlProps {
  label: string;
  editable: boolean;
  manualEnabled: boolean;
  onManualEnabledChange: (enabled: boolean) => void;
  valueCents: number | null;
  onValueCentsChange: (cents: number | null) => void;
  calculatedCents: number;
}

export const PriceEditControl: React.FC<PriceEditControlProps> = ({
  label,
  editable,
  manualEnabled,
  onManualEnabledChange,
  valueCents,
  onValueCentsChange,
  calculatedCents,
}) => {
  const { colors } = useTheme();
  const inputRef = useRef<TextInput>(null);

  const displayCents =
    manualEnabled && valueCents !== null ? valueCents : calculatedCents;
  const displayRub = centsToRubInput(displayCents);

  const handleToggleManual = () => {
    if (!editable) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const nextManual = !manualEnabled;
    onManualEnabledChange(nextManual);

    if (nextManual) {
      // If we enable manual, set current value as valueCents
      onValueCentsChange(displayCents);
      // Auto focus next frame
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      // Reset value cents when disabling manual
      onValueCentsChange(null);
    }
  };

  const handlePriceChange = (text: string) => {
    onValueCentsChange(rubToCents(text));
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.muted }]}>
        {label.toUpperCase()}
      </Text>

      <View
        style={[
          styles.control,
          {
            backgroundColor: colors.surface,
            borderColor: manualEnabled ? colors.accent : colors.borderInset,
          },
        ]}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              { color: manualEnabled ? colors.text : colors.textSoft },
            ]}
            value={manualEnabled ? centsToRubInput(valueCents) : displayRub}
            onChangeText={handlePriceChange}
            editable={editable && manualEnabled}
            keyboardType="numeric"
            placeholder="0"
          />
          <Text style={[styles.currency, { color: colors.muted }]}>₽</Text>
        </View>

        {editable && (
          <Pressable
            onPress={handleToggleManual}
            style={[
              styles.toggleBtn,
              {
                backgroundColor: manualEnabled ? colors.surface : colors.borderLight,
                borderWidth: manualEnabled ? 1 : 0,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={manualEnabled ? "close" : "pencil-outline"}
              size={14}
              color={colors.textSoft}
            />
            <Text
              style={[
                styles.toggleText,
                { color: colors.textSoft },
              ]}
            >
              {manualEnabled ? "Отмена" : "Изменить"}
            </Text>
          </Pressable>
        )}
      </View>

      {manualEnabled && (
        <View style={styles.hint}>
          <MaterialCommunityIcons
            name="information-outline"
            size={12}
            color={colors.muted}
          />
          <Text style={[styles.hintText, { color: colors.muted }]}>
            Установлено вручную. Авто: {Math.round(calculatedCents / 100)} ₽
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.6,
    marginBottom: 5,
  },
  control: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingRight: 8,
    minHeight: 48,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 12,
  },
  input: {
    fontSize: 15,
    fontWeight: "700",
    paddingVertical: 10,
    minWidth: 40,
  },
  currency: {
    fontSize: 14,
    marginLeft: 4,
    fontWeight: "600",
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: "700",
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
    paddingHorizontal: 4,
  },
  hintText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
