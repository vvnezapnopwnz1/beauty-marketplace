# Mobile Time Inline Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the tall, cluttered chip-based `TimeSlotPicker` with a premium, space-saving iOS/Android inline wheels picker (`TimeRangeInlinePicker`) on the appointment creation and editing forms.

**Architecture:** Create `TimeRangeInlinePicker.tsx` containing a single, unified picker cards component. It maintains a toggle state `activePicker: "start" | "end" | null`. On iOS, the time picker renders inline as a wheel spinner when active. On Android, it invokes the normal native dialog.

**Tech Stack:** React Native, Expo, `@react-native-community/datetimepicker`, `expo-haptics`.

---

### Task 1: Create TimeRangeInlinePicker Component

**Files:**
- Create: `mobile/src/components/appointments/TimeRangeInlinePicker.tsx`

- [ ] **Step 1.1: Write the TimeRangeInlinePicker implementation**

Create the file `/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/mobile/src/components/appointments/TimeRangeInlinePicker.tsx` with the following content:

```typescript
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { useTheme } from "@shared/theme/useTheme";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";

interface TimeRangeInlinePickerProps {
  timeStart: string; // "HH:MM"
  onTimeStartChange: (time: string) => void;
  timeEnd: string; // "HH:MM"
  onTimeEndChange: (time: string) => void;
  disabled?: boolean;
}

const timeToDate = (timeStr: string): Date => {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 10, m ?? 0, 0, 0);
  return d;
};

const dateToTime = (date: Date): string => {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
};

export const TimeRangeInlinePicker: React.FC<TimeRangeInlinePickerProps> = ({
  timeStart,
  onTimeStartChange,
  timeEnd,
  onTimeEndChange,
  disabled = false,
}) => {
  const { colors } = useTheme();
  const [activePicker, setActivePicker] = useState<"start" | "end" | null>(null);

  const handleRowPress = (type: "start" | "end") => {
    if (disabled) return;
    if (Platform.OS === "ios") {
      void Haptics.selectionAsync();
    }
    setActivePicker((prev) => (prev === type ? null : type));
  };

  const handleTimeChange = (event: any, date?: Date) => {
    if (disabled) return;

    if (Platform.OS === "android") {
      // Android picker closes automatically after dialog resolution
      setActivePicker(null);
    }

    if (date) {
      const formatted = dateToTime(date);
      if (activePicker === "start") {
        onTimeStartChange(formatted);
      } else if (activePicker === "end") {
        onTimeEndChange(formatted);
      }
    }
  };

  const getPickerDate = () => {
    if (activePicker === "start") return timeToDate(timeStart);
    if (activePicker === "end") return timeToDate(timeEnd);
    return new Date();
  };

  return (
    <View style={[styles.container, disabled && { opacity: 0.6 }]}>
      <View
        style={[
          styles.outerBox,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
          },
        ]}
      >
        {/* Start Time Row */}
        <Pressable
          onPress={() => handleRowPress("start")}
          style={({ pressed }) => [
            styles.row,
            activePicker === "start" && { backgroundColor: colors.surfaceAlt },
            pressed && !disabled && { opacity: 0.8 },
          ]}
        >
          <Text style={[styles.rowLabel, { color: colors.text }]}>
            🕒 Время начала
          </Text>
          <Text style={[styles.rowValue, { color: colors.accent }]}>
            {timeStart}
          </Text>
        </Pressable>

        {/* Inline picker for Start on iOS */}
        {Platform.OS === "ios" && activePicker === "start" && (
          <View style={[styles.pickerContainer, { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
            <DateTimePicker
              value={timeToDate(timeStart)}
              mode="time"
              is24Hour={true}
              display="spinner"
              onChange={handleTimeChange}
              textColor={colors.text}
            />
          </View>
        )}

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

        {/* End Time Row */}
        <Pressable
          onPress={() => handleRowPress("end")}
          style={({ pressed }) => [
            styles.row,
            activePicker === "end" && { backgroundColor: colors.surfaceAlt },
            pressed && !disabled && { opacity: 0.8 },
          ]}
        >
          <Text style={[styles.rowLabel, { color: colors.text }]}>
            🏁 Время окончания
          </Text>
          <Text style={[styles.rowValue, { color: colors.accent }]}>
            {timeEnd}
          </Text>
        </Pressable>

        {/* Inline picker for End on iOS */}
        {Platform.OS === "ios" && activePicker === "end" && (
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={timeToDate(timeEnd)}
              mode="time"
              is24Hour={true}
              display="spinner"
              onChange={handleTimeChange}
              textColor={colors.text}
            />
          </View>
        )}
      </View>

      {/* Android Native Pop-up triggers */}
      {Platform.OS === "android" && activePicker !== null && (
        <DateTimePicker
          value={getPickerDate()}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  outerBox: {
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: 1.5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  rowValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    height: 1,
  },
  pickerContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    paddingVertical: 4,
  },
});
```

---

### Task 2: Integrate TimeRangeInlinePicker in Creation Screen

**Files:**
- Modify: `mobile/app/(tabs)/appointment-new.tsx`

- [ ] **Step 2.1: Replace TimeSlotPicker with TimeRangeInlinePicker**

Modify imports:
Replace `TimeSlotPicker` import with `TimeRangeInlinePicker`.

Replace jsx:
Replace the separate Start and End time slots pickers with `<TimeRangeInlinePicker>` connected to `timeStart`, `setTimeStart`, `timeEnd`, and `setTimeEnd`.

---

### Task 3: Integrate TimeRangeInlinePicker in Editing Screen

**Files:**
- Modify: `mobile/src/features/appointments/AppointmentEditTab.tsx`

- [ ] **Step 3.1: Replace TimeSlotPicker with TimeRangeInlinePicker**

Modify imports:
Replace `TimeSlotPicker` import with `TimeRangeInlinePicker`.

Replace jsx:
Replace the separate start time and end time `TimeSlotPicker` components inside `AppointmentEditTab.tsx` with a single `<TimeRangeInlinePicker>` tag.

---

### Task 4: Verify and Cleanup

**Files:**
- Test/Run: `npm run lint` inside `mobile/`

- [ ] **Step 4.1: Code quality check**

Run linting on the workspace to ensure that our new component meets 100% of compile parameters with zero errors.
