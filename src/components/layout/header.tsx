
"use client";

import Link from "next/link";
import { useState, useEffect, lazy, Suspense } from "react";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { UserNav } from "../auth/user-nav";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "./global-search";
import { Button } from "../ui/button";
import { ShoppingCart } from "lucide-react";

const NotificationDropdown = lazy(() => import('./notification-dropdown').then(module => ({ default: module.default })));


const Header = () => {
  const { user, cart } = useAuth();
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
  
  const cartItemCount = cart?.length || 0;

  return (
    <header className="sticky top-0 z-10 grid h-16 w-full grid-cols-[auto_1fr_auto] items-center gap-4 border-b-2 border-b-foreground/20 bg-primary px-4 md:px-6">
      <div className="flex items-center gap-4">
          {/* Desktop sidebar trigger (visible when collapsed) */}
          <SidebarTrigger className={cn("hidden h-7 w-7 -ml-2", !open && "md:flex")} />
          
          {/* Mobile sidebar trigger */}
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
      </div>
      
      <div className="flex justify-start">
        <GlobalSearch />
      </div>

      <div className="flex items-center justify-end gap-2">
         {user && (
          <Button asChild variant="secondary" size="icon" className="h-10 w-10 rounded-full bg-black/10 hover:bg-black/20 relative">
            <Link href="/profile?tab=quotation">
              <ShoppingCart className="h-6 w-6 text-white" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                  {cartItemCount}
                </span>
              )}
               <span className="sr-only">View Cart</span>
            </Link>
          </Button>
        )}
        <Suspense fallback={null}>
            <NotificationDropdown />
        </Suspense>
        <UserNav />
      </div>
    </header>
  );
};

export default Header;
