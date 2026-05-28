import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import { useTheme } from "../../shared/theme/useTheme";
import { useCreateAction } from "./CreateActionContext";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

type ActionItem = {
  key: string;
  label: string;
  sublabel?: string;
  icon: FeatherName;
  route: string;
};

const ACTIONS: ActionItem[] = [
  {
    key: "appointment",
    label: "Новая запись",
    sublabel: "Запланировать клиента",
    icon: "calendar",
    route: "/appointment-new",
  },
  {
    key: "client",
    label: "Новый клиент",
    icon: "user-plus",
    route: "/clients-new",
  },
  {
    key: "service",
    label: "Новая услуга",
    icon: "scissors",
    route: "/services-new",
  },
];

function getPrimaryKey(pathname: string): string {
  if (pathname.includes("clients")) return "client";
  if (pathname.includes("services")) return "service";
  return "appointment";
}

export function CreateActionSheet() {
  const { isOpen, close } = useCreateAction();
  const { colors, typography } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const primaryKey = getPrimaryKey(pathname);

  const go = (target: string) => {
    close();
    setTimeout(
      () =>
        router.push({
          pathname: target as any,
          params: { returnPath: pathname },
        }),
      0,
    );
  };

  const primaryAction = ACTIONS.find((a) => a.key === primaryKey) ?? ACTIONS[0];
  const secondaryActions = ACTIONS.filter((a) => a.key !== primaryKey);

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={close}
    >
      <Pressable style={styles.scrim} onPress={close}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.bg }]}
          onPress={(e) => e.stopPropagation()}
        >
          <SafeAreaView edges={["bottom"]}>
            <View
              style={[styles.handle, { backgroundColor: colors.borderLight }]}
            />
            <Text
              style={[
                styles.title,
                { color: colors.text, fontFamily: typography.fonts.serif },
              ]}
            >
              Что создать?
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={primaryAction.label}
              onPress={() => go(primaryAction.route)}
              style={({ pressed }) => [
                styles.primaryCard,
                {
                  backgroundColor: colors.accent,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View style={styles.primaryIcon}>
                <Feather
                  name={primaryAction.icon}
                  size={22}
                  color={colors.accentText}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.primaryTitle, { color: colors.accentText }]}
                >
                  {primaryAction.label}
                </Text>
                {primaryAction.sublabel ? (
                  <Text
                    style={[
                      styles.primarySub,
                      { color: colors.accentText, opacity: 0.85 },
                    ]}
                  >
                    {primaryAction.sublabel}
                  </Text>
                ) : null}
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={colors.accentText}
              />
            </Pressable>

            {secondaryActions.map((action) => (
              <Pressable
                key={action.key}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                onPress={() => go(action.route)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderLight,
                    opacity: pressed ? 0.85 : 1,
                    marginBottom: 4,
                  },
                ]}
              >
                <Feather name={action.icon} size={18} color={colors.text} />
                <Text style={[styles.rowLabel, { color: colors.text }]}>
                  {action.label}
                </Text>
                <Feather name="chevron-right" size={16} color={colors.muted} />
              </Pressable>
            ))}

            <Pressable
              onPress={close}
              style={[styles.cancel, { borderColor: colors.borderLight }]}
              accessibilityRole="button"
              accessibilityLabel="Отмена"
            >
              <Text style={{ color: colors.textSoft, fontWeight: "500" }}>
                Отмена
              </Text>
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.select({ ios: 0, default: 12 }),
    gap: 10,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 100,
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "500",
    letterSpacing: -0.3,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  primaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginBottom: 4,
  },
  primaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryTitle: { fontSize: 17, fontWeight: "600", letterSpacing: -0.2 },
  primarySub: { fontSize: 12, marginTop: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: "500" },
  cancel: {
    marginTop: 4,
    paddingVertical: 13,
    borderRadius: 100,
    alignItems: "center",
    borderWidth: 1,
  },
});
