# Mobile Master Nav Redesign v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перестроить нижнюю навигацию мобильного приложения мастера: объединить «Календарь» и «Записи» в один таб с режимами `Календарь | Список`, заменить пятый таб «Ещё» на четыре таба + центральный FAB `+`, который открывает action sheet с приоритетом «Новая запись» и secondary-действиями «Новый клиент» / «Новая услуга». Реализовать формы создания записи и клиента (бэкенд POST уже есть). Обеспечить онбординг-страховку: empty state для услуг внутри формы записи.

**Architecture:**
- Frontend: React Native (expo-router v3 file-based routing). Без зависимостей за пределами уже установленных.
- Backend POST endpoints **уже существуют** (`POST /master-dashboard/appointments`, `POST /master-dashboard/clients`). Mобильное приложение их не использует — нужно добавить URL в `endpoints.ts` и mutations в entity-слое.
- Кастомный `tabBarButton` в `Tabs.Screen` для центрального FAB (expo-router нативно поддерживает через `options.tabBarButton`).
- Action sheet — собственный компонент на основе `Modal` + `Animated`. Не используем `@expo/react-native-action-sheet` (нативный sheet не позволяет ставить крупный primary CTA).

**Tech Stack:**
- expo-router 3 + React Native (см. `mobile/package.json`)
- `@tanstack/react-query` (паттерн из `entities/appointments/api.ts`)
- `@expo/vector-icons` (Feather + MaterialCommunityIcons — уже используются в репо)
- Theme через `useTheme()` из `src/shared/theme/useTheme.ts`
- FSD структура: `entities/*` (data), `features/*` (UI блоки), `app/*` (роуты)

**Pre-flight check (one-time, не задача):**
- Бэкенд POST endpoints проверены 2026-05-08:
  - `POST /api/v1/master-dashboard/appointments` body: `{ serviceIds: uuid[], startsAt: RFC3339, guestName, guestPhone, clientNote?, clientUserId? }` → 201 + Appointment
  - `POST /api/v1/master-dashboard/clients` body: `{ displayName, phone?, notes?, extraContact?, userId? }` → 201 + MasterClientDTO

---

## Phase 1 — Слияние Календарь + Записи

### Task 1: Расширить `AppointmentFilters` чипом «Сегодня» и поиском по клиенту

**Files:**
- Modify: `mobile/src/features/appointments/AppointmentFilters.tsx`

- [ ] **Step 1: Расширить тип `FilterId`**

В `mobile/src/features/appointments/AppointmentFilters.tsx` заменить тип и список `ITEMS`:

```tsx
export type FilterId =
  | "all"
  | "today"
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled";

const ITEMS: Array<{ id: FilterId; label: string }> = [
  { id: "all", label: "Все" },
  { id: "today", label: "Сегодня" },
  { id: "pending", label: "Ожидают" },
  { id: "confirmed", label: "Подтв." },
  { id: "completed", label: "Завершены" },
  { id: "cancelled", label: "Отменены" },
];
```

- [ ] **Step 2: Добавить опциональное поле поиска (в том же компоненте, над чипами)**

Расширить `Props` и UI:

```tsx
type Props = {
  active: FilterId;
  onChange: (id: FilterId) => void;
  pendingCount: number;
  search?: string;
  onSearchChange?: (v: string) => void;
};

// Внутри return — над ScrollView:
{onSearchChange ? (
  <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
    <Feather name="search" size={14} color={colors.muted} />
    <TextInput
      value={search ?? ""}
      onChangeText={onSearchChange}
      placeholder="Поиск по клиенту"
      placeholderTextColor={colors.muted}
      style={[styles.searchInput, { color: colors.text }]}
      autoCorrect={false}
      autoCapitalize="none"
    />
  </View>
) : null}
```

Добавить импорты `TextInput`, `Feather` и стили:
```tsx
searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100, borderWidth: 1, marginBottom: 8 },
searchInput: { flex: 1, fontSize: 13, paddingVertical: 0 },
```

- [ ] **Step 3: Ручная проверка**

Запустить мобильное:
```bash
cd mobile && npm run start
```
Открыть существующий экран `/(tabs)/records` → убедиться, что чип «Сегодня» появился, поиск **не отображается** (потому что `onSearchChange` пока не передан со стороны Records).

- [ ] **Step 4: Commit**

```bash
git add mobile/src/features/appointments/AppointmentFilters.tsx
git commit -m "feat(mobile): add 'today' + 'cancelled' chips and optional client search to AppointmentFilters"
```

---

### Task 2: Создать `CalendarViewToggle` (сегмент-контрол режимов)

**Files:**
- Create: `mobile/src/features/calendar/CalendarViewToggle.tsx`

- [ ] **Step 1: Создать компонент**

```tsx
import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { useTheme } from "../../shared/theme/useTheme";

export type CalendarMode = "calendar" | "list";

type Props = {
  mode: CalendarMode;
  onChange: (m: CalendarMode) => void;
};

const ITEMS: Array<{ id: CalendarMode; label: string }> = [
  { id: "calendar", label: "Календарь" },
  { id: "list", label: "Список" },
];

export function CalendarViewToggle({ mode, onChange }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      {ITEMS.map((it) => {
        const active = it.id === mode;
        return (
          <Pressable
            key={it.id}
            onPress={() => onChange(it.id)}
            style={[
              styles.seg,
              active && { backgroundColor: colors.bg, borderColor: colors.borderInset },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Режим: ${it.label}`}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: active ? "600" : "400",
                color: active ? colors.text : colors.textSoft,
              }}
            >
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 100,
    borderWidth: 1,
    gap: 3,
  },
  seg: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 100,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/features/calendar/CalendarViewToggle.tsx
