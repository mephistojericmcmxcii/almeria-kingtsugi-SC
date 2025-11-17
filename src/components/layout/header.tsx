
"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "../auth/user-nav";
import { useAuth } from "@/hooks/use-auth";

const Header = () => {
  const { user } = useAuth();
  
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return "Good morning";
    if (hours < 18) return "Good afternoon";
    return "Good evening";
  };
  
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6 w-full">
      <SidebarTrigger className="hidden md:flex" />
      <div className="flex-1">
        <h1 className="text-lg font-semibold md:hidden">
            {getGreeting()}, {user?.displayName?.split(' ')[0]}!
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
