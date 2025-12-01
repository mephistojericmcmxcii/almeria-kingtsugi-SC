
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

  // This component now creates a self-contained, printable sticker layout.
  // It no longer uses the PrintLayoutWrapper.

  return (
    <>
      <style>{`
          @media print {
            @page {
              size: landscape;
              margin: 1cm;
            }
            body {
              background-color: #fff !important;
              -webkit-print-color-adjust: exact;
            }
            .sticker-container {
              border: none !important;
              box-shadow: none !important;
              margin: 0 !important;
              border-radius: 0 !important;
            }
          }
          body {
             font-family: 'PT Sans', sans-serif;
             background-color: #f3f4f6;
          }
          .sticker-container {
              margin: 2rem auto;
              padding: 2rem;
              border: 10px solid black;
              border-image: linear-gradient(45deg, gold, black) 1;
              background-color: #fff;
              width: 100%;
              max-width: 1000px; /* Adjusted for landscape */
          }
          .box-identity {
              font-size: 20pt;
              font-weight: bold;
              text-align: center;
              margin-bottom: 1.5rem;
              padding: 0.5rem;
              background-color: #f9fafb;
              border: 1px dashed #ccc;
          }
          .po-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 0.5rem 2rem;
              font-size: 12pt;
              margin-bottom: 1.5rem;
              padding-bottom: 1rem;
              border-bottom: 1px solid #e5e7eb;
          }
          .po-info-label {
              font-weight: bold;
              color: #4b5563;
          }
          .po-info-value {
              font-weight: 600;
          }
          .item-table {
              width: 100%;
              border-collapse: collapse;
          }
          .item-table th, .item-table td {
              font-size: 11pt;
              padding: 8px 10px;
              text-align: left;
              border-bottom: 1px solid #e5e7eb;
          }
           .item-table th {
                font-weight: bold;
                text-transform: uppercase;
                color: #6b7280;
                background-color: #f9fafb;
           }
          .item-table tr:last-child td {
              border-bottom: none;
          }
          .text-center {
              text-align: center;
          }
          .font-medium {
              font-weight: 600;
          }
        `}</style>
        <div className="sticker-container">
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
                        <p className="po-info-value">{format(po.date.toDate(), 'dd-MMM-yyyy')}</p>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <p className="po-info-label">Care Of:</p>
                        <p className="po-info-value">{po.careOf}</p>
                    </div>
                </div>
            )}

            <table className="item-table">
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
        </div>
    </>
  );
};

export default PrintBoxListLayout;
