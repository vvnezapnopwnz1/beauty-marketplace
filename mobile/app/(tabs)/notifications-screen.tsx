import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/shared/theme/useTheme";
import { useMeQuery } from "../../src/entities/me/api";

export default function NotificationsTabScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data: me } = useMeQuery();

  const pendingInvites = me?.effectiveRoles?.pendingInvites ?? 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Уведомления</Text>
        <Text style={[styles.subtitle, { color: colors.textSoft }]}>
          Центр уведомлений и приглашений
        </Text>
        
        {pendingInvites > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Feather name="mail" size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  Приглашения в салоны
                </Text>
                <Text style={[styles.cardContent, { color: colors.textSoft }]}>
                  У вас {pendingInvites} {pendingInvites === 1 ? 'приглашение' : pendingInvites < 5 ? 'приглашения' : 'приглашений'}
                </Text>
              </View>
            </View>
            <Pressable
              style={[styles.button, { backgroundColor: colors.accent }]}
              onPress={() => router.push("/(settings)/notifications")}
            >
              <Text style={[styles.buttonText, { color: colors.accentText }]}>
                Посмотреть
              </Text>
            </Pressable>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Feather name="bell" size={20} color={colors.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Настройки уведомлений
              </Text>
              <Text style={[styles.cardContent, { color: colors.textSoft }]}>
                Управление push-уведомлениями и звуками
              </Text>
            </View>
          </View>
          <Pressable
            style={[styles.button, { backgroundColor: colors.borderLight }]}
            onPress={() => router.push("/(settings)/notifications")}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>
              Настроить
            </Text>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Feather name="message-circle" size={20} color={colors.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Запросы клиентов
              </Text>
              <Text style={[styles.cardContent, { color: colors.textSoft }]}>
                Вопросы от клиентов по услугам
              </Text>
            </View>
          </View>
          <Pressable
            style={[styles.button, { backgroundColor: colors.borderLight }]}
            onPress={() => router.push("/(settings)/inquiries")}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>
              Открыть
            </Text>
          </Pressable>
        </View>

        {pendingInvites === 0 && (
          <Text style={[styles.emptyState, { color: colors.muted }]}>
            Нет новых уведомлений
          </Text>
        )}
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
    gap: 12 
  },
  cardHeader: { 
    flexDirection: "row", 
    alignItems: "flex-start", 
    gap: 12 
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  cardTitle: { 
    fontSize: 16, 
    fontWeight: "600", 
    marginBottom: 4 
  },
  cardContent: { 
    fontSize: 14, 
    lineHeight: 20 
  },
  button: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: { 
    fontSize: 16, 
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 40 
  },
});