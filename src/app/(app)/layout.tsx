
"use client";

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { SidebarProvider, Sidebar, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import MainSidebar from '@/components/layout/main-sidebar';
import Header from '@/components/layout/header';
import { cn } from '@/lib/utils';

function AppContent({ children }: { children: React.ReactNode }) {
  const { setOpen } = useSidebar();
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  return (
    <div className="flex flex-col w-full">
      <Header />
      <main 
        onClick={() => setOpen(false)}
        className={cn(
        "flex-1 overflow-y-auto bg-background",
        isHomePage ? "p-0" : "p-4 md:p-8"
      )}>
          {children}
      </main>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  return (
    <SidebarProvider>
      <MainSidebar />
      <AppContent>
        {children}
      </AppContent>
    </SidebarProvider>
  );
}
