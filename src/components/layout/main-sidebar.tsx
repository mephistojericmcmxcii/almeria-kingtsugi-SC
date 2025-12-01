

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
  LogIn,
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
  Receipt,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useFirebase } from "@/firebase";
import { UserNav } from "../auth/user-nav";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { LoginRedirectDialog } from "../auth/login-redirect-dialog";
import { doc, getDoc } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";

const LOGO_CACHE_KEY = 'brandLogoUrl';

const MainSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, showAdminOrderBadge, showAdminRfqBadge } = useAuth();
  const { firestore } = useFirebase();
  const [managementOpen, setManagementOpen] = React.useState(false);
  const [isLoginRedirectOpen, setIsLoginRedirectOpen] = React.useState(false);
  const [logoUrl, setLogoUrl] = React.useState<string | null | undefined>(undefined);
  const [isLoadingLogo, setIsLoadingLogo] = React.useState(true);

  React.useEffect(() => {
    // Attempt to load from cache first
    const cachedLogoUrl = localStorage.getItem(LOGO_CACHE_KEY);
    if (cachedLogoUrl) {
      setLogoUrl(cachedLogoUrl);
      setIsLoadingLogo(false);
    } else {
      // Set to null if not in cache to show fallback immediately while fetching
      setLogoUrl(null);
    }

    const fetchLogo = async () => {
      if (!firestore) return;
      
      try {
        const brandSettingsRef = doc(firestore, 'system_settings', 'brand_logo');
        const docSnap = await getDoc(brandSettingsRef);
        const fetchedUrl = docSnap.exists() ? docSnap.data().logoUrl : null;

        if (fetchedUrl) {
            localStorage.setItem(LOGO_CACHE_KEY, fetchedUrl);
            setLogoUrl(fetchedUrl);
        } else {
            localStorage.removeItem(LOGO_CACHE_KEY);
            setLogoUrl(null);
        }
      } catch (error) {
        console.error("Error fetching brand logo:", error);
        setLogoUrl(null); // Fallback on error
      } finally {
        // Only set loading to false here if we didn't have a cached version
        if (cachedLogoUrl === null) {
            setIsLoadingLogo(false);
        }
      }
    };
    
    fetchLogo();
  }, [firestore]);


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
    { href: '/management/orders', label: 'Orders', icon: ShoppingCart, notification: false },
    { href: '/management/financial', label: 'Financials', icon: CreditCard, notification: false },
    { href: '/management/po', label: 'Purchase Order', icon: FileText, notification: false },
  ];

  const isManagementActive = managementMenuItems.some(item => pathname.startsWith(item.href));

  return (
    <>
    <Sidebar>
      <SidebarHeader className="h-16 border-b-2 border-b-foreground/20">
        <Link href="/" className="flex items-center w-full h-full justify-center">
            {isLoadingLogo ? (
                <Skeleton className="h-10 w-48" />
            ) : logoUrl ? (
                <img src={logoUrl} alt="Kintsugi Brand Logo" className="h-14 object-contain" />
            ) : (
                <>
                    <Gem className="h-8 w-8 text-primary"/>
                    <h1 className="font-bold text-3xl font-ink-free text-primary">KINTSUGI</h1>
                </>
            )}
        </Link>
      </SidebarHeader>
      <SidebarMenu className="flex-1">
        {menuItems.map((item) => {
          if (item.adminOnly && user?.role !== 'admin') {
            return null;
          }
          if (!user && item.isProtected && item.label === 'My Transactions') {
              return null; // Don't show My Transactions if not logged in
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
                <LogOut className="transform rotate-180" />
                <span>Logout</span>
            </SidebarMenuButton>
        ) : (
             <Link href="/login">
                <SidebarMenuButton>
                    <LogIn />
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

    
