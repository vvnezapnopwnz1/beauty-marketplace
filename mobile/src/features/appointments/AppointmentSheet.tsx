import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useTheme } from "../../shared/theme/useTheme";
import { categoryColor } from "../../shared/theme/categoryColor";
import type { MasterAppointment } from "../../entities/appointments/api";
import { AppointmentDetailsTab } from "./AppointmentDetailsTab";
import { AppointmentEditTab } from "./AppointmentEditTab";

const STATUS_DOT: Record<string, string> = {
  confirmed: "#2A9E6A", pending: "#C4800A", completed: "#4A90D4",
  cancelled: "#C04040", cancelled_client: "#C04040", cancelled_staff: "#C04040", no_show: "#888",
};
const STATUS_LABEL: Record<string, string> = {
  confirmed: "Подтверждена", pending: "Ожидает", completed: "Завершена",
  cancelled: "Отмена", cancelled_client: "Отмена", cancelled_staff: "Отмена", no_show: "Не пришёл",
};

function fmt(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type Props = {
  appointment: MasterAppointment | null;
  onClose: () => void;
};

export function AppointmentSheet({ appointment, onClose }: Props) {
  const { colors, typography } = useTheme();
  const sheetRef = useRef<BottomSheet>(null);
  const [tab, setTab] = useState<"details" | "edit">("details");
  const snapPoints = useMemo(() => ["88%"], []);

  useEffect(() => {
    if (appointment) {
      setTab("details");
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
    }
  }, [appointment]);

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.55} />,
    [],
  );

  if (!appointment) {
    return (
      <BottomSheet ref={sheetRef} index={-1} snapPoints={snapPoints} enablePanDownToClose backdropComponent={renderBackdrop} onClose={onClose}>
        <View />
      </BottomSheet>
    );
  }

  const start = new Date(appointment.startsAt);
  const c = categoryColor(colors, (appointment as any).cat ?? null);
  const dot = STATUS_DOT[appointment.status] ?? STATUS_DOT.confirmed;
  const label = STATUS_LABEL[appointment.status] ?? appointment.status;

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onClose={onClose}
      backgroundStyle={{ backgroundColor: colors.card }}
      handleIndicatorStyle={{ backgroundColor: colors.borderLight }}
    >
      <View style={styles.headerWrap}>
        <View style={styles.headerRow}>
          <View style={[styles.badge, { backgroundColor: `${c}18`, borderColor: `${c}55` }]}>
            <View style={[styles.badgeDot, { backgroundColor: c }]} />
          </View>
          <View style={styles.headerInfo}>
            <Text numberOfLines={1} style={[styles.title, { color: colors.text, fontFamily: typography.fonts.serif }]}>
              {appointment.serviceName}
            </Text>
            <View style={styles.headerSub}>
              <View style={[styles.statusPill, { backgroundColor: `${dot}1F`, borderColor: `${dot}40` }]}>
                <View style={[styles.statusDot, { backgroundColor: dot }]} />
                <Text style={[styles.statusText, { color: dot }]}>{label}</Text>
              </View>
              <Text style={[styles.headerDate, { color: colors.muted }]}>
                {start.getDate()} апр · {fmt(start)}
              </Text>
            </View>
          </View>
          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <MaterialCommunityIcons name="close" size={14} color={colors.muted} />
          </Pressable>
        </View>

        <View style={[styles.tabs, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          {(["details", "edit"] as const).map((key) => {
            const active = tab === key;
            return (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                style={[
                  styles.tabBtn,
                  active && { backgroundColor: colors.card, borderColor: colors.borderLight },
                ]}
              >
                <Text style={{
                  fontSize: 12,
                  fontWeight: active ? "600" : "400",
                  color: active ? colors.accent : colors.muted,
                }}>
                  {key === "details" ? "Детали" : "Редактировать"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <BottomSheetScrollView contentContainerStyle={styles.body}>
        {tab === "details"
          ? <AppointmentDetailsTab appointment={appointment} onEdit={() => setTab("edit")} />
          : <AppointmentEditTab appointment={appointment} onCancel={() => setTab("details")} onSaved={onClose} />}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: 20, paddingTop: 6 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  badge: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  badgeDot: { width: 14, height: 14, borderRadius: 7 },
  headerInfo: { flex: 1 },
  title: { fontSize: 20, fontWeight: "500", lineHeight: 22, marginBottom: 3 },
  headerSub: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 100, borderWidth: 1 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusText: { fontSize: 10, fontWeight: "600" },
  headerDate: { fontSize: 11 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  tabs: { flexDirection: "row", borderRadius: 12, padding: 3, borderWidth: 1 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 9, borderWidth: 1, borderColor: "transparent" },
  body: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24 },
});
