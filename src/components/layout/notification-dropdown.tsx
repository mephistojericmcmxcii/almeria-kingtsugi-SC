
'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Bell, ShoppingCart, FileQuestion, Truck, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';


export default function NotificationDropdown() {
  const { 
    user,
    cart,
    showCartBadge,
    showQuoteReadyBadge, 
    showNewPurchaseBadge, 
    showNewHistoryBadge,
    dismissUserNotifications
  } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const cartItemCount = cart?.length || 0;

  const notifications = [
    {
      show: showCartBadge,
      icon: ShoppingCart,
      title: `${cartItemCount} item(s) in your quote list`,
      description: "Ready to submit for a quotation.",
      href: '/profile?tab=quotation',
      tab: 'quotation'
    },
    {
      show: showQuoteReadyBadge,
      icon: FileQuestion,
      title: "Your Quotation is Ready",
      description: "A new quotation is available for your review and confirmation.",
      href: '/profile?tab=quotation',
      tab: 'quotation'
    },
    {
      show: showNewPurchaseBadge,
      icon: Truck,
      title: "Purchase Update",
      description: "There's an update on one of your active purchases.",
      href: '/profile?tab=purchases',
      tab: 'purchases'
    },
    {
      show: showNewHistoryBadge,
      icon: History,
      title: "Order History Update",
      description: "One of your orders has been completed or cancelled.",
      href: '/profile?tab=orders',
      tab: 'orders'
    }
  ].filter(n => n.show);

  const hasNotifications = notifications.length > 0;

  const handleNotificationClick = (href: string) => {
    dismissUserNotifications();
    router.push(href);
  };
  
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && hasNotifications) {
      // Dismiss notifications when the dropdown is closed
      dismissUserNotifications();
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-black/10 hover:bg-black/20 relative">
          <Bell className="h-6 w-6 text-white" />
          {hasNotifications && (
            <span className="absolute top-1 right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {hasNotifications ? (
          notifications.map((notification, index) => (
            <DropdownMenuItem key={index} onSelect={() => handleNotificationClick(notification.href)} className="flex items-start gap-3 p-3 cursor-pointer">
              <notification.icon className="h-5 w-5 text-muted-foreground mt-1" />
              <div className="flex flex-col">
                <p className="font-semibold text-sm">{notification.title}</p>
                <p className="text-xs text-muted-foreground">{notification.description}</p>
              </div>
            </DropdownMenuItem>
          ))
        ) : (
          <div className="text-center text-sm text-muted-foreground p-4">
            You have no new notifications.
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
