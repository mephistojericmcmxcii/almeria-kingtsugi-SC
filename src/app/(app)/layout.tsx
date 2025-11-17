
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
  const isHomePage = pathname === '/home';

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

  useEffect(() => {
    // If the authentication check is complete and there's still no user,
    // then it's safe to redirect to the login page.
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // While the authentication state is being determined, show a loading screen.
  // This prevents the redirect from happening prematurely on page refresh.
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="p-8 space-y-4 flex flex-col items-center">
            <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-muted-foreground">Restoring your session...</p>
        </div>
      </div>
    );
  }
  
  // If there is no user after the loading is complete, we don't render the layout,
  // allowing the useEffect to handle the redirect.
  if (!user) {
      return null;
  }
  
  return (
    <SidebarProvider>
      <MainSidebar />
      <AppContent>
        {children}
      </AppContent>
    </SidebarProvider>
  );
}