git commit -m "feat(mobile): add CalendarViewToggle segment control"
```

---

### Task 3: Перепроектировать `calendar.tsx` — два режима через локальный state

**Files:**
- Modify: `mobile/app/(tabs)/calendar.tsx`

- [ ] **Step 1: Переписать экран**

Полностью заменить содержимое `mobile/app/(tabs)/calendar.tsx`:

```tsx
import React, { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/shared/theme/useTheme";
import {
  useMasterAppointmentsQuery,
  type MasterAppointment,
} from "../../src/entities/appointments/api";
import { CalendarHeader } from "../../src/features/calendar/CalendarHeader";
import { MasterCalendar } from "../../src/features/calendar/MasterCalendar";
import { AppointmentSheet } from "../../src/features/appointments/AppointmentSheet";
import {
  CalendarViewToggle,
  type CalendarMode,
} from "../../src/features/calendar/CalendarViewToggle";
import {
  AppointmentFilters,
  type FilterId,
} from "../../src/features/appointments/AppointmentFilters";
import { AppointmentListCard } from "../../src/features/appointments/AppointmentListCard";

const MONTH_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CalendarScreen() {
  const { colors, typography } = useTheme();
  const today = useMemo(() => new Date(), []);
  const todayWeekStart = useMemo(() => startOfWeek(today), [today]);
  const todayIdx = (today.getDay() + 6) % 7;

  const [mode, setMode] = useState<CalendarMode>("calendar");
  const [weekStart, setWeekStart] = useState<Date>(todayWeekStart);
  const [selectedIdx, setSelectedIdx] = useState(todayIdx);
  const [openAppt, setOpenAppt] = useState<MasterAppointment | null>(null);
  const [filter, setFilter] = useState<FilterId>("all");
  const [search, setSearch] = useState("");

  // Calendar mode: load 1-week window. List mode: load ±1 month.
  const range = useMemo(() => {
    if (mode === "calendar") {
      const from = weekStart;
      const to = new Date(from);
      to.setDate(to.getDate() + 7);
      return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
    }
    const from = new Date(today);
    from.setMonth(today.getMonth() - 1);
    const to = new Date(today);
    to.setMonth(today.getMonth() + 1);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }, [mode, weekStart, today]);

  const apiStatus =
    filter === "all" || filter === "today" ? "" : filter;

  const { data, isLoading, isError } = useMasterAppointmentsQuery({
    from: range.from,
    to: range.to,
    status: apiStatus,
    page: 1,
    pageSize: mode === "calendar" ? 200 : 100,
  });

  const items = data?.items ?? [];

  const visibleItems = useMemo(() => {
    if (mode !== "list") return items;
    let out = items;
    if (filter === "today") {
      out = out.filter((it) =>
        isSameDay(new Date(it.startsAt), today),
      );
    }
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter((it) =>
        (it.clientLabel ?? "").toLowerCase().includes(q) ||
        (it.clientPhone ?? "").toLowerCase().includes(q),
      );
    }
    return out;
  }, [mode, items, filter, search, today]);

  const pendingCount = items.filter((i) => i.status === "pending").length;

  const shiftWeek = useCallback((deltaDays: number) => {
    setWeekStart((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + deltaDays);
      return next;
    });
  }, []);

  const onPrevWeek = useCallback(() => shiftWeek(-7), [shiftWeek]);
  const onNextWeek = useCallback(() => shiftWeek(7), [shiftWeek]);
  const onToday = useCallback(() => {
    setWeekStart(todayWeekStart);
    setSelectedIdx(todayIdx);
  }, [todayWeekStart, todayIdx]);

  const selectedDate = new Date(weekStart);
  selectedDate.setDate(weekStart.getDate() + selectedIdx);
  const monthLabel = `${MONTH_RU[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  const rangeLabel = `${selectedDate.getDate()} ${MONTH_RU[selectedDate.getMonth()]
    .toLowerCase()
    .slice(0, -1)}я`.replace("ья", "я");

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.muted }]}>
          {mode === "calendar" ? "РАСПИСАНИЕ" : "УПРАВЛЕНИЕ"}
        </Text>
        <Text
          style={[
            styles.title,
            { color: colors.text, fontFamily: typography.fonts.serif },
          ]}
        >
          Календарь
        </Text>
        <View style={styles.toggleWrap}>
          <CalendarViewToggle mode={mode} onChange={setMode} />
        </View>
        {mode === "calendar" ? (
          <CalendarHeader
            monthLabel={monthLabel}
            rangeLabel={rangeLabel}
            onPrevWeek={onPrevWeek}
            onNextWeek={onNextWeek}
            onToday={onToday}
          />
        ) : (
          <AppointmentFilters
            active={filter}
            onChange={setFilter}
            pendingCount={pendingCount}
            search={search}
            onSearchChange={setSearch}
          />
        )}
      </View>

      {mode === "calendar" ? (
        <MasterCalendar
          weekStart={weekStart}
          selectedIndex={selectedIdx}
          appointments={items}
          onSelectDay={setSelectedIdx}
          onSelectAppointment={setOpenAppt}
        />
      ) : (
        <>
          {isLoading ? (
            <Text style={[styles.state, { color: colors.muted }]}>Загрузка...</Text>
          ) : null}
          {isError ? (
            <Text style={[styles.state, { color: colors.red }]}>
              Не удалось загрузить
            </Text>
          ) : null}
          <FlatList
            data={visibleItems}
            keyExtractor={(it) => it.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <AppointmentListCard
                appointment={item as any}
                onPress={() => setOpenAppt(item)}
              />
            )}
            ListEmptyComponent={
              !isLoading ? (
                <Text style={[styles.state, { color: colors.muted }]}>
                  {search.trim() || filter !== "all" ? "Нет совпадений" : "Нет записей"}
                </Text>
              ) : null
            }
          />
        </>
      )}

      <AppointmentSheet
        appointment={openAppt}
        onClose={() => setOpenAppt(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12 },
  eyebrow: { fontSize: 10, fontWeight: "600", letterSpacing: 0.8, marginBottom: 2 },
  title: { fontSize: 26, fontWeight: "500", letterSpacing: -0.4 },
  toggleWrap: { marginTop: 12, marginBottom: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  state: { textAlign: "center", paddingVertical: 24, fontSize: 13 },
});
```

