import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";
import { useTheme } from "../../src/shared/theme/useTheme";
import { ScheduleEditor } from "../../src/features/schedule/ScheduleEditor";

export default function ScheduleTabScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScheduleEditor
        headerTitle="Расписание"
        headerSubtitle="Управление рабочими часами"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
});
