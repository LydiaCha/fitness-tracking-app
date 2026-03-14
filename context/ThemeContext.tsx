import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppThemeDark, AppThemeLight, AppThemeType } from '@/constants/theme';
import { STORAGE_KEYS } from '@/utils/appConstants';
import { safeGetItem, safeSetItem } from '@/utils/storage';
import { logger } from '@/utils/logger';

interface ThemeCtx {
  theme:       AppThemeType;
  isDark:      boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: AppThemeDark,
  isDark: true,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    safeGetItem(STORAGE_KEYS.THEME).then(v => {
      if (v !== null) setIsDark(v === 'dark');
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      safeSetItem(STORAGE_KEYS.THEME, next ? 'dark' : 'light').then(ok => {
        if (!ok) logger.warn('general', 'toggleTheme', 'Failed to persist theme preference');
      });
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: isDark ? AppThemeDark : AppThemeLight, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeCtx {
  return useContext(ThemeContext);
}