- [ ] **Step 2: Ручная проверка обоих режимов**

Запустить app, на табе «Календарь»:
- режим `Календарь` показывает прежний day-list с `< Сегодня >`
- режим `Список` скрывает day-navigation и показывает чипы статусов + поиск
- переключение между режимами не теряет выбранную запись (sheet остаётся открытым корректно)

- [ ] **Step 3: Commit**

```bash
git add mobile/app/(tabs)/calendar.tsx
git commit -m "feat(mobile/calendar): merge Records into Calendar via segmented Calendar|List toggle"
```

---

### Task 4: Удалить отдельный таб «Записи» и роут `records`

**Files:**
- Modify: `mobile/app/(tabs)/_layout.tsx`
- Delete: `mobile/app/(tabs)/records.tsx`

- [ ] **Step 1: Убрать `Tabs.Screen` для `records` из layout**

В `mobile/app/(tabs)/_layout.tsx` удалить строки 30-33:

```tsx
      <Tabs.Screen
        name="records"
        options={{ title: "Записи", tabBarIcon: tabIcon("list") }}
      />
```

- [ ] **Step 2: Удалить файл роута**

```bash
git rm mobile/app/(tabs)/records.tsx
```

- [ ] **Step 3: Проверить, что нет dangling-ссылок**

```bash
cd /Users/vvnezapnopwnz/Documents/Files/beauty-marketplace
grep -rn "/records\|tabs/records\|\"records\"" mobile/app mobile/src 2>&1 | grep -v node_modules
```
Ожидаемо: пусто. Если найдутся ссылки — заменить на `/(tabs)/calendar` или удалить.

- [ ] **Step 4: Запустить app и убедиться, что Tab bar теперь имеет 4 пункта (Календарь, Клиенты, Профиль, Ещё)**

- [ ] **Step 5: Commit**

```bash
git add mobile/app/(tabs)/_layout.tsx mobile/app/(tabs)/records.tsx
git commit -m "refactor(mobile): drop standalone Records tab — content moved into Calendar"
```

---

## Phase 2 — Custom tabBar с FAB + переименование «Ещё» → «Бизнес»

### Task 5: Переименовать таб «Ещё» в «Бизнес»

**Files:**
- Modify: `mobile/app/(tabs)/_layout.tsx`
- Modify: `mobile/src/features/more/MoreScreen.tsx` (заголовок внутри экрана)

- [ ] **Step 1: Заменить `title` в layout**

В `mobile/app/(tabs)/_layout.tsx`:

```tsx
      <Tabs.Screen
        name="more"
        options={{ title: "Бизнес", tabBarIcon: tabIcon("grid") }}
      />
```

(`grid` иконка точнее под bento-сетку, чем `more-horizontal`).

- [ ] **Step 2: Заменить заголовок внутри MoreScreen**

В `mobile/src/features/more/MoreScreen.tsx` строка с `Text>Ещё</Text>`:

```tsx
            <Text
              style={[
                styles.title,
                { color: colors.text, fontFamily: typography.fonts.serif },
              ]}
            >
              Бизнес
            </Text>
```

- [ ] **Step 3: Ручная проверка**

В app пятый таб теперь подписан «Бизнес», заголовок внутри экрана тоже «Бизнес».

- [ ] **Step 4: Commit**

```bash
git add mobile/app/(tabs)/_layout.tsx mobile/src/features/more/MoreScreen.tsx
git commit -m "feat(mobile): rename 'Ещё' tab to 'Бизнес'"
```

---

### Task 6: Создать центральный `CenterFabButton` (UI компонент кнопки)

**Files:**
- Create: `mobile/src/features/nav/CenterFabButton.tsx`

- [ ] **Step 1: Реализовать компонент кнопки**

```tsx
import React from "react";
import { Pressable, View, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../shared/theme/useTheme";

type Props = {
  onPress: () => void;
};

export function CenterFabButton({ onPress }: Props) {
  const { colors } = useTheme();
  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Создать"
        style={({ pressed }) => [
          styles.btn,
          {
            backgroundColor: colors.accent,
            shadowColor: colors.accent,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          },
        ]}
      >
        <Feather name="plus" size={26} color={colors.accentText} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    bottom: Platform.select({ ios: 22, android: 18, default: 18 }),
    pointerEvents: "box-none",
  },
  btn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
    elevation: 8,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/features/nav/CenterFabButton.tsx
git commit -m "feat(mobile): add CenterFabButton presentational component"
```

---

### Task 7: Подключить FAB к `TabLayout` через overlay + проброс state создания

**Files:**
- Modify: `mobile/app/(tabs)/_layout.tsx`
- Create: `mobile/src/features/nav/CreateActionContext.tsx`

- [ ] **Step 1: Создать контекст для открытия sheet (используется и FAB-ом, и любым экраном)**

`mobile/src/features/nav/CreateActionContext.tsx`:

