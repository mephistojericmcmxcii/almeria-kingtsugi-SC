
'use client';

import React from 'react';
import { format } from 'date-fns';
import type { PurchaseOrder } from '@/lib/types';

interface PrintPoListLayoutProps {
  pos: PurchaseOrder[];
  totals: Record<string, { allocated: number; utilized: number; itemCount: number; }>;
}

const PrintPoListLayout: React.FC<PrintPoListLayoutProps> = ({ pos, totals }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };
  
  const printDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

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
            padding: 2rem;
            font-size: 10pt;
            background-color: #f9fafb;
            color: #111827;
            -webkit-print-color-adjust: exact;
          }
          .print-container {
            width: 100%;
            max-width: 1000px;
            margin: auto;
            background-color: white;
            padding: 2rem;
            border-radius: 0.5rem;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          }
          .header, .footer {
            text-align: center;
            font-size: 9pt;
            color: #6b7280;
          }
          .header {
             border-bottom: 1px solid #e5e7eb;
             padding-bottom: 1rem;
             margin-bottom: 2rem;
          }
          .header h1 {
              font-family: 'Playfair Display', serif;
              font-size: 24pt;
              margin: 0;
              color: hsl(var(--primary));
          }
           .footer {
              margin-top: 2rem;
              padding-top: 1rem;
              border-top: 1px solid #e5e7eb;
           }
          .document-title h2 {
            font-family: 'Playfair Display', serif;
            font-size: 20pt;
            margin: 0 0 1rem 0;
            color: #111827;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border-bottom: 1px solid hsl(var(--border));
            padding: 10px 8px;
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
          .font-medium {
              font-weight: 600;
          }
          
          @media print {
            @page {
              size: A4 landscape;
              margin: 1cm;
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
            }
            th, td {
                padding: 8px 6px;
            }
          }
        `}</style>
        <div className="print-container">
          <header className="header">
             <h1>Kintsugi Variety Shop</h1>
          </header>
          
          <main>
            <div className="document-title">
              <h2>Purchase Order Summary</h2>
            </div>

            <table>
              <thead>
                <tr>
                  <th>PO #</th>
                  <th>Date</th>
                  <th>Care Of</th>
                  <th className="text-right">Total Allocation</th>
                  <th className="text-right">Amount Utilized</th>
                  <th className="text-right"># of Items</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pos.length > 0 ? (
                  pos.map((po) => {
                    const total = totals[po.id];
                    const itemCount = total?.itemCount || 0;
                    return (
                        <tr key={po.id}>
                            <td className="font-medium">{po.poNumber}</td>
                            <td>{format(po.date.toDate(), 'MMM d, yyyy')}</td>
                            <td>{po.careOf}</td>
                            <td className="text-right">{formatCurrency(total?.allocated || 0)}</td>
                            <td className="text-right">{formatCurrency(total?.utilized || 0)}</td>
                            <td className="text-right font-medium">
                                {itemCount}
                            </td>
                            <td>{(po as any).displayStatus || po.status}</td>
                        </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} style={{textAlign: 'center', padding: '20px'}}>No purchase orders selected.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </main>

           <footer className="footer">
            Date Printed: {printDate}
           </footer>
        </div>
    </>
  );
};

export default PrintPoListLayout;
