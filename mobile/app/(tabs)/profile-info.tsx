import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/shared/theme/useTheme";
import { useMeQuery, useUpdateMeMutation, useUpdateAvatarMutation } from "../../src/entities/me/api";
import { useQuery } from "@tanstack/react-query";
import { fetchMasterServiceCategories } from "../../src/api/masterOnboarding";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { API_V1 } from "../../src/api/endpoints";

function resolveAvatarUrl(urlStr: string | null | undefined): string | null {
  if (!urlStr) return null;
  
  console.log(`[Avatar Debug] Input URL: ${urlStr}`);

  // Если URL содержит localhost или 127.0.0.1, мы должны заменить его на актуальный IP хоста,
  // так как мобильное приложение запущено на симуляторе или реальном устройстве,
  // которые не знают про localhost сервера.
  if (urlStr.includes("localhost") || urlStr.includes("127.0.0.1")) {
    try {
      // Парсим хост из API_V1 (например: "http://192.168.1.50:8080/api/v1")
      const apiMatch = /https?:\/\/([^:/]+)/.exec(API_V1);
      if (apiMatch && apiMatch[1]) {
        const apiHostname = apiMatch[1];
        // Подставляем реальный IP вместо localhost
        const resolved = urlStr
          .replace("localhost", apiHostname)
          .replace("127.0.0.1", apiHostname);
        console.log(`[Avatar Debug] Resolved URL: ${resolved}`);
        return resolved;
      }
    } catch (e) {
      console.error("[Avatar Debug] Failed to resolve avatar URL:", e);
    }
  }
  return urlStr;
}

