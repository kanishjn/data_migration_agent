'use client';

import { cn } from '@/lib/utils';
import { useApp } from '@/lib/app-context';

interface MainContentProps {
  children: React.ReactNode;
  className?: string;
}

export function MainContent({ children, className }: MainContentProps) {
  const { sidebarCollapsed } = useApp();

  return (
    <main
      className={cn(
        'min-h-screen pt-16 transition-all duration-300 ease-out',
        className
      )}
      style={{
        marginLeft: sidebarCollapsed ? 72 : 260,
      }}
    >
      <div className="p-6 lg:p-8">{children}</div>
    </main>
  );
}
