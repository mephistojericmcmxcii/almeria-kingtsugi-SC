
'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Pencil } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Header from '@/components/layout/header';
import MainSidebar from '@/components/layout/main-sidebar';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';


const EditHomeDialog = lazy(() => import('@/components/home/edit-home-dialog').then(module => ({ default: module.EditHomeDialog })));

export type HomePageSettings = {
  backgroundUrl: string;
  welcomeTitle?: string;
  welcomeSubtitle?: string;
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'center' | 'bottom';
  titleSize?: number;
  footerTextLeft?: string;
  footerTextCenter?: string;
  footerTextRight?: string;
};

const defaultContent: HomePageSettings = {
    welcomeTitle: 'Welcome to Kintsugi',
    welcomeSubtitle: 'Your portal for managing the art of imperfection.',
    backgroundUrl: 'https://images.unsplash.com/photo-1549492423-400259a5e5a4?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    textAlign: 'center',
    verticalAlign: 'center',
    titleSize: 7,
    footerTextCenter: `© ${new Date().getFullYear()} Kintsugi Variety Shop. All Rights Reserved.`,
};

const titleSizeClasses: {[key: number]: string} = {
    4: 'text-4xl md:text-4xl',
    5: 'text-5xl md:text-5xl',
    6: 'text-6xl md:text-6xl',
    7: 'text-7xl md:text-7xl',
    8: 'text-8xl md:text-8xl',
    9: 'text-9xl md:text-9xl',
}

function HomePageContent() {
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [content, setContent] = useState<HomePageSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setOpen } = useSidebar();
  const isMobile = useIsMobile();

  useEffect(() => {
      const fetchContent = async () => {
          if (!firestore) return;
          setIsLoading(true);
          try {
              const homeContentRef = doc(firestore, 'system_settings', 'home_page');
              const docSnap = await getDoc(homeContentRef);
              if (docSnap.exists()) {
                  setContent(docSnap.data() as HomePageSettings);
              } else {
                  setContent(defaultContent);
              }
          } catch (error) {
              console.error("Error fetching home page settings:", error);
              setContent(defaultContent);
          } finally {
              setIsLoading(false);
          }
      };
      fetchContent();
  }, [firestore]);
  
  const displayContent = content || defaultContent;
  
  const textAlign = displayContent.textAlign || 'center';
  const verticalAlign = displayContent.verticalAlign || 'center';
  const titleSize = displayContent.titleSize || 7;

  return (
    <>
      <style>{`
        .responsive-footer-text {
          font-size: clamp(5pt, 2vw, 9pt);
          white-space: nowrap;
        }
      `}</style>
      <div className="flex flex-col w-full h-screen">
          <Header />
           <main 
              className="flex-1 flex flex-col relative transition-all duration-500"
              style={{ 
                backgroundImage: `url(${displayContent.backgroundUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
              onClick={() => setOpen(false)}
          >
              {/* Overlay */}
              <div className="absolute inset-0 w-full h-full bg-black/50" />

              {/* Content Area */}
              <div className={cn(
                  "relative z-10 flex-1 flex flex-col p-8",
                  {
                  'justify-start pt-8': verticalAlign === 'top',
                  'justify-center': verticalAlign === 'center',
                  'justify-end pb-8': verticalAlign === 'bottom',
                  }
              )}>
              <div className={cn(
                  "w-full flex",
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
              </div>

              {/* Admin Edit Button */}
              {user?.role === 'admin' && (
              <div className="absolute top-4 right-4 z-20">
                  <Button variant="secondary" size="icon" onClick={(e) => { e.stopPropagation(); setIsEditDialogOpen(true);}}>
                  <ImageIcon className="h-4 w-4" />
                  <span className="sr-only">Edit Home Page</span>
                  </Button>
              </div>
              )}

              {/* Footer */}
              <footer className="relative z-10 h-14 flex items-center bg-black/15 backdrop-blur-sm mt-auto">
                  <div className="w-full flex justify-between items-center text-white/60 responsive-footer-text px-2">
                      <div className="text-left flex-1">{displayContent.footerTextLeft}</div>
                      <div className="text-center flex-1">{displayContent.footerTextCenter}</div>
                      <div className="text-right flex-1">{displayContent.footerTextRight}</div>
                  </div>
              </footer>
        
              {user?.role === 'admin' && content && (
                  <Suspense fallback={<div>Loading...</div>}>
                      <EditHomeDialog 
                          isOpen={isEditDialogOpen}
                          onOpenChange={setIsEditDialogOpen}
                          content={content}
                      />
                  </Suspense>
              )}
          </main>
          </div>
      </>
  );
}


export default function HomePage() {
    return (
        <SidebarProvider>
            <MainSidebar />
            <HomePageContent />
        </SidebarProvider>
    );
}