```tsx
import React, { createContext, useContext, useState, useCallback } from "react";

type Ctx = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const CreateActionContext = createContext<Ctx | null>(null);

export function CreateActionProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  return (
    <CreateActionContext.Provider value={{ isOpen, open, close }}>
      {children}
    </CreateActionContext.Provider>
  );
}

export function useCreateAction() {
  const v = useContext(CreateActionContext);
  if (!v) throw new Error("useCreateAction must be used within CreateActionProvider");
  return v;
}
```

- [ ] **Step 2: Обернуть `<Slot />` в `_layout.tsx` (root) провайдером**

В `mobile/app/_layout.tsx` (root) импортировать и обернуть **внутри** `BiometricGate`:

```tsx
import { CreateActionProvider } from "../src/features/nav/CreateActionContext";

// ...

<BiometricGate timeoutMs={5 * 60 * 1000}>
  <CreateActionProvider>
    <Slot />
  </CreateActionProvider>
</BiometricGate>
```

- [ ] **Step 3: Подключить FAB к табам**

В `mobile/app/(tabs)/_layout.tsx` импортировать FAB и контекст, добавить overlay поверх Tabs:

```tsx
import React from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../src/shared/theme/useTheme";
import { CenterFabButton } from "../../src/features/nav/CenterFabButton";
import { useCreateAction } from "../../src/features/nav/CreateActionContext";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

function tabIcon(name: FeatherName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Feather name={name} color={color} size={size} />
  );
}

export default function TabLayout() {
  const { colors } = useTheme();
  const { open } = useCreateAction();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: { borderTopWidth: 1, borderTopColor: colors.border },
        }}
      >
        <Tabs.Screen
          name="calendar"
          options={{ title: "Календарь", tabBarIcon: tabIcon("calendar") }}
        />
        <Tabs.Screen
          name="clients"
          options={{ title: "Клиенты", tabBarIcon: tabIcon("users") }}
        />
        <Tabs.Screen
          name="more"
          options={{ title: "Бизнес", tabBarIcon: tabIcon("grid") }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: "Профиль", tabBarIcon: tabIcon("user") }}
        />
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="appointments" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="services" options={{ href: null }} />
      </Tabs>
      <CenterFabButton onPress={open} />
    </View>
  );
}
```

Заметки:
- Порядок табов теперь: `Календарь · Клиенты · Бизнес · Профиль` (4 шт.). FAB лежит **поверх** tab bar и визуально размещён по центру. Он не занимает слот таба — иначе пришлось бы делать пятый невидимый таб ради геометрии, что усложнит навигацию. Centerness достигается за счёт `position: absolute; left: 0; right: 0; alignItems: 'center'` в `CenterFabButton`.

- [ ] **Step 4: Ручная проверка**

- Tab bar — 4 иконки + кнопка `+` по центру (visually overlay).
- Тап по `+` пока ничего не делает (sheet будет в Task 8).
- Все 4 таба работают.

- [ ] **Step 5: Commit**

```bash
git add mobile/app/_layout.tsx mobile/app/(tabs)/_layout.tsx mobile/src/features/nav/CreateActionContext.tsx
git commit -m "feat(mobile/nav): wire CenterFabButton overlay + CreateActionProvider"
```

---

## Phase 3 — Action sheet с весами

### Task 8: Создать `CreateActionSheet` (primary card + 2 secondary rows)

**Files:**
- Create: `mobile/src/features/nav/CreateActionSheet.tsx`

- [ ] **Step 1: Реализовать sheet**

```tsx
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
import { useRouter } from "expo-router";
import { useTheme } from "../../shared/theme/useTheme";
import { useCreateAction } from "./CreateActionContext";

export function CreateActionSheet() {
  const { isOpen, close } = useCreateAction();
  const { colors, typography } = useTheme();
  const router = useRouter();

  const go = (target: string) => {
    close();
    // setTimeout 0 даёт modal-ю успеть закрыться до пуш-навигации (избегает мигания на iOS)
    setTimeout(() => router.push(target as any), 0);
  };

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
            <View style={styles.handle} />
            <Text
              style={[
                styles.title,
                { color: colors.text, fontFamily: typography.fonts.serif },
              ]}
            >
              Что создать?
            </Text>

            {/* Primary — крупная карточка */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Новая запись"
              onPress={() => go("/appointments/new")}
              style={({ pressed }) => [
                styles.primaryCard,
                {
                  backgroundColor: colors.accent,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View style={styles.primaryIcon}>
                <Feather name="calendar" size={22} color={colors.accentText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.primaryTitle, { color: colors.accentText }]}>
                  Новая запись
                </Text>
                <Text style={[styles.primarySub, { color: colors.accentText, opacity: 0.85 }]}>
                  Запланировать клиента
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.accentText} />
            </Pressable>

            {/* Secondary — компактные строки */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Новый клиент"
              onPress={() => go("/clients/new")}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Feather name="user-plus" size={18} color={colors.text} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Новый клиент</Text>
              <Feather name="chevron-right" size={16} color={colors.muted} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Новая услуга"
              onPress={() => go("/services/new")}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Feather name="scissors" size={18} color={colors.text} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Новая услуга</Text>
              <Feather name="chevron-right" size={16} color={colors.muted} />
            </Pressable>

            <Pressable
              onPress={close}
              style={[styles.cancel, { borderColor: colors.borderLight }]}
              accessibilityRole="button"
              accessibilityLabel="Отмена"
            >
              <Text style={{ color: colors.textSoft, fontWeight: "500" }}>Отмена</Text>
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
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
    backgroundColor: "#0002",
    marginBottom: 6,
  },
  title: { fontSize: 22, fontWeight: "500", letterSpacing: -0.3, marginBottom: 6, paddingHorizontal: 4 },
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
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  primaryTitle: { fontSize: 17, fontWeight: "600", letterSpacing: -0.2 },
  primarySub: { fontSize: 12, marginTop: 2 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, paddingHorizontal: 14,
    borderRadius: 14, borderWidth: 1,
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
```

