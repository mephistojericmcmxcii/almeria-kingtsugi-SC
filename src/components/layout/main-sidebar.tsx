
'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  SidebarTrigger,
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
import { LoginRedirectDialog } from "../auth/login-redirect-dialog";

const MainSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, showAdminOrderBadge, showAdminRfqBadge } = useAuth();
  const [managementOpen, setManagementOpen] = React.useState(false);
  const [isLoginRedirectOpen, setIsLoginRedirectOpen] = React.useState(false);

  React.useEffect(() => {
    if (pathname.startsWith('/management')) {
      setManagementOpen(true);
    } else {
      setManagementOpen(false);
    }
  }, [pathname]);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string, isProtected: boolean) => {
    if (isProtected && !user) {
      e.preventDefault();
      setIsLoginRedirectOpen(true);
    } else {
      router.push(href);
    }
  };

  const menuItems = [
    {
      href: "/",
      label: "Home",
      icon: Home,
      adminOnly: false,
      isProtected: false,
    },
    {
      href: "/products",
      label: "Products",
      icon: Package,
      adminOnly: false,
      isProtected: false,
    },
    {
      href: "/quotation-request",
      label: "Request for Quotation",
      icon: Send,
      adminOnly: false,
      isProtected: true, // This route requires login
    },
    {
      href: "/reviews",
      label: "Customer Reviews",
      icon: Star,
      adminOnly: false,
      isProtected: false,
    },
     {
      href: "/about",
      label: "About Us",
      icon: Info,
      adminOnly: false,
      isProtected: false,
    },
    {
      href: "/admin",
      label: "Admin",
      icon: Settings,
      adminOnly: true,
      isProtected: true,
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
      <SidebarHeader className="h-16 border-b-2" style={{ borderColor: '#f7d825' }}>
        <div className="flex items-center gap-2">
          <Gem className="h-6 w-6 text-primary"/>
          <h1 className="font-bold text-2xl font-ink-free text-primary">KINTSUGI</h1>
        </div>
      </SidebarHeader>
      <SidebarMenu className="flex-1">
        {menuItems.map((item) => {
          if (item.adminOnly && user?.role !== 'admin') {
            return null;
          }
          return (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href!} onClick={(e) => handleLinkClick(e, item.href!, item.isProtected)}>
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
    <LoginRedirectDialog isOpen={isLoginRedirectOpen} onOpenChange={setIsLoginRedirectOpen} />
    </>
  );
};

export default MainSidebar;
