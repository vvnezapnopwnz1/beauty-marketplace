import React, { createContext, useMemo } from "react";
import { StatusBar } from "expo-status-bar";
import { useThemeStore } from "../../stores/themeStore";
import { TYPOGRAPHY } from "./tokens";
import { DEFAULT_LIGHT_ID, THEMES_MAP } from "./themes";

type ThemeContextValue = {
  colors: any;
  typography: typeof TYPOGRAPHY;
  themeId: string;
  setThemeId: any;
  availableThemes: string[];
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

type Props = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: Props) {
  const themeId = useThemeStore((state) => state.themeId);
  const setThemeId = useThemeStore((state) => state.setThemeId);

  const colors = THEMES_MAP[themeId] ?? THEMES_MAP[DEFAULT_LIGHT_ID];
  const statusBarStyle = colors.kind === "dark" ? "light" : "dark";

  const value = useMemo(
    () => ({
      colors,
      typography: TYPOGRAPHY,
      themeId: colors.id,
      setThemeId,
      availableThemes: Object.keys(THEMES_MAP),
    }),
    [colors, setThemeId]
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={statusBarStyle} />
      {children}
    </ThemeContext.Provider>
  );
}
