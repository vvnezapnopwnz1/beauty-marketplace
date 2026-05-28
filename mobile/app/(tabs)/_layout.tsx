import React from "react";
import { Text, View } from "react-native";
import { Tabs, usePathname } from "expo-router";
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
  return <Text>tabs root</Text>;
  // const { colors } = useTheme();
  // const { open } = useCreateAction();
  // const pathname = usePathname();
  // const hideFab =
  //   pathname.includes("appointment-new") ||
  //   pathname.includes("clients-new") ||
  //   pathname.includes("services-new");

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="calendar"
          options={{
            title: "Календарь",
            tabBarIcon: tabIcon("calendar"),
          }}
        />
        {/* Временно отключили остальные табы и скрытые экраны, чтобы изолировать крэш */}
      </Tabs>
      {/* {!hideFab && <CenterFabButton onPress={open} />} */}
      {/* {!hideFab && <CreateActionSheet />} */}
    </View>
  );
}
