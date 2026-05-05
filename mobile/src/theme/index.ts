import { PALETTES, Palette } from './palettes';
import { TYPOGRAPHY } from './typography';
import { useThemeStore } from '../stores/themeStore';

export const useTheme = () => {
  const activePaletteName = useThemeStore((state) => state.activePaletteName);
  const setActivePaletteName = useThemeStore((state) => state.setActivePaletteName);

  const colors = PALETTES[activePaletteName] || PALETTES['Ivory Date'];

  return {
    colors,
    typography: TYPOGRAPHY,
    activePaletteName,
    setPalette: setActivePaletteName,
    availablePalettes: Object.keys(PALETTES),
  };
};

export * from './palettes';
export * from './typography';
