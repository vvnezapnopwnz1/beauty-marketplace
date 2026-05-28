import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { useTheme } from "../../shared/theme/useTheme";
import {
  useMasterClientsQuery,
  type MasterClient,
} from "../../entities/clients/api";
import { parseOptionalRuPhone } from "../../shared/lib/formatPhone";

interface Props {
  value: string;
  onChangeText: (name: string) => void;
  onSelectClient: (client: MasterClient | null) => void;
  phoneValue: string;
  onPhoneChange: (phone: string) => void;
  onBlur?: () => void;
}

export function ClientAutocompleteField({
  value,
  onChangeText,
  onSelectClient,
  phoneValue,
  onPhoneChange,
  onBlur,
}: Props) {
  const { colors } = useTheme();
  const [search, setSearch] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<MasterClient | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const trimmed = search.trim();
      if (!trimmed) {
        setDebouncedSearch("");
        return;
      }
      const parsed = parseOptionalRuPhone(trimmed);
      if (parsed.kind === "valid") {
        setDebouncedSearch(parsed.e164);
      } else {
        setDebouncedSearch(trimmed);
      }
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [search]);

  const { data: clients, isLoading } = useMasterClientsQuery(
    debouncedSearch.length >= 2 ? debouncedSearch : undefined,
  );

  useEffect(() => {
    setSearch(value);
  }, [value]);

  const handleChange = (text: string) => {
    setSearch(text);
    onChangeText(text);
    if (highlighted && highlighted.displayName !== text) {
      setHighlighted(null);
      onSelectClient(null);
    }
    setIsOpen(text.trim().length >= 2);
  };

  const handleSelect = (client: MasterClient) => {
    setSearch(client.displayName);
    onChangeText(client.displayName);
    onPhoneChange(client.phone ?? "");
    setHighlighted(client);
    onSelectClient(client);
    setIsOpen(false);
  };

  const showDropdown = isOpen && debouncedSearch.length >= 2;
  const hasResults = (clients?.length ?? 0) > 0;

  return (
    <View>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderInset,
          },
        ]}
      >
        <TextInput
          value={search}
          onChangeText={handleChange}
          placeholder="Имя или телефон клиента"
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text }]}
          onFocus={() => search.trim().length >= 2 && setIsOpen(true)}
          onBlur={() => {
            setTimeout(() => setIsOpen(false), 150);
            onBlur?.();
          }}
          autoCorrect={false}
          autoCapitalize="words"
        />
        {highlighted && (
          <View
            style={[styles.badge, { backgroundColor: `${colors.accent}20` }]}
          >
            <Text
              style={{
                color: colors.accent,
                fontSize: 11,
                fontWeight: "600",
              }}
            >
              ✓
            </Text>
          </View>
        )}
      </View>

      {showDropdown && hasResults && (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderInset,
            },
          ]}
        >
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {clients?.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handleSelect(item)}
                style={({ pressed }) => [
                  styles.row,
                  pressed && { backgroundColor: `${colors.accent}10` },
                ]}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  {item.displayName}
                </Text>
                <Text
                  style={{
                    color: colors.muted,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  {item.phone || "—"}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {showDropdown && !isLoading && !hasResults && (
        <Text style={[styles.empty, { color: colors.muted }]}>
          Клиенты не найдены. Будет создан новый.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrap: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
  },
  dropdown: {
    borderWidth: 1.5,
    borderRadius: 12,
    marginTop: 6,
    maxHeight: 200,
    overflow: "hidden",
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  empty: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: "italic",
  },
});
