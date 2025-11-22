
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
          @media print {
            @page {
              size: A4;
              margin: 1cm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              font-size: 10pt;
              margin: 0;
              -webkit-print-color-adjust: exact;
            }
            .print-container {
              width: 100%;
            }
            .header, .footer {
              text-align: center;
              font-size: 9pt;
              color: #666;
            }
            .header {
              height: 50px; /* Reserved space */
            }
            .footer {
                position: fixed;
                bottom: 0;
                width: 100%;
                height: 30px; /* Reserved space */
            }
            h1 {
              font-size: 16pt;
              margin: 0 0 5px 0;
            }
            h2 {
                font-size: 12pt;
                margin: 0 0 20px 0;
                color: #333;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
          }
        `}</style>
        <div className="print-container">
          <div className="header">
            {/* You can add a logo or static header content here */}
          </div>
          
          <main>
            <h1>Inventory Variants List</h1>
            <h2>Item: {item.name}</h2>
            <p>Category: {item.category}</p>
            <p>Date Printed: {printDate}</p>

            <table>
              <thead>
                <tr>
                  <th>Brand</th>
                  <th>Model</th>
                  <th>Source</th>
                  <th style={{textAlign: 'right'}}>Quantity</th>
                  <th style={{textAlign: 'right'}}>Cost Price</th>
                  <th style={{textAlign: 'right'}}>Selling Price</th>
                </tr>
              </thead>
              <tbody>
                {variants.length > 0 ? (
                  variants.map((variant) => (
                    <tr key={variant.id}>
                      <td>{variant.brand}</td>
                      <td>{variant.model || 'N/A'}</td>
                      <td>{variant.source}</td>
                      <td style={{textAlign: 'right'}}>{variant.quantity}</td>
                      <td style={{textAlign: 'right'}}>{formatCurrency(variant.costPrice)}</td>
                      <td style={{textAlign: 'right'}}>{formatCurrency(variant.price)}</td>
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

           <div className="footer">
            Page <span className="page-number"></span>
           </div>
        </div>
    </>
  );
};

export default PrintLayout;
