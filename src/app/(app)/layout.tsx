"use client";

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import MainSidebar from '@/components/layout/main-sidebar';
import Header from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If the auth state is not loading and there's no user, redirect to login.
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // While loading, show a skeleton screen. This prevents the redirect from happening prematurely.
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="p-8 space-y-4 flex flex-col items-center">
            <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }
  
  // If there is no user after loading, we don't render the layout to prevent a flash of content.
  if (!user) {
      return null;
  }

  return (
    <SidebarProvider>
      <MainSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-1 overflow-y-auto bg-background p-4 pt-20 md:p-8 md:pt-24">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
