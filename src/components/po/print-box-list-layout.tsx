
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

  return (
    <>
      <style>{`
          @media print {
            @page {
              size: portrait;
              margin: 1cm;
            }
            body {
              background-color: #fff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .sticker-container {
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
              padding: 1.5rem;
              position: relative;
              background-color: #fff;
              width: 100%;
              max-width: 500px;
              z-index: 1;
          }
          .sticker-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: -1;
            padding: 10px; /* This creates the border thickness */
            background: linear-gradient(45deg, gold, black);
            -webkit-mask: 
               linear-gradient(#fff 0 0) content-box, 
               linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
          }
          .box-identity {
              font-size: 18pt;
              font-weight: bold;
              text-align: center;
              margin-bottom: 1rem;
              padding: 0.5rem;
              background-color: #f9fafb;
              border: 1px dashed #ccc;
          }
          .po-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 0.5rem 1.5rem;
              font-size: 11pt;
              margin-bottom: 1rem;
              padding-bottom: 1rem;
              border-bottom: 1px solid #e5e7eb;
          }
          .po-info-label {
              font-weight: bold;
              color: #4b5563;
              font-size: 10pt;
          }
          .po-info-value {
              font-weight: 600;
          }
          .item-table {
              width: 100%;
              border-collapse: collapse;
          }
          .item-table th, .item-table td {
              font-size: 10pt;
              padding: 6px 8px;
              text-align: left;
              border-bottom: 1px solid #e5e7eb;
          }
           .item-table th {
                font-weight: bold;
                text-transform: uppercase;
                color: #6b7280;
                background-color: #f9fafb;
                font-size: 9pt;
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
