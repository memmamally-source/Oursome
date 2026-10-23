import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useSettings } from '@/features/settings/store';

import { darkPalette, lightPalette, type Accent, type AccentKey, type Palette } from './tokens';

type ThemeValue = { palette: Palette; isDark: boolean; accent: (key: AccentKey) => Accent };

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const preference = useSettings((s) => s.theme);
  const isDark = preference === 'system' ? system === 'dark' : preference === 'dark';
  const value = useMemo<ThemeValue>(() => {
    const palette = isDark ? darkPalette : lightPalette;
    return { palette, isDark, accent: (key) => palette.accents[key] };
  }, [isDark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
