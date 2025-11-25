
'use client';

import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { PageLoader } from '@/components/layout/page-loader';
import { Suspense, useState, useEffect } from 'react';

function AppWrapper({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <>
      {isMounted && (
        <Suspense fallback={null}>
          <PageLoader />
        </Suspense>
      )}
      {children}
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>KINTSUGI variety shop</title>
        <meta name="description" content="Business management for the KINTSUGI variety shop" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Yuji+Syuku&family=Ink+Free&display=swap" rel="stylesheet" />
        <link rel="icon" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAzFBMVEUBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQG8DbEXAAAARHRSTlMAAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyEiJCUnKSorLC4vMDEyMzQ1Njc4OTo7PD1AQUNFR0hLTE1PUllhY2RlZmdqbnJ3en+HiLqRFAAAAfNJREFUeNqV00dywkAMBvDMAxIyD4MghAEM5oB5mhkY+v+fci4LbmNFY7a4KqWsT69er2prD2Y4M3k/dygh3J6/d15JzPqJ+9fOqN3e3g16e/s3KCL+p+w7GQXs+fL7g5OALJdBIiSBCyS0yVgoK+TqT5ATJ0wV8+h+b04hP3Ksnv3d+3lPSeC2v3d/wVAKAhK4V9YvJIBtAv4f6gJ6A9gP4M6+J+0f6y/rvz7/R/1v+S/6P+t/pv+j/lf9n/2/mX6f5B/rfzL/I/9D/g/+T/3/S//7+5wB/AP4F/s/6n/Ofs3+r/wL/o/5v/g/7D/2v+0/4D+r/vv+H+O/wv7P+7/w/5f9N/i/6f9x/1P+3/lf0b/C/tv6t+y/i39+/Qv538e/rP83+v/1/4D/T/3P4X9J/rn9C/i//3+F/+n+n/jP1f+v/x/zv63/D/lP9T/F/3v9T/Rfz7+B/kP/7/Wv9r/uv4n+P/2P83+D/lP+c/l/5b/Wf2/+9/1v8p/Q/8n/R/6v/1/6v/v/4v+f/gf5b/n/zf5f/v/h/6v9b/4/v34wPz+f/i97+/v3+t/a+7+1e4f4r4p4/v1f137ePz7+e/jX9S/mv5D/I/0v6J/M//v/r/1/+R/ov+f/O/l36T+Rfov8N/G/3/4r/I/+P9X/xP3v+T/qf5P+M/m/93+A/hP4z8m/4H6B/jvyf+e/Af578//u/2X7H+x/pf5r9B/iv+X8p/G/+P/X+V+4f4x8B/AP9B/Q/7X4L/Gv8/+D/GfgP93+b/Lf9N/o/4f4v+x/V/+n/b/vP6J+Xfhv2X9T+lfn35T9D/vvyH9L+V/i37r+NfnH6F/4//w9j/pP7r+Xfj/5h/S/rf3b+q/lP7t+bftn4t+4frn5L+NfiX5f+K/g3/I/j35D+qf0r9U/ev3X8//+/x/+O/7//y/6z/Nfq36l+Jfxz/0f2v+w/t/xb/Fv8v9b/Y/2f+z/y/0f8G/y/3v/a/9r/wv/S/6H/Y/wD+Q9+v21+v/s/t37/DfwB/wG8wFzOquD1DAAAAABJRU5ErkJggg==" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <AuthProvider>
            <AppWrapper>
              {children}
            </AppWrapper>
            <Toaster />
          </AuthProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
