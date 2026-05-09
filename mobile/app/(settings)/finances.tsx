import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../src/shared/theme/useTheme";
import {
  useFinancesSummaryQuery,
  useFinanceTrendQuery,
  useTopServicesQuery,
  useExpenseCategoriesQuery,
  useCreateExpenseCategoryMutation,
  useDeleteExpenseCategoryMutation,
  useExpensesQuery,
  useCreateExpenseMutation,
  useDeleteExpenseMutation,
} from "../../src/entities/finances/api";

type Source = "all" | "personal" | "salon";

function rub(cents: number) {
  return `${(cents / 100).toLocaleString("ru-RU")} ₽`;
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function FinancesSettingsScreen() {
  const { colors } = useTheme();

  const [source, setSource] = useState<Source>("all");
  const [from, setFrom] = useState<Date>(
    new Date(new Date().setDate(new Date().getDate() - 30)),
  );
  const [to, setTo] = useState<Date>(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseCategoryId, setExpenseCategoryId] = useState<string | null>(
    null,
  );
  const [expenseDate, setExpenseDate] = useState(toDateStr(new Date()));

  const [newCatName, setNewCatName] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("");

  const params = { source, from: toDateStr(from), to: toDateStr(to) };

  const { data: summary, isLoading: summaryLoading } =
    useFinancesSummaryQuery(params);
  const { data: trend = [] } = useFinanceTrendQuery(params);
  const { data: topServices = [] } = useTopServicesQuery(params);
  const { data: categories = [] } = useExpenseCategoriesQuery();
  const { data: expensesData } = useExpensesQuery({
    from: toDateStr(from),
    to: toDateStr(to),
  });
  const expenses = expensesData?.items ?? [];

  const createExpense = useCreateExpenseMutation();
  const deleteExpense = useDeleteExpenseMutation();
  const createCategory = useCreateExpenseCategoryMutation();
  const deleteCategory = useDeleteExpenseCategoryMutation();

  const maxIncome = Math.max(...topServices.map((s) => s.incomeCents), 1);

  const submitExpense = () => {
    const cents = Math.round(parseFloat(expenseAmount.replace(",", ".")) * 100);
    if (!cents || isNaN(cents) || cents <= 0) {
      Alert.alert("Ошибка", "Введите корректную сумму");
      return;
    }
    createExpense.mutate(
      {
        categoryId: expenseCategoryId,
        amountCents: cents,
        description: expenseDesc.trim() || null,
        expenseDate,
      },
      {
        onSuccess: () => {
          setModalVisible(false);
          setExpenseAmount("");
          setExpenseDesc("");
          setExpenseCategoryId(null);
          setExpenseDate(toDateStr(new Date()));
        },
        onError: () => Alert.alert("Ошибка", "Не удалось добавить расход"),
      },
    );
  };

  const submitCategory = () => {
    if (!newCatName.trim()) return;
    createCategory.mutate(
      { name: newCatName.trim(), emoji: newCatEmoji.trim() || undefined },
      {
        onSuccess: () => {
          setNewCatName("");
          setNewCatEmoji("");
        },
      },
    );
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.surface,
      borderColor: colors.borderInset,
      color: colors.text,
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Финансы</Text>

        {/* Source filter */}
        <View style={styles.sourceRow}>
          {(["all", "personal", "salon"] as Source[]).map((s) => {
            const active = source === s;
            const label =
              s === "all" ? "Все" : s === "personal" ? "Личные" : "Салонные";
            return (
              <Pressable
                key={s}
                onPress={() => setSource(s)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.accent : colors.surface,
                    borderColor: active ? colors.accent : colors.borderLight,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: active ? colors.accentText : colors.text,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Date range */}
        <View style={styles.dateRow}>
          <Pressable
            onPress={() => setShowFromPicker(true)}
            style={[
              styles.datePill,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <Feather name="calendar" size={13} color={colors.muted} />
            <Text style={{ fontSize: 12, color: colors.text, marginLeft: 4 }}>
              {toDateStr(from)}
            </Text>
          </Pressable>
          <Text style={{ color: colors.muted, fontSize: 12 }}>—</Text>
          <Pressable
            onPress={() => setShowToPicker(true)}
            style={[
              styles.datePill,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <Feather name="calendar" size={13} color={colors.muted} />
            <Text style={{ fontSize: 12, color: colors.text, marginLeft: 4 }}>
              {toDateStr(to)}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setModalVisible(true)}
            style={[styles.addBtn, { backgroundColor: colors.accent }]}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: colors.accentText,
              }}
            >
              + Расход
            </Text>
          </Pressable>
        </View>

        {showFromPicker && (
          <DateTimePicker
            value={from}
            mode="date"
            display="default"
            onChange={(_, d) => {
              setShowFromPicker(false);
              if (d) setFrom(d);
            }}
          />
        )}
        {showToPicker && (
          <DateTimePicker
            value={to}
            mode="date"
            display="default"
            onChange={(_, d) => {
              setShowToPicker(false);
              if (d) setTo(d);
            }}
          />
        )}

        {/* Summary */}
        {summaryLoading ? (
          <Text style={{ color: colors.muted, fontSize: 13 }}>Загрузка...</Text>
        ) : summary ? (
          <View style={styles.summaryRow}>
            {[
              {
                label: "Доход",
                value: summary.incomeCents,
                color: colors.nails,
              },
              {
                label: "Расход",
                value: summary.expensesCents,
                color: colors.red,
              },
              {
                label: "Прибыль",
                value: summary.profitCents,
                color: colors.accent,
              },
            ].map(({ label, value, color }) => (
              <View
                key={label}
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>
                  {label}
                </Text>
                <Text style={[styles.summaryValue, { color }]}>
                  {rub(value)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Trend table */}
        {trend.length > 0 && (
          <View
            style={[
              styles.section,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Тренд
            </Text>
            {trend.slice(-7).map((pt) => (
              <View key={pt.date} style={styles.trendRow}>
                <Text style={[styles.trendDate, { color: colors.muted }]}>
                  {pt.date}
                </Text>
                <Text style={[styles.trendIncome, { color: colors.nails }]}>
                  +{rub(pt.incomeCents)}
                </Text>
                <Text style={[styles.trendExpense, { color: colors.red }]}>
                  -{rub(pt.expenseCents)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Top services */}
        {topServices.length > 0 && (
          <View
            style={[
              styles.section,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Топ услуг
            </Text>
            {topServices.map((s) => {
              const pct = s.incomeCents / maxIncome;
              return (
                <View key={s.serviceName} style={styles.barRow}>
                  <Text
                    style={[styles.barLabel, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {s.serviceName}
                  </Text>
                  <View
                    style={[
                      styles.barTrack,
                      { backgroundColor: `${colors.accent}22` },
                    ]}
                  >
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.round(pct * 100)}%`,
                          backgroundColor: colors.accent,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barValue, { color: colors.textSoft }]}>
                    {rub(s.incomeCents)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Expenses */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Расходы
          </Text>
          {expenses.length === 0 ? (
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              Нет расходов за период
            </Text>
          ) : null}
          {expenses.map((e) => (
            <View
              key={e.id}
              style={[styles.expenseRow, { borderColor: colors.borderLight }]}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: colors.text,
                  }}
                >
                  {e.categoryName ? `${e.categoryName}` : "Без категории"}
                </Text>
                {e.description ? (
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    {e.description}
                  </Text>
                ) : null}
                <Text style={{ fontSize: 11, color: colors.muted }}>
                  {e.expenseDate}
                </Text>
              </View>
              <View style={styles.expenseRight}>
                <Text
                  style={{ fontSize: 14, fontWeight: "700", color: colors.red }}
                >
                  -{rub(e.amountCents)}
                </Text>
                <Pressable
                  onPress={() =>
                    Alert.alert("Удалить расход?", "", [
                      { text: "Отмена", style: "cancel" },
                      {
                        text: "Удалить",
                        style: "destructive",
                        onPress: () => deleteExpense.mutate(e.id),
                      },
                    ])
                  }
                  hitSlop={8}
                >
                  <Feather name="x" size={16} color={colors.muted} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* Categories */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Категории расходов
          </Text>
          {categories.map((cat) => (
            <View
              key={cat.id}
              style={[styles.catRow, { borderColor: colors.borderLight }]}
            >
              <Text style={{ fontSize: 20 }}>{cat.emoji}</Text>
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: colors.text,
                  marginLeft: 8,
                }}
              >
                {cat.name}
              </Text>
              <Pressable
                onPress={() =>
                  Alert.alert("Удалить категорию?", cat.name, [
                    { text: "Отмена", style: "cancel" },
                    {
                      text: "Удалить",
                      style: "destructive",
                      onPress: () => deleteCategory.mutate(cat.id),
                    },
                  ])
                }
                hitSlop={8}
              >
                <Feather name="x" size={15} color={colors.muted} />
              </Pressable>
            </View>
          ))}
          <View style={styles.addCatRow}>
            <TextInput
              value={newCatEmoji}
              onChangeText={setNewCatEmoji}
              placeholder="😊"
              placeholderTextColor={colors.muted}
              style={[inputStyle, { width: 44, textAlign: "center" }]}
              maxLength={2}
            />
            <TextInput
              value={newCatName}
              onChangeText={setNewCatName}
              placeholder="Название категории"
              placeholderTextColor={colors.muted}
              style={[inputStyle, { flex: 1 }]}
            />
            <Pressable
              onPress={submitCategory}
              disabled={createCategory.isPending}
              style={[styles.addCatBtn, { backgroundColor: colors.accent }]}
            >
              <Feather name="plus" size={16} color={colors.accentText} />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Add expense modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        />
        <View
          style={[
            styles.modalSheet,
            { backgroundColor: colors.bg, borderColor: colors.borderLight },
          ]}
        >
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Новый расход
          </Text>

          <Text style={[styles.fieldLabel, { color: colors.muted }]}>
            СУММА (₽) *
          </Text>
          <TextInput
            value={expenseAmount}
            onChangeText={setExpenseAmount}
            placeholder="0"
            placeholderTextColor={colors.muted}
            style={inputStyle}
            keyboardType="numeric"
            autoFocus
          />

          <Text style={[styles.fieldLabel, { color: colors.muted }]}>ДАТА</Text>
          <TextInput
            value={expenseDate}
            onChangeText={setExpenseDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.muted}
            style={inputStyle}
          />

          <Text style={[styles.fieldLabel, { color: colors.muted }]}>
            КАТЕГОРИЯ
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 10 }}
          >
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => setExpenseCategoryId(null)}
                style={[
                  styles.chip,
                  {
                    borderColor:
                      expenseCategoryId === null
                        ? colors.accent
                        : colors.borderLight,
                    backgroundColor:
                      expenseCategoryId === null
                        ? `${colors.accent}22`
                        : colors.surface,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color:
                      expenseCategoryId === null ? colors.accent : colors.text,
                  }}
                >
                  Без категории
                </Text>
              </Pressable>
              {categories.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setExpenseCategoryId(cat.id)}
                  style={[
                    styles.chip,
                    {
                      borderColor:
                        expenseCategoryId === cat.id
                          ? colors.accent
                          : colors.borderLight,
                      backgroundColor:
                        expenseCategoryId === cat.id
                          ? `${colors.accent}22`
                          : colors.surface,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color:
                        expenseCategoryId === cat.id
                          ? colors.accent
                          : colors.text,
                    }}
                  >
                    {cat.emoji} {cat.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Text style={[styles.fieldLabel, { color: colors.muted }]}>
            ОПИСАНИЕ
          </Text>
          <TextInput
            value={expenseDesc}
            onChangeText={setExpenseDesc}
            placeholder="Комментарий..."
            placeholderTextColor={colors.muted}
            style={inputStyle}
          />

          <Pressable
            onPress={submitExpense}
            disabled={createExpense.isPending}
            style={[styles.saveBtn, { backgroundColor: colors.accent }]}
          >
            <Text style={{ color: colors.accentText, fontWeight: "600" }}>
              {createExpense.isPending ? "Сохраняется..." : "Сохранить"}
            </Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "700" },
  sourceRow: { flexDirection: "row", gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  summaryLabel: { fontSize: 11, marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  section: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  trendRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  trendDate: { width: 80, fontSize: 11 },
  trendIncome: { flex: 1, fontSize: 12, textAlign: "right" },
  trendExpense: { flex: 1, fontSize: 12, textAlign: "right" },
  barRow: { gap: 4 },
  barLabel: { fontSize: 12, fontWeight: "600" },
  barTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
  barValue: { fontSize: 11 },
  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingBottom: 8,
    gap: 8,
  },
  expenseRight: { alignItems: "flex-end", gap: 4 },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingBottom: 6,
  },
  addCatRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    alignItems: "center",
  },
  addCatBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: { flex: 1, backgroundColor: "transparent" },
  modalSheet: {
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 6,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  saveBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: "center",
  },
});
