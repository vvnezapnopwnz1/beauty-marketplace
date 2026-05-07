# Mobile Beautica Redesign (Nav A · Calendar · Appointments · Bento) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the `mobile/beautica-nav.html` mockup into the live React Native app: Floating Pill bottom nav, Master-only redesigned calendar (day + week), Appointments list with Details/Edit bottom-sheet, Bento "More" screen, polished Profile and Clients screens.

**Architecture:** Custom `tabBar` for `expo-router` `Tabs` (replaces default), per-screen rebuilds in `mobile/app/(tabs)/*.tsx`, presentation components under `mobile/src/features/<area>/*` and `mobile/src/components/*`. New per-category color tokens added to `mobile/src/shared/theme/themes.ts` so screens can color-code services (hair / nails / brows / makeup / massage). Existing data layer (`useMasterAppointmentsQuery`, `useMeQuery`, `useTodayQuery`, `MASTER.*` endpoints) is reused unchanged.

**Tech Stack:** Expo Router, React Native + Reanimated 4, `@gorhom/bottom-sheet@^5`, `expo-linear-gradient`, `expo-haptics`, MaterialCommunityIcons (`@expo/vector-icons`), Zustand theme store, react-i18next.

**Reference mockup:** `mobile/beautica-nav.html` — line ranges below cite this file as the visual contract.

**Scope notes:**
- Mockup is for the master/salon-admin app only (per `project_mobile_app_scope` memory). Client UX is out of scope.
- Calendar redesign here is **master-only**. The salon-admin variant of the calendar is explicitly deferred.
- We will *not* port the mockup's custom inline-SVG icons literally — we map each to a MaterialCommunityIcons equivalent (the project already uses MCI everywhere).
- The mockup uses light "Ivory" themes only. Existing `THEMES_MAP` already provides equivalent tokens; we extend it with five service-category colors.

**Verification per task:** `cd mobile && npm run lint`. Plus `cd mobile && npx tsc --noEmit` after the final task. UI changes are verified by running `cd mobile && npm start` and walking each affected screen on iOS Simulator + Android Emulator (or a device).

---

## File Structure

**New files:**
- `mobile/src/shared/theme/categoryColor.ts` — `categoryColor(palette, cat)` helper.
- `mobile/src/components/navigation/FloatingPillTabBar.tsx` — Nav-A custom tab bar.
- `mobile/src/features/calendar/CalendarHeader.tsx` — month / day-week toggle / search button.
- `mobile/src/features/calendar/DayWeekStrip.tsx` — 7-day chip strip for day view.
- `mobile/src/features/calendar/WeekOverview.tsx` — 7-day cards + per-day hourly heatmap for week view.
- `mobile/src/features/calendar/DayStatsStrip.tsx` — three KPI strip (records / revenue / free).
- `mobile/src/features/calendar/DayTimelineStrip.tsx` — horizontal day-bar with now-line.
- `mobile/src/features/calendar/AgendaList.tsx` — vertical list of appointment rows for selected day.
- `mobile/src/features/appointments/AppointmentsList.tsx` — list orchestrator (filters + items).
- `mobile/src/features/appointments/AppointmentListCard.tsx` — single row card.
- `mobile/src/features/appointments/AppointmentFilters.tsx` — pill row.
- `mobile/src/features/appointments/AppointmentSheet.tsx` — bottom sheet w/ Details + Edit tabs.
- `mobile/src/features/appointments/AppointmentDetailsTab.tsx`
- `mobile/src/features/appointments/AppointmentEditTab.tsx`
- `mobile/src/features/appointments/useAppointmentSheet.tsx` — context+ref for opening from any screen.
- `mobile/src/features/more/RoleModeToggle.tsx`
- `mobile/src/features/more/RevenueHeroCard.tsx`
- `mobile/src/features/more/QuickActionsRow.tsx`
- `mobile/src/features/more/BentoGrid.tsx` and `BentoCard.tsx` — reusable bento primitives.
- `mobile/src/features/more/MoreScreen.tsx` — composition root.

**Modified files:**
- `mobile/src/shared/theme/palette.types.ts` — extend `Palette` with category colors.
- `mobile/src/shared/theme/themes.ts` — add category colors to all four themes.
- `mobile/app/(tabs)/_layout.tsx` — wire new tab order + `tabBar` prop.
- `mobile/app/(tabs)/calendar.tsx` — rebuild layout; mount `AppointmentSheet`.
- `mobile/app/(tabs)/records.tsx` — rebuild as Appointments screen (URL stays `/records`).
- `mobile/app/(tabs)/profile.tsx` — replace re-export with full hero+sections screen.
- `mobile/app/(tabs)/clients.tsx` — restyle list cards to mockup spec.
- `mobile/src/features/calendar/MasterCalendar.tsx` — replace placeholder body with composition of new sub-components (kept as orchestrator).
- `mobile/src/features/calendar/AppointmentQuickActionsSheet.tsx` — **delete** (replaced by `AppointmentSheet`).
- `mobile/src/components/navigation/CustomTabBar.tsx` — **delete** (unused; replaced by FloatingPillTabBar).
- `mobile/src/shared/i18n/locales/ru.json` — add new keys for tabs, calendar, appointments, more.

**New tab route:**
- `mobile/app/(tabs)/more.tsx` — renders `MoreScreen`. (Replaces today/index as the dashboard surface for the redesigned shell. The `(tabs)/index.tsx` "Today" screen is removed from nav and its file deleted, since "More" subsumes its hero metrics. Today data still flows via `useTodayQuery` inside `MoreScreen`.)

---

## Phase 0 — Theme & helpers

### Task 0.1: Extend `Palette` type with category colors

**Files:**
- Modify: `mobile/src/shared/theme/palette.types.ts`

- [ ] **Step 1: Add five category color fields**

```ts
export type Palette = {
  // ...existing fields...
  hair: string;
  nails: string;
  brows: string;
  makeup: string;
  massage: string;
};
```

- [ ] **Step 2: Run `cd mobile && npx tsc --noEmit`**

Expected: errors in `themes.ts` because all four palettes lack the new fields. That confirms the type is enforced.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/shared/theme/palette.types.ts
git commit -m "feat(mobile/theme): add service-category color slots to Palette"
```

### Task 0.2: Add category colors to all four themes

**Files:**
- Modify: `mobile/src/shared/theme/themes.ts`

- [ ] **Step 1: Add tasteful, mockup-aligned values to each theme**

Append to each of `ivoryDate`, `sandDune`, `slateStone`, `linenTea` (use the existing `accent`/`luxe` neighborhood; values below match the mockup's ivory-day vibe):

```ts
// ivoryDate
hair: "#C97A56",
nails: "#A06B8E",
brows: "#B0884A",
makeup: "#7E96BD",
massage: "#6E9B7C",

// sandDune
hair: "#C77A30",
nails: "#A0738B",
brows: "#A88040",
makeup: "#7891B5",
massage: "#5F8E6F",

// slateStone
hair: "#C26E44",
nails: "#9F718B",
brows: "#A2853E",
makeup: "#7E94B6",
massage: "#5F8E6F",

// linenTea
hair: "#A87A5F",
nails: "#A98199",
brows: "#A98445",
makeup: "#7C90B5",
massage: "#5F8E70",
```

- [ ] **Step 2: Verify TS clean**

Run: `cd mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify lint clean**

Run: `cd mobile && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/shared/theme/themes.ts
git commit -m "feat(mobile/theme): add service-category palette values to all themes"
```

### Task 0.3: Add `categoryColor` helper

**Files:**
- Create: `mobile/src/shared/theme/categoryColor.ts`

- [ ] **Step 1: Implement helper**

```ts
import type { Palette } from "./palette.types";

export type ServiceCategory = "hair" | "nails" | "brows" | "makeup" | "massage";

const FALLBACK: Record<ServiceCategory, keyof Palette> = {
  hair: "hair",
  nails: "nails",
  brows: "brows",
  makeup: "makeup",
  massage: "massage",
};

export function categoryColor(palette: Palette, cat: string | null | undefined): string {
  if (cat && cat in FALLBACK) {
    return palette[FALLBACK[cat as ServiceCategory]];
  }
  return palette.accent;
}
```

- [ ] **Step 2: Lint**

Run: `cd mobile && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/shared/theme/categoryColor.ts
git commit -m "feat(mobile/theme): add categoryColor helper for service-coded UI"
```

---

## Phase 1 — Floating Pill bottom nav (Concept A)

Mockup reference: `beautica-nav.html` lines 1116–1153.

### Task 1.1: Implement `FloatingPillTabBar`

**Files:**
- Create: `mobile/src/components/navigation/FloatingPillTabBar.tsx`

- [ ] **Step 1: Create the component**

```tsx
import React from "react";
import { View, Pressable, Text, StyleSheet, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../shared/theme/useTheme";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const TAB_META: Record<string, { label: string; icon: IconName }> = {
  calendar: { label: "Календарь", icon: "calendar-month-outline" },
  records: { label: "Записи", icon: "format-list-bulleted-square" },
  clients: { label: "Клиенты", icon: "account-group-outline" },
  profile: { label: "Профиль", icon: "account-outline" },
  more: { label: "Ещё", icon: "dots-horizontal" },
};

const ORDER = ["calendar", "records", "clients", "profile", "more"] as const;

type Props = BottomTabBarProps & {
  badges?: Partial<Record<(typeof ORDER)[number], number>>;
};

export function FloatingPillTabBar({ state, navigation, badges = {} }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.outer, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.pill,
          {
            backgroundColor: colors.card,
            borderColor: colors.borderLight,
            shadowColor: "#000",
          },
        ]}
      >
        {ORDER.map((name) => {
          const route = state.routes.find((r) => r.name === name);
          if (!route) return null;
          const meta = TAB_META[name];
          const focused = state.routes[state.index]?.name === name;
          const badge = badges[name];

          return (
            <Pressable
              key={name}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={meta.label}
              onPress={() => {
                if (Platform.OS === "ios") void Haptics.selectionAsync();
                navigation.navigate(route.name);
              }}
              style={[
                styles.item,
                focused && {
                  backgroundColor: colors.accentLight,
                  borderColor: colors.accentBorder,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={meta.icon}
                size={22}
                color={focused ? colors.accent : colors.muted}
              />
              <Text
                style={[
                  styles.label,
                  { color: focused ? colors.accent : colors.muted },
                  focused && styles.labelActive,
                ]}
              >
                {meta.label}
              </Text>
              {badge && badge > 0 ? (
                <View style={[styles.badge, { backgroundColor: colors.accent, borderColor: colors.card }]}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.homeIndicatorWrap}>
        <View style={[styles.homeIndicator, { backgroundColor: colors.text }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 4 : 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 6,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -2 },
    elevation: 6,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "transparent",
    position: "relative",
  },
  label: { fontSize: 9, fontWeight: "400", letterSpacing: 0.1 },
  labelActive: { fontWeight: "700" },
  badge: {
    position: "absolute",
    top: 5,
    right: "18%",
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 8, fontWeight: "700", color: "#fff" },
  homeIndicatorWrap: { alignItems: "center", marginTop: 6 },
  homeIndicator: { width: 120, height: 4, borderRadius: 2, opacity: 0.2 },
});
```

