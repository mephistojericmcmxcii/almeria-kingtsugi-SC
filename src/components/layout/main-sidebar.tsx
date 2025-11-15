
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
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { UserNav } from "../auth/user-nav";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";


const MainSidebar = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [servicesOpen, setServicesOpen] = React.useState(false);

  React.useEffect(() => {
    if (pathname.startsWith('/services')) {
      setServicesOpen(true);
    }
  }, [pathname]);

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

  const servicesMenuItems = [
    { href: '/services/inventory', label: 'Inventory', icon: Boxes, roles: ['admin', 'guest'] },
    { href: '/services/orders', label: 'Orders', icon: ShoppingCart, roles: ['admin'] },
    { href: '/services/po-payment', label: 'PO Payment', icon: CreditCard, roles: ['admin'] },
    { href: '/services/po', label: 'PO', icon: FileText, roles: ['admin'] },
    { href: '/services/create-admin', label: 'Create Admin', icon: UserPlus, roles: ['admin'] },
    { href: '/services/make-admin', label: 'Make Admin', icon: UserCog, roles: ['admin'] },
  ];

  const isServicesActive = servicesMenuItems.some(item => pathname.startsWith(item.href));


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
          ) : null
        )}
        
        {user?.role === 'admin' && (
            <Collapsible open={servicesOpen} onOpenChange={setServicesOpen} asChild>
                <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip="Services" isActive={isServicesActive}>
                            <Briefcase />
                            <span>Services</span>
                            <ChevronDown className={cn("ml-auto transition-transform", servicesOpen && "rotate-180")} />
                        </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent asChild>
                        <SidebarMenuSub>
                            {servicesMenuItems.map(item => (
                                (item.roles.includes(user?.role || '') && !(item as any).hidden) ? (
                                <SidebarMenuItem key={item.href}>
                                    <Link href={item.href}>
                                        <SidebarMenuSubButton isActive={pathname.startsWith(item.href)}>
                                            <item.icon />
                                            <span>{item.label}</span>
                                        </SidebarMenuSubButton>
                                    </Link>
                                </SidebarMenuItem>
                                ) : null
                            ))}
                        </SidebarMenuSub>
                    </CollapsibleContent>
                </SidebarMenuItem>
            </Collapsible>
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
