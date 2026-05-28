import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Animated,
  ScrollView,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../shared/theme/useTheme";
import type { MasterClient } from "../../entities/clients/api";
import { deriveClientSegment } from "../../entities/clients/api";
import { ClientDetailsTab } from "./ClientDetailsTab";
import { ClientEditTab } from "./ClientEditTab";

const SHEET_H = Dimensions.get("window").height * 0.88;

function segmentPill(
  segment: string,
  colors: ReturnType<typeof useTheme>["colors"],
): { label: string; color: string; bg: string } {
  switch (segment) {
    case "vip":
      return { label: "VIP", color: colors.yellow, bg: colors.yellowLight };
    case "regular":
      return {
        label: "Постоянный",
        color: colors.green,
        bg: colors.greenLight,
      };
    default:
      return { label: "Новый", color: colors.blue, bg: colors.blueLight };
  }
}

type Props = {
  client: MasterClient | null;
  onClose: () => void;
};

export function ClientSheet({ client, onClose }: Props) {
  const { colors, typography } = useTheme();
  const [tab, setTab] = useState<"details" | "edit">("details");
  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(SHEET_H)).current;

  useEffect(() => {
    if (client) {
      setTab("details");
      setVisible(true);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SHEET_H,
        duration: 220,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  }, [client]);

  if (!visible && !client) return null;

  const initials = client
    ? (client.displayName ?? "•")
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "•";

  const segment = client ? deriveClientSegment(client) : "new";
  const pill = segmentPill(segment, colors);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: colors.card, transform: [{ translateY }] },
        ]}
      >
        <View
          style={[styles.handle, { backgroundColor: colors.borderLight }]}
        />

        <View style={styles.headerWrap}>
          <View style={styles.headerRow}>
            <View
              style={[styles.avatar, { backgroundColor: colors.accentLight }]}
            >
              <Text style={[styles.avatarText, { color: colors.accent }]}>
                {initials}
              </Text>
            </View>

            <View style={styles.headerInfo}>
              <Text
                numberOfLines={1}
                style={[
                  styles.title,
                  { color: colors.text, fontFamily: typography.fonts.serif },
                ]}
              >
                {client?.displayName ?? ""}
              </Text>
              <View style={styles.headerSub}>
                <View
                  style={[
                    styles.segmentPill,
                    {
                      backgroundColor: pill.bg,
                      borderColor: `${pill.color}40`,
                    },
                  ]}
                >
                  <Text style={[styles.segmentText, { color: pill.color }]}>
                    {pill.label}
                  </Text>
                </View>
                <Text style={[styles.visitsText, { color: colors.muted }]}>
                  {client?.visitCount ?? 0} визитов
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              style={[
                styles.closeBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="close"
                size={14}
                color={colors.muted}
              />
            </Pressable>
          </View>

          <View
            style={[
              styles.tabs,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            {(["details", "edit"] as const).map((key) => {
              const active = tab === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setTab(key)}
                  style={[
                    styles.tabBtn,
                    active && {
                      backgroundColor: colors.card,
                      borderColor: colors.borderLight,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: active ? "600" : "400",
                      color: active ? colors.accent : colors.muted,
                    }}
                  >
                    {key === "details" ? "Детали" : "Редактировать"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          removeClippedSubviews={false}
        >
          {client && tab === "details" ? (
            <ClientDetailsTab client={client} onEdit={() => setTab("edit")} />
          ) : client ? (
            <ClientEditTab
              client={client}
              onCancel={() => setTab("details")}
              onSaved={onClose}
            />
          ) : null}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_H,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  headerWrap: { paddingHorizontal: 20, paddingTop: 6 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "700" },
  headerInfo: { flex: 1 },
  title: { fontSize: 20, fontWeight: "500", lineHeight: 22, marginBottom: 3 },
  headerSub: { flexDirection: "row", alignItems: "center", gap: 6 },
  segmentPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 100,
    borderWidth: 1,
  },
  segmentText: { fontSize: 10, fontWeight: "600" },
  visitsText: { fontSize: 11 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  tabs: { flexDirection: "row", borderRadius: 12, padding: 3, borderWidth: 1 },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "transparent",
  },
  body: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 40 },
});
