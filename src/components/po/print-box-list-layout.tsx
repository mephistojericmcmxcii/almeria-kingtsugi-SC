
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
              margin: 0;
            }
            body {
              background-color: #fff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
          body {
             font-family: 'PT Sans', sans-serif;
             background-color: #f3f4f6;
          }
          .print-area {
            width: 100%;
          }
          .outer-border {
              margin: 1rem auto;
              padding: 8px;
              background-color: black;
              width: 100%;
              max-width: 500px;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          }
          .inner-border {
              padding: 4px;
              background-color: #D4AF37; /* Gold color */
          }
          .sticker-content {
              background-color: #fff;
              padding: 1.5rem;
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
        <div className="print-area">
            <div className="outer-border">
                <div className="inner-border">
                    <div className="sticker-content">
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
                </div>
            </div>
        </div>
    </>
  );
};

export default PrintBoxListLayout;
