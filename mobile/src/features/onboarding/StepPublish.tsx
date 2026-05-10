import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../shared/theme/useTheme";
import { OnboardingShell } from "./OnboardingShell";
import {
  getMyMasterProfile,
  publishMasterProfile,
  fetchMasterServiceCategories,
} from "../../api/masterOnboarding";
import { useAuthStore } from "../../stores/authStore";
import type { MasterCabinetProfile, DashboardServiceCategoryGroup } from "../../api/types";

function specializationLabel(
  slug: string,
  groups?: DashboardServiceCategoryGroup[]
): string {
  const g = groups?.find((x) => x.parentSlug === slug);
  return (
    g?.specialistTitleRu ?? g?.labelRu ?? g?.label ?? slug
  );
}

export function StepPublishScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [profile, setProfile] = useState<MasterCabinetProfile | null>(null);
  const [groups, setGroups] = useState<DashboardServiceCategoryGroup[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const [p, cats] = await Promise.all([
          getMyMasterProfile(),
          fetchMasterServiceCategories().catch(() => null),
        ]);
        setProfile(p);
        if (cats) setGroups(cats.groups);
      } catch {
        setError("Не удалось загрузить профиль");
      }
    })();
  }, []);

  const handlePublish = async () => {
    setError(null);
    setMissingFields([]);
    setPublishing(true);
    try {
      await publishMasterProfile();
      // Refresh user so landing/tabs know onboarding is completed
      const { authApi } = await import("../../api/auth");
      const me = await authApi.fetchMe();
      setUser({
        id: me.id,
        phone: me.phone,
        displayName: me.displayName ?? null,
        globalRole: me.globalRole,
        effectiveRoles: me.effectiveRoles,
        masterProfileId: me.masterProfileId ?? null,
      });
      router.replace("/(tabs)");
    } catch (err: unknown) {
      const e = err as { body?: { error?: string; fields?: string[] } };
      if (e?.body?.error === "missing_required") {
        setMissingFields(e.body.fields ?? []);
      } else {
        setError("Не удалось опубликовать профиль");
      }
    } finally {
      setPublishing(false);
    }
  };

  if (!profile) {
    return (
      <OnboardingShell currentStep="publish" title="Публикация" subtitle="">
        <ActivityIndicator color={colors.accent} />
      </OnboardingShell>
    );
  }

  const specs = profile.specializations.map((s) =>
    specializationLabel(s, groups)
  );

  return (
    <OnboardingShell
      currentStep="publish"
      title="Публикация"
      subtitle="Проверьте данные и запустите профиль"
    >
      <View style={styles.card}>
        <View style={styles.row}>
          <Feather name="user" size={16} color={colors.muted} />
          <Text style={[styles.label, { color: colors.textSoft }]}>
            Имя
          </Text>
        </View>
        <Text style={[styles.value, { color: colors.text }]}>
          {profile.displayName || "—"}
        </Text>
        {missingFields.includes("displayName") && (
          <Text style={[styles.hint, { color: colors.red }]}>
            Укажите имя на шаге «Профиль»
          </Text>
        )}

        <View style={[styles.row, { marginTop: 16 }]}>
          <Feather name="scissors" size={16} color={colors.muted} />
          <Text style={[styles.label, { color: colors.textSoft }]}>
            Специализации
          </Text>
        </View>
        <Text style={[styles.value, { color: colors.text }]}>
          {specs.length > 0 ? specs.join(", ") : "—"}
        </Text>
        {missingFields.includes("specializations") && (
          <Text style={[styles.hint, { color: colors.red }]}>
            Выберите специализации
          </Text>
        )}
      </View>

      {error && (
        <Text style={[styles.error, { color: colors.red }]}>{error}</Text>
      )}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.accent }]}
        onPress={handlePublish}
        disabled={publishing}
      >
        {publishing ? (
          <ActivityIndicator color={colors.textInverse} />
        ) : (
          <Text style={[styles.buttonText, { color: colors.textInverse }]}>
            Опубликовать профиль
          </Text>
        )}
      </TouchableOpacity>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    gap: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: 2,
  },
  hint: {
    fontSize: 12,
    marginTop: 2,
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
