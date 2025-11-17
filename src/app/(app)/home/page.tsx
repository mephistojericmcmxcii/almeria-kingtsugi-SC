
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Pencil } from 'lucide-react';
import { EditHomeDialog } from '@/components/home/edit-home-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type HomePageSettings = {
  backgroundUrl: string;
  welcomeTitle?: string;
  welcomeSubtitle?: string;
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'center' | 'bottom';
  titleSize?: number;
  footerText?: string;
  footerTextAlign?: 'left' | 'center' | 'right';
};

const defaultContent: HomePageSettings = {
    welcomeTitle: 'Welcome to Kintsugi',
    welcomeSubtitle: 'Your portal for managing the art of imperfection.',
    backgroundUrl: 'https://images.unsplash.com/photo-1549492423-400259a5e5a4?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    textAlign: 'center',
    verticalAlign: 'center',
    titleSize: 7,
    footerText: `© ${new Date().getFullYear()} Kintsugi Variety Shop. All Rights Reserved.`,
    footerTextAlign: 'center',
};

const titleSizeClasses: {[key: number]: string} = {
    4: 'text-4xl md:text-4xl',
    5: 'text-5xl md:text-5xl',
    6: 'text-6xl md:text-6xl',
    7: 'text-7xl md:text-7xl',
    8: 'text-8xl md:text-8xl',
    9: 'text-9xl md:text-9xl',
}

export default function HomePage() {
  const { user, firestore } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const homeContentRef = useMemoFirebase(
      () => (firestore ? doc(firestore, 'system_settings', 'home_page') : null),
      [firestore]
  );
  const { data: content, isLoading } = useDoc<HomePageSettings>(homeContentRef);
  
  const displayContent = content || defaultContent;
  
  const textAlign = displayContent.textAlign || 'center';
  const verticalAlign = displayContent.verticalAlign || 'center';
  const titleSize = displayContent.titleSize || 7;
  const footerText = displayContent.footerText ?? defaultContent.footerText;
  const footerTextAlign = displayContent.footerTextAlign || 'center';

  return (
    <>
      <div className={cn(
          "absolute inset-0 flex flex-col overflow-hidden",
          {
            'justify-start pt-24': verticalAlign === 'top',
            'justify-center': verticalAlign === 'center',
            'justify-end pb-24': verticalAlign === 'bottom',
          }
        )}>
        {/* Background Image */}
        {isLoading ? (
          <Skeleton className="absolute inset-0 w-full h-full" />
        ) : (
          <div 
            className="absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-500"
            style={{ backgroundImage: `url(${displayContent.backgroundUrl})`}}
            data-ai-hint="seasonal background"
          />
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 w-full h-full bg-black/50" />

        {/* Content */}
        <div className={cn(
          "relative z-10 p-8 w-full flex",
          {
            'items-start': textAlign === 'left',
            'items-center justify-center text-center': textAlign === 'center',
            'items-end justify-end text-right': textAlign === 'right',
          }
          )}>
          <div className="space-y-4 max-w-4xl">
            {isLoading ? (
                <Skeleton className="h-16 w-96" />
            ) : (
                displayContent.welcomeTitle && (
                    <h1 className={cn(
                        "font-bold tracking-tight font-headline text-white drop-shadow-lg",
                        titleSizeClasses[titleSize] || 'text-7xl'
                        )}>
                        {displayContent.welcomeTitle}
                    </h1>
                )
            )}
            {isLoading ? (
                <Skeleton className="h-6 w-80" />
            ) : (
                displayContent.welcomeSubtitle && (
                    <p className="text-lg md:text-xl text-white/90 drop-shadow-md">
                        {displayContent.welcomeSubtitle}
                    </p>
                )
            )}
          </div>
        </div>

        {/* Admin Edit Button */}
        {user?.role === 'admin' && (
          <div className="absolute top-24 right-8 z-20">
            <Button variant="secondary" size="icon" onClick={() => setIsEditDialogOpen(true)}>
              <ImageIcon className="h-4 w-4" />
              <span className="sr-only">Edit Home Page</span>
            </Button>
          </div>
        )}
         {/* Footer */}
        <footer className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-black/15 backdrop-blur-sm">
            <p className={cn(
                "text-xs text-white/60",
                {
                    'text-left': footerTextAlign === 'left',
                    'text-center': footerTextAlign === 'center',
                    'text-right': footerTextAlign === 'right',
                }
            )}>
                {footerText}
            </p>
        </footer>
      </div>

      {user?.role === 'admin' && (
          <EditHomeDialog 
              isOpen={isEditDialogOpen}
              onOpenChange={setIsEditDialogOpen}
              content={displayContent}
          />
      )}
    </>
  );
}
    