- [ ] **Step 2: Lint**

Run: `cd mobile && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/navigation/FloatingPillTabBar.tsx
git commit -m "feat(mobile/nav): add FloatingPillTabBar (concept A)"
```

### Task 1.2: Add `more.tsx` route, drop `index.tsx` from nav

**Files:**
- Create: `mobile/app/(tabs)/more.tsx`

- [ ] **Step 1: Create stub for the More tab**

```tsx
import React from "react";
import { MoreScreen } from "../../src/features/more/MoreScreen";

export default function MoreRoute() {
  return <MoreScreen />;
}
```

- [ ] **Step 2: Create a placeholder `MoreScreen` so the tab compiles**

File: `mobile/src/features/more/MoreScreen.tsx`

```tsx
import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../shared/theme/useTheme";

export function MoreScreen() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: 16 }}>
        <Text style={{ color: colors.text, fontSize: 22 }}>Ещё</Text>
      </View>
    </SafeAreaView>
  );
}
```

(Filled in fully in Phase 5; this stub keeps the tab bar wiring buildable now.)

- [ ] **Step 3: Commit**

```bash
git add mobile/app/(tabs)/more.tsx mobile/src/features/more/MoreScreen.tsx
git commit -m "feat(mobile): add empty More tab route + screen stub"
```

### Task 1.3: Wire the new nav into `(tabs)/_layout.tsx`

**Files:**
- Modify: `mobile/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Replace the layout with the floating-pill version**

```tsx
import React from "react";
import { Tabs } from "expo-router";
import { AppHeader } from "../../src/components/shell/AppHeader";
import { FloatingPillTabBar } from "../../src/components/navigation/FloatingPillTabBar";

