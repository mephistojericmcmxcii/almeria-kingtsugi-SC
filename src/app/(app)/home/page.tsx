
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
};

const defaultContent: HomePageSettings = {
    welcomeTitle: 'Welcome to Kintsugi',
    welcomeSubtitle: 'Your portal for managing the art of imperfection.',
    backgroundUrl: 'https://images.unsplash.com/photo-1549492423-400259a5e5a4?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    textAlign: 'center',
    verticalAlign: 'center',
    titleSize: 7
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

  return (
    <>
      <div className="relative min-h-[calc(100vh-theme(spacing.24))] -m-8 -mt-24 flex items-center justify-center text-center overflow-hidden">
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
          "relative z-10 p-8 w-full h-full flex flex-col",
          verticalAlign === 'top' && 'justify-start pt-24',
          verticalAlign === 'center' && 'justify-center',
          verticalAlign === 'bottom' && 'justify-end pb-24',
          textAlign === 'left' && 'items-start text-left',
          textAlign === 'center' && 'items-center text-center',
          textAlign === 'right' && 'items-end text-right',
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

    