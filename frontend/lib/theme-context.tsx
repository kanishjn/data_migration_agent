'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { Theme } from '@/types';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // Always use dark theme
  useEffect(() => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
    setMounted(true);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'dark', resolvedTheme: 'dark' }}>
      <div style={{ visibility: mounted ? 'visible' : 'hidden' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
