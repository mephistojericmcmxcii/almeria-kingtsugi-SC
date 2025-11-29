
'use client';

import Link from "next/link";
import * as React from "react";
import { Gem } from "lucide-react";
import { useFirebase } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";

const LOGO_CACHE_KEY = 'brandLogoUrl';

export function LoginHeader() {
  const { firestore } = useFirebase();
  const [logoUrl, setLogoUrl] = React.useState<string | null | undefined>(undefined);
  const [isLoadingLogo, setIsLoadingLogo] = React.useState(true);

   React.useEffect(() => {
    const cachedLogoUrl = localStorage.getItem(LOGO_CACHE_KEY);
    if (cachedLogoUrl) {
      setLogoUrl(cachedLogoUrl);
      setIsLoadingLogo(false);
    } else {
      setLogoUrl(null);
    }

    const fetchLogo = async () => {
      if (!firestore) return;
      
      try {
        const brandSettingsRef = doc(firestore, 'system_settings', 'brand_logo');
        const docSnap = await getDoc(brandSettingsRef);
        const fetchedUrl = docSnap.exists() ? docSnap.data().logoUrl : null;

        if (fetchedUrl) {
            localStorage.setItem(LOGO_CACHE_KEY, fetchedUrl);
            setLogoUrl(fetchedUrl);
        } else {
            localStorage.removeItem(LOGO_CACHE_KEY);
            setLogoUrl(null);
        }
      } catch (error) {
        console.error("Error fetching brand logo:", error);
        setLogoUrl(null);
      } finally {
        if (cachedLogoUrl === null) {
            setIsLoadingLogo(false);
        }
      }
    };
    
    fetchLogo();
  }, [firestore]);


  return (
    <div className="flex justify-center items-center h-20 mb-8">
        <Link href="/" className="flex items-center justify-center">
            {isLoadingLogo ? (
                <Skeleton className="h-12 w-48" />
            ) : logoUrl ? (
                <img src={logoUrl} alt="Kintsugi Brand Logo" className="h-16 object-contain" />
            ) : (
                <>
                    <Gem className="h-8 w-8 text-primary"/>
                    <h1 className="font-bold text-3xl font-ink-free text-primary">KINTSUGI</h1>
                </>
            )}
        </Link>
    </div>
  );
}
