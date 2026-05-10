import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useTheme } from "../../src/shared/theme/useTheme";

export default function ScheduleTabScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Расписание</Text>
        <Text style={[styles.subtitle, { color: colors.textSoft }]}>
          Управление рабочими часами и перерывами
        </Text>
        
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Рабочие дни
          </Text>
          <Text style={[styles.cardContent, { color: colors.textSoft }]}>
            Понедельник - Пятница: 9:00 - 20:00
          </Text>
          <Text style={[styles.cardContent, { color: colors.textSoft }]}>
            Суббота: 10:00 - 18:00
          </Text>
          <Text style={[styles.cardContent, { color: colors.textSoft }]}>
            Воскресенье: выходной
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Перерывы
          </Text>
          <Text style={[styles.cardContent, { color: colors.textSoft }]}>
            Обед: 13:00 - 14:00
          </Text>
        </View>

        <Text style={[styles.note, { color: colors.muted }]}>
          Для редактирования расписания перейдите в настройки салона
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 90 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  subtitle: { fontSize: 16, marginBottom: 8 },
  card: { 
    borderWidth: 1, 
    borderRadius: 14, 
    padding: 16, 
    gap: 8 
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: "600", 
    marginBottom: 8 
  },
  cardContent: { 
    fontSize: 14, 
    lineHeight: 20 
  },
  note: { 
    fontSize: 12, 
    fontStyle: "italic", 
    textAlign: "center",
    marginTop: 16 
  },
});