import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useTheme } from "../../src/shared/theme/useTheme";
import { useMeQuery, useUpdateMeMutation, useUpdateAvatarMutation } from "../../src/entities/me/api";
import { Input } from "../../src/components/ui/Input";
import { Button } from "../../src/components/ui/Button";

export default function SettingsProfileScreen() {
  const { colors, typography } = useTheme();
  const router = useRouter();

  const { data, isLoading, isError } = useMeQuery();
  const updateMeMutation = useUpdateMeMutation();
  const updateAvatarMutation = useUpdateAvatarMutation();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (data) {
      setDisplayName(data.displayName ?? "");
      setBio(data.bio ?? "");
    }
  }, [data]);

  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        await updateAvatarMutation.mutateAsync(uri);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Ошибка", "Не удалось загрузить аватар");
    }
  };

  const handleSave = async () => {
    try {
      await updateMeMutation.mutateAsync({
        displayName: displayName.trim() || null,
        bio: bio.trim() || null,
      });
      router.back();
    } catch (err) {
      console.error(err);
      Alert.alert("Ошибка", "Не удалось сохранить изменения");
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
            Редактирование профиля
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
          ) : isError ? (
            <Text style={{ color: colors.red, textAlign: 'center', marginTop: 20 }}>
              Не удалось загрузить профиль
            </Text>
          ) : (
            <>
              <View style={styles.avatarSection}>
                <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarWrapper}>
                  {data?.avatarUrl ? (
                    <Image source={{ uri: data.avatarUrl }} style={[styles.avatarImage, { borderColor: colors.border }]} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.avatarInitials, { color: colors.accent, fontFamily: typography.fonts.serif }]}>
                        {(data?.displayName ?? data?.phone ?? "•")
                          .split(" ")
                          .map((s) => s[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {updateAvatarMutation.isPending ? (
                    <View style={[styles.avatarOverlay, { backgroundColor: colors.overlay }]}>
                      <ActivityIndicator color={colors.bg} />
                    </View>
                  ) : (
                    <View style={[styles.editIconBadge, { backgroundColor: colors.accent, borderColor: colors.bg }]}>
                      <MaterialCommunityIcons name="camera-plus" size={16} color={colors.bg} />
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={[styles.avatarHint, { color: colors.muted }]}>
                  Нажмите, чтобы изменить фото
                </Text>
              </View>

              <View style={styles.formSection}>
                <Input
                  label="Имя пользователя"
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Ваше имя"
                />

                <Input
                  label="О себе"
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Коротко о себе..."
                  multiline
                />

                <Input
                  label="Телефон"
                  value={data?.phone ?? ""}
                  editable={false}
                  inputStyle={{ color: colors.muted }}
                />

                <View style={styles.roleContainer}>
                  <Text style={[styles.roleLabel, { color: colors.muted, fontFamily: typography.fonts.bold }]}>РОЛЬ В СИСТЕМЕ</Text>
                  <Text style={[styles.roleValue, { color: colors.text }]}>{data?.globalRole || "Неизвестно"}</Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>

        {!isLoading && !isError && (
          <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
            <Button
              onPress={handleSave}
              disabled={updateMeMutation.isPending || updateAvatarMutation.isPending}
            >
              {updateMeMutation.isPending ? <ActivityIndicator color={colors.bg} /> : "Сохранить"}
            </Button>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  keyboardView: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 18,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  loader: {
    marginTop: 40,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarWrapper: {
    position: "relative",
    width: 100,
    height: 100,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    fontSize: 32,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  editIconBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  avatarHint: {
    marginTop: 12,
    fontSize: 13,
  },
  formSection: {
    gap: 16,
  },
  roleContainer: {
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.03)", // Keeping rgba here is common for subtle shading, if there's an explicit theme error I'll remove it.
  },
  roleLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  roleValue: {
    fontSize: 15,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
});
