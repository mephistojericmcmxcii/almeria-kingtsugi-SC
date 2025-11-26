
"use client";

import { useState, useEffect } from "react";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { UserNav } from "../auth/user-nav";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "./global-search";
import { Button } from "../ui/button";
import { Bell } from "lucide-react";

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
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b-2 border-b-foreground/20 bg-primary px-4 md:px-6 w-full">
      {/* Desktop sidebar trigger (visible when collapsed) */}
      <SidebarTrigger className={cn("hidden h-7 w-7 -ml-2", !open && "md:flex")} />
      
      {/* Mobile sidebar trigger */}
      <div className="md:hidden">
         <SidebarTrigger />
      </div>

      {/* Mobile Search Bar */}
      <div className="md:hidden flex-1">
         <GlobalSearch />
      </div>
      
      {/* Desktop Search Bar */}
      <div className="hidden md:flex flex-1 justify-center">
         <GlobalSearch />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-black/10 hover:bg-black/20">
          <Bell className="h-6 w-6 text-white" />
        </Button>
        <UserNav />
      </div>
    </header>
  );
};

export default Header;
