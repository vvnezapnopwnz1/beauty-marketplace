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
