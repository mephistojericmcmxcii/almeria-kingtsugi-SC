
'use client';

import React from 'react';
import { format } from 'date-fns';
import type { PurchaseOrder, PurchaseOrderItem } from '@/lib/types';

interface PrintPoListLayoutProps {
  pos: PurchaseOrder[];
  totals: Record<string, { allocated: number; utilized: number; itemCount: number; }>;
  poItems?: Record<string, PurchaseOrderItem[]>;
}

const PrintPoListLayout: React.FC<PrintPoListLayoutProps> = ({ pos, totals, poItems }) => {
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
            margin-top: 10px;
          }
          th, td {
            border-bottom: 1px solid hsl(var(--border));
            padding: 10px 16px;
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
          .po-block {
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 1rem;
              margin-bottom: 1.5rem;
              page-break-inside: avoid;
          }
          .child-table {
              margin-top: 1rem;
              margin-left: 2rem;
              width: calc(100% - 2rem);
          }
          .child-table th, .child-table td {
              font-size: 9pt;
              padding: 6px 8px;
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
                padding: 8px 12px;
            }
            .po-block {
                border: 1px solid #ccc;
                padding: 0.5rem;
                margin-bottom: 1rem;
                border-radius: 0;
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
            
            {pos.length > 0 ? (
                poItems ? (
                    pos.map(po => {
                        const children = poItems[po.id] || [];
                        return (
                            <div key={po.id} className="po-block">
                                <table className="parent-table">
                                    <thead>
                                        <tr>
                                            <th>PO #</th>
                                            <th>Date</th>
                                            <th>Care Of</th>
                                            <th className="text-right">Item Count</th>
                                            <th className="text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="font-medium">{po.poNumber}</td>
                                            <td>{format(po.date.toDate(), 'MMM d, yyyy')}</td>
                                            <td>{po.careOf}</td>
                                            <td className="text-right font-medium">{totals[po.id]?.itemCount || 0}</td>
                                            <td className="text-right">{(po as any).displayStatus || po.status}</td>
                                        </tr>
                                    </tbody>
                                </table>
                                {children.length > 0 && (
                                    <table className="child-table">
                                        <thead>
                                            <tr>
                                                <th>Item Name</th>
                                                <th>Unit</th>
                                                <th className="text-right">Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {children.map(child => (
                                                <tr key={child.id}>
                                                    <td>{child.name}</td>
                                                    <td>{child.unit}</td>
                                                    <td className="text-right">{child.quantity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )
                    })
                ) : (
                <table>
                  <thead>
                    <tr>
                      <th>PO #</th>
                      <th>Date</th>
                      <th>Care Of</th>
                      <th className="text-right">Item Count</th>
                      <th className="text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pos.map((po) => {
                        const total = totals[po.id];
                        return (
                            <tr key={po.id}>
                                <td className="font-medium">{po.poNumber}</td>
                                <td>{format(po.date.toDate(), 'MMM d, yyyy')}</td>
                                <td>{po.careOf}</td>
                                <td className="text-right font-medium">{total?.itemCount || 0}</td>
                                <td className="text-right">{(po as any).displayStatus || po.status}</td>
                            </tr>
                        );
                    })}
                  </tbody>
                </table>
                )
            ) : (
                <p style={{textAlign: 'center', padding: '20px'}}>No purchase orders selected.</p>
            )}
          </main>

           <footer className="footer">
            Date Printed: {printDate}
           </footer>
        </div>
    </>
  );
};

export default PrintPoListLayout;

