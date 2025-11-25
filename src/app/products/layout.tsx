
'use client';

import Header from '@/components/layout/header';
import MainSidebar from '@/components/layout/main-sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';

function PublicContent({ children }: { children: React.ReactNode }) {
    const { setOpen } = useSidebar();
    return (
        <div className="flex flex-col w-full h-screen">
            <Header />
            <ScrollArea className="flex-1" onClick={() => setOpen(false)}>
                <main className="p-4 md:p-8">
                    {children}
                </main>
            </ScrollArea>
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
