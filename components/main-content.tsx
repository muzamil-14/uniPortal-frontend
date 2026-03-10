'use client';

import { useSidebar } from '@/lib/sidebar-context';
import { ReactNode } from 'react';

export default function MainContent({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <main
      className={`min-h-screen transition-all duration-300 ${
        collapsed ? 'lg:pl-[68px]' : 'lg:pl-60'
      }`}
    >
      {children}
    </main>
  );
}
