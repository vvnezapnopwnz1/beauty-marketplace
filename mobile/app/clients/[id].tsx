import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../src/shared/theme/useTheme";
import {
  useMasterClientQuery,
  useUpdateMasterClientMutation,
} from "../../src/entities/clients/api";
import {
  formatPhone,
  parseOptionalRuPhone,
} from "../../src/shared/lib/formatPhone";

export default function EditClientScreen() {
  const { colors, typography } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: client, isLoading, isError } = useMasterClientQuery(id);
  const update = useUpdateMasterClientMutation(id);

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (client) {
      setDisplayName(client.displayName ?? "");
      setPhone(client.phone ? formatPhone(client.phone) : "");
      setNotes(client.notes ?? "");
    }
  }, [client]);

  const submit = () => {
    if (!displayName.trim()) {
      Alert.alert("Имя обязательно", "Введите имя клиента.");
      return;
    }
    const phoneParsed = parseOptionalRuPhone(phone);
    if (phoneParsed.kind === "invalid") {
      Alert.alert("Некорректный телефон", "Введите корректный номер телефона.");
      return;
    }
    update.mutate(
      {
        displayName: displayName.trim(),
        phone: phoneParsed.kind === "valid" ? phoneParsed.e164 : null,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => router.back(),
        onError: (err) => {
          const msg =
            err instanceof Error ? err.message : "Не удалось обновить клиента";
          Alert.alert("Ошибка", msg);
        },
      },
    );
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.surface,
      borderColor: colors.borderInset,
      color: colors.text,
    },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !client) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <View style={styles.center}>
          <Text style={{ color: colors.text }}>
            Не удалось загрузить клиента
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Назад"
          hitSlop={12}
        >
          <Feather name="chevron-left" size={26} color={colors.text} />
        </Pressable>
        <Text
          style={[
            styles.title,
            { color: colors.text, fontFamily: typography.fonts.serif },
          ]}
        >
          Редактировать клиента
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.label, { color: colors.muted }]}>ИМЯ *</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Например, Анна И."
          placeholderTextColor={colors.muted}
          style={inputStyle}
          autoFocus
        />

        <Text style={[styles.label, { color: colors.muted, marginTop: 14 }]}>
          ТЕЛЕФОН
        </Text>
        <TextInput
          value={phone}
          onChangeText={(text) => setPhone(formatPhone(text))}
          placeholder="+7 (___) ___-__-__"
          placeholderTextColor={colors.muted}
          style={inputStyle}
          keyboardType="phone-pad"
          maxLength={18}
        />

        <Text style={[styles.label, { color: colors.muted, marginTop: 14 }]}>
          ЗАМЕТКА
        </Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Аллергия, предпочтения..."
          placeholderTextColor={colors.muted}
          multiline
          style={[
            inputStyle,
            { minHeight: 70, paddingTop: 10, textAlignVertical: "top" },
          ]}
        />

        <Pressable
          onPress={submit}
          disabled={update.isPending}
          style={[
            styles.submit,
            {
              backgroundColor: update.isPending
                ? `${colors.accent}80`
                : colors.accent,
            },
          ]}
        >
          <Text
            style={{
              color: colors.accentText,
              fontSize: 14,
              fontWeight: "600",
            }}
          >
            {update.isPending ? "Сохраняется..." : "Сохранить"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  title: { fontSize: 18, fontWeight: "500", letterSpacing: -0.2 },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  label: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.6,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  submit: {
    marginTop: 22,
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: "center",
  },
});
