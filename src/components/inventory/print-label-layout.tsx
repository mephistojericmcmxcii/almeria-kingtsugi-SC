
'use client';

import React from 'react';
import type { InventoryVariant } from '@/lib/types';

interface PrintLabelLayoutProps {
  variants: InventoryVariant[];
}

const PrintLabelLayout: React.FC<PrintLabelLayoutProps> = ({ variants }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };
  
  return (
    <>
      <style>{`
          @media print {
            @page {
              size: 3in 2in; /* Standard label size */
              margin: 0;
            }
          }
          body {
            margin: 0;
            -webkit-print-color-adjust: exact;
          }
          .label-container {
            display: flex;
            flex-wrap: wrap;
            gap: 0;
          }
          .label {
            width: 3in;
            height: 2in;
            box-sizing: border-box;
            padding: 0.15in;
            border: 1px dotted #ccc; /* Visible on screen, not printed */
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            font-size: 11pt;
            page-break-after: always;
          }
          .label h3 {
            font-size: 14pt;
            font-weight: bold;
            margin: 0 0 4px 0;
          }
          .label p {
            margin: 0;
            line-height: 1.3;
          }
          .price {
              font-size: 18pt;
              font-weight: bold;
              margin-top: 8px;
          }
           @media screen {
            .label {
              margin: 10px;
              border: 1px solid #999;
            }
          }
        `}</style>
      <div className="label-container">
        {variants.map((variant) => (
          <div key={variant.id} className="label">
            <h3>{variant.parentName}</h3>
            <p>{variant.brand}{variant.model ? ` - ${variant.model}` : ''}</p>
            <p>{variant.variation}</p>
            <p className="price">{formatCurrency(variant.price)}</p>
          </div>
        ))}
      </div>
    </>
  );
};

export default PrintLabelLayout;
