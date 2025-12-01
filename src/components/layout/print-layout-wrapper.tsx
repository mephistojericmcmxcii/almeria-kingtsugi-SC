
'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface PrintSettings {
  headerImageUrl?: string;
  footerImageUrl?: string;
}

interface PrintLayoutWrapperProps {
  children: React.ReactNode;
  title?: string;
  useLandscape?: boolean;
  disableHeader?: boolean;
  disableFooter?: boolean;
}

const PrintLayoutWrapper: React.FC<PrintLayoutWrapperProps> = ({ children, title, useLandscape = false, disableHeader = false, disableFooter = false }) => {
  const { firestore } = useFirebase();
  const [settings, setSettings] = useState<PrintSettings>({});
  const [isLoading, setIsLoading] = useState(true);

  const printDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  useEffect(() => {
    const fetchSettings = async () => {
      if (!firestore) return;
      try {
        const settingsRef = doc(firestore, 'system_settings', 'print_settings');
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as PrintSettings);
        }
      } catch (error) {
        console.error("Failed to fetch print settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [firestore]);
  
  if (isLoading) {
      return <div>Loading print layout...</div>;
  }

  return (
    <>
      <style>{`
          :root {
            --primary: 39 61% 57%;
            --muted-foreground: 240 3.8% 46.1%;
            --border: 0 0% 89.8%;
          }
          body {
            font-family: 'PT Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 0;
            font-size: 10pt;
            background-color: #f9fafb;
            color: #111827;
            -webkit-print-color-adjust: exact;
          }
          .print-container {
            width: 100%;
            max-width: ${useLandscape ? '1200px' : '800px'};
            margin: 2rem auto;
            background-color: white;
            border-radius: 0.5rem;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            display: flex;
            flex-direction: column;
            min-height: calc(100vh - 4rem);
          }
          .print-header img, .print-footer img {
            width: 100%;
            height: auto;
            display: block;
          }
          .print-header {
             margin-bottom: 0;
          }
           .print-footer {
              margin-top: auto; /* Pushes footer to the bottom */
              padding-top: 1rem;
              text-align: center;
              font-size: 9pt;
              color: #6b7280;
           }
          .document-title h2 {
            font-family: 'Playfair Display', serif;
            font-size: 20pt;
            margin: 0 0 1rem 0;
            color: #111827;
          }
          .document-title p {
              margin: 0 0 1rem 0;
              font-size: 10pt;
              color: #6b7280;
          }
          main {
            flex-grow: 1;
            padding: 2rem;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border-bottom: 1px solid hsl(var(--border));
            padding: 12px 8px;
            text-align: left;
            vertical-align: top;
          }
          th {
            font-weight: bold;
            color: hsl(var(--muted-foreground));
            font-size: 9pt;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          tr:last-child td {
              border-bottom: none;
          }
          .text-right {
              text-align: right;
          }
          .text-center {
              text-align: center;
          }
          .font-medium {
              font-weight: 600;
          }
          
          @media print {
            @page {
              size: ${useLandscape ? 'A4 landscape' : 'A4 portrait'};
              margin: 0;
            }
            body {
              background-color: white;
              padding: 0;
              font-size: 9pt;
            }
            .print-container {
              box-shadow: none;
              border-radius: 0;
              padding: 0;
              margin: 0;
              width: 100%;
              max-width: none;
              min-height: 100vh;
            }
            main {
              padding: 1.5cm; /* Re-apply padding to main content only */
            }
             th, td {
                padding: 8px;
             }
            tr, td, th {
                page-break-inside: avoid;
            }
          }
        `}</style>
        <div className="print-container">
          {!disableHeader && settings.headerImageUrl && (
            <header className="print-header">
               <img src={settings.headerImageUrl} alt="Company Header" />
            </header>
          )}
          
            <main>
                {title && (
                    <div className="document-title">
                    <h2>{title}</h2>
                    </div>
                )}
                {children}
            </main>

          {!disableFooter && (
             settings.footerImageUrl ? (
                 <footer className="print-footer">
                    <img src={settings.footerImageUrl} alt="Company Footer" />
                 </footer>
              ) : (
                <footer className="print-footer" style={{paddingBottom: '1rem'}}>
                    Date Printed: {printDate}
                </footer>
              )
          )}
        </div>
    </>
  );
};

export default PrintLayoutWrapper;
