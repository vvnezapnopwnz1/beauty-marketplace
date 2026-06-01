import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { useTheme } from "@shared/theme/useTheme";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

interface TimeSlotPickerProps {
  selectedTime: string; // Format: "HH:MM"
  onTimeChange: (time: string) => void;
  disabled?: boolean;
}

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  selectedTime,
  onTimeChange,
  disabled = false,
}) => {
  const { colors } = useTheme();
  const [showTimePicker, setShowDatePicker] = useState(false);

  // Time Slot presets
  const presets = useMemo(() => {
    return {
      morning: ["08:00", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30"],
      afternoon: ["12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"],
      evening: ["17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"],
    };
  }, []);

  const allPresets = useMemo(() => {
    return [...presets.morning, ...presets.afternoon, ...presets.evening];
  }, [presets]);

  const isCustomTime = useMemo(() => {
    return !allPresets.includes(selectedTime);
  }, [selectedTime, allPresets]);

  const handleTimePress = (timeStr: string) => {
    if (disabled) return;
    if (Platform.OS === "ios") {
      void Haptics.selectionAsync();
    }
    onTimeChange(timeStr);
  };

  const handleCustomTimeChange = (event: any, date?: Date) => {
    if (disabled) return;
    setShowDatePicker(false);
    if (date) {
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      handleTimePress(`${hours}:${minutes}`);
    }
  };

  const getDateTimePickerDate = () => {
    try {
      const [h, m] = selectedTime.split(":").map(Number);
      const d = new Date();
      d.setHours(h || 10, m || 0, 0, 0);
      return d;
    } catch {
      const d = new Date();
      d.setHours(10, 0, 0, 0);
      return d;
    }
  };

  const renderTimeRow = (title: string, list: string[], icon: "sun" | "sunset" | "moon") => {
    return (
      <View style={styles.groupContainer}>
        <View style={styles.groupHeader}>
          <Feather name={icon} size={13} color={colors.muted} />
          <Text style={[styles.groupTitle, { color: colors.muted }]}>{title}</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {list.map((timeStr) => {
            const isSelected = selectedTime === timeStr;
            return (
              <Pressable
                key={timeStr}
                disabled={disabled}
                onPress={() => handleTimePress(timeStr)}
                style={({ pressed }) => [
                  styles.timeChip,
                  {
                    backgroundColor: isSelected ? colors.accent : colors.surfaceAlt,
                    borderColor: isSelected ? "transparent" : colors.borderLight,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text
                  style={[
                    styles.timeText,
                    {
                      color: isSelected ? colors.accentText : colors.text,
                      fontWeight: isSelected ? "bold" : "500",
                    },
                  ]}
                >
                  {timeStr}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={[styles.container, disabled && { opacity: 0.6 }]}>
      {/* Top action row */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Выберите время</Text>
        {!disabled && (
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={({ pressed }) => [
              styles.customButton,
              {
                backgroundColor: isCustomTime ? colors.accentLight : colors.surfaceAlt,
                borderColor: isCustomTime ? colors.accentBorder : colors.borderLight,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Feather name="clock" size={14} color={isCustomTime ? colors.accent : colors.textSoft} />
            <Text
              style={[
                styles.customButtonText,
                { color: isCustomTime ? colors.accent : colors.textSoft },
              ]}
            >
              {isCustomTime ? `Своё: ${selectedTime}` : "Определённое..."}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Rows per time of day */}
      {renderTimeRow("Утро", presets.morning, "sun")}
      {renderTimeRow("День", presets.afternoon, "sunset")}
      {renderTimeRow("Вечер", presets.evening, "moon")}

      {showTimePicker && (
        <DateTimePicker
          value={getDateTimePickerDate()}
          mode="time"
          is24Hour={true}
          display="spinner"
          onChange={handleCustomTimeChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  customButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  customButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  groupContainer: {
    marginBottom: 12,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipsScroll: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    gap: 8,
  },
  timeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 64,
  },
  timeText: {
    fontSize: 14,
  },
});
