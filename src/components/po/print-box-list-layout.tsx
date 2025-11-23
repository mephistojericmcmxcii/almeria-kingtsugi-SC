
'use client';

import React from 'react';
import { format } from 'date-fns';
import type { PurchaseOrder, PurchaseOrderItem } from '@/lib/types';

interface PrintBoxListLayoutProps {
  po: PurchaseOrder | null;
  items: PurchaseOrderItem[];
  boxIdentity: string;
}

const PrintBoxListLayout: React.FC<PrintBoxListLayoutProps> = ({ po, items, boxIdentity }) => {
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
          }
          body {
            font-family: 'PT Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 0;
            padding: 1rem;
            font-size: 10pt;
            background-color: #f9fafb;
            color: #111827;
            -webkit-print-color-adjust: exact;
          }
          .print-container {
            width: 100%;
            max-width: 600px;
            margin: auto;
            background-color: white;
            padding: 1.5rem;
            border: 2px solid #333;
          }
          .header h1 {
              font-family: 'Playfair Display', serif;
              font-size: 20pt;
              margin: 0;
              color: hsl(var(--primary));
              text-align: center;
              border-bottom: 2px solid #333;
              padding-bottom: 0.5rem;
              margin-bottom: 1rem;
          }
          .box-identity {
              font-size: 14pt;
              font-weight: bold;
              text-align: center;
              margin-bottom: 1rem;
              padding: 0.5rem;
              border: 1px dashed #999;
              background-color: #f3f4f6;
          }
          .po-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 0.5rem 1rem;
              font-size: 11pt;
              margin-bottom: 1.5rem;
          }
          .po-info-label {
              font-weight: bold;
              color: #4b5563;
          }
          .po-info-value {
              font-weight: 600;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th, td {
            border: 1px solid #ccc;
            padding: 8px;
            text-align: left;
            vertical-align: top;
          }
          th {
            font-weight: bold;
            background-color: #f3f4f6;
            font-size: 9pt;
            text-transform: uppercase;
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
              size: auto;
              margin: 0.5in;
            }
            body {
              background-color: white;
              padding: 0;
              font-size: 9pt;
            }
            .print-container {
              border: 2px solid #000;
              padding: 1rem;
              box-shadow: none;
            }
            th, td {
                padding: 6px;
            }
          }
        `}</style>
        <div className="print-container">
          <header className="header">
             <h1>DELIVERY CONTENTS</h1>
          </header>
          
          <main>
            {boxIdentity && (
              <div className="box-identity">
                {boxIdentity}
              </div>
            )}
            {po && (
                <div className="po-info">
                    <div>
                        <p className="po-info-label">P.O. #:</p>
                        <p className="po-info-value">{po.poNumber}</p>
                    </div>
                    <div>
                        <p className="po-info-label">Date:</p>
                        <p className="po-info-value">{format(po.date.toDate(), 'MMM d, yyyy')}</p>
                    </div>
                     <div style={{ gridColumn: '1 / -1' }}>
                        <p className="po-info-label">Care Of:</p>
                        <p className="po-info-value">{po.careOf}</p>
                    </div>
                </div>
            )}

            <table>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th className="text-center">Qty</th>
                  <th>Unit</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium">{item.name}</td>
                      <td className="text-center">{item.quantity}</td>
                      <td>{item.unit}</td>
                      <td>{item.description || 'N/A'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center" style={{ padding: '20px'}}>No items selected.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </main>
        </div>
    </>
  );
};

export default PrintBoxListLayout;
