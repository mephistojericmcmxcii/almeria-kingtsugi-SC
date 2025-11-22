
'use client';

import React from 'react';
import type { InventoryItem, InventoryVariant } from '@/lib/types';

interface PrintLayoutProps {
  item: InventoryItem;
  variants: InventoryVariant[];
}

const PrintLayout: React.FC<PrintLayoutProps> = ({ item, variants }) => {
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
            font-size: 11pt;
            background-color: #f9fafb;
            color: #111827;
            -webkit-print-color-adjust: exact;
          }
          .print-container {
            width: 100%;
            max-width: 800px;
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
            margin: 0 0 0.5rem 0;
            color: #111827;
          }
          .document-title p {
              margin: 0 0 1rem 0;
              font-size: 10pt;
              color: #6b7280;
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
          .font-medium {
              font-weight: 600;
          }
          
          @media print {
            @page {
              size: A4;
              margin: 1cm;
            }
            body {
              background-color: white;
              padding: 0;
            }
            .print-container {
              box-shadow: none;
              border-radius: 0;
              padding: 0;
            }
            tr, td, th {
                page-break-inside: avoid;
            }
          }
        `}</style>
        <div className="print-container">
          <header className="header">
             <h1>Kintsugi Variety Shop</h1>
          </header>
          
          <main>
            <div className="document-title">
              <h2>Inventory Variant List</h2>
              <p>
                  <strong>Item:</strong> {item.name} <br/>
                  <strong>Category:</strong> {item.category}
              </p>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Variation</th>
                  <th>Brand</th>
                  <th>Model</th>
                  <th className="text-right">Quantity</th>
                  <th className="text-right">Cost Price</th>
                  <th className="text-right">Selling Price</th>
                </tr>
              </thead>
              <tbody>
                {variants.length > 0 ? (
                  variants.map((variant) => (
                    <tr key={variant.id}>
                      <td className="font-medium">{variant.variation}</td>
                      <td className="font-medium">{variant.brand}</td>
                      <td>{variant.model || 'N/A'}</td>
                      <td className="text-right">{variant.quantity}</td>
                      <td className="text-right">{formatCurrency(variant.costPrice)}</td>
                      <td className="text-right">{formatCurrency(variant.price)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{textAlign: 'center', padding: '20px'}}>No variants found.</td>
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

export default PrintLayout;
