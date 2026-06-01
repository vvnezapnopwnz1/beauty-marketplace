import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Platform,
} from "react-native";
import { useTheme } from "@shared/theme/useTheme";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

interface DatePickerCarouselProps {
  selectedDate: string; // Format: "YYYY-MM-DD"
  onDateChange: (date: string) => void;
  disabled?: boolean;
}

const formatDateToString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseStringToDate = (str: string): Date => {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const DatePickerCarousel: React.FC<DatePickerCarouselProps> = ({
  selectedDate,
  onDateChange,
  disabled = false,
}) => {
  const { colors, typography } = useTheme();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const monthsFull = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ];

  const weekdaysShort = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

  // Generate 14 days from today
  const generateDays = (startDate: Date) => {
    const list = [];
    const monthsShort = [
      "янв",
      "фев",
      "мар",
      "апр",
      "май",
      "июн",
      "июл",
      "авг",
      "сен",
      "окт",
      "ноя",
      "дек",
    ];

    for (let i = 0; i < 14; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = formatDateToString(d);
      list.push({
        dateStr,
        dayNum: d.getDate(),
        weekday: weekdaysShort[d.getDay()],
        monthName: monthsShort[d.getMonth()],
        isToday: i === 0,
        date: d,
      });
    }
    return list;
  };

  const visibleDays = useMemo(() => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const baseDays = generateDays(todayDate);

    const selectedInBase = baseDays.some((b) => b.dateStr === selectedDate);
    if (selectedInBase) {
      return baseDays;
    }

    // Selected date is not in the base 14 days, insert it chronologically
    try {
      const customDateObj = parseStringToDate(selectedDate);
      const monthsShort = [
        "янв",
        "фев",
        "мар",
        "апр",
        "май",
        "июн",
        "июл",
        "авг",
        "сен",
        "окт",
        "ноя",
        "дек",
      ];

      const customItem = {
        dateStr: selectedDate,
        dayNum: customDateObj.getDate(),
        weekday: weekdaysShort[customDateObj.getDay()],
        monthName: monthsShort[customDateObj.getMonth()],
        isToday: selectedDate === formatDateToString(new Date()),
        date: customDateObj,
      };

      const allDays = [...baseDays, customItem].sort((a, b) =>
        a.dateStr.localeCompare(b.dateStr),
      );
      return allDays;
    } catch {
      return baseDays;
    }
  }, [selectedDate]);

  const monthHeader = useMemo(() => {
    try {
      const d = parseStringToDate(selectedDate);
      return `${monthsFull[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      const d = new Date();
      return `${monthsFull[d.getMonth()]} ${d.getFullYear()}`;
    }
  }, [selectedDate]);

  const handleDatePress = (dateStr: string) => {
    if (disabled) return;
    if (Platform.OS === "ios") {
      void Haptics.selectionAsync();
    }
    onDateChange(dateStr);
  };

  const handleCustomDateChange = (event: any, date?: Date) => {
    if (disabled) return;
    setShowDatePicker(false);
    if (date) {
      const dateStr = formatDateToString(date);
      handleDatePress(dateStr);
    }
  };

  return (
    <View style={[styles.container, disabled && { opacity: 0.6 }]}>
      {/* Month Header and arbitrary picker button */}
      <View style={styles.header}>
        <Text style={[styles.monthText, { color: colors.text }]}>
          {monthHeader}
        </Text>
        {!disabled && (
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={({ pressed }) => [
              styles.calendarButton,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.borderLight,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Feather name="calendar" size={17} color={colors.accent} />
            <Text style={[styles.calendarButtonText, { color: colors.accent }]}>
              Выбрать...
            </Text>
          </Pressable>
        )}
      </View>

      {/* Date Carousel */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={visibleDays}
        keyExtractor={(item) => item.dateStr}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isSelected = item.dateStr === selectedDate;
          return (
            <Pressable
              onPress={() => handleDatePress(item.dateStr)}
              style={({ pressed }) => [
                styles.dayCard,
                {
                  backgroundColor: isSelected ? colors.accent : colors.card,
                  borderColor: isSelected ? "transparent" : colors.borderLight,
                },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text
                style={[
                  styles.weekdayText,
                  { color: isSelected ? colors.accentText : colors.muted },
                ]}
              >
                {item.weekday}
              </Text>
              <Text
                style={[
                  styles.dayNumText,
                  {
                    color: isSelected ? colors.accentText : colors.text,
                    fontWeight: isSelected ? "bold" : "600",
                  },
                ]}
              >
                {item.dayNum}
              </Text>
              <Text
                style={[
                  styles.monthNameText,
                  { color: isSelected ? colors.accentText : colors.muted },
                ]}
              >
                {item.monthName}
              </Text>
              {item.isToday && !isSelected && (
                <View style={[styles.todayIndicator, { backgroundColor: colors.accent }]} />
              )}
            </Pressable>
          );
        }}
      />

      {showDatePicker && (
        <DateTimePicker
          value={parseStringToDate(selectedDate)}
          mode="date"
          display="default"
          onChange={handleCustomDateChange}
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
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  monthText: {
    fontSize: 16,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  calendarButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  calendarButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  listContent: {
    paddingVertical: 4,
    gap: 8,
  },
  dayCard: {
    width: 58,
    height: 80,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  dayNumText: {
    fontSize: 18,
    lineHeight: 22,
    marginBottom: 2,
  },
  monthNameText: {
    fontSize: 10,
  },
  todayIndicator: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
