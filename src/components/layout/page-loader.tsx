
'use client';

import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Hourglass } from 'lucide-react';

export function PageLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsPageLoading(true);
    setIsVisible(true);

    const timer = setTimeout(() => {
        setIsPageLoading(false);
    }, 1200); // Duration of the loading screen

    const fadeOutTimer = setTimeout(() => {
        setIsVisible(false);
    }, 1500); // Delay fade out to allow for animation

    return () => {
        clearTimeout(timer);
        clearTimeout(fadeOutTimer);
    };
  }, [pathname, searchParams]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm transition-opacity duration-300',
        isPageLoading ? 'opacity-100' : 'opacity-0',
        !isVisible && 'pointer-events-none'
      )}
    >
        <Hourglass className="h-16 w-16 animate-spin text-primary" />
    </div>
  );
}
