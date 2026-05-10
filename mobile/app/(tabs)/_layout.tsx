import React from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../src/shared/theme/useTheme";
import { CenterFabButton } from "../../src/features/nav/CenterFabButton";
import { CreateActionSheet } from "../../src/features/nav/CreateActionSheet";
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
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingBottom: 8,
          },
          tabBarItemStyle: {},
        }}
      >
        <Tabs.Screen
          name="calendar"
          options={{
            title: "Календарь",
            tabBarIcon: tabIcon("calendar"),
          }}
        />
        <Tabs.Screen
          name="clients"
          options={{
            title: "Клиенты",
            tabBarIcon: tabIcon("users"),
            tabBarItemStyle: { marginRight: 40 },
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: "Бизнес",
            tabBarIcon: tabIcon("grid"),
            tabBarItemStyle: { marginLeft: 40 },
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Профиль",
            tabBarIcon: tabIcon("user"),
          }}
        />
        {/* Hidden screens for navigation within tabs */}
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="appointments" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="services" options={{ href: null }} />
        <Tabs.Screen
          name="services-screen"
          options={{
            href: null,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="schedule-screen"
          options={{
            href: null,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="finances-screen"
          options={{
            href: null,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="notifications-screen"
          options={{
            href: null,
            headerShown: false,
          }}
        />
      </Tabs>
      <CenterFabButton onPress={open} />
      <CreateActionSheet />
    </View>
  );
}
