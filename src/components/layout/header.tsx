
"use client";

import { useState, useEffect } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "../auth/user-nav";
import { useAuth } from "@/hooks/use-auth";

const Header = () => {
  const { user } = useAuth();
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
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b-2 border-b-foreground/20 bg-primary text-primary-foreground px-4 md:px-6 w-full">
      <SidebarTrigger className="hidden md:flex h-14 w-14 -ml-2" />
      <div className="flex-1">
        <h1 className="text-lg font-semibold md:hidden">
            {greeting}, {user?.displayName?.split(' ')[0]}!
        </h1>
      </div>
      <div className="md:hidden">
         <SidebarTrigger />
      </div>
      <UserNav />
    </header>
  );
};

export default Header;
