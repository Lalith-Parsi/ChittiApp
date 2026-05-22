import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeColors, light, dark } from './theme';

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  colors: light,
  toggleTheme: () => {},
});

const STORAGE_KEY = 'chitti_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [override, setOverride] = useState<'dark' | 'light' | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val === 'dark' || val === 'light') setOverride(val);
      setReady(true);
    });
  }, []);

  const isDark = override !== null ? override === 'dark' : system === 'dark';
  const colors = isDark ? dark : light;

  const toggleTheme = () => {
    const next: 'dark' | 'light' = isDark ? 'light' : 'dark';
    setOverride(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  };

  if (!ready) return null;

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
