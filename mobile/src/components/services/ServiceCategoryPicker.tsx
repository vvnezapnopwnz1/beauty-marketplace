import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../shared/theme/useTheme";
import type { DashboardServiceCategoryGroup } from "../../api/types";

type Props = {
  filteredGroups: DashboardServiceCategoryGroup[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
  error?: string;
};

export function ServiceCategoryPicker({
  filteredGroups,
  selectedSlug,
  onSelect,
  error,
}: Props) {
  const { colors } = useTheme();

  const allItems = useMemo(
    () =>
      filteredGroups.flatMap((g) =>
        g.items.map((it) => ({ ...it, groupLabel: g.labelRu ?? g.label }))
      ),
    [filteredGroups]
  );

  const selectedItemLabel =
    allItems.find((it) => it.slug === selectedSlug)?.nameRu ?? "";

  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <View>
      <Text style={[styles.label, { color: colors.muted }]}>
        КАТЕГОРИЯ *
      </Text>
      <TouchableOpacity
        style={[
          styles.input,
          styles.selectRow,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.red : colors.borderInset,
          },
        ]}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text
          style={[
            styles.selectText,
            {
              color: selectedItemLabel ? colors.text : colors.muted,
            },
          ]}
        >
          {selectedItemLabel || "Выберите категорию"}
        </Text>
        <Feather
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.textSoft}
        />
      </TouchableOpacity>

      {error && (
        <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>
      )}

      {isOpen && (
        <View
          style={[
            styles.pickerDropdown,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderInset,
            },
          ]}
        >
          {filteredGroups.map((g) => (
            <View key={g.parentSlug}>
              <Text
                style={[
                  styles.pickerGroupLabel,
                  { color: colors.textSoft },
                ]}
              >
                {g.labelRu ?? g.label}
              </Text>
              {g.items.map((it) => (
                <TouchableOpacity
                  key={it.slug}
                  style={[
                    styles.pickerItem,
                    it.slug === selectedSlug && {
                      backgroundColor: `${colors.accent}20`,
                    },
                  ]}
                  onPress={() => {
                    onSelect(it.slug);
                    setIsOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      {
                        color:
                          it.slug === selectedSlug
                            ? colors.accent
                            : colors.text,
                        fontWeight:
                          it.slug === selectedSlug ? "600" : "400",
                      },
                    ]}
                  >
                    {it.nameRu}
                  </Text>
                  {it.slug === selectedSlug && (
                    <Feather name="check" size={14} color={colors.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: {
    flex: 1,
  },
  errorText: {
    fontSize: 11,
    marginTop: 4,
  },
  pickerDropdown: {
    borderWidth: 1.5,
    borderRadius: 12,
    marginTop: 4,
    overflow: "hidden",
  },
  pickerGroupLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pickerItemText: {
    fontSize: 14,
    flex: 1,
  },
});
