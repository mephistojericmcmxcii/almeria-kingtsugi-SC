
'use client';

import Header from '@/components/layout/header';
import MainSidebar from '@/components/layout/main-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function PublicPagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <MainSidebar />
        <div className="flex flex-col w-full">
          <Header />
          <main className="flex-1 overflow-y-auto bg-background p-4 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
