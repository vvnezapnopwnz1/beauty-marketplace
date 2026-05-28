import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Modal,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../shared/theme/useTheme";
import {
  createMasterService,
  updateMasterService,
} from "../../api/masterOnboarding";
import type {
  MasterServiceDTO,
  DashboardServiceCategoryGroup,
} from "../../api/types";

const SHEET_H = Dimensions.get("window").height * 0.92;

type Props = {
  visible: boolean;
  onClose: () => void;
  service: MasterServiceDTO | null;
  filteredGroups: DashboardServiceCategoryGroup[];
  onSaved: () => void;
};

export function ServiceFormSheet({
  visible,
  onClose,
  service,
  filteredGroups,
  onSaved,
}: Props) {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(SHEET_H)).current;
  const [sheetVisible, setSheetVisible] = useState(false);

  const [name, setName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [priceText, setPriceText] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);

  const allItems = filteredGroups.flatMap((g) =>
    g.items.map((it) => ({ ...it, groupLabel: g.labelRu ?? g.label }))
  );

  const selectedItemLabel =
    allItems.find((it) => it.slug === categorySlug)?.nameRu ?? "";

  useEffect(() => {
    if (visible) {
      setName(service?.name ?? "");
      setCategorySlug(service?.categorySlug ?? allItems[0]?.slug ?? "");
      setPriceText(
        service?.priceCents != null
          ? String(Math.round(service.priceCents / 100))
          : ""
      );
      setDurationMinutes(service?.durationMinutes ?? 60);
      setDescription(service?.description ?? "");
      setError(null);
      setCategoryPickerOpen(false);
      setSheetVisible(true);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SHEET_H,
        duration: 220,
        useNativeDriver: true,
      }).start(() => setSheetVisible(false));
    }
  }, [visible]);

  const handleClose = () => {
    onClose();
  };

  const decDuration = () =>
    setDurationMinutes((v) => Math.max(5, v - 5));
  const incDuration = () =>
    setDurationMinutes((v) => Math.min(480, v + 5));

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Введите название услуги");
      return;
    }
    if (!categorySlug) {
      setError("Выберите категорию");
      return;
    }
    setSaving(true);
    try {
      const priceCents =
        priceText.trim() === ""
          ? null
          : Math.round(parseFloat(priceText.replace(",", ".")) * 100);

      const body = {
        name: name.trim(),
        categorySlug: categorySlug || null,
        description: description.trim() || null,
        priceCents: isNaN(priceCents as number) ? null : priceCents,
        durationMinutes,
      };

      if (service) {
        await updateMasterService(service.id, body);
      } else {
        await createMasterService(body);
      }
      onSaved();
    } catch {
      setError("Не удалось сохранить. Попробуйте ещё раз.");
    } finally {
      setSaving(false);
    }
  };

  if (!sheetVisible) return null;

  return (
    <Modal
      visible={sheetVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.kavWrapper}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, transform: [{ translateY }] },
          ]}
        >
          <View
            style={[styles.handle, { backgroundColor: colors.borderLight }]}
          />

          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              {service ? "Редактировать услугу" : "Новая услуга"}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <Feather name="x" size={22} color={colors.textSoft} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.form}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {error && (
              <Text style={[styles.errorText, { color: colors.red }]}>
                {error}
              </Text>
            )}

            <Text style={[styles.label, { color: colors.textSoft }]}>
              Название *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: colors.bg,
                },
              ]}
              placeholder="Например, Стрижка женская"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
            />

            <Text style={[styles.label, { color: colors.textSoft }]}>
              Категория *
            </Text>
            <TouchableOpacity
              style={[
                styles.input,
                styles.selectRow,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.bg,
                },
              ]}
              onPress={() => setCategoryPickerOpen((v) => !v)}
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
                name={categoryPickerOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.textSoft}
              />
            </TouchableOpacity>

            {categoryPickerOpen && (
              <View
                style={[
                  styles.pickerDropdown,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
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
                          it.slug === categorySlug && {
                            backgroundColor: colors.accentLight,
                          },
                        ]}
                        onPress={() => {
                          setCategorySlug(it.slug);
                          setCategoryPickerOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerItemText,
                            {
                              color:
                                it.slug === categorySlug
                                  ? colors.accent
                                  : colors.text,
                              fontWeight:
                                it.slug === categorySlug ? "600" : "400",
                            },
                          ]}
                        >
                          {it.nameRu}
                        </Text>
                        {it.slug === categorySlug && (
                          <Feather
                            name="check"
                            size={14}
                            color={colors.accent}
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            )}

            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={[styles.label, { color: colors.textSoft }]}>
                  Цена (₽)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: colors.border,
                      color: colors.text,
                      backgroundColor: colors.bg,
                    },
                  ]}
                  placeholder="По запросу"
                  placeholderTextColor={colors.muted}
                  value={priceText}
                  onChangeText={setPriceText}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.flex1}>
                <Text style={[styles.label, { color: colors.textSoft }]}>
                  Длительность
                </Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={[
                      styles.stepperBtn,
                      { borderColor: colors.border, backgroundColor: colors.bg },
                    ]}
                    onPress={decDuration}
                    disabled={durationMinutes <= 5}
                  >
                    <Text
                      style={[
                        styles.stepperBtnText,
                        {
                          color:
                            durationMinutes <= 5
                              ? colors.muted
                              : colors.text,
                        },
                      ]}
                    >
                      −
                    </Text>
                  </TouchableOpacity>
                  <Text
                    style={[styles.stepperValue, { color: colors.text }]}
                  >
                    {durationMinutes} мин
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.stepperBtn,
                      { borderColor: colors.border, backgroundColor: colors.bg },
                    ]}
                    onPress={incDuration}
                    disabled={durationMinutes >= 480}
                  >
                    <Text
                      style={[
                        styles.stepperBtnText,
                        {
                          color:
                            durationMinutes >= 480
                              ? colors.muted
                              : colors.text,
                        },
                      ]}
                    >
                      +
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <Text style={[styles.label, { color: colors.textSoft }]}>
              Описание
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textarea,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: colors.bg,
                },
              ]}
              placeholder="Что входит в услугу…"
              placeholderTextColor={colors.muted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: colors.accent },
                saving && { opacity: 0.7 },
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text
                  style={[styles.saveBtnText, { color: colors.textInverse }]}
                >
                  Сохранить
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  kavWrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    height: SHEET_H,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  form: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
  },
  textarea: {
    minHeight: 80,
    paddingTop: 13,
  },
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: {
    fontSize: 15,
    flex: 1,
  },
  pickerDropdown: {
    borderWidth: 1,
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
  row: {
    flexDirection: "row",
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    overflow: "hidden",
    height: 46,
  },
  stepperBtn: {
    width: 40,
    height: 46,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnText: {
    fontSize: 18,
    fontWeight: "400",
  },
  stepperValue: {
    flex: 1,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
  saveBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