export default function SettingsProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  // Queries & Mutations
  const { data: me, isLoading: isMeLoading, isError: isMeError } = useMeQuery();
  const updateMeMutation = useUpdateMeMutation();
  const updateAvatarMutation = useUpdateAvatarMutation();

  const handlePickImage = async () => {
    console.log("[Avatar Selector] Requesting permissions...");
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log("[Avatar Selector] Permission status:", status);
      if (status !== "granted") {
        Alert.alert(
          "Разрешение отклонено",
          "Нам нужен доступ к галерее для выбора фото профиля."
        );
        return;
      }

      console.log("[Avatar Selector] Launching image library...");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      console.log("[Avatar Selector] Picker result:", JSON.stringify(result));

      if (!result.canceled && result.assets?.[0]?.uri) {
        const selectedUri = result.assets[0].uri;
        console.log("[Avatar Selector] Selected URI:", selectedUri);
        
        updateAvatarMutation.mutate(selectedUri, {
          onSuccess: (data) => {
            console.log("[Avatar Selector] Upload mutation succeeded:", data);
            Alert.alert("Успех", "Фото профиля успешно обновлено");
          },
          onError: (err: any) => {
            console.error("[Avatar Selector] Upload mutation failed:", err);
            const msg =
              err?.response?.data?.message ||
              err?.message ||
              "Не удалось загрузить фото";
            Alert.alert("Ошибка загрузки", msg);
          },
        });
      } else {
        console.log("[Avatar Selector] Selection was cancelled by user.");
      }
    } catch (err: any) {
      console.error("[Avatar Selector] Unexpected error:", err);
      Alert.alert("Ошибка", err.message || "Не удалось выбрать фото");
    }
  };

  const isMaster = !!me?.masterProfileId || !!me?.master;

  const { data: categoriesData } = useQuery({
    queryKey: ["serviceCategories"],
    queryFn: fetchMasterServiceCategories,
  });

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Sync state with loaded me record
  useEffect(() => {
    if (me) {
      setDisplayName(me.displayName ?? "");
      setBio(me.bio ?? "");
      setSelectedSpecializations(me.master?.specializations ?? []);
    }
  }, [me, isEditing]);

  const toggleSpecialization = (slug: string) => {
    setSelectedSpecializations((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const getSpecializationLabel = (slug: string) => {
    const group = categoriesData?.groups?.find((g) => g.parentSlug === slug);
    if (group) {
      return group.specialistTitleRu ?? group.labelRu ?? group.label;
    }
    return slug;
  };

  const handleSave = () => {
    setErrorText(null);
    if (!displayName.trim()) {
      setErrorText("Имя не может быть пустым");
      return;
    }

    updateMeMutation.mutate(
      {
        displayName: displayName.trim(),
        bio: bio.trim() || null,
        master: isMaster
          ? {
              specializations: selectedSpecializations,
            }
          : null,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
        onError: (err: any) => {
          setErrorText(err?.response?.data?.message || err?.message || "Не удалось сохранить");
        },
      }
    );
  };

  if (isMeLoading) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={[styles.safe, { backgroundColor: colors.bg }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>
            Загрузка профиля...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isMeError || !me) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={[styles.safe, { backgroundColor: colors.bg }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="chevron-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Личная информация
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Feather name="alert-triangle" size={48} color={colors.red} />
          <Text style={[styles.errorTitle, { color: colors.red }]}>
            Не удалось получить профиль
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent }]}
            onPress={() => router.back()}
          >
            <Text style={{ color: colors.textInverse, fontWeight: "600" }}>Вернуться назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={[styles.safe, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="chevron-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Личная информация
        </Text>
        {isEditing ? (
          <TouchableOpacity onPress={handleSave} disabled={updateMeMutation.isPending}>
            {updateMeMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={[styles.headerAction, { color: colors.accent }]}>Готово</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Text style={[styles.headerAction, { color: colors.accent }]}>Изм.</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Role & ID Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <View style={styles.row}>
            <TouchableOpacity 
              onPress={handlePickImage} 
              disabled={updateAvatarMutation.isPending}
              style={[styles.avatarPlaceholder, { backgroundColor: colors.surface }]}
            >
              {updateAvatarMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.accent} />
                ) : me.avatarUrl ? (
                <Image source={{ uri: resolveAvatarUrl(me.avatarUrl)! }} style={styles.avatarImage} />
              ) : (
                <Feather name="user" size={32} color={colors.accent} />
              )}
              <View style={[styles.editAvatarIconBadge, { backgroundColor: colors.accent }]}>
                <Feather name="camera" size={10} color={colors.textInverse} />
              </View>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: colors.text }]}>
                {me.displayName || "Без имени"}
              </Text>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: colors.accentLight }]}>
                  <Text style={[styles.badgeText, { color: colors.accent }]}>
                    {me.globalRole === "master" ? "Мастер" : "Клиент"}
                  </Text>
                </View>
                <Text style={[styles.userId, { color: colors.muted }]}>ID: {me.id.substring(0, 8)}...</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Errors Block */}
        {errorText && (
          <View style={[styles.errorBanner, { backgroundColor: colors.redLight, borderColor: colors.red }]}>
            <Feather name="x-circle" size={18} color={colors.red} style={{ marginRight: 8 }} />
            <Text style={[styles.errorBannerText, { color: colors.red }]}>{errorText}</Text>
          </View>
        )}

        {/* Inputs */}
        <View style={styles.formContainer}>
          {/* Display Name */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSoft }]}>Имя или псевдоним</Text>
            {isEditing ? (
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: colors.border,
                    color: colors.text,
                    backgroundColor: colors.surface,
                  },
                ]}
                placeholder="Как вас называть"
                placeholderTextColor={colors.muted}
                value={displayName}
                onChangeText={setDisplayName}
                autoCorrect={false}
              />
            ) : (
              <View style={[styles.readOnlyBox, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                <Text style={[styles.readOnlyText, { color: colors.text }]}>
                  {me.displayName ?? "—"}
                </Text>
              </View>
            )}
          </View>

          {/* Bio / Description */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSoft }]}>Описание / О себе</Text>
            {isEditing ? (
              <TextInput
                style={[
                  styles.input,
                  styles.textarea,
                  {
                    borderColor: colors.border,
                    color: colors.text,
                    backgroundColor: colors.surface,
                  },
                ]}
                placeholder="Расскажите клиентам о себе, своих навыках и опыте..."
                placeholderTextColor={colors.muted}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            ) : (
              <View style={[styles.readOnlyBox, styles.readOnlyBio, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                <Text style={[styles.readOnlyText, { color: me.bio ? colors.text : colors.muted }]}>
                  {me.bio ?? "О себе ничего не добавлено"}
                </Text>
              </View>
            )}
          </View>

          {/* Phone Number (Always Read-Only) */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSoft }]}>Номер телефона</Text>
            <View style={[styles.readOnlyBox, styles.disabledBox, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <Feather name="lock" size={14} color={colors.muted} style={{ marginRight: 8 }} />
              <Text style={[styles.readOnlyText, { color: colors.muted }]}>
                {me.phone}
              </Text>
            </View>
            <Text style={[styles.inputHint, { color: colors.muted }]}>
              Телефон используется для входа и привязан навсегда. Изменение невозможно.
            </Text>
          </View>

          {/* Specializations (Only for Masters) */}
          {isMaster && (
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSoft }]}>Ваши специализации</Text>
              
              {isEditing ? (
                <View style={styles.specializationsContainer}>
                  {categoriesData?.groups?.map((g) => {
                    const active = selectedSpecializations.includes(g.parentSlug);
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
                        onPress={() => toggleSpecialization(g.parentSlug)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            {
                              color: active ? colors.textInverse : colors.text,
                            },
                          ]}
                        >
                          {getSpecializationLabel(g.parentSlug)}
                        </Text>
                        {active && (
                          <Feather name="check" size={12} color={colors.textInverse} style={{ marginLeft: 4 }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  {!categoriesData && (
                    <ActivityIndicator size="small" color={colors.accent} />
                  )}
                </View>
              ) : (
                <View style={styles.specializationsDisplay}>
                  {me.master?.specializations && me.master.specializations.length > 0 ? (
                    me.master.specializations.map((slug) => (
                      <View
                        key={slug}
                        style={[
                          styles.staticChip,
                          { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight },
                        ]}
                      >
                        <Text style={[styles.staticChipText, { color: colors.textSoft }]}>
                          {getSpecializationLabel(slug)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.noSpecializationsText, { color: colors.muted }]}>
                      Специализации не выбраны. Нажмите «Изм.», чтобы указать направления работы.
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Action Buttons in Edit Mode */}
        {isEditing && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton, { borderColor: colors.border }]}
              onPress={() => setIsEditing(false)}
              disabled={updateMeMutation.isPending}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Отмена</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton, { backgroundColor: colors.accent, shadowColor: colors.text }]}
              onPress={handleSave}
              disabled={updateMeMutation.isPending}
            >
              {updateMeMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>Сохранить</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  headerAction: {
    fontSize: 16,
    fontWeight: "600",
    paddingVertical: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  editAvatarIconBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  userId: {
    fontSize: 12,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorBannerText: {
    fontSize: 14,
    flex: 1,
  },
  formContainer: {
    gap: 16,
  },
  formGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
  },
  textarea: {
    minHeight: 100,
    paddingTop: 14,
  },
  readOnlyBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 48,
    justifyContent: "center",
  },
  readOnlyBio: {
    minHeight: 80,
    justifyContent: "flex-start",
  },
  readOnlyText: {
    fontSize: 15,
    lineHeight: 20,
  },
  disabledBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  inputHint: {
    fontSize: 12,
    lineHeight: 16,
    fontStyle: "italic",
    paddingHorizontal: 4,
  },
  specializationsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  specializationsDisplay: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  staticChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  staticChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  noSpecializationsText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  saveButton: {
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