- [ ] **Step 2: Смонтировать sheet один раз на уровне `(tabs)/_layout.tsx`**

В `_layout.tsx` рядом с `<CenterFabButton />`:

```tsx
import { CreateActionSheet } from "../../src/features/nav/CreateActionSheet";

// ...
      <CenterFabButton onPress={open} />
      <CreateActionSheet />
    </View>
```

- [ ] **Step 3: Ручная проверка**

- Тап по `+` → открывается sheet с крупной карточкой «Новая запись» и двумя secondary-строками.
- Тап по primary → роут `/appointments/new` (404 пока — починим в Phase 4).
- Тап по «Новый клиент» → `/clients/new` (404 — починим в Phase 5).
- Тап по «Новая услуга» → существующий роут `(settings)/services?new=1` открывается.
- Тап по scrim или «Отмена» — sheet закрывается.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/features/nav/CreateActionSheet.tsx mobile/app/(tabs)/_layout.tsx
git commit -m "feat(mobile/nav): CreateActionSheet with weighted primary 'Новая запись'"
```

---

## Phase 4 — Создание записи (форма + API)

### Task 9: Добавить POST endpoint и тип для создания записи

**Files:**
- Modify: `mobile/src/api/endpoints.ts`
- Modify: `mobile/src/entities/appointments/api.ts`

- [ ] **Step 1: В `endpoints.ts` ничего не менять**

`MASTER.appointments` (`/api/v1/master-dashboard/appointments`) уже подходит и для GET, и для POST. Бэкенд диспатчит по методу.

- [ ] **Step 2: Расширить `entities/appointments/api.ts` мутацией**

Добавить в файл (импорты и функцию):

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type CreatePersonalAppointmentInput = {
  serviceIds: string[];
  startsAt: string; // RFC3339
  guestName: string;
  guestPhone: string;
  clientNote?: string;
  clientUserId?: string;
};

export function useCreatePersonalAppointmentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePersonalAppointmentInput) => {
      const { data } = await apiClient.post(MASTER.appointments, input);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["appointments"] });
      void qc.invalidateQueries({ queryKey: ["today"] });
    },
  });
}
```

(Если `apiClient` или `MASTER` ещё не импортированы — добавить импорты по аналогии с существующими query-хуками в этом же файле.)

- [ ] **Step 3: Commit**

```bash
git add mobile/src/entities/appointments/api.ts
git commit -m "feat(mobile/entities): add useCreatePersonalAppointmentMutation"
```

---

### Task 10: Реализовать `useMasterServicesQuery`, если ещё нет

**Files:**
- Read: `mobile/src/entities/services/api.ts`
- Modify (если нужно): `mobile/src/entities/services/api.ts`

- [ ] **Step 1: Проверить существующий хук**

```bash
cat mobile/src/entities/services/api.ts
```

Если уже есть `useMasterServicesQuery` или подобный — пропустить шаги 2-3, использовать как есть в Task 11.

- [ ] **Step 2: Если нет — добавить**

Минимальная реализация:

```ts
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../api/client";
import { MASTER } from "../../api/endpoints";

export type MasterService = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents?: number | null;
  isActive: boolean;
};

export function useMasterServicesQuery() {
  return useQuery({
    queryKey: ["master-services"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ items: MasterService[] }>(MASTER.services);
      return data.items ?? [];
    },
  });
}
```

- [ ] **Step 3: Commit (только если файл изменён)**

```bash
git add mobile/src/entities/services/api.ts
git commit -m "feat(mobile/entities): expose useMasterServicesQuery for service picker"
```

---

### Task 11: Создать роут и форму `/appointments/new`

**Files:**
- Create: `mobile/app/appointments/new.tsx`

- [ ] **Step 1: Реализовать форму записи**

