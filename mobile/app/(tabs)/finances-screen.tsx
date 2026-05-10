import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useTheme } from "../../src/shared/theme/useTheme";
import { useTodayQuery } from "../../src/entities/today/api";

export default function FinancesTabScreen() {
  const { colors } = useTheme();
  const today = new Date().toISOString().slice(0, 10);
  const { data: todayData } = useTodayQuery(today);

  const revenueRub = (todayData?.revenueCents ?? 0) / 100;
  const appointmentsCount = todayData?.appointmentsCount ?? 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Финансы</Text>
        <Text style={[styles.subtitle, { color: colors.textSoft }]}>
          Обзор доходов и статистики
        </Text>
        
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Text style={[styles.heroLabel, { color: colors.textSoft }]}>
            Доход сегодня
          </Text>
          <Text style={[styles.heroAmount, { color: colors.text }]}>
            {revenueRub.toLocaleString("ru-RU")} ₽
          </Text>
          <Text style={[styles.heroSub, { color: colors.muted }]}>
            {appointmentsCount} {appointmentsCount === 1 ? 'запись' : appointmentsCount < 5 ? 'записи' : 'записей'}
          </Text>
        </View>

        <View style={styles.row}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight, flex: 1 }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Неделя
            </Text>
            <Text style={[styles.cardAmount, { color: colors.text }]}>
              {(revenueRub * 7).toLocaleString("ru-RU")} ₽
            </Text>
          </View>
          
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight, flex: 1 }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Месяц
            </Text>
            <Text style={[styles.cardAmount, { color: colors.text }]}>
              {(revenueRub * 30).toLocaleString("ru-RU")} ₽
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Средний чек
          </Text>
          <Text style={[styles.cardAmount, { color: colors.text }]}>
            {appointmentsCount > 0 
              ? Math.round(revenueRub / appointmentsCount).toLocaleString("ru-RU")
              : "0"} ₽
          </Text>
        </View>

        <Text style={[styles.note, { color: colors.muted }]}>
          Детальная финансовая статистика доступна в веб-версии
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
  heroCard: { 
    borderWidth: 1, 
    borderRadius: 16, 
    padding: 20, 
    alignItems: "center"
  },
  heroLabel: { 
    fontSize: 14, 
    fontWeight: "500", 
    marginBottom: 8 
  },
  heroAmount: { 
    fontSize: 32, 
    fontWeight: "700", 
    marginBottom: 4 
  },
  heroSub: { 
    fontSize: 14 
  },
  row: { 
    flexDirection: "row", 
    gap: 12 
  },
  card: { 
    borderWidth: 1, 
    borderRadius: 14, 
    padding: 16, 
    alignItems: "center"
  },
  cardTitle: { 
    fontSize: 14, 
    fontWeight: "500", 
    color: "#666",
    marginBottom: 8 
  },
  cardAmount: { 
    fontSize: 20, 
    fontWeight: "600" 
  },
  note: { 
    fontSize: 12, 
    fontStyle: "italic", 
    textAlign: "center",
    marginTop: 16 
  },
});