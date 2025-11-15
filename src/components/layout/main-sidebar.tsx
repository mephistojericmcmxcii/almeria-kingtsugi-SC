"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  Info,
  Gem,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { UserNav } from "../auth/user-nav";

const MainSidebar = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const menuItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ['admin', 'guest'],
    },
    {
      href: "/admin",
      label: "Admin",
      icon: Settings,
      roles: ['admin'],
    },
    {
      href: "/about",
      label: "About Us",
      icon: Info,
      roles: ['admin', 'guest'],
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Gem className="h-6 w-6 text-primary" />
            </div>
            <span className="font-headline text-lg font-semibold">Kintsugi</span>
        </div>
      </SidebarHeader>
      <SidebarMenu className="flex-1">
        {menuItems.map((item) =>
          item.roles.includes(user?.role || '') ? (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ) : null
        )}
      </SidebarMenu>
      <SidebarFooter>
        <div className="md:hidden">
            <UserNav />
        </div>
        <SidebarMenuButton onClick={logout}>
            <LogOut />
            <span>Logout</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
};

export default MainSidebar;