```tsx
import React, { useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/shared/theme/useTheme";
import {
  useCreatePersonalAppointmentMutation,
} from "../../src/entities/appointments/api";
import { useMasterServicesQuery } from "../../src/entities/services/api";

function combineDateTime(dateISO: string, timeHHmm: string): Date {
  const [h, m] = timeHHmm.split(":").map(Number);
  const d = new Date(dateISO);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

export default function NewAppointmentScreen() {
  const { colors, typography } = useTheme();
  const router = useRouter();

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("10:00");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [clientNote, setClientNote] = useState("");

  const { data: services, isLoading: servicesLoading } = useMasterServicesQuery();
  const create = useCreatePersonalAppointmentMutation();

  const hasServices = (services ?? []).length > 0;

  const submit = () => {
    if (!serviceIds.length) {
      Alert.alert("Не выбрана услуга", "Выберите хотя бы одну услугу.");
      return;
    }
    if (!guestName.trim()) {
      Alert.alert("Нет имени клиента", "Укажите имя клиента или выберите из списка.");
      return;
    }
    const startsAt = combineDateTime(date, time).toISOString();
    create.mutate(
      {
        serviceIds,
        startsAt,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        clientNote: clientNote.trim() || undefined,
      },
      {
        onSuccess: () => router.back(),
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "Не удалось создать запись";
          Alert.alert("Ошибка", msg);
        },
      },
    );
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.surface, borderColor: colors.borderInset, color: colors.text },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Назад" hitSlop={12}>
          <Feather name="chevron-left" size={26} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text, fontFamily: typography.fonts.serif }]}>
          Новая запись
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Услуга */}
        <Text style={[styles.label, { color: colors.muted }]}>УСЛУГА *</Text>
        {servicesLoading ? (
          <Text style={[styles.hint, { color: colors.muted }]}>Загрузка услуг...</Text>
        ) : !hasServices ? (
          // Empty state — онбординг-страховка
          <Pressable
            onPress={() => router.push("/services/new" as any)}
            style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.borderInset }]}
          >
            <Feather name="scissors" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>У вас ещё нет услуг</Text>
              <Text style={[styles.emptySub, { color: colors.muted }]}>
                Чтобы записать клиента, добавьте услугу
              </Text>
            </View>
            <View style={[styles.emptyBtn, { backgroundColor: colors.accent }]}>
              <Text style={{ color: colors.accentText, fontSize: 12, fontWeight: "600" }}>
                Добавить
              </Text>
            </View>
          </Pressable>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderInset }]}>
            {(services ?? []).filter((s) => s.isActive).map((s, i) => {
              const checked = serviceIds.includes(s.id);
              return (
                <Pressable
                  key={s.id}
                  onPress={() =>
                    setServiceIds((prev) =>
                      prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id],
                    )
                  }
                  style={[
                    styles.serviceRow,
                    i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderLight },
                  ]}
                >
                  <View style={[styles.checkbox, { borderColor: checked ? colors.accent : colors.borderInset, backgroundColor: checked ? colors.accent : "transparent" }]}>
                    {checked ? <Feather name="check" size={12} color={colors.accentText} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: "500" }}>{s.name}</Text>
                    <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>
                      {s.durationMinutes} мин{s.priceCents != null ? ` · ${Math.round(s.priceCents / 100)} ₽` : ""}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Дата и время */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.muted }]}>ДАТА *</Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="ГГГГ-ММ-ДД"
              placeholderTextColor={colors.muted}
              style={inputStyle}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.muted }]}>ВРЕМЯ *</Text>
            <TextInput
              value={time}
              onChangeText={setTime}
              placeholder="10:00"
              placeholderTextColor={colors.muted}
              style={inputStyle}
            />
          </View>
        </View>

        {/* Клиент */}
        <Text style={[styles.label, { color: colors.muted, marginTop: 14 }]}>КЛИЕНТ *</Text>
        <TextInput
          value={guestName}
          onChangeText={setGuestName}
          placeholder="Имя"
          placeholderTextColor={colors.muted}
          style={inputStyle}
        />
        <TextInput
          value={guestPhone}
          onChangeText={setGuestPhone}
          placeholder="+7 ..."
          placeholderTextColor={colors.muted}
          style={[inputStyle, { marginTop: 8 }]}
          keyboardType="phone-pad"
        />

        <Text style={[styles.label, { color: colors.muted, marginTop: 14 }]}>КОММЕНТАРИЙ</Text>
        <TextInput
          value={clientNote}
          onChangeText={setClientNote}
          placeholder="Заметка к записи..."
          placeholderTextColor={colors.muted}
          multiline
          style={[inputStyle, { minHeight: 60, paddingTop: 10, textAlignVertical: "top" }]}
        />

        <Pressable
          onPress={submit}
          disabled={create.isPending || !hasServices}
          style={[
            styles.submit,
            {
              backgroundColor: create.isPending || !hasServices ? `${colors.accent}80` : colors.accent,
            },
          ]}
        >
          <Text style={{ color: colors.accentText, fontSize: 14, fontWeight: "600" }}>
            {create.isPending ? "Создаётся..." : "Создать запись"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 10,
  },
  title: { fontSize: 18, fontWeight: "500", letterSpacing: -0.2 },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  label: { fontSize: 10, fontWeight: "600", letterSpacing: 0.6, marginTop: 4, marginBottom: 5 },
  input: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, fontSize: 13 },
  card: { borderWidth: 1.5, borderRadius: 12, overflow: "hidden" },
  serviceRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  checkbox: {
    width: 18, height: 18, borderRadius: 5, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  emptyState: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1.5,
  },
  emptyTitle: { fontSize: 13, fontWeight: "600" },
  emptySub: { fontSize: 11, marginTop: 2 },
  emptyBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100 },
  submit: {
    marginTop: 22, paddingVertical: 14, borderRadius: 100,
    alignItems: "center",
  },
  hint: { fontSize: 13, paddingVertical: 12, textAlign: "center" },
});
```

- [ ] **Step 2: Ручная проверка happy path**

1. Создать тест-услугу через `(settings)/services` если ещё нет.
2. Открыть FAB → «Новая запись».
3. Чек-бокс по услуге, ввод даты `2026-05-09`, времени `15:00`, имени `Тест`, телефона `+79991234567`.
4. Тап «Создать запись» → возврат назад.
5. На «Календаре» в режиме День (`2026-05-09`) запись видна.

- [ ] **Step 3: Ручная проверка empty state**

Временно деактивировать все услуги через бэкенд (или войти под пустым аккаунтом). Открыть форму → должен появиться empty state «У вас ещё нет услуг» с кнопкой «Добавить» → ведёт в `(settings)/services?new=1`. После создания услуги вернуться → empty state ушёл, список услуг отрисован.

- [ ] **Step 4: Commit**

```bash
git add mobile/app/appointments/new.tsx
git commit -m "feat(mobile/appointments): /appointments/new form with services empty-state"
```

---

## Phase 5 — Создание клиента (быстрая форма)

### Task 12: Добавить POST мутацию для клиента

**Files:**
- Modify: `mobile/src/entities/clients/api.ts`

- [ ] **Step 1: Расширить файл**