const TITLES: Record<string, string> = {
  calendar: "Календарь",
  records: "Записи",
  clients: "Клиенты",
  profile: "Профиль",
  more: "Ещё",
};

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingPillTabBar {...props} />}
      screenOptions={({ route }) => ({
        header: () => <AppHeader title={TITLES[route.name] ?? "Beautica"} />,
      })}
    >
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="records" />
      <Tabs.Screen name="clients" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="more" />

      {/* Hidden routes still reachable by URL */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="appointments" options={{ href: null }} />
      <Tabs.Screen name="services" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
```

- [ ] **Step 2: Lint + tsc**

Run: `cd mobile && npm run lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Smoke-test on simulator**

Run: `cd mobile && npm start` (or `npm run ios`). Confirm five tabs render in the floating pill, tapping each navigates, active state shows accent-soft pill, no overlap with home indicator.

- [ ] **Step 4: Commit**

```bash
git add mobile/app/(tabs)/_layout.tsx
git commit -m "feat(mobile): mount FloatingPillTabBar with 5-tab nav order"
```

### Task 1.4: Delete unused `CustomTabBar`

**Files:**
- Delete: `mobile/src/components/navigation/CustomTabBar.tsx`

- [ ] **Step 1: Confirm no imports**

Run: `grep -rn "CustomTabBar" mobile/src mobile/app`
Expected: no matches.

- [ ] **Step 2: Delete and commit**

```bash
git rm mobile/src/components/navigation/CustomTabBar.tsx
git commit -m "chore(mobile/nav): drop unused CustomTabBar"
```

---

## Phase 2 — Master Calendar redesign

Mockup reference: `beautica-nav.html` lines 117–318. We split it into focused pieces.

### Task 2.1: `CalendarHeader`

**Files:**
- Create: `mobile/src/features/calendar/CalendarHeader.tsx`

- [ ] **Step 1: Implement header with month label + day/week toggle + search button**

```tsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../shared/theme/useTheme";

type Props = {
  monthLabel: string;        // "Апрель 2026"
  rangeLabel: string;        // "13 апреля" or "13 – 19 апр"
  view: "day" | "week";
  onChangeView: (v: "day" | "week") => void;
  onSearchPress?: () => void;
};

export function CalendarHeader({ monthLabel, rangeLabel, view, onChangeView, onSearchPress }: Props) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.row}>
      <View>
        <Text style={[styles.eyebrow, { color: colors.muted }]}>{monthLabel.toUpperCase()}</Text>
        <Text style={[styles.title, { color: colors.text, fontFamily: typography.fonts.serif }]}>{rangeLabel}</Text>
      </View>
      <View style={styles.right}>
        <View style={[styles.toggle, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          {(["day", "week"] as const).map((v) => {
            const active = view === v;
            return (
              <Pressable
                key={v}
                onPress={() => onChangeView(v)}
                style={[
                  styles.toggleBtn,
                  active && { backgroundColor: colors.card, borderColor: colors.borderLight },
                ]}
              >
                <Text style={{
                  fontSize: 11,
                  fontWeight: active ? "600" : "400",
                  color: active ? colors.accent : colors.muted,
                }}>
                  {v === "day" ? "День" : "Нед"}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={onSearchPress}
          style={[styles.iconBtn, { backgroundColor: colors.accentLight }]}
        >
          <MaterialCommunityIcons name="magnify" size={16} color={colors.accent} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  eyebrow: { fontSize: 10, fontWeight: "600", letterSpacing: 0.8 },
  title: { fontSize: 26, fontWeight: "500", letterSpacing: -0.5, lineHeight: 28 },
  right: { flexDirection: "row", alignItems: "center", gap: 8 },
  toggle: { flexDirection: "row", padding: 3, borderRadius: 10, borderWidth: 1 },
  toggleBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 7, borderWidth: 1, borderColor: "transparent" },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
```

- [ ] **Step 2: Lint + commit**

```bash
cd mobile && npm run lint
git add mobile/src/features/calendar/CalendarHeader.tsx
git commit -m "feat(mobile/calendar): CalendarHeader (month + day/week toggle)"
```

### Task 2.2: `DayWeekStrip` (day-view 7-day chips)

Mockup: lines 167–188.

**Files:**
- Create: `mobile/src/features/calendar/DayWeekStrip.tsx`

- [ ] **Step 1: Implement**

```tsx
import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { useTheme } from "../../shared/theme/useTheme";

const DAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

type Props = {
  weekDates: Date[];        // length 7
  selectedIndex: number;
  countsByIndex: number[];  // appointment counts per day
  onSelect: (index: number) => void;
};

export function DayWeekStrip({ weekDates, selectedIndex, countsByIndex, onSelect }: Props) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.row}>
      {weekDates.map((d, i) => {
        const active = i === selectedIndex;
        const cnt = countsByIndex[i] ?? 0;
        return (
          <Pressable
            key={d.toISOString()}
            onPress={() => onSelect(i)}
            style={[styles.cell, active && { backgroundColor: colors.accent }]}
          >
            <Text style={[styles.dow, { color: active ? "rgba(255,255,255,0.7)" : colors.muted }]}>
              {DAYS_SHORT[i]}
            </Text>
            <Text style={[styles.num, { color: active ? "#fff" : colors.text, fontFamily: typography.fonts.serif }]}>
              {d.getDate()}
            </Text>
            <View style={styles.dots}>
              {Array.from({ length: Math.min(cnt, 4) }).map((_, di) => (
                <View
                  key={di}
                  style={[
                    styles.dot,
                    { backgroundColor: active ? "rgba(255,255,255,0.6)" : colors.accent, opacity: active ? 1 : 0.5 },
                  ]}
                />
              ))}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 4, marginBottom: 12 },
  cell: { flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 12 },
  dow: { fontSize: 9, fontWeight: "600", letterSpacing: 0.4, textTransform: "uppercase" },
  num: { fontSize: 18, fontWeight: "400" },
  dots: { flexDirection: "row", gap: 2, marginTop: 3, height: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
```

- [ ] **Step 2: Lint + commit**

```bash
cd mobile && npm run lint
git add mobile/src/features/calendar/DayWeekStrip.tsx
git commit -m "feat(mobile/calendar): DayWeekStrip 7-day chip selector"
```

### Task 2.3: `WeekOverview` (week cards + per-day hourly heatmap)

Mockup: lines 191–236. Shows 7 day-cards with revenue bars and a 13-row hourly heatmap underneath.

**Files:**
- Create: `mobile/src/features/calendar/WeekOverview.tsx`

- [ ] **Step 1: Implement**

```tsx
import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { useTheme } from "../../shared/theme/useTheme";
import { categoryColor } from "../../shared/theme/categoryColor";

const DAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8..20

type DayData = {
  date: Date;
  revenueRub: number;
  appointmentCount: number;
  /** length === HOURS.length; each entry = { count, primaryCat } */
  hourly: Array<{ count: number; primaryCat?: string | null }>;
};

type Props = {
  days: DayData[];          // length 7
  selectedIndex: number;
  onSelect: (i: number) => void;
};

export function WeekOverview({ days, selectedIndex, onSelect }: Props) {
  const { colors, typography } = useTheme();
  const maxRev = Math.max(1, ...days.map((d) => d.revenueRub));

  return (
    <View style={{ marginBottom: 12 }}>
      <View style={styles.cardRow}>
        {days.map((d, i) => {
          const active = i === selectedIndex;
          const revPct = d.revenueRub / maxRev;
          return (
            <Pressable
              key={d.date.toISOString()}
              onPress={() => onSelect(i)}
              style={[
                styles.card,
                {
                  backgroundColor: active ? colors.accentLight : colors.surface,
                  borderColor: active ? colors.accent : colors.borderLight,
                },
              ]}
            >
              <Text style={[styles.dow, { color: active ? colors.accent : colors.muted }]}>
                {DAYS_SHORT[i]}
              </Text>
              <Text style={[styles.dayNum, {
                color: active ? colors.accent : colors.text,
                fontFamily: typography.fonts.serif,
              }]}>
                {d.date.getDate()}
              </Text>
              <View style={styles.barWrap}>
                <View style={[styles.bar, {
                  height: Math.max(2, revPct * 20),
                  backgroundColor: active ? colors.accent : colors.accentLight,
                }]} />
              </View>
              <Text style={[styles.cnt, { color: active ? colors.accent : colors.muted }]}>
                {d.appointmentCount}зап
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.heatLabel, { color: colors.muted }]}>ЗАГРУЖЕННОСТЬ ПО ЧАСАМ</Text>
      <View style={styles.heatRow}>
        {days.map((d, di) => {
          const active = di === selectedIndex;
          return (
            <Pressable key={`hm-${di}`} onPress={() => onSelect(di)} style={styles.heatCol}>
              {d.hourly.map((cell, hi) => {
                const c = cell.count > 0
                  ? (active ? colors.accent : categoryColor(colors, cell.primaryCat ?? null))
                  : colors.surface;
                const opacity = cell.count > 0 ? Math.min(1, 0.4 + cell.count * 0.3) : 0.3;
                return (
                  <View
                    key={`h-${HOURS[hi]}`}
                    style={[styles.heatCell, { backgroundColor: c, opacity }]}
                  />
                );
              })}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardRow: { flexDirection: "row", gap: 4, marginBottom: 8 },
  card: {
    flex: 1, alignItems: "center", borderWidth: 1.5, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 4,
  },
  dow: { fontSize: 9, fontWeight: "600", letterSpacing: 0.3, textTransform: "uppercase" },
  dayNum: { fontSize: 16, fontWeight: "400", lineHeight: 16 },
  barWrap: { width: "80%", height: 20, justifyContent: "flex-end" },
  bar: { width: "100%", borderRadius: 2 },
  cnt: { fontSize: 8 },
  heatLabel: { fontSize: 9, fontWeight: "600", letterSpacing: 0.6, marginBottom: 5 },
  heatRow: { flexDirection: "row", gap: 4 },
  heatCol: { flex: 1, gap: 1 },
  heatCell: { height: 4, borderRadius: 2 },
});
```

- [ ] **Step 2: Lint + commit**

```bash
cd mobile && npm run lint
git add mobile/src/features/calendar/WeekOverview.tsx
git commit -m "feat(mobile/calendar): WeekOverview with revenue bars + hourly heatmap"
```

### Task 2.4: `DayStatsStrip` and `DayTimelineStrip`

Mockup: lines 240–268.

**Files:**
- Create: `mobile/src/features/calendar/DayStatsStrip.tsx`
- Create: `mobile/src/features/calendar/DayTimelineStrip.tsx`

- [ ] **Step 1: `DayStatsStrip`**

```tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../shared/theme/useTheme";

type Stat = { label: string; value: string; accent?: boolean };

export function DayStatsStrip({ stats }: { stats: Stat[] }) {
  const { colors, typography } = useTheme();
  return (
    <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      {stats.map((s, i) => (
        <View
          key={s.label}
          style={[
            styles.cell,
            i < stats.length - 1 && { borderRightWidth: 1, borderRightColor: colors.borderLight },
          ]}
        >
          <Text style={[
            styles.value,
            { color: s.accent ? colors.accent : colors.text, fontFamily: typography.fonts.serif },
          ]}>
            {s.value}
          </Text>
          <Text style={[styles.label, { color: colors.muted }]}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: "row", borderWidth: 1, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 14, marginHorizontal: 16, marginBottom: 10 },
  cell: { flex: 1, alignItems: "center" },
  value: { fontSize: 17, fontWeight: "500" },
  label: { fontSize: 9, marginTop: 1 },
});
```

- [ ] **Step 2: `DayTimelineStrip`**

```tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "../../shared/theme/useTheme";
import { categoryColor } from "../../shared/theme/categoryColor";

const START_H = 8;
const HOURS_SPAN = 13; // 8..21

type Slot = { startsAt: string; endsAt: string; cat?: string | null };

export function DayTimelineStrip({ slots, now = new Date() }: { slots: Slot[]; now?: Date }) {
  const { colors } = useTheme();
  const minutesFromStart = (now.getHours() - START_H) * 60 + now.getMinutes();
  const totalMin = HOURS_SPAN * 60;
  const nowPct = Math.max(0, Math.min(1, minutesFromStart / totalMin));

  return (
    <View style={[styles.bar, { backgroundColor: colors.surface }]}>
      {slots.map((s, i) => {
        const start = new Date(s.startsAt);
        const end = new Date(s.endsAt);
        const left = ((start.getHours() * 60 + start.getMinutes() - START_H * 60) / totalMin) * 100;
        const width = Math.max(1, ((end.getTime() - start.getTime()) / 60000 / totalMin) * 100);
        return (
          <View
            key={`${s.startsAt}-${i}`}
            style={[
              styles.slot,
              {
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: categoryColor(colors, s.cat ?? null),
              },
            ]}
          />
        );
      })}
      <View style={[styles.now, { left: `${nowPct * 100}%`, backgroundColor: colors.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: "relative", height: 7, borderRadius: 4, marginHorizontal: 16, marginBottom: 10, overflow: "hidden" },
  slot: { position: "absolute", top: 0, bottom: 0, opacity: 0.75, borderRadius: 2 },
  now: { position: "absolute", top: 0, bottom: 0, width: 2, borderRadius: 1, zIndex: 2 },
});
```

- [ ] **Step 3: Lint + commit**

```bash
cd mobile && npm run lint
git add mobile/src/features/calendar/DayStatsStrip.tsx mobile/src/features/calendar/DayTimelineStrip.tsx
git commit -m "feat(mobile/calendar): DayStatsStrip + DayTimelineStrip"
```

### Task 2.5: `AgendaList` (vertical agenda for selected day)

Mockup: lines 272–311.

**Files:**
- Create: `mobile/src/features/calendar/AgendaList.tsx`

- [ ] **Step 1: Implement**

```tsx
import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useTheme } from "../../shared/theme/useTheme";
import { categoryColor } from "../../shared/theme/categoryColor";
import type { MasterAppointment } from "../../entities/appointments/api";

const STATUS_DOT: Record<string, string> = {
  confirmed: "#2A9E6A",
  pending: "#C4800A",
  completed: "#4A90D4",
  cancelled: "#C04040",
  cancelled_client: "#C04040",
  cancelled_staff: "#C04040",
  no_show: "#888",
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Подтверждена",
  pending: "Ожидает",
  completed: "Завершена",
  cancelled: "Отмена",
  cancelled_client: "Отмена",
  cancelled_staff: "Отмена",
  no_show: "Не пришёл",
};

function fmt(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type Props = {
  appointments: Array<MasterAppointment & { cat?: string | null }>;
  onSelect: (a: MasterAppointment) => void;
};

export function AgendaList({ appointments, onSelect }: Props) {
  const { colors } = useTheme();
  if (appointments.length === 0) {
    return <Text style={[styles.empty, { color: colors.muted }]}>Нет записей</Text>;
  }
  return (
    <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
      {appointments.map((a) => {
        const start = new Date(a.startsAt);
        const end = new Date(a.endsAt);
        const dur = Math.round((end.getTime() - start.getTime()) / 60000);
        const c = categoryColor(colors, a.cat ?? null);
        const dot = STATUS_DOT[a.status] ?? STATUS_DOT.confirmed;
        const label = STATUS_LABEL[a.status] ?? a.status;

        return (
          <Pressable key={a.id} onPress={() => onSelect(a)} style={styles.row}>
            <View style={styles.timeCol}>
              <Text style={[styles.time, { color: colors.text }]}>{fmt(start)}</Text>
              <Text style={[styles.dur, { color: colors.muted }]}>{dur}м</Text>
            </View>
            <View style={[styles.rail, { backgroundColor: `${c}50` }]}>
              <View style={[styles.railDot, { backgroundColor: c, borderColor: colors.bg }]} />
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <View style={styles.cardTop}>
                <Text numberOfLines={1} style={[styles.svc, { color: c }]}>{a.serviceName}</Text>
                <Text style={[styles.price, { color: colors.text }]}>
                  {(a.totalPriceCents / 100).toLocaleString("ru-RU")} ₽
                </Text>
              </View>
              <View style={styles.cardBottom}>
                <Text style={[styles.client, { color: colors.textSoft }]}>{a.clientLabel}</Text>
                <View style={styles.statusWrap}>
                  <View style={[styles.statusDot, { backgroundColor: dot }]} />
                  <Text style={[styles.statusLabel, { color: colors.muted }]}>{label}</Text>
                </View>
              </View>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 7 },
  empty: { textAlign: "center", paddingVertical: 40, fontSize: 13 },
  row: { flexDirection: "row", gap: 10, alignItems: "stretch" },
  timeCol: { width: 40, alignItems: "flex-end", paddingTop: 4 },
  time: { fontSize: 11, fontWeight: "600" },
  dur: { fontSize: 9, marginTop: 1 },
  rail: { width: 2, borderRadius: 1, position: "relative" },
  railDot: { position: "absolute", top: 10, left: -3, width: 8, height: 8, borderRadius: 4, borderWidth: 2 },
  card: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 11 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  svc: { fontSize: 12, fontWeight: "700", flex: 1, marginRight: 8 },
  price: { fontSize: 11, fontWeight: "600" },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 6 },
  client: { fontSize: 10 },
  statusWrap: { flexDirection: "row", alignItems: "center", gap: 3 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusLabel: { fontSize: 9 },
});
```

- [ ] **Step 2: Lint + commit**

```bash
cd mobile && npm run lint
git add mobile/src/features/calendar/AgendaList.tsx
git commit -m "feat(mobile/calendar): AgendaList for selected day"
```

### Task 2.6: Wire `(tabs)/calendar.tsx` to the new components

**Files:**
- Modify: `mobile/app/(tabs)/calendar.tsx`
- Modify: `mobile/src/features/calendar/MasterCalendar.tsx` (now an orchestrator)

- [ ] **Step 1: Replace `MasterCalendar` body**

```tsx
import React, { useMemo } from "react";
import { View, StyleSheet, Text } from "react-native";
import type { MasterAppointment } from "../../entities/appointments/api";
import { useTheme } from "../../shared/theme/useTheme";
import { DayWeekStrip } from "./DayWeekStrip";
import { WeekOverview } from "./WeekOverview";
import { DayStatsStrip } from "./DayStatsStrip";
import { DayTimelineStrip } from "./DayTimelineStrip";
import { AgendaList } from "./AgendaList";

type Props = {
  mode: "day" | "week";
  weekStart: Date;
  selectedIndex: number;
  appointments: MasterAppointment[];   // already filtered to weekStart..+7d
  onSelectDay: (i: number) => void;
  onSelectAppointment: (a: MasterAppointment) => void;
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);

export function MasterCalendar({
  mode, weekStart, selectedIndex, appointments, onSelectDay, onSelectAppointment,
}: Props) {
  const { colors, typography } = useTheme();

  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
  }), [weekStart]);

  const apptsByDayIdx = useMemo(() => {
    const buckets: MasterAppointment[][] = Array.from({ length: 7 }, () => []);
    appointments.forEach((a) => {
      const d = new Date(a.startsAt);
      for (let i = 0; i < 7; i++) {
        if (d.toDateString() === weekDates[i].toDateString()) {
          buckets[i].push(a);
          break;
        }
      }
    });
    return buckets;
  }, [appointments, weekDates]);

  const dayCounts = apptsByDayIdx.map((arr) => arr.length);

  const dayAppts = apptsByDayIdx[selectedIndex] ?? [];
  const dayRevenueRub = dayAppts.reduce((s, a) => s + a.totalPriceCents / 100, 0);

  const stats = [
    { label: "Записей", value: String(dayAppts.length) },
    { label: "Выручка", value: `${(dayRevenueRub / 1000).toFixed(1)}к ₽`, accent: true },
    { label: "Свободно", value: "—" }, // TODO: compute from working hours when API exposes
  ];

  if (mode === "week") {
    const weekData = weekDates.map((date, i) => {
      const arr = apptsByDayIdx[i];
      const revenueRub = arr.reduce((s, a) => s + a.totalPriceCents / 100, 0);
      const hourly = HOURS.map((h) => {
        const inHour = arr.filter((a) => new Date(a.startsAt).getHours() === h);
        return { count: inHour.length, primaryCat: (inHour[0] as any)?.cat ?? null };
      });
      return { date, revenueRub, appointmentCount: arr.length, hourly };
    });

    return (
      <View style={styles.container}>
        <WeekOverview days={weekData} selectedIndex={selectedIndex} onSelect={onSelectDay} />
        <DayStatsStrip stats={stats} />
        <Text style={[styles.divider, { color: colors.text, fontFamily: typography.fonts.serif }]}>
          {weekDates[selectedIndex].toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" })}
        </Text>
        <DayTimelineStrip slots={dayAppts.map((a) => ({ startsAt: a.startsAt, endsAt: a.endsAt, cat: (a as any).cat }))} />
        <AgendaList appointments={dayAppts as any} onSelect={onSelectAppointment} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DayWeekStrip
        weekDates={weekDates}
        selectedIndex={selectedIndex}
        countsByIndex={dayCounts}
        onSelect={onSelectDay}
      />
      <DayStatsStrip stats={stats} />
      <DayTimelineStrip slots={dayAppts.map((a) => ({ startsAt: a.startsAt, endsAt: a.endsAt, cat: (a as any).cat }))} />
      <AgendaList appointments={dayAppts as any} onSelect={onSelectAppointment} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  divider: { paddingHorizontal: 16, marginBottom: 6, fontSize: 16, fontWeight: "500" },
});
```

- [ ] **Step 2: Replace `(tabs)/calendar.tsx`**

```tsx
import React, { useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/shared/theme/useTheme";
import { useMasterAppointmentsQuery, type MasterAppointment } from "../../src/entities/appointments/api";
import { CalendarHeader } from "../../src/features/calendar/CalendarHeader";
import { MasterCalendar } from "../../src/features/calendar/MasterCalendar";
import { AppointmentSheet } from "../../src/features/appointments/AppointmentSheet";

const MONTH_RU = [
  "Январь","Февраль","Март","Апрель","Май","Июнь",
  "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь",
];

export default function CalendarScreen() {
  const { colors } = useTheme();
  const [view, setView] = useState<"day" | "week">("day");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [openAppt, setOpenAppt] = useState<MasterAppointment | null>(null);

  const weekStart = useMemo(() => {
    const now = new Date();
    const d = new Date(now);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday-based
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const range = useMemo(() => {
    const from = weekStart;
    const to = new Date(from); to.setDate(to.getDate() + 7);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }, [weekStart]);

  const { data } = useMasterAppointmentsQuery({ from: range.from, to: range.to, page: 1, pageSize: 200 });

  const monthLabel = `${MONTH_RU[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
  const selectedDate = new Date(weekStart); selectedDate.setDate(weekStart.getDate() + selectedIdx);
  const rangeLabel = view === "day"
    ? `${selectedDate.getDate()} ${MONTH_RU[selectedDate.getMonth()].toLowerCase().slice(0, -1)}я`.replace("ья","я")
    : `${weekStart.getDate()} – ${weekStart.getDate() + 6} ${MONTH_RU[weekStart.getMonth()].slice(0, 3).toLowerCase()}`;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <CalendarHeader
          monthLabel={monthLabel}
          rangeLabel={rangeLabel}
          view={view}
          onChangeView={setView}
        />
      </View>
      <MasterCalendar
        mode={view}
        weekStart={weekStart}
        selectedIndex={selectedIdx}
        appointments={data?.items ?? []}
        onSelectDay={setSelectedIdx}
        onSelectAppointment={setOpenAppt}
      />
      <AppointmentSheet appointment={openAppt} onClose={() => setOpenAppt(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12 },
});
```

- [ ] **Step 3: Note: `AppointmentSheet` doesn't exist yet — leave the import. The file will be written in Phase 3 (next). Don't run lint until Phase 3 lands.**

- [ ] **Step 4: Commit (do not lint yet — depends on Phase 3)**

```bash
git add mobile/app/(tabs)/calendar.tsx mobile/src/features/calendar/MasterCalendar.tsx
git commit -m "feat(mobile/calendar): rebuild master calendar shell + week/day modes"
```

---

## Phase 3 — Appointment Sheet (Details + Edit)

Mockup reference: `beautica-nav.html` lines 877–1112 + screenshots.

We use `@gorhom/bottom-sheet` (already installed) for proper backdrop + drag.

### Task 3.1: `AppointmentSheet` shell

**Files:**
- Create: `mobile/src/features/appointments/AppointmentSheet.tsx`

- [ ] **Step 1: Implement bottom sheet with header + tab bar + scroll body**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/features/appointments/AppointmentSheet.tsx
git commit -m "feat(mobile/appts): AppointmentSheet shell with Details/Edit tabs"
```

### Task 3.2: `AppointmentDetailsTab`

Mockup: lines 982–1026.

**Files:**
- Create: `mobile/src/features/appointments/AppointmentDetailsTab.tsx`

- [ ] **Step 1: Implement details rows + status-aware action buttons**

```tsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../api/client";
import { MASTER } from "../../api/endpoints";
import { useTheme } from "../../shared/theme/useTheme";
import type { MasterAppointment } from "../../entities/appointments/api";

function fmt(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type Props = { appointment: MasterAppointment; onEdit: () => void };

export function AppointmentDetailsTab({ appointment, onEdit }: Props) {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const start = new Date(appointment.startsAt);
  const end = new Date(appointment.endsAt);

  const patchStatus = useMutation({
    mutationFn: async (status: string) => {
      await apiClient.patch(MASTER.appointmentStatus(appointment.id), { status });
    },
    onSettled: () => { void qc.invalidateQueries({ queryKey: ["appointments"] }); },
  });

  const rows: Array<{ icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; label: string; value: string; accent?: boolean }> = [
    { icon: "account-outline", label: "Клиент", value: appointment.clientLabel },
    { icon: "scissors-cutting", label: "Услуга", value: appointment.serviceName },
    { icon: "calendar-blank-outline", label: "Дата", value: start.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) },
    { icon: "clock-outline", label: "Время", value: `${fmt(start)} – ${fmt(end)}` },
    { icon: "credit-card-outline", label: "Стоимость", value: `${(appointment.totalPriceCents / 100).toLocaleString("ru-RU")} ₽`, accent: true },
  ];

  return (
    <View>
      {rows.map((r, i) => (
        <View key={r.label} style={[styles.row, i < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
          <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
            <MaterialCommunityIcons name={r.icon} size={14} color={colors.muted} />
          </View>
          <Text style={[styles.label, { color: colors.muted }]}>{r.label}</Text>
          <Text style={[styles.value, { color: r.accent ? colors.accent : colors.text }]}>{r.value}</Text>
        </View>
      ))}

      <View style={styles.actions}>
        {appointment.status === "pending" && (
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => patchStatus.mutate("confirmed")}
              style={[styles.actionBtn, { backgroundColor: colors.greenLight, borderColor: `${colors.green}66` }]}
            >
              <Text style={[styles.actionText, { color: colors.green }]}>✓ Подтвердить</Text>
            </Pressable>
            <Pressable
              onPress={() => patchStatus.mutate("cancelled_staff")}
              style={[styles.actionBtn, { backgroundColor: colors.redLight, borderColor: `${colors.red}66` }]}
            >
              <Text style={[styles.actionText, { color: colors.red }]}>Отменить</Text>
            </Pressable>
          </View>
        )}
        {appointment.status === "confirmed" && (
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => patchStatus.mutate("completed")}
              style={[styles.actionBtn, { backgroundColor: colors.blueLight, borderColor: `${colors.blue}66` }]}
            >
              <Text style={[styles.actionText, { color: colors.blue }]}>Завершить</Text>
            </Pressable>
            <Pressable
              onPress={() => patchStatus.mutate("no_show")}
              style={[styles.actionBtn, { backgroundColor: colors.redLight, borderColor: `${colors.red}66` }]}
            >
              <Text style={[styles.actionText, { color: colors.red }]}>Не пришёл</Text>
            </Pressable>
          </View>
        )}
        <Pressable onPress={onEdit} style={[styles.primaryBtn, { backgroundColor: colors.accent }]}>
          <Text style={[styles.primaryText, { color: colors.accentText }]}>Редактировать запись</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  iconBox: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  label: { flex: 1, fontSize: 12 },
  value: { fontSize: 13, fontWeight: "600" },
  actions: { marginTop: 16, gap: 8 },
  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 100, borderWidth: 1.5, alignItems: "center" },
  actionText: { fontSize: 13, fontWeight: "600" },
  primaryBtn: { paddingVertical: 13, borderRadius: 100, alignItems: "center" },
  primaryText: { fontSize: 13, fontWeight: "600" },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/features/appointments/AppointmentDetailsTab.tsx
git commit -m "feat(mobile/appts): AppointmentDetailsTab with status actions"
```

### Task 3.3: `AppointmentEditTab`

Mockup: lines 1027–1106 + screenshot 2.

**Files:**
- Create: `mobile/src/features/appointments/AppointmentEditTab.tsx`

- [ ] **Step 1: Implement form (client/phone/service/master/time/price/status/comment)**

```tsx
import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../api/client";
import { MASTER } from "../../api/endpoints";
import { useTheme } from "../../shared/theme/useTheme";
import { categoryColor } from "../../shared/theme/categoryColor";
import type { MasterAppointment } from "../../entities/appointments/api";

function fmt(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const STATUS_OPTS: Array<{ value: string; label: string; dot: string }> = [
  { value: "pending", label: "Ожидает", dot: "#C4800A" },
  { value: "confirmed", label: "Подтверждена", dot: "#2A9E6A" },
  { value: "completed", label: "Завершена", dot: "#4A90D4" },
  { value: "cancelled_staff", label: "Отмена", dot: "#C04040" },
  { value: "no_show", label: "Не пришёл", dot: "#888" },
];

type Props = { appointment: MasterAppointment; onCancel: () => void; onSaved: () => void };

export function AppointmentEditTab({ appointment, onCancel, onSaved }: Props) {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const start = useMemo(() => new Date(appointment.startsAt), [appointment.startsAt]);
  const end = useMemo(() => new Date(appointment.endsAt), [appointment.endsAt]);

  const [client, setClient] = useState(appointment.clientLabel);
  const [phone, setPhone] = useState(appointment.clientPhone ?? "");
  const [timeStart, setTimeStart] = useState(fmt(start));
  const [timeEnd, setTimeEnd] = useState(fmt(end));
  const [priceRub, setPriceRub] = useState(String(Math.round(appointment.totalPriceCents / 100)));
  const [status, setStatus] = useState(appointment.status);
  const [comment, setComment] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      // Re-derive ISO times from existing date + new HH:MM
      const [sh, sm] = timeStart.split(":").map(Number);
      const [eh, em] = timeEnd.split(":").map(Number);
      const startsAt = new Date(start); startsAt.setHours(sh ?? 0, sm ?? 0, 0, 0);
      const endsAt = new Date(start); endsAt.setHours(eh ?? 0, em ?? 0, 0, 0);

      await apiClient.patch(MASTER.appointment(appointment.id), {
        clientLabel: client,
        clientPhone: phone || null,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        totalPriceCents: Math.max(0, Math.round(Number(priceRub) || 0) * 100),
        status,
        notes: comment || undefined,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["appointments"] });
      onSaved();
    },
  });

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>{label.toUpperCase()}</Text>
      {children}
    </View>
  );

  const inputStyle = [styles.input, { backgroundColor: colors.surface, borderColor: colors.borderInset, color: colors.text }];

  return (
    <View>
      <Field label="Клиент">
        <TextInput value={client} onChangeText={setClient} placeholder="Имя клиента" placeholderTextColor={colors.muted} style={inputStyle} />
      </Field>
      <Field label="Телефон">
        <TextInput value={phone} onChangeText={setPhone} placeholder="+7 ..." placeholderTextColor={colors.muted} style={inputStyle} keyboardType="phone-pad" />
      </Field>
      <Field label="Услуга">
        <View style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.borderInset, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
          <Text style={{ color: colors.text, fontSize: 13 }}>{appointment.serviceName}</Text>
          <MaterialCommunityIcons name="chevron-right" size={14} color={colors.muted} />
        </View>
      </Field>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="Время начала">
            <TextInput value={timeStart} onChangeText={setTimeStart} placeholder="10:00" placeholderTextColor={colors.muted} style={inputStyle} />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Время конца">
            <TextInput value={timeEnd} onChangeText={setTimeEnd} placeholder="11:00" placeholderTextColor={colors.muted} style={inputStyle} />
          </Field>
        </View>
      </View>

      <Field label="Стоимость (₽)">
        <TextInput value={priceRub} onChangeText={setPriceRub} placeholder="0" placeholderTextColor={colors.muted} style={inputStyle} keyboardType="numeric" />
      </Field>

      <Field label="Статус">
        <View style={{ backgroundColor: colors.surface, borderColor: colors.borderInset, borderWidth: 1.5, borderRadius: 12, overflow: "hidden" }}>
          {STATUS_OPTS.map((opt, i) => {
            const active = status === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setStatus(opt.value)}
                style={[
                  styles.statusRow,
                  active && { backgroundColor: `${opt.dot}14` },
                  i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderLight },
                ]}
              >
                <View style={[styles.statusDot, { backgroundColor: opt.dot }]} />
                <Text style={{ flex: 1, fontSize: 13, color: active ? colors.text : colors.textSoft, fontWeight: active ? "600" : "400" }}>
                  {opt.label}
                </Text>
                {active && <MaterialCommunityIcons name="check" size={14} color={opt.dot} />}
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="Комментарий">
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Заметка к записи..."
          placeholderTextColor={colors.muted}
          multiline
          style={[inputStyle, { minHeight: 56, paddingTop: 10, textAlignVertical: "top" }]}
        />
      </Field>

      <View style={styles.footer}>
        <Pressable onPress={onCancel} style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Text style={{ color: colors.textSoft, fontSize: 13, fontWeight: "500" }}>Назад</Text>
        </Pressable>
        <Pressable
          onPress={() => save.mutate()}
          disabled={save.isPending}
          style={[styles.btn, { flex: 2, backgroundColor: save.isPending ? `${colors.accent}80` : colors.accent }]}
        >
          <Text style={{ color: colors.accentText, fontSize: 13, fontWeight: "600" }}>
            {save.isPending ? "Сохранение..." : "Сохранить"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.6, marginBottom: 5 },
  input: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, fontSize: 13 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  footer: { flexDirection: "row", gap: 8, marginTop: 4, paddingBottom: 8 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 100, alignItems: "center", borderWidth: 1, borderColor: "transparent" },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/features/appointments/AppointmentEditTab.tsx
git commit -m "feat(mobile/appts): AppointmentEditTab form (status + fields)"
```

### Task 3.4: Drop the old `AppointmentQuickActionsSheet`

**Files:**
- Delete: `mobile/src/features/calendar/AppointmentQuickActionsSheet.tsx`

- [ ] **Step 1: Confirm callers updated**

Run: `grep -rn "AppointmentQuickActionsSheet" mobile/src mobile/app`
Expected: no matches (calendar.tsx now uses `AppointmentSheet`).

- [ ] **Step 2: Delete + lint + commit**

```bash
git rm mobile/src/features/calendar/AppointmentQuickActionsSheet.tsx
cd mobile && npm run lint && npx tsc --noEmit
git add -A
git commit -m "refactor(mobile/appts): replace QuickActionsSheet with AppointmentSheet"
```

- [ ] **Step 3: Smoke-test**

`cd mobile && npm start`. Tap an appointment in the calendar agenda → sheet opens, swipe to Edit, edit fields, Save → sheet closes; status pill action buttons mutate via existing API.

---

## Phase 4 — Appointments page (`records.tsx`)

Mockup: `beautica-nav.html` lines 320–420.

### Task 4.1: `AppointmentFilters` pill row

**Files:**
- Create: `mobile/src/features/appointments/AppointmentFilters.tsx`

- [ ] **Step 1: Implement**

```tsx
import React from "react";
import { ScrollView, Pressable, Text, View, StyleSheet } from "react-native";
import { useTheme } from "../../shared/theme/useTheme";

export type FilterId = "all" | "pending" | "confirmed" | "completed";

type Props = {
  active: FilterId;
  onChange: (id: FilterId) => void;
  pendingCount: number;
};

const ITEMS: Array<{ id: FilterId; label: string }> = [
  { id: "all", label: "Все" },
  { id: "pending", label: "Ожидают" },
  { id: "confirmed", label: "Подтв." },
  { id: "completed", label: "Завершены" },
];

export function AppointmentFilters({ active, onChange, pendingCount }: Props) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {ITEMS.map((f) => {
        const isAct = active === f.id;
        return (
          <Pressable
            key={f.id}
            onPress={() => onChange(f.id)}
            style={[
              styles.pill,
              {
                backgroundColor: isAct ? colors.accent : colors.surface,
                borderColor: isAct ? colors.accent : colors.borderLight,
              },
            ]}
          >
            <Text style={{ color: isAct ? colors.accentText : colors.textSoft, fontSize: 12, fontWeight: isAct ? "600" : "400" }}>
              {f.label}
            </Text>
            {f.id === "pending" && pendingCount > 0 ? (
              <View style={[styles.badge, { backgroundColor: isAct ? "rgba(255,255,255,0.3)" : colors.yellow }]}>
                <Text style={styles.badgeTxt}>{pendingCount}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 6, paddingBottom: 12 },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 100, borderWidth: 1 },
  badge: { paddingVertical: 1, paddingHorizontal: 5, borderRadius: 100 },
  badgeTxt: { color: "#fff", fontSize: 9, fontWeight: "700" },
});
```

- [ ] **Step 2: Commit**

```bash
cd mobile && npm run lint
git add mobile/src/features/appointments/AppointmentFilters.tsx
git commit -m "feat(mobile/appts): filter pill row"
```

### Task 4.2: `AppointmentListCard`

Mockup: lines 384–411.

**Files:**
- Create: `mobile/src/features/appointments/AppointmentListCard.tsx`

- [ ] **Step 1: Implement**

```tsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../shared/theme/useTheme";
import { categoryColor } from "../../shared/theme/categoryColor";
import type { MasterAppointment } from "../../entities/appointments/api";

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

type Props = { appointment: MasterAppointment & { cat?: string | null }; onPress: () => void };

export function AppointmentListCard({ appointment: a, onPress }: Props) {
  const { colors } = useTheme();
  const c = categoryColor(colors, a.cat ?? null);
  const dot = STATUS_DOT[a.status] ?? STATUS_DOT.confirmed;
  const label = STATUS_LABEL[a.status] ?? a.status;
  const start = new Date(a.startsAt);
  const end = new Date(a.endsAt);
  const dur = Math.round((end.getTime() - start.getTime()) / 60000);

  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <View style={[styles.stripe, { backgroundColor: c }]} />
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={[styles.svc, { color: c }]}>{a.serviceName}</Text>
          <Text style={[styles.price, { color: colors.text }]}>
            {(a.totalPriceCents / 100).toLocaleString("ru-RU")} ₽
          </Text>
        </View>
        <Text numberOfLines={1} style={[styles.client, { color: colors.textSoft }]}>{a.clientLabel}</Text>
        <Text style={[styles.meta, { color: colors.muted }]}>
          {start.getDate()} апр · {fmt(start)} – {fmt(end)} · {dur}мин
        </Text>
      </View>
      <View style={styles.right}>
        <View style={[styles.statusPill, { backgroundColor: `${dot}1F`, borderColor: `${dot}40` }]}>
          <View style={[styles.statusDot, { backgroundColor: dot }]} />
          <Text style={{ fontSize: 9, color: dot, fontWeight: "600" }}>{label}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={14} color={colors.muted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: 12, alignItems: "center", padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  stripe: { width: 4, height: 44, borderRadius: 2 },
  info: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  svc: { fontSize: 13, fontWeight: "700", flex: 1, marginRight: 8 },
  price: { fontSize: 12, fontWeight: "700" },
  client: { fontSize: 11, marginBottom: 5 },
  meta: { fontSize: 10 },
  right: { alignItems: "flex-end", gap: 6 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 100, borderWidth: 1 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
});
```

- [ ] **Step 2: Commit**

```bash
cd mobile && npm run lint
git add mobile/src/features/appointments/AppointmentListCard.tsx
git commit -m "feat(mobile/appts): styled list card"
```

### Task 4.3: Rebuild `(tabs)/records.tsx`

Mockup: lines 337–420.

**Files:**
- Modify: `mobile/app/(tabs)/records.tsx`

- [ ] **Step 1: Replace contents**

```tsx
import React, { useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/shared/theme/useTheme";
import { useMasterAppointmentsQuery, type MasterAppointment } from "../../src/entities/appointments/api";
import { AppointmentFilters, type FilterId } from "../../src/features/appointments/AppointmentFilters";
import { AppointmentListCard } from "../../src/features/appointments/AppointmentListCard";
import { AppointmentSheet } from "../../src/features/appointments/AppointmentSheet";

export default function RecordsScreen() {
  const { colors, typography } = useTheme();
  const [filter, setFilter] = useState<FilterId>("all");
  const [openAppt, setOpenAppt] = useState<MasterAppointment | null>(null);

  const range = useMemo(() => {
    const now = new Date();
    const from = new Date(now); from.setMonth(now.getMonth() - 1);
    const to = new Date(now);   to.setMonth(now.getMonth() + 1);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }, []);

  const apiStatus = filter === "all" ? "" : filter;
  const { data, isLoading, isError } = useMasterAppointmentsQuery({
    from: range.from, to: range.to, status: apiStatus, page: 1, pageSize: 100,
  });

  const items = data?.items ?? [];
  const pendingCount = items.filter((i) => i.status === "pending").length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.muted }]}>УПРАВЛЕНИЕ</Text>
            <Text style={[styles.title, { color: colors.text, fontFamily: typography.fonts.serif }]}>Записи</Text>
          </View>
        </View>
        <AppointmentFilters active={filter} onChange={setFilter} pendingCount={pendingCount} />
      </View>

      {isLoading ? <Text style={[styles.state, { color: colors.muted }]}>Загрузка...</Text> : null}
      {isError ? <Text style={[styles.state, { color: colors.red }]}>Не удалось загрузить</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <AppointmentListCard appointment={item as any} onPress={() => setOpenAppt(item)} />
        )}
        ListEmptyComponent={!isLoading ? <Text style={[styles.state, { color: colors.muted }]}>Нет записей</Text> : null}
      />

      <AppointmentSheet appointment={openAppt} onClose={() => setOpenAppt(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  eyebrow: { fontSize: 10, fontWeight: "600", letterSpacing: 0.8, marginBottom: 2 },
  title: { fontSize: 26, fontWeight: "500", letterSpacing: -0.4 },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  state: { textAlign: "center", paddingVertical: 24, fontSize: 13 },
});
```

- [ ] **Step 2: Lint + tsc + smoke**

Run: `cd mobile && npm run lint && npx tsc --noEmit`
Expected: no errors. Then on simulator: tap a row → sheet opens with Details + Edit.

- [ ] **Step 3: Commit**

```bash
git add mobile/app/(tabs)/records.tsx
git commit -m "feat(mobile/appts): rebuild Records screen with filters + sheet"
```

---

## Phase 5 — More screen (Bento)

Mockup: lines 627–874.

We use `expo-linear-gradient` for the bento card backgrounds.

### Task 5.1: `BentoCard` and `BentoGrid` primitives

**Files:**
- Create: `mobile/src/features/more/BentoCard.tsx`
- Create: `mobile/src/features/more/BentoGrid.tsx`

- [ ] **Step 1: `BentoCard`**

```tsx
import React from "react";
import { View, ViewStyle, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  gradient: [string, string];
  onPress?: () => void;
  style?: ViewStyle;
  children: React.ReactNode;
};

export function BentoCard({ gradient, onPress, style, children }: Props) {
  const Wrap = onPress ? Pressable : View;
  return (
    <Wrap onPress={onPress} style={[styles.shell, style]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>{children}</View>
    </Wrap>
  );
}

const styles = StyleSheet.create({
  shell: { borderRadius: 20, overflow: "hidden", minHeight: 130, padding: 16 },
  content: { flex: 1 },
});
```

- [ ] **Step 2: `BentoGrid`** (two-column row helper)

```tsx
import React from "react";
import { View, StyleSheet } from "react-native";

type Props = { left: React.ReactNode; right: React.ReactNode; leftFlex?: number; rightFlex?: number };

export function BentoRow({ left, right, leftFlex = 1.55, rightFlex = 1 }: Props) {
  return (
    <View style={styles.row}>
      <View style={{ flex: leftFlex }}>{left}</View>
      <View style={{ flex: rightFlex }}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: "row", gap: 10 } });
```

- [ ] **Step 3: Commit**

```bash
cd mobile && npm run lint
git add mobile/src/features/more/BentoCard.tsx mobile/src/features/more/BentoGrid.tsx
git commit -m "feat(mobile/more): bento primitives"
```

### Task 5.2: `RoleModeToggle`, `RevenueHeroCard`, `QuickActionsRow`

**Files:**
- Create: `mobile/src/features/more/RoleModeToggle.tsx`
- Create: `mobile/src/features/more/RevenueHeroCard.tsx`
- Create: `mobile/src/features/more/QuickActionsRow.tsx`

- [ ] **Step 1: `RoleModeToggle`** — accent-pill switch between «Мастер» and «Салон» (mockup lines 672–681).

```tsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../../shared/theme/useTheme";

type Mode = "master" | "salon";
type Props = { mode: Mode; onChange: (m: Mode) => void };

export function RoleModeToggle({ mode, onChange }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      {(["master", "salon"] as const).map((m) => {
        const active = mode === m;
        return (
          <Pressable
            key={m}
            onPress={() => onChange(m)}
            style={[styles.btn, active && { backgroundColor: colors.accent }]}
          >
            <Text style={{
              fontSize: 11,
              fontWeight: active ? "700" : "400",
              color: active ? colors.accentText : colors.muted,
            }}>
              {m === "master" ? "Мастер" : "Салон"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", padding: 3, borderRadius: 14, borderWidth: 1 },
  btn: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 11 },
});
```

- [ ] **Step 2: `RevenueHeroCard`** — dark gradient, big number, sparkline (mockup lines 707–729).

```tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../shared/theme/useTheme";

type Props = {
  label: string;       // "Выручка · Апрель"
  amountRub: number;   // 48200
  weekly: number[];    // 7 numbers
};

export function RevenueHeroCard({ label, amountRub, weekly }: Props) {
  const { colors, typography } = useTheme();
  const max = Math.max(1, ...weekly);
  return (
    <View style={styles.card}>
      <LinearGradient colors={["#1a1830", "#0e0c1e"]} style={StyleSheet.absoluteFill} />
      <View style={[styles.deco, { backgroundColor: `${colors.accent}24`, top: -28, right: -28, width: 110, height: 110 }]} />
      <View style={[styles.deco, { backgroundColor: `${colors.nails}1A`, bottom: -18, right: 30, width: 64, height: 64 }]} />
      <View style={styles.content}>
        <Text style={styles.eyebrow}>{label.toUpperCase()}</Text>
        <Text style={[styles.amount, { fontFamily: typography.fonts.serif }]}>
          {amountRub.toLocaleString("ru-RU")} <Text style={styles.amountUnit}>₽</Text>
        </Text>
        <View style={styles.bars}>
          {weekly.map((v, i) => (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  height: (v / max) * 28,
                  backgroundColor: i === weekly.length - 1 ? colors.accent : "rgba(255,255,255,0.25)",
                },
              ]}
            />
          ))}
        </View>
        <View style={styles.weekRow}>
          <Text style={styles.weekDow}>Пн</Text>
          <Text style={styles.weekDow}>Вс</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, overflow: "hidden", padding: 18, minHeight: 130, position: "relative" },
  deco: { position: "absolute", borderRadius: 9999 },
  content: { position: "relative", zIndex: 1 },
  eyebrow: { fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: "600", letterSpacing: 0.8, marginBottom: 4 },
  amount: { fontSize: 36, fontWeight: "500", color: "#fff", letterSpacing: -1, lineHeight: 36, marginBottom: 12 },
  amountUnit: { fontSize: 18, fontWeight: "300", opacity: 0.7 },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: 28 },
  bar: { flex: 1, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  weekRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  weekDow: { fontSize: 9, color: "rgba(255,255,255,0.4)" },
});
```

- [ ] **Step 3: `QuickActionsRow`** — row of round-pill icon buttons (mockup lines 731–750).

```tsx
import React from "react";
import { ScrollView, View, Pressable, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../shared/theme/useTheme";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
export type QuickAction = { id: string; label: string; icon: IconName; color: string; badge?: number; onPress?: () => void };

export function QuickActionsRow({ items }: { items: QuickAction[] }) {
  const { colors } = useTheme();
  return (
    <View>
      <Text style={[styles.eyebrow, { color: colors.muted }]}>РАЗДЕЛЫ</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((qa) => (
          <Pressable key={qa.id} onPress={qa.onPress} style={styles.btn}>
            <View style={[styles.circle, { backgroundColor: `${qa.color}20`, borderColor: `${qa.color}40` }]}>
              <MaterialCommunityIcons name={qa.icon} size={18} color={qa.color} />
              {qa.badge && qa.badge > 0 ? (
                <View style={[styles.badge, { backgroundColor: colors.accent, borderColor: colors.bg }]}>
                  <Text style={styles.badgeTxt}>{qa.badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, { color: colors.textSoft }]}>{qa.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 10, fontWeight: "600", letterSpacing: 0.7, marginBottom: 8, paddingLeft: 4 },
  row: { gap: 6 },
  btn: { alignItems: "center", gap: 5, paddingVertical: 2 },
  circle: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  badge: { position: "absolute", top: 2, right: 2, width: 14, height: 14, borderRadius: 7, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  badgeTxt: { color: "#fff", fontSize: 8, fontWeight: "700" },
  label: { fontSize: 9, fontWeight: "500" },
});
```

- [ ] **Step 4: Lint + commit**

```bash
cd mobile && npm run lint
git add mobile/src/features/more/RoleModeToggle.tsx mobile/src/features/more/RevenueHeroCard.tsx mobile/src/features/more/QuickActionsRow.tsx
git commit -m "feat(mobile/more): role toggle + revenue hero + quick actions row"
```

### Task 5.3: Compose `MoreScreen` with bento

Mockup: lines 662–871.

**Files:**
- Modify: `mobile/src/features/more/MoreScreen.tsx`

- [ ] **Step 1: Replace stub with full composition**

```tsx
import React, { useState } from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "../../shared/theme/useTheme";
import { useTodayQuery } from "../../entities/today/api";
import { useMeQuery } from "../../entities/me/api";
import { RoleModeToggle } from "./RoleModeToggle";
import { RevenueHeroCard } from "./RevenueHeroCard";
import { QuickActionsRow, type QuickAction } from "./QuickActionsRow";
import { BentoCard } from "./BentoCard";
import { BentoRow } from "./BentoGrid";

export function MoreScreen() {
  const { colors, typography } = useTheme();
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const { data: todayData } = useTodayQuery(today);
  const { data: me } = useMeQuery();
  const [mode, setMode] = useState<"master" | "salon">("master");

  const revenueRub = (todayData?.revenueCents ?? 0) / 100;
  const weekly = [28, 45, 38, 62, 55, 71, Math.max(20, revenueRub / 1000) || 48]; // placeholder until weekly API exists

  const quickActions: QuickAction[] = [
    { id: "services",  label: "Услуги",     icon: "shape-outline",        color: colors.nails,   onPress: () => router.push("/(settings)/services") },
    { id: "schedule",  label: "Расписание", icon: "clock-outline",         color: colors.hair,    onPress: () => router.push("/(settings)/schedule") },
    { id: "finance",   label: "Финансы",    icon: "credit-card-outline",  color: colors.massage, onPress: () => router.push("/(settings)/finances") },
    { id: "analytics", label: "Аналитика",  icon: "chart-line",           color: colors.makeup },
    { id: "notif",     label: "Уведомл.",   icon: "bell-outline",         color: colors.accent,  badge: me?.effectiveRoles?.pendingInvites ?? 0, onPress: () => router.push("/(settings)/notifications") },
    { id: "settings",  label: "Настройки",  icon: "cog-outline",          color: colors.muted },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.muted }]}>OVERVIEW</Text>
            <Text style={[styles.title, { color: colors.text, fontFamily: typography.fonts.serif }]}>Ещё</Text>
          </View>
          <RoleModeToggle mode={mode} onChange={setMode} />
        </View>

        <RevenueHeroCard label="Выручка · сегодня" amountRub={revenueRub} weekly={weekly} />

        <QuickActionsRow items={quickActions} />

        {/* Row 1: Services + Schedule */}
        <BentoRow
          left={
            <BentoCard gradient={[`${colors.nails}30`, `${colors.nails}08`]}>
              <Text style={[styles.bentoEyebrow, { color: colors.nails }]}>УСЛУГИ</Text>
              <Text style={[styles.bentoBig, { color: colors.text, fontFamily: typography.fonts.serif }]}>
                {todayData?.appointmentsCount ?? "—"}
              </Text>
              <Text style={[styles.bentoSub, { color: colors.textSoft }]}>записей сегодня</Text>
            </BentoCard>
          }
          right={
            <BentoCard gradient={[`${colors.massage}28`, `${colors.massage}06`]}>
              <Text style={[styles.bentoEyebrow, { color: colors.massage }]}>ГРАФИК</Text>
              <Text style={[styles.bentoSub, { color: colors.massage, marginTop: 6, fontWeight: "600" }]}>9:00–20:00</Text>
            </BentoCard>
          }
        />

        {/* Row 2: Salons + Finance */}
        <BentoRow
          leftFlex={1}
          rightFlex={1.55}
          left={
            <BentoCard gradient={[`${colors.brows}28`, `${colors.brows}06`]}>
              <Text style={[styles.bentoEyebrow, { color: colors.brows }]}>САЛОНЫ</Text>
              <Text style={[styles.bentoBig, { color: colors.text, fontFamily: typography.fonts.serif }]}>
                {me?.effectiveRoles?.salonMemberships?.length ?? 0}
              </Text>
            </BentoCard>
          }
          right={
            <BentoCard gradient={[`${colors.massage}28`, `${colors.massage}06`]}>
              <Text style={[styles.bentoEyebrow, { color: colors.massage }]}>ФИНАНСЫ</Text>
              <Text style={[styles.bentoBig, { color: colors.text, fontFamily: typography.fonts.serif }]}>
                {(revenueRub / 1000).toFixed(1)}к
              </Text>
              <Text style={[styles.bentoSub, { color: colors.muted }]}>Доход сегодня</Text>
            </BentoCard>
          }
        />

        {/* Notifications */}
        <BentoCard gradient={[`${colors.accent}1F`, `${colors.accent}08`]}>
          <Text style={[styles.bentoEyebrow, { color: colors.accent }]}>УВЕДОМЛЕНИЯ</Text>
          <Text style={[styles.bentoBig, { color: colors.text, fontSize: 18, marginTop: 4, fontFamily: typography.fonts.serif }]}>
            {me?.effectiveRoles?.pendingInvites ? `${me.effectiveRoles.pendingInvites} приглашение` : "Нет новых"}
          </Text>
        </BentoCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 80, gap: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, marginBottom: 4 },
  eyebrow: { fontSize: 10, fontWeight: "600", letterSpacing: 0.8, marginBottom: 2 },
  title: { fontSize: 26, fontWeight: "500", letterSpacing: -0.4, lineHeight: 26 },
  bentoEyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 0.7, marginBottom: 6 },
  bentoBig: { fontSize: 28, fontWeight: "500", lineHeight: 28, marginBottom: 8 },
  bentoSub: { fontSize: 11 },
});
```

- [ ] **Step 2: Lint + tsc + smoke**

Run: `cd mobile && npm run lint && npx tsc --noEmit`
Expected: no errors. Then on simulator: open the «Ещё» tab → role toggle, hero card, quick actions, bento grid all render and scroll cleanly.

- [ ] **Step 3: Delete the now-unused `(tabs)/index.tsx`**

Confirm no callers (deep links): `grep -rn "(tabs)/\\b\\|/(tabs)\"\\|router.push(\"/(tabs)\")\\|router.replace(\"/(tabs)\")" mobile/src mobile/app`. If any push to `/(tabs)` (the index), repoint them to `/(tabs)/calendar` or `/(tabs)/more` based on intent.

```bash
git rm mobile/app/\(tabs\)/index.tsx
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/features/more/MoreScreen.tsx mobile/app/\(tabs\)/_layout.tsx
git commit -m "feat(mobile/more): bento overview screen + drop legacy Today tab"
```

---

## Phase 6 — Profile screen polish

Mockup: lines 542–625.

### Task 6.1: Rebuild `(tabs)/profile.tsx`

**Files:**
- Modify: `mobile/app/(tabs)/profile.tsx`

- [ ] **Step 1: Replace re-export with full screen**

```tsx
import React from "react";
import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/shared/theme/useTheme";
import { useMeQuery } from "../../src/entities/me/api";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

type Section = { label: string; items: Array<{ icon: IconName; label: string; sub?: string; href?: string }> };

export default function ProfileScreen() {
  const { colors, typography } = useTheme();
  const router = useRouter();
  const { data: me } = useMeQuery();

  const initials = (me?.displayName ?? me?.phone ?? "•")
    .split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const pendingInvites = me?.effectiveRoles?.pendingInvites ?? 0;

  const stats: Array<{ label: string; value: string; accent?: boolean }> = [
    { label: "Визитов", value: "—" },     // TODO when stats endpoint lands
    { label: "Клиентов", value: "—" },
    { label: "Рейтинг", value: "—", accent: true },
  ];

  const sections: Section[] = [
    {
      label: "МОИ ДАННЫЕ",
      items: [
        { icon: "account-outline", label: "Личная информация", sub: "Имя, фото, контакты", href: "/(settings)/profile" },
        { icon: "star-outline", label: "Портфолио", sub: "—" },
      ],
    },
    {
      label: "БЕЗОПАСНОСТЬ",
      items: [
        { icon: "bell-outline", label: "Уведомления", sub: "Push и Telegram", href: "/(settings)/notifications" },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <LinearGradient
            colors={[`${colors.accent}24`, "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroRow}>
            <View style={[styles.avatar, { backgroundColor: `${colors.accent}22`, borderColor: `${colors.accent}55` }]}>
              <Text style={[styles.avatarText, { color: colors.accent, fontFamily: typography.fonts.serif }]}>{initials || "•"}</Text>
            </View>
            <View>
              <Text style={[styles.name, { color: colors.text, fontFamily: typography.fonts.serif }]}>
                {me?.displayName ?? "Профиль"}
              </Text>
              <Text style={[styles.phone, { color: colors.muted }]}>{me?.phone ?? ""}</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            {stats.map((s) => (
              <View key={s.label} style={[styles.statCell, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                <Text style={[styles.statValue, {
                  color: s.accent ? colors.yellow : colors.text,
                  fontFamily: typography.fonts.serif,
                }]}>
                  {s.value}
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.body}>
          {pendingInvites > 0 ? (
            <View style={[styles.invite, { backgroundColor: `${colors.accent}14`, borderColor: `${colors.accent}55` }]}>
              <MaterialCommunityIcons name="home-outline" size={18} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }}>Приглашение в салон</Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>{pendingInvites} ожидает решения</Text>
              </View>
              <View style={[styles.inviteBadge, { backgroundColor: colors.accent }]}>
                <Text style={styles.inviteBadgeText}>{pendingInvites}</Text>
              </View>
            </View>
          ) : null}

          {sections.map((section) => (
            <View key={section.label} style={{ marginBottom: 16 }}>
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>{section.label}</Text>
              <View style={[styles.sectionBody, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                {section.items.map((item, i) => (
                  <Pressable
                    key={item.label}
                    onPress={() => item.href && router.push(item.href as any)}
                    style={[
                      styles.itemRow,
                      i < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
                    ]}
                  >
                    <View style={[styles.itemIcon, { backgroundColor: colors.bg }]}>
                      <MaterialCommunityIcons name={item.icon} size={18} color={colors.muted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "500", color: colors.text }}>{item.label}</Text>
                      {item.sub ? <Text style={{ fontSize: 11, color: colors.muted }}>{item.sub}</Text> : null}
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={14} color={colors.muted} />
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 80 },
  hero: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16, position: "relative" },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  avatarText: { fontSize: 24, fontWeight: "500" },
  name: { fontSize: 22, fontWeight: "500", marginBottom: 1 },
  phone: { fontSize: 12 },
  statsRow: { flexDirection: "row", gap: 8 },
  statCell: { flex: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8, alignItems: "center", borderWidth: 1 },
  statValue: { fontSize: 22, fontWeight: "500" },
  statLabel: { fontSize: 9, marginTop: 1 },
  body: { paddingHorizontal: 16, paddingTop: 14 },
  invite: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1.5, marginBottom: 14 },
  inviteBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 100 },
  inviteBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  sectionLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.8, marginBottom: 8 },
  sectionBody: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 14 },
  itemIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
});
```

- [ ] **Step 2: Lint + commit**

```bash
cd mobile && npm run lint
git add mobile/app/\(tabs\)/profile.tsx
git commit -m "feat(mobile/profile): hero + stats + sections layout"
```

---

## Phase 7 — Clients screen polish

Mockup: lines 487–540.

### Task 7.1: Restyle list cards in `(tabs)/clients.tsx`

**Files:**
- Modify: `mobile/app/(tabs)/clients.tsx`

- [ ] **Step 1: Add summary stats strip + restyle each row**

The existing screen already has search + segment chips. Add these visual changes:
1. Insert a 3-up summary strip (Всего / VIP / Новые) above the list (mockup lines 506–514). Compute counts from `data` directly.
2. Replace the current `card` row with a horizontal row: avatar circle (initials, category-colored), name + tag pill, metadata line, chevron right.

Apply this diff to the JSX, after the chips wrapper:

```tsx
{/* Summary stats */}
<View style={styles.summaryRow}>
  {[
    { label: "Всего", value: data.length, color: colors.text },
    { label: "VIP", value: data.filter((c) => deriveClientSegment(c) === "vip").length, color: colors.yellow },
    { label: "Новые", value: data.filter((c) => deriveClientSegment(c) === "new").length, color: colors.accent },
  ].map((s) => (
    <View key={s.label} style={[styles.summaryCell, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <Text style={[styles.summaryValue, { color: s.color, fontFamily: typography.fonts.serif }]}>{s.value}</Text>
      <Text style={[styles.summaryLabel, { color: colors.muted }]}>{s.label}</Text>
    </View>
  ))}
</View>
```

And replace each card render block with:

```tsx
{rows.map((item) => {
  const visits = item.visitCount ?? item.visitsCount ?? 0;
  const segment = deriveClientSegment(item);
  const initials = (item.displayName ?? "•").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const tagCfg = segment === "vip"
    ? { label: "VIP", color: colors.yellow, bg: colors.yellowLight }
    : segment === "new"
    ? { label: "Новый", color: colors.accent, bg: colors.accentLight }
    : null;

  return (
    <View key={item.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <View style={[styles.avatar, { backgroundColor: colors.accentLight }]}>
        <Text style={[styles.avatarText, { color: colors.accent }]}>{initials}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.titleLine}>
          <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>
            {item.displayName || "Без имени"}
          </Text>
          {tagCfg ? (
            <View style={[styles.tag, { backgroundColor: tagCfg.bg }]}>
              <Text style={{ color: tagCfg.color, fontSize: 9, fontWeight: "700" }}>{tagCfg.label}</Text>
            </View>
          ) : null}
        </View>
        <Text style={{ fontSize: 11, color: colors.muted }}>
          {visits} визитов{item.phone ? ` · ${item.phone}` : ""}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={14} color={colors.muted} />
    </View>
  );
})}
```

Add the new styles to the existing `StyleSheet.create({...})`:

```ts
summaryRow: { flexDirection: "row", gap: 8, paddingHorizontal: 18, marginBottom: 12 },
summaryCell: { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 10, borderWidth: 1 },
summaryValue: { fontSize: 20, fontWeight: "500" },
summaryLabel: { fontSize: 10 },
card: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, marginBottom: 7 },
avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
avatarText: { fontSize: 13, fontWeight: "700" },
titleLine: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
name: { fontSize: 13, fontWeight: "600", flex: 1 },
tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 100 },
```

Also add the import:

```ts
import { MaterialCommunityIcons } from "@expo/vector-icons";
```

- [ ] **Step 2: Lint + commit**

```bash
cd mobile && npm run lint
git add mobile/app/\(tabs\)/clients.tsx
git commit -m "feat(mobile/clients): summary strip + redesigned client cards"
```

---

## Phase 8 — Final verification

### Task 8.1: Type-check, lint, lockup smoke

**Files:** none.

- [ ] **Step 1: Verify**

```bash
cd mobile && npm run lint && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 2: iOS smoke**

Run `cd mobile && npm run ios`. Walk: Calendar (day toggle, week toggle), tap an appointment → Sheet (Details + Edit, Save). Records (filters, tap row → same Sheet). Clients (summary + restyled rows). Profile (hero, stats, sections). More (role toggle, revenue hero, quick actions, bento grid scrollable). Floating-pill nav active state and badges should match mockup.

- [ ] **Step 3: Android smoke**

Repeat on Android emulator (`npm run android`). Pay special attention to:
- shadow rendering on `FloatingPillTabBar` (uses `elevation`).
- `LinearGradient` colors on dark hero card.
- `BottomSheet` close-by-pan.

- [ ] **Step 4: Capture follow-ups**

If any visual gap vs the mockup remains (e.g., haptics on tab tap need calibration, rich week-view heatmap needs a new server field for `primaryCat`, edit form lacks service/master selectors), append to `docs/vault/product/status.md` as a follow-up note. Do not extend this plan.

---

## Self-Review

- [x] **Spec coverage:**
  - Floating Pill nav (concept A) — Phase 1 ✓
  - Calendar exact-match for day + week, master-only — Phase 2 (with explicit deferral note for salon variant) ✓
  - Records list of styled blocks → tap opens Details/Edit sheet — Phases 3–4 ✓
  - "Ещё" Bento cards — Phase 5 ✓
  - Other pages styled to mockup (Profile, Clients) — Phases 6–7 ✓
- [x] **Placeholder scan:** No "TBD"/"similar to" ‒ each step contains code or precise instructions.
- [x] **Type consistency:** `MasterAppointment` is reused unchanged. `cat` is read defensively (`(a as any).cat`) because the existing API type doesn't yet expose it; flagged as a follow-up rather than introducing a fragile type extension here.
- [x] **External deps:** `@gorhom/bottom-sheet`, `expo-linear-gradient`, `expo-haptics`, `MaterialCommunityIcons` — all already in `mobile/package.json`. No installs needed.
