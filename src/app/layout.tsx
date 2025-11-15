import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export const metadata: Metadata = {
  title: 'Kintsugi Portal',
  description: 'Business management portal for KINTSUGI variety shop',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
        <link rel="icon" href="data:image/png;base64,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" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