Добавить в `mobile/src/entities/clients/api.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type CreateMasterClientInput = {
  displayName: string;
  phone?: string | null;
  notes?: string | null;
};

export function useCreateMasterClientMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMasterClientInput) => {
      const { data } = await apiClient.post<MasterClient>(MASTER.clients, input);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/entities/clients/api.ts
git commit -m "feat(mobile/entities): add useCreateMasterClientMutation"
```

---

### Task 13: Создать роут и форму `/clients/new`

**Files:**
- Create: `mobile/app/clients/new.tsx`

- [ ] **Step 1: Реализовать форму**

```tsx
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/shared/theme/useTheme";
import { useCreateMasterClientMutation } from "../../src/entities/clients/api";

export default function NewClientScreen() {
  const { colors, typography } = useTheme();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const create = useCreateMasterClientMutation();

  const submit = () => {
    if (!displayName.trim()) {
      Alert.alert("Имя обязательно", "Введите имя клиента.");
      return;
    }
    create.mutate(
      {
        displayName: displayName.trim(),
        phone: phone.trim() || null,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => router.back(),
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "Не удалось создать клиента";
          Alert.alert("Ошибка", msg);
        },
      },
    );
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.surface, borderColor: colors.borderInset, color: colors.text },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Назад" hitSlop={12}>
          <Feather name="chevron-left" size={26} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text, fontFamily: typography.fonts.serif }]}>
          Новый клиент
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: colors.muted }]}>ИМЯ *</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Например, Анна И."
          placeholderTextColor={colors.muted}
          style={inputStyle}
          autoFocus
        />

        <Text style={[styles.label, { color: colors.muted, marginTop: 14 }]}>ТЕЛЕФОН</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="+7 ..."
          placeholderTextColor={colors.muted}
          style={inputStyle}
          keyboardType="phone-pad"
        />

        <Text style={[styles.label, { color: colors.muted, marginTop: 14 }]}>ЗАМЕТКА</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Аллергия, предпочтения..."
          placeholderTextColor={colors.muted}
          multiline
          style={[inputStyle, { minHeight: 70, paddingTop: 10, textAlignVertical: "top" }]}
        />

        <Pressable
          onPress={submit}
          disabled={create.isPending}
          style={[
            styles.submit,
            { backgroundColor: create.isPending ? `${colors.accent}80` : colors.accent },
          ]}
        >
          <Text style={{ color: colors.accentText, fontSize: 14, fontWeight: "600" }}>
            {create.isPending ? "Создаётся..." : "Создать"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 10,
  },
  title: { fontSize: 18, fontWeight: "500", letterSpacing: -0.2 },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  label: { fontSize: 10, fontWeight: "600", letterSpacing: 0.6, marginBottom: 5 },
  input: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, fontSize: 13 },
  submit: {
    marginTop: 22, paddingVertical: 14, borderRadius: 100, alignItems: "center",
  },
});
```

- [ ] **Step 2: Ручная проверка**

1. FAB → «Новый клиент».
2. Ввести `Анна Тест`, `+79991234567`, тап «Создать» → возврат назад.
3. На табе «Клиенты» новый клиент виден.

- [ ] **Step 3: Commit**

```bash
git add mobile/app/clients/new.tsx
git commit -m "feat(mobile/clients): /clients/new quick form"
```

---

## Phase 6 — Создание услуги (новый роут с минимальной формой)

> **Контекст:** существующий экран `mobile/app/(settings)/services.tsx` сейчас только показывает список услуг (без кнопки «+»/формы). Добавлять модальную форму внутрь settings-экрана — лишний state. Делаем отдельный роут `/services/new` по аналогии с `/appointments/new` и `/clients/new`.

### Task 14: Добавить мутацию `useCreateMasterServiceMutation`

**Files:**
- Modify: `mobile/src/entities/services/api.ts`

- [ ] **Step 1: Расширить файл**

Добавить в `mobile/src/entities/services/api.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type CreateMasterServiceInput = {
  name: string;
  durationMinutes: number;
  priceCents?: number | null;
  categorySlug?: string | null;
  description?: string | null;
};

export function useCreateMasterServiceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMasterServiceInput) => {
      const { data } = await apiClient.post<MasterService>(MASTER.services, input);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["master-services"] });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/entities/services/api.ts
git commit -m "feat(mobile/entities): add useCreateMasterServiceMutation"
```

---

### Task 14b: Создать роут и форму `/services/new`

**Files:**
- Create: `mobile/app/services/new.tsx`

- [ ] **Step 1: Реализовать форму**

