import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/shared/theme/useTheme";
import { useCreateMasterClientMutation } from "../../src/entities/clients/api";

export default function NewClientScreen() {
  const { colors, typography } = useTheme();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const create = useCreateMasterClientMutation();

  const submit = () => {
    if (!displayName.trim()) {
      Alert.alert("Имя обязательно", "Введите имя клиента.");
      return;
    }
    create.mutate(
      {
        displayName: displayName.trim(),
        phone: phone.trim() || null,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => router.back(),
        onError: (err) => {
          const msg =
            err instanceof Error ? err.message : "Не удалось создать клиента";
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
          Новый клиент
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
          onChangeText={setPhone}
          placeholder="+7 ..."
          placeholderTextColor={colors.muted}
          style={inputStyle}
          keyboardType="phone-pad"
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
          disabled={create.isPending}
          style={[
            styles.submit,
            {
              backgroundColor: create.isPending
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
            {create.isPending ? "Создаётся..." : "Создать"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
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
