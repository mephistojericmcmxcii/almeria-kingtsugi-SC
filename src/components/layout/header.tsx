
"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { UserNav } from "../auth/user-nav";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "./global-search";

const NotificationDropdown = lazy(() => import('./notification-dropdown').then(module => ({ default: module.default })));


const Header = () => {
  const { user } = useAuth();
  const { open } = useSidebar();
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const getGreeting = () => {
      const hours = new Date().getHours();
      if (hours < 12) return "Good morning";
      if (hours < 18) return "Good afternoon";
      return "Good evening";
    };
    setGreeting(getGreeting());
  }, []);
  
  return (
    <header className="sticky top-0 z-10 grid h-16 w-full grid-cols-3 items-center gap-4 border-b-2 border-b-foreground/20 bg-primary px-4 md:px-6">
      <div className="flex items-center gap-4">
          {/* Desktop sidebar trigger (visible when collapsed) */}
          <SidebarTrigger className={cn("hidden h-7 w-7 -ml-2", !open && "md:flex")} />
          
          {/* Mobile sidebar trigger */}
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
      </div>
      
      <div className="flex justify-center">
        <GlobalSearch />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Suspense fallback={null}>
            <NotificationDropdown />
        </Suspense>
        <UserNav />
      </div>
    </header>
  );
};

export default Header;
