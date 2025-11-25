
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
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAzFBMVEUBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQG8DbEXAAAARHRSTlMAAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyEiJCUnKSorLC4vMDEyMzQ1Njc4OTo7PD1AQUNFR0hLTE1PUllhY2RlZmdqbnJ3en+HiLqRFAAAAfNJREFUeNqV00dywkAMBvDMAxIyD4MghAEM5oB5mhkY+v+fci4LbmNFY7a4KqWsT69er2prD2Y4M3k/dygh3J6/d15JzPqJ+9fOqN3e3g16e/s3KCL+p+w7GQXs+fL7g5OALJdBIiSBCyS0yVgoK+TqT5ATJ0wV8+h+b04hP3Ksnv3d+3lPSeC2v3d/wVAKAhK4V9YvJIBtAv4f6gJ6A9gP4M6+J+0f6y/rvz7/R/1v+S/6P+t/pv+j/lf9n/2/mX6f5B/rfzL/I/9D/g/+T/3/S//7+5wB/AP4F/s/6n/Ofs3+r/wL/o/5v/g/7D/2v+0/4D+r/vv+H+O/wv7P+7/w/5f9N/i/6f9x/1P+3/lf0b/C/tv6t+y/i39+/Qv538e/rP83+v/1/4D/T/3P4X9J/rn9C/i//3+F/+n+n/jP1f+v/x/zv63/D/lP9T/F/3v9T/Rfz7+B/kP/7/Wv9r/uv4n+P/2P83+D/lP+c/l/5b/Wf2/+9/1v8p/Q/8n/R/6v/1/6v/v/4v+f/gf5b/n/zf5f/v/h/6v9b/4/v34wPz+f/i97+/v3+t/a+7+1e4f4r4p4/v1f137ePz7+e/jX9S/mv5D/I/0v6J/M//v/r/1/+R/ov+f/O/l36T+Rfov8N/G/3/4r/I/+P9X/xP3v+T/qf5P+M/m/93+A/hP4z8m/4H6B/jvyf+e/Af578//u/2X7H+x/pf5r9B/iv+X8p/G/+P/X+V+4f4x8B/AP9B/Q/7X4L/Gv8/+D/GfgP93+b/Lf9N/o/4f4v+x/V/+n/b/vP6J+Xfhv2X9T+lfn35T9D/vvyH9L+V/i37r+NfnH6F/4//w9j/pP7r+Xfj/5h/S/rf3b+q/lP7t+bftn4t+4frn5L+NfiX5f+K/g3/I/j35D+qf0r9U/ev3X8//+/x/+O/7//y/6z/Nfq36l+Jfxz/0f2v+w/t/xb/Fv8v9b/Y/2f+z/y/0f8G/y/3v/a/9r/wv/S/6H/Y/wD+Q9+v21+v/s/t37/DfwB/wG8wFzOquD1DAAAAABJRU5ErkJggg==" alt="Kintsugi Logo" className="size-6" />
          <h1 className="font-bold text-lg font-ink-free">KINTSUGI</h1>
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
