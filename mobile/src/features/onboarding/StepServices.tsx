import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../shared/theme/useTheme";
import { OnboardingShell } from "./OnboardingShell";
import {
  advanceMasterOnboardingStep,
  deleteMasterService,
  fetchMasterServiceCategories,
  getMasterServices,
  getMyMasterProfile,
} from "../../api/masterOnboarding";
import type {
  DashboardServiceCategoryGroup,
  MasterServiceDTO,
} from "../../api/types";
import { ServiceFormSheet } from "./ServiceFormSheet";

export function StepServicesScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<MasterServiceDTO[]>([]);
  const [allGroups, setAllGroups] = useState<DashboardServiceCategoryGroup[]>(
    [],
  );
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingService, setEditingService] = useState<MasterServiceDTO | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [svcs, cats, profile] = await Promise.all([
        getMasterServices(),
        fetchMasterServiceCategories(),
        getMyMasterProfile(),
      ]);
      setServices(svcs);
      setAllGroups(cats.groups);
      setSpecializations(profile.specializations ?? []);
    } catch {
      setLoadError(
        "Не удалось загрузить данные. Потяните вниз или попробуйте позже.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredGroups = useMemo(() => {
    if (specializations.length === 0) return allGroups;
    const filtered = allGroups.filter((g) =>
      specializations.includes(g.parentSlug),
    );
    return filtered.length > 0 ? filtered : allGroups;
  }, [allGroups, specializations]);

  const slugToName = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of allGroups) {
      for (const it of g.items) {
        m.set(it.slug, it.nameRu);
      }
    }
    return m;
  }, [allGroups]);

  const handleOpenCreate = () => {
    setEditingService(null);
    setSheetVisible(true);
  };

  const handleOpenEdit = (svc: MasterServiceDTO) => {
    setEditingService(svc);
    setSheetVisible(true);
  };

  const handleDelete = (svc: MasterServiceDTO) => {
    Alert.alert("Удалить услугу?", `«${svc.name}» будет удалена.`, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMasterService(svc.id);
            setServices((prev) => prev.filter((s) => s.id !== svc.id));
          } catch {
            Alert.alert("Ошибка", "Не удалось удалить услугу.");
          }
        },
      },
    ]);
  };

  const handleSaved = () => {
    setSheetVisible(false);
    setLoading(true);
    void load();
  };

  const handleNext = async () => {
    setBusy(true);
    try {
      await advanceMasterOnboardingStep("schedule");
    } finally {
      setBusy(false);
      router.push("/(onboarding)/schedule");
    }
  };

  const formatPrice = (svc: MasterServiceDTO) => {
    if (svc.priceCents == null) return "По запросу";
    return `${Math.round(svc.priceCents / 100).toLocaleString("ru-RU")} ₽`;
  };

  return (
    <OnboardingShell
      currentStep="services"
      title="Услуги"
      subtitle="Персональный каталог"
    >
      {loading ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : loadError ? (
        <Text style={[styles.errorText, { color: colors.red }]}>
          {loadError}
        </Text>
      ) : (
        <>
          {services.length === 0 ? (
            <View style={styles.emptyState}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: colors.accentLight },
                ]}
              >
                <Feather name="layers" size={28} color={colors.accent} />
              </View>
              <Text style={[styles.emptyText, { color: colors.textSoft }]}>
                Добавьте хотя бы одну услугу, которую вы предоставляете
              </Text>
            </View>
          ) : (
            <View style={styles.serviceList}>
              {services.map((svc) => (
                <TouchableOpacity
                  key={svc.id}
                  style={[
                    styles.serviceCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => handleOpenEdit(svc)}
                  activeOpacity={0.75}
                >
                  <View style={styles.serviceCardMain}>
                    <Text
                      style={[styles.serviceName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {svc.name}
                    </Text>
                    <Text
                      style={[styles.serviceMeta, { color: colors.textSoft }]}
                      numberOfLines={1}
                    >
                      {slugToName.get(svc.categorySlug ?? "") ??
                        svc.categorySlug ??
                        "—"}{" "}
                      · {svc.durationMinutes} мин · {formatPrice(svc)}
                    </Text>
                  </View>
                  <View style={styles.serviceActions}>
                    <TouchableOpacity
                      hitSlop={8}
                      onPress={() => handleOpenEdit(svc)}
                    >
                      <Feather
                        name="edit-2"
                        size={16}
                        color={colors.textSoft}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      hitSlop={8}
                      onPress={() => handleDelete(svc)}
                    >
                      <Feather name="trash-2" size={16} color={colors.red} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.addButton,
              {
                borderColor: colors.accent,
                backgroundColor: colors.accentLight,
              },
            ]}
            onPress={handleOpenCreate}
          >
            <Feather name="plus" size={16} color={colors.accent} />
            <Text style={[styles.addButtonText, { color: colors.accent }]}>
              Добавить услугу
            </Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor:
              services.length > 0 ? colors.accent : colors.borderLight,
          },
        ]}
        onPress={handleNext}
        disabled={busy || services.length === 0}
      >
        {busy ? (
          <ActivityIndicator color={colors.textInverse} />
        ) : (
          <Text
            style={[
              styles.buttonText,
              {
                color: services.length > 0 ? colors.textInverse : colors.muted,
              },
            ]}
          >
            Продолжить
          </Text>
        )}
      </TouchableOpacity>

      <ServiceFormSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        service={editingService}
        filteredGroups={filteredGroups}
        onSaved={handleSaved}
      />
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginVertical: 32,
  },
  errorText: {
    fontSize: 13,
    textAlign: "center",
    marginVertical: 16,
  },
  emptyState: {
    alignItems: "center",
    gap: 16,
    paddingVertical: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  serviceList: {
    gap: 10,
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  serviceCardMain: {
    flex: 1,
    gap: 3,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: "600",
  },
  serviceMeta: {
    fontSize: 12,
  },
  serviceActions: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
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
