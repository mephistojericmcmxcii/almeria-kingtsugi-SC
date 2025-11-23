
'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Info,
  Gem,
  Settings,
  LogOut,
  Briefcase,
  Boxes,
  CreditCard,
  FileText,
  ChevronDown,
  ShoppingCart,
  UserCog,
  UserPlus,
  User,
  Home,
  Package,
  FileQuestion,
  Send,
  Star,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { UserNav } from "../auth/user-nav";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const MainSidebar = () => {
  const pathname = usePathname();
  const { user, logout, showAdminOrderBadge, showAdminRfqBadge } = useAuth();
  const [managementOpen, setManagementOpen] = React.useState(false);

  React.useEffect(() => {
    if (pathname.startsWith('/management')) {
      setManagementOpen(true);
    } else {
      setManagementOpen(false);
    }
  }, [pathname]);

  const menuItems = [
    {
      href: "/",
      label: "Home",
      icon: Home,
      adminOnly: false,
    },
    {
      href: "/products",
      label: "Products",
      icon: Package,
      adminOnly: false,
    },
    {
      href: "/products/quotation-request",
      label: "Request for Quotation",
      icon: Send,
      adminOnly: false,
    },
     {
      href: "/about",
      label: "About Us",
      icon: Info,
      adminOnly: false,
    },
    {
      href: "/reviews",
      label: "Customer Reviews",
      icon: Star,
      adminOnly: false,
    },
    {
      href: "/admin",
      label: "Admin",
      icon: Settings,
      adminOnly: true,
    },
  ];

  const managementMenuItems = [
    { href: '/management/inventory', label: 'Inventory', icon: Boxes, notification: false },
    { href: '/management/orders', label: 'Orders', icon: ShoppingCart, notification: showAdminOrderBadge || showAdminRfqBadge },
    { href: '/management/po-payment', label: 'PO Payment', icon: CreditCard, notification: false },
    { href: '/management/po', label: 'Purchase Order', icon: FileText, notification: false },
  ];

  const isManagementActive = managementMenuItems.some(item => pathname.startsWith(item.href));

  const KintsugiLogo = () => (
    <svg width="150" height="42" viewBox="0 0 458 128" fill="none" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
      <image href="data:image/png;base64,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" alt="Kintsugi Variety Shop" className="h-10"/>
    </svg>
  );

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
            <KintsugiLogo />
        </div>
      </SidebarHeader>
      <SidebarMenu className="flex-1">
        {menuItems.map((item) => {
          if (item.adminOnly && user?.role !== 'admin') {
            return null;
          }
          return (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href!}>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            )
        })}
        
        {user?.role === 'admin' && (
            <Collapsible open={managementOpen} onOpenChange={setManagementOpen} asChild>
                <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip="Management" isActive={isManagementActive}>
                            <Briefcase />
                            <span>Management</span>
                            <ChevronDown className={cn("ml-auto transition-transform", managementOpen && "rotate-180")} />
                        </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent asChild>
                        <SidebarMenuSub>
                            {managementMenuItems.map(item => (
                                <SidebarMenuItem key={item.href}>
                                    <Link href={item.href}>
                                        <SidebarMenuSubButton isActive={pathname.startsWith(item.href)} className="relative">
                                            <item.icon />
                                            <span>{item.label}</span>
                                            {item.notification && (
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-destructive"></span>
                                            )}
                                        </SidebarMenuSubButton>
                                    </Link>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenuSub>
                    </CollapsibleContent>
                </SidebarMenuItem>
            </Collapsible>
        )}
        
      </SidebarMenu>
      <SidebarFooter>
        {user ? (
            <SidebarMenuButton onClick={logout}>
                <LogOut />
                <span>Logout</span>
            </SidebarMenuButton>
        ) : (
             <Link href="/login">
                <SidebarMenuButton>
                    <LogOut className="rotate-180" />
                    <span>Login</span>
                </SidebarMenuButton>
             </Link>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

export default MainSidebar;
