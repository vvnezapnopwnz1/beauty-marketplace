import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/shared/theme/useTheme";
import { useMeQuery } from "../../src/entities/me/api";

export default function SettingsProfileScreen() {
  const { colors } = useTheme();
  const { data, isLoading, isError } = useMeQuery();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <Text style={[styles.title, { color: colors.text }]}>Профиль</Text>
        {isLoading ? <Text style={{ color: colors.muted }}>Загрузка...</Text> : null}
        {isError ? <Text style={{ color: colors.red }}>Не удалось получить профиль</Text> : null}
        {data ? (
          <>
            <Text style={{ color: colors.textSoft }}>ID: {data.id}</Text>
            <Text style={{ color: colors.textSoft }}>Телефон: {data.phone}</Text>
            <Text style={{ color: colors.textSoft }}>Имя: {data.displayName ?? "—"}</Text>
            <Text style={{ color: colors.textSoft }}>Роль: {data.globalRole}</Text>
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 16 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
});
