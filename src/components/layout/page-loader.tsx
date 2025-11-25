
'use client';

import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const KintsugiLoader = () => (
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="kintsugi-loader">
        <style>{`
            .kintsugi-loader .crack {
                stroke: hsl(var(--primary));
                stroke-width: 0.5;
                fill: none;
                stroke-linecap: round;
                stroke-dasharray: 400;
                stroke-dashoffset: 400;
                animation: draw 2.5s ease-in-out forwards;
            }
            .kintsugi-loader .crack-1 { animation-delay: 0s; }
            .kintsugi-loader .crack-2 { animation-delay: 0.1s; }
            .kintsugi-loader .crack-3 { animation-delay: 0.2s; }
            .kintsugi-loader .crack-4 { animation-delay: 0.3s; }
            .kintsugi-loader .crack-5 { animation-delay: 0.4s; }
            .kintsugi-loader .crack-6 { animation-delay: 0.5s; }
            .kintsugi-loader .crack-7 { animation-delay: 0.6s; }
            .kintsugi-loader .crack-8 { animation-delay: 0.7s; }

            @keyframes draw {
                to {
                    stroke-dashoffset: 0;
                }
            }
        `}</style>
        <g>
            {/* Main vertical and horizontal cracks */}
            <path className="crack crack-1" d="M50 0 V 100" />
            <path className="crack crack-2" d="M0 50 H 100" />
            
            {/* Cracks from center to corners */}
            <path className="crack crack-3" d="M50 50 L 0 0" />
            <path className="crack crack-4" d="M50 50 L 100 0" />
            <path className="crack crack-5" d="M50 50 L 0 100" />
            <path className="crack crack-6" d="M50 50 L 100 100" />

            {/* Additional branching cracks */}
            <path className="crack crack-7" d="M25 25 L 10 40" />
            <path className="crack crack-8" d="M75 75 L 90 60" />
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
    }, 1200); // Increased duration for animation

    const fadeOutTimer = setTimeout(() => {
        setIsVisible(false);
    }, 1500); // Delay fade out

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
