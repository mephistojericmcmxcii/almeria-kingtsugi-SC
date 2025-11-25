
'use client';

import Header from '@/components/layout/header';
import MainSidebar from '@/components/layout/main-sidebar';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';


function PublicContent({ children }: { children: React.ReactNode }) {
    const { setOpen } = useSidebar();
    return (
        <div className="flex flex-col w-full">
            <Header />
            <main onClick={() => setOpen(false)} className="flex-1 overflow-y-auto bg-background p-4 md:p-8">
                {children}
            </main>
        </div>
    )
}

export default function PublicPagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
        <MainSidebar />
        <PublicContent>{children}</PublicContent>
    </SidebarProvider>
  );
}
