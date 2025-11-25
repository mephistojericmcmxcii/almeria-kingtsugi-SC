
'use client';

import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

export function PageLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsPageLoading(true);
    // Show the loader immediately
    setIsVisible(true);

    // Hide loader after a short delay to allow page content to render
    const timer = setTimeout(() => {
        setIsPageLoading(false);
    }, 500); // Adjust delay as needed

    // Fade out animation
    const fadeOutTimer = setTimeout(() => {
        setIsVisible(false);
    }, 800); // Should be > page load delay

    return () => {
        clearTimeout(timer);
        clearTimeout(fadeOutTimer);
    };
  }, [pathname, searchParams]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-300',
        isPageLoading ? 'opacity-100' : 'opacity-0',
        !isVisible && 'pointer-events-none'
      )}
    >
      <div className="p-8 space-y-4 flex flex-col items-center">
        <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    </div>
  );
}
