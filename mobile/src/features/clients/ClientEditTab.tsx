import React, { useState } from "react";
import {
  Alert,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../shared/theme/useTheme";
import type { MasterClient } from "../../entities/clients/api";
import { useUpdateMasterClientMutation } from "../../entities/clients/api";
import { formatPhone, parseOptionalRuPhone } from "../../shared/lib/formatPhone";

type Props = {
  client: MasterClient;
  onCancel: () => void;
  onSaved: () => void;
};

export function ClientEditTab({ client, onCancel, onSaved }: Props) {
  const { colors } = useTheme();
  const qc = useQueryClient();

  const [displayName, setDisplayName] = useState(client.displayName ?? "");
  const [phone, setPhone] = useState(
    client.phone ? formatPhone(client.phone) : "",
  );
  const [notes, setNotes] = useState(client.notes ?? "");

  const update = useUpdateMasterClientMutation(client.id);

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
        onSuccess: () => {
          void qc.invalidateQueries({ queryKey: ["clients"] });
          onSaved();
        },
        onError: (err) => {
          const msg =
            err instanceof Error ? err.message : "Не удалось обновить клиента";
          Alert.alert("Ошибка", msg);
        },
      },
    );
  };

  const Field = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>
        {label.toUpperCase()}
      </Text>
      {children}
    </View>
  );

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.surface,
      borderColor: colors.borderInset,
      color: colors.text,
    },
  ];

  return (
    <View>
      <Field label="Имя">
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Например, Анна И."
          placeholderTextColor={colors.muted}
          style={inputStyle}
        />
      </Field>

      <Field label="Телефон">
        <TextInput
          value={phone}
          onChangeText={(text) => setPhone(formatPhone(text))}
          placeholder="+7 (___) ___-__-__"
          placeholderTextColor={colors.muted}
          style={inputStyle}
          keyboardType="phone-pad"
          maxLength={18}
        />
      </Field>

      <Field label="Заметка">
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Аллергия, предпочтения..."
          placeholderTextColor={colors.muted}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          style={[
            inputStyle,
            { minHeight: 70, paddingTop: 10, textAlignVertical: "top" },
          ]}
        />
      </Field>

      <View style={styles.footer}>
        <Pressable
          onPress={onCancel}
          style={[
            styles.btn,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <Text
            style={{ color: colors.textSoft, fontSize: 13, fontWeight: "500" }}
          >
            Назад
          </Text>
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={update.isPending}
          style={[
            styles.btn,
            {
              flex: 2,
              backgroundColor: update.isPending
                ? `${colors.accent}80`
                : colors.accent,
            },
          ]}
        >
          <Text
            style={{
              color: colors.accentText,
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            {update.isPending ? "Сохранение..." : "Сохранить"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
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
  footer: { flexDirection: "row", gap: 8, marginTop: 4, paddingBottom: 8 },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 100,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
});
