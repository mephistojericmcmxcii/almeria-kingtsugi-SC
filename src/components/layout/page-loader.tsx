
'use client';

import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const KintsugiLoader = () => (
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="kintsugi-loader">
        <style>{`
            .kintsugi-loader .crack {
                stroke: hsl(var(--primary));
                stroke-width: 0.3;
                fill: none;
                stroke-linecap: round;
                stroke-linejoin: round;
                stroke-dasharray: 1200;
                stroke-dashoffset: 1200;
                animation: draw 2s ease-out forwards;
            }
            .kintsugi-loader .crack-1 { animation-delay: 0s; }
            .kintsugi-loader .crack-2 { animation-delay: 0.2s; }
            .kintsugi-loader .crack-3 { animation-delay: 0.4s; }
            .kintsugi-loader .crack-4 { animation-delay: 0.1s; }
            .kintsugi-loader .crack-5 { animation-delay: 0.3s; }
            .kintsugi-loader .crack-6 { animation-delay: 0.5s; }
            .kintsugi-loader .crack-7 { animation-delay: 0.6s; }
            .kintsugi-loader .crack-8 { animation-delay: 0.25s; }

            @keyframes draw {
                to {
                    stroke-dashoffset: 0;
                }
            }
        `}</style>
        <g>
            {/* Main diagonal crack */}
            <path className="crack crack-1" d="M-5 105 Q 40 60, 60 40 T 105 -5" />

            {/* Branching cracks */}
            <path className="crack crack-2" d="M50 50 Q 55 45, 65 35 Q 70 30, 80 20" />
            <path className="crack crack-3" d="M45 55 Q 35 65, 20 80 T 5 95" />
            <path className="crack crack-4" d="M60 40 Q 70 42, 85 45 T 95 60" />
            <path className="crack crack-5" d="M30 70 Q 25 65, 20 55 T 15 30" />
            <path className="crack crack-6" d="M80 20 Q 85 15, 95 5" />
            <path className="crack crack-7" d="M5 95 Q 15 90, 30 88" />
            <path className="crack crack-8" d="M50 50 Q 40 40, 25 25 T 10 10" />
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