```tsx
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/shared/theme/useTheme";
import { useCreateMasterServiceMutation } from "../../src/entities/services/api";

function parsePriceRubToCents(raw: string): number | null {
  const t = raw.trim().replace(/\s+/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function parseDurationMin(raw: string): number {
  const n = parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export default function NewServiceScreen() {
  const { colors, typography } = useTheme();
  const router = useRouter();

  const [name, setName] = useState("");
  const [durationStr, setDurationStr] = useState("60");
  const [priceStr, setPriceStr] = useState("");
  const [description, setDescription] = useState("");

  const create = useCreateMasterServiceMutation();

  const submit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("Название обязательно", "Введите название услуги.");
      return;
    }
    const duration = parseDurationMin(durationStr);
    if (duration <= 0) {
      Alert.alert("Некорректная длительность", "Укажите длительность в минутах.");
      return;
    }
    const priceCents = parsePriceRubToCents(priceStr);

    create.mutate(
      {
        name: trimmedName,
        durationMinutes: duration,
        priceCents,
        description: description.trim() || null,
      },
      {
        onSuccess: () => router.back(),
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "Не удалось создать услугу";
          Alert.alert("Ошибка", msg);
        },
      },
    );
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.surface, borderColor: colors.borderInset, color: colors.text },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Назад" hitSlop={12}>
          <Feather name="chevron-left" size={26} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text, fontFamily: typography.fonts.serif }]}>
          Новая услуга
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: colors.muted }]}>НАЗВАНИЕ *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Маникюр + покрытие"
          placeholderTextColor={colors.muted}
          style={inputStyle}
          autoFocus
        />

        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.muted }]}>ДЛИТЕЛЬНОСТЬ (МИН) *</Text>
            <TextInput
              value={durationStr}
              onChangeText={setDurationStr}
              placeholder="60"
              placeholderTextColor={colors.muted}
              style={inputStyle}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.muted }]}>ЦЕНА (₽)</Text>
            <TextInput
              value={priceStr}
              onChangeText={setPriceStr}
              placeholder="0"
              placeholderTextColor={colors.muted}
              style={inputStyle}
              keyboardType="numeric"
            />
          </View>
        </View>

        <Text style={[styles.label, { color: colors.muted, marginTop: 14 }]}>ОПИСАНИЕ</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Что входит в услугу..."
          placeholderTextColor={colors.muted}
          multiline
          style={[inputStyle, { minHeight: 70, paddingTop: 10, textAlignVertical: "top" }]}
        />

        <Pressable
          onPress={submit}
          disabled={create.isPending}
          style={[
            styles.submit,
            { backgroundColor: create.isPending ? `${colors.accent}80` : colors.accent },
          ]}
        >
          <Text style={{ color: colors.accentText, fontSize: 14, fontWeight: "600" }}>
            {create.isPending ? "Создаётся..." : "Создать"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 10,
  },
  title: { fontSize: 18, fontWeight: "500", letterSpacing: -0.2 },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  label: { fontSize: 10, fontWeight: "600", letterSpacing: 0.6, marginBottom: 5 },
  input: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, fontSize: 13 },
  submit: { marginTop: 22, paddingVertical: 14, borderRadius: 100, alignItems: "center" },
});
```

- [ ] **Step 2: Ручная проверка**

1. FAB → «Новая услуга» → форма открывается.
2. Ввести `Маникюр`, `60`, `1500`, тап «Создать» → возврат.
3. На `(settings)/services` (через `Бизнес → Услуги`) — новая услуга в списке.
4. Empty-state из формы записи `/appointments/new` теперь ведёт сюда же.

- [ ] **Step 3: Commit**

```bash
git add mobile/app/services/new.tsx
git commit -m "feat(mobile/services): /services/new minimal create form"
```

---

## Phase 7 — Финальная регрессия и release notes

### Task 15: Прогнать чек-лист регрессии

- [ ] **Step 1: Запустить app и пройти 8 сценариев**

| # | Сценарий | Ожидание |
|---|---|---|
| 1 | Открыть таб «Календарь» | Режим Календарь, день показан корректно, `< Сегодня >` работают |
| 2 | Переключить в «Список» | Чипы статусов и поиск; контрол `< Сегодня >` скрыт |
| 3 | Поиск «Ан» | Список фильтруется по `clientLabel` и `clientPhone` |
| 4 | Чип «Сегодня» | Только сегодняшние записи |
| 5 | FAB → «Новая запись» | Форма открывается, услуги загружены |
| 6 | Сохранить новую запись | Запись появляется в Календаре и Списке |
| 7 | FAB → «Новый клиент» | Форма работает, клиент создаётся |
| 8 | FAB → «Новая услуга» | Открывается `/services/new` с автофокусом на названии |
| 9 | Empty state в /appointments/new | При пустом списке услуг видна карточка-onboarding с CTA «Добавить» → ведёт на `/services/new` |

- [ ] **Step 2: Type-check и lint**

```bash
cd mobile && npx tsc --noEmit
cd mobile && npx eslint . --ext .ts,.tsx
```

Все проблемы — починить до commit.

- [ ] **Step 3: Обновить `docs/vault/product/status.md`**

Добавить запись о новой навигации мобильного:
- слияние Календарь+Записи через SegmentedControl
- центральный FAB с action sheet
- переименование «Ещё» → «Бизнес»
- формы /appointments/new и /clients/new

- [ ] **Step 4: Финальный commit**

```bash
git add docs/vault/product/status.md
git commit -m "docs(status): mobile master nav v2 — Calendar/List, FAB, Бизнес"
```

---

## Notes / Risks / Out of scope

- **Out of scope этого плана**: pagination в режиме «Список» (сейчас pageSize=100, ±1 месяц — этого достаточно для типичного объёма мастера; миграция на бесконечный список — отдельный план).
- **Out of scope**: native date/time picker в форме записи. Сейчас текстовые поля `ГГГГ-ММ-ДД` и `HH:MM`. Аналогичный подход уже используется в `AppointmentEditTab.tsx`. Native picker — отдельный UX-улучшение.
- **Out of scope**: client picker (выбор существующего клиента из списка) внутри формы записи. Сейчас только `guestName + guestPhone` (бэкенд принимает оба варианта через `clientUserId` либо `guestName/Phone`). После Task 13 можно добавить шаг «Выбрать из клиентов».
- **Coachmark «Записи переехали»** не включён в план — это nice-to-have. Если нужен, добавить после Task 4 как отдельный mini-task: при первом запуске после миграции показать однократный tooltip над сегмент-контролом «Список» с текстом «Записи теперь здесь».
- **Risk**: `Modal` поверх `Tabs` на iOS требует `statusBarTranslucent` и `SafeAreaView edges={["bottom"]}` — учтено в Task 8.
- **Risk**: при FAB через overlay центрирование привязано к ширине экрана. На iPad/web tab bar может быть растянут — проверить визуально, при необходимости ограничить max-width.
