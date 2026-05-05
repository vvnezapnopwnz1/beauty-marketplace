import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeState {
  activePaletteName: string;
  setActivePaletteName: (name: string) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      activePaletteName: 'Ivory Date',
      setActivePaletteName: (name) => set({ activePaletteName: name }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
