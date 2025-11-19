
"use client";

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
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { UserNav } from "../auth/user-nav";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { SendRfqForm } from "@/components/rfq/send-rfq-form";


const MainSidebar = () => {
  const pathname = usePathname();
  const { user, logout, showAdminOrderBadge, showAdminRfqBadge } = useAuth();
  const [managementOpen, setManagementOpen] = React.useState(false);
  const [isRfqOpen, setIsRfqOpen] = React.useState(false);

  React.useEffect(() => {
    if (pathname.startsWith('/management')) {
      setManagementOpen(true);
    } else {
      setManagementOpen(false);
    }
  }, [pathname]);

  const menuItems = [
    {
      href: "/home",
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
      id: "rfq",
      label: "Request for Quotation",
      icon: FileQuestion,
      adminOnly: false,
      action: () => setIsRfqOpen(true),
    },
     {
      href: "/about",
      label: "About Us",
      icon: Info,
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


  return (
    <>
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
        {menuItems.map((item) => {
          if (item.adminOnly && user?.role !== 'admin') {
            return null;
          }
          if (item.href) {
            return (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
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
          }
          return (
             <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                    onClick={item.action}
                    tooltip={item.label}
                >
                    <item.icon />
                    <span>{item.label}</span>
                </SidebarMenuButton>
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
        <SidebarMenuButton onClick={logout}>
            <LogOut />
            <span>Logout</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
    <SendRfqForm isOpen={isRfqOpen} onOpenChange={setIsRfqOpen} />
    </>
  );
};

export default MainSidebar;

    