'use client';

import { ThemeProvider } from '@/lib/theme-context';
import { ApiProvider } from '@/lib/api-context';
import { AppProvider } from '@/lib/app-context';
import { Sidebar, TopBar } from '@/components/layout';
import { RingScene } from '@/components/three';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ApiProvider>
        <AppProvider>
        {/* Premium black background with grid pattern */}
        <div className="premium-background" aria-hidden="true" />
        {/* 3D Ring Scene */}
        <RingScene />
        {/* Noise/grain overlay for texture like template */}
        <div className="noise-overlay" aria-hidden="true" />
        <Sidebar />
        <TopBar />
        {children}
        </AppProvider>
      </ApiProvider>
    </ThemeProvider>
  );
}
