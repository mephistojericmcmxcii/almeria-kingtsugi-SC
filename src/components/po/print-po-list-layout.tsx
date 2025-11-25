

'use client';

import React from 'react';
import { format } from 'date-fns';
import type { PurchaseOrder, PurchaseOrderItem } from '@/lib/types';
import PrintLayoutWrapper from '@/components/layout/print-layout-wrapper';


interface PrintPoListLayoutProps {
  pos: PurchaseOrder[];
  totals: Record<string, { allocated: number; utilized: number; itemCount: number; }>;
  poItems?: Record<string, PurchaseOrderItem[]>;
}

const PrintPoListLayout: React.FC<PrintPoListLayoutProps> = ({ pos, totals, poItems }) => {

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

  return (
    <PrintLayoutWrapper title="Purchase Order Summary Report" useLandscape>
       <style>{`
          .po-block {
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 1rem;
              margin-bottom: 1.5rem;
              page-break-inside: avoid;
          }
          .child-table {
              margin-top: 1rem;
              margin-left: 1.5rem;
              width: calc(100% - 1.5rem);
          }
          .child-table th, .child-table td {
              font-size: 9pt;
              padding: 6px 8px;
          }
        `}</style>
        <main>
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
                                          <th className="text-right">Allocation</th>
                                          <th className="text-right">Utilized</th>
                                          <th className="text-right">Status</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      <tr>
                                          <td className="font-medium">{po.poNumber}</td>
                                          <td>{format(po.date.toDate(), 'dd-MMM-yyyy')}</td>
                                          <td>{po.careOf}</td>
                                          <td className="text-right">{formatCurrency(totals[po.id]?.allocated || 0)}</td>
                                          <td className="text-right">{formatCurrency(totals[po.id]?.utilized || 0)}</td>
                                          <td className="text-right">{(po as any).displayStatus || po.status}</td>
                                      </tr>
                                  </tbody>
                              </table>
                              {children.length > 0 && (
                                  <table className="child-table">
                                      <thead>
                                          <tr>
                                              <th>Item Name</th>
                                              <th className="text-right">Qty</th>
                                              <th className="text-right">Allocated Amt. (per QTY)</th>
                                              <th className="text-right">Actual Amt. (per QTY)</th>
                                              <th className="text-right">Total Allocation</th>
                                              <th className="text-right">Total Utilized</th>
                                              <th>Description</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {children.map(child => (
                                              <tr key={child.id}>
                                                  <td>{child.name}</td>
                                                  <td className="text-right">{child.quantity}</td>
                                                  <td className="text-right">{formatCurrency(child.amount)}</td>
                                                  <td className="text-right">{formatCurrency(child.actualAmount || 0)}</td>
                                                  <td className="text-right font-medium">{formatCurrency(child.amount * (child.quantity ?? 1))}</td>
                                                  <td className="text-right font-medium">{formatCurrency((child.actualAmount || 0) * (child.quantity ?? 1))}</td>
                                                  <td>{child.description || 'N/A'}</td>
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
                    <th>Status</th>
                    <th className="text-right">Total Allocation</th>
                    <th className="text-right">Amount Utilized</th>
                    <th className="text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {pos.map((po) => {
                      const total = totals[po.id];
                      const balance = (total?.allocated || 0) - (total?.utilized || 0);
                      return (
                          <tr key={po.id}>
                              <td className="font-medium">{po.poNumber}</td>
                              <td>{format(po.date.toDate(), 'dd-MMM-yyyy')}</td>
                              <td>{po.careOf}</td>
                              <td>{(po as any).displayStatus || po.status}</td>
                              <td className="text-right">{formatCurrency(total?.allocated || 0)}</td>
                              <td className="text-right">{formatCurrency(total?.utilized || 0)}</td>
                              <td className="text-right font-medium">{formatCurrency(balance)}</td>
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
    </PrintLayoutWrapper>
  );
};

export default PrintPoListLayout;
