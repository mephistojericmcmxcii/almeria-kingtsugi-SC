
'use client';

import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const KintsugiLoader = () => (
    <svg width="150" height="150" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="kintsugi-loader">
        <style>{`
            .kintsugi-loader .crack {
                stroke: hsl(var(--primary));
                stroke-width: 0.75;
                fill: none;
                stroke-linecap: round;
                stroke-dasharray: 200;
                stroke-dashoffset: 200;
                animation: draw 2.5s ease-in-out forwards;
            }
            .kintsugi-loader .crack-1 { animation-delay: 0s; }
            .kintsugi-loader .crack-2 { animation-delay: 0.2s; }
            .kintsugi-loader .crack-3 { animation-delay: 0.4s; }
            .kintsugi-loader .crack-4 { animation-delay: 0.6s; }
            .kintsugi-loader .crack-5 { animation-delay: 0.8s; }
            .kintsugi-loader .crack-6 { animation-delay: 1s; }

            @keyframes draw {
                to {
                    stroke-dashoffset: 0;
                }
            }
        `}</style>
        <g>
            <path className="crack crack-1" d="M50 0 V 100" />
            <path className="crack crack-2" d="M50 50 L 15 20" />
            <path className="crack crack-3" d="M15 20 L 0 35" />
            <path className="crack crack-4" d="M50 50 L 90 70" />
            <path className="crack crack-5" d="M90 70 L 100 60" />
            <path className="crack crack-6" d="M50 25 L 85 10" />
        </g>
    </svg>
);


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
    }, 800); // Increased duration for animation

    const fadeOutTimer = setTimeout(() => {
        setIsVisible(false);
    }, 1100); // Delay fade out

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
        <KintsugiLoader />
    </div>
  );
}
