import React from "react";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../src/shared/theme/useTheme";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

function tabIcon(name: FeatherName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Feather name={name} color={color} size={size} />
  );
}

export default function TabLayout() {
  const { colors } = useTheme();

  return (
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
        name="profile"
        options={{ title: "Профиль", tabBarIcon: tabIcon("user") }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: "Ещё", tabBarIcon: tabIcon("more-horizontal") }}
      />
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="appointments" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="services" options={{ href: null }} />
    </Tabs>
  );
}
