

'use client';

import React from 'react';
import { format } from 'date-fns';
import type { PurchaseOrder, PurchaseOrderItem } from '@/lib/types';
import PrintLayoutWrapper from '@/components/layout/print-layout-wrapper';

interface PrintBoxListLayoutProps {
  po: PurchaseOrder | null;
  items: PurchaseOrderItem[];
  boxIdentity: string;
}

const PrintBoxListLayout: React.FC<PrintBoxListLayoutProps> = ({ po, items, boxIdentity }) => {

  return (
    <PrintLayoutWrapper>
      <style>{`
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
        `}</style>
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
    </PrintLayoutWrapper>
  );
};

export default PrintBoxListLayout;
