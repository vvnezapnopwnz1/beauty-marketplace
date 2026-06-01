import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable, StyleSheet, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Stack } from "expo-router/stack";
import { useTheme } from "../../src/shared/theme/useTheme";
import { ScheduleEditor } from "../../src/features/schedule/ScheduleEditor";

export default function ScheduleTabScreen() {
  const { colors } = useTheme();
  const router = useRouter();

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
