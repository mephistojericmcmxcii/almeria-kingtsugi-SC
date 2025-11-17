
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Pencil } from 'lucide-react';
import { EditHomeDialog } from '@/components/home/edit-home-dialog';
import { Skeleton } from '@/components/ui/skeleton';

export type HomePageSettings = {
  backgroundUrl: string;
  welcomeTitle?: string;
  welcomeSubtitle?: string;
};

const defaultContent: HomePageSettings = {
    welcomeTitle: 'Welcome to Kintsugi',
    welcomeSubtitle: 'Your portal for managing the art of imperfection.',
    backgroundUrl: 'https://images.unsplash.com/photo-1549492423-400259a5e5a4?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
};

export default function HomePage() {
  const { user, firestore } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const homeContentRef = useMemoFirebase(
      () => (firestore ? doc(firestore, 'system_settings', 'home_page') : null),
      [firestore]
  );
  const { data: content, isLoading } = useDoc<HomePageSettings>(homeContentRef);
  
  const displayContent = content || defaultContent;

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
        <div className="relative z-10 p-8 space-y-4">
          {isLoading ? (
              <Skeleton className="h-16 w-96 mx-auto" />
          ) : (
              displayContent.welcomeTitle && (
                  <h1 className="text-5xl md:text-7xl font-bold tracking-tight font-headline text-white drop-shadow-lg">
                      {displayContent.welcomeTitle}
                  </h1>
              )
          )}
           {isLoading ? (
              <Skeleton className="h-6 w-80 mx-auto" />
           ) : (
              displayContent.welcomeSubtitle && (
                  <p className="text-lg md:text-xl text-white/90 drop-shadow-md">
                      {displayContent.welcomeSubtitle}
                  </p>
              )
           )}
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
