

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
import { useState, useEffect } from 'react';
import type { Notification } from '@/lib/types';
import { useFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';


const ICONS: Record<string, React.ElementType> = {
    'quote-ready': FileQuestion,
    'confirmed': Truck,
    'delivering': Truck,
    'completed': History,
    'cancelled': History,
    'declined': History,
    'cart': ShoppingCart,
    'default': Bell,
};


export default function NotificationDropdown() {
  const { user, firestore, notifications, isLoading, markNotificationAsRead } = useAuth();
  const router = useRouter();
  
  if (isLoading || !user) return null;

  const unreadNotifications = notifications.filter(n => !n.read);
  const hasNotifications = unreadNotifications.length > 0;

  const handleNotificationClick = async (notification: Notification) => {
    await markNotificationAsRead(notification);
    router.push(notification.href);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full bg-black/10 hover:bg-black/20 relative">
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
          unreadNotifications.map((notification) => {
             const Icon = ICONS[notification.title.toLowerCase().replace(/ /g, '-')] || ICONS.default;
             return (
                 <DropdownMenuItem key={notification.id} onSelect={() => handleNotificationClick(notification)} className="flex items-start gap-3 p-3 cursor-pointer">
                    <Icon className="h-5 w-5 text-muted-foreground mt-1" />
                    <div className="flex flex-col">
                        <p className="font-semibold text-sm">{notification.title}</p>
                        <p className="text-xs text-muted-foreground">{notification.description}</p>
                    </div>
                </DropdownMenuItem>
             )
          })
        ) : (
          <div className="text-center text-sm text-muted-foreground p-4">
            You have no new notifications.
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

    

    