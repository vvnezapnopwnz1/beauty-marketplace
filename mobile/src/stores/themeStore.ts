import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_LIGHT_ID, isThemeId, type ThemeId } from '../shared/theme/themes';

interface ThemeState {
  themeId: ThemeId;
  setThemeId: (themeId: ThemeId) => void;
  activePaletteName: string;
  setActivePaletteName: (name: string) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeId: DEFAULT_LIGHT_ID,
      setThemeId: (themeId) => set({ themeId, activePaletteName: themeId }),
      activePaletteName: DEFAULT_LIGHT_ID,
      setActivePaletteName: (name) =>
        set({
          activePaletteName: name,
          themeId: isThemeId(name) ? name : DEFAULT_LIGHT_ID,
        }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persistedState) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return persistedState as ThemeState;
        }

        const state = persistedState as Partial<ThemeState>;
        const rawThemeId = state.themeId;
        const rawActivePaletteName = state.activePaletteName;
        const migratedThemeId = isThemeId(String(rawThemeId))
          ? rawThemeId
          : isThemeId(String(rawActivePaletteName))
            ? (rawActivePaletteName as ThemeId)
            : DEFAULT_LIGHT_ID;

        return {
          ...state,
          themeId: migratedThemeId,
          activePaletteName: migratedThemeId,
        } as ThemeState;
      },
    }
  )
);
