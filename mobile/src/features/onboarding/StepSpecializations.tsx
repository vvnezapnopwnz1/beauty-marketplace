import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../shared/theme/useTheme";
import { OnboardingShell } from "./OnboardingShell";
import {
  fetchMasterServiceCategories,
  getMyMasterProfile,
  updateMyMasterProfile,
  advanceMasterOnboardingStep,
} from "../../api/masterOnboarding";
import type { DashboardServiceCategoryGroup } from "../../api/types";

export function StepSpecializationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [options, setOptions] = useState<DashboardServiceCategoryGroup[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const cats = await fetchMasterServiceCategories();
        setOptions(cats.groups);
      } catch {
        // silently fail — user can still proceed
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = (slug: string) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const handleNext = async () => {
    setError(null);
    if (selected.length === 0) {
      setError("Выберите хотя бы одну специализацию");
      return;
    }
    setSaving(true);
    try {
      const current = await getMyMasterProfile();
      await updateMyMasterProfile({
        displayName: current.displayName,
        bio: current.bio ?? null,
        specializations: selected,
      });
      await advanceMasterOnboardingStep("services");
      router.push("/(onboarding)/services");
    } catch {
      setError("Не удалось сохранить. Попробуйте ещё раз.");
    } finally {
      setSaving(false);
    }
  };

  const renderLabel = (group: DashboardServiceCategoryGroup) =>
    group.specialistTitleRu ?? group.labelRu ?? group.label;

  return (
    <OnboardingShell
      currentStep="specializations"
      title="Специализации"
      subtitle="В чём вы мастер?"
    >
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.chipList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {options.map((g) => {
              const active = selected.includes(g.parentSlug);
              return (
                <TouchableOpacity
                  key={g.parentSlug}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.accent : colors.surface,
                      borderColor: active ? colors.accent : colors.border,
                    },
                  ]}
                  onPress={() => toggle(g.parentSlug)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: active ? colors.textInverse : colors.text,
                      },
                    ]}
                  >
                    {renderLabel(g)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {error && (
            <Text style={[styles.error, { color: colors.red }]}>{error}</Text>
          )}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={handleNext}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.textInverse }]}>
                Продолжить
              </Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  chipList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  error: {
    fontSize: 13,
    textAlign: "center",
    marginTop: -8,
  },
  button: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
