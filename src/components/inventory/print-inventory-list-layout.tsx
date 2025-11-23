

'use client';

import React from 'react';
import { format } from 'date-fns';
import type { InventoryItem, InventoryVariant } from '@/lib/types';
import PrintLayoutWrapper from '@/components/layout/print-layout-wrapper';

interface PrintInventoryListLayoutProps {
  items: InventoryItem[];
  variants?: Record<string, InventoryVariant[]>;
}

const PrintInventoryListLayout: React.FC<PrintInventoryListLayoutProps> = ({ items, variants }) => {
  return (
    <PrintLayoutWrapper>
      <style>{`
          .document-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2rem;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 1rem;
          }
          .document-header .info-block {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }
           .document-header .info-item {
            display: flex;
            align-items: baseline;
          }
          .document-header .info-label {
            font-weight: bold;
            width: 120px;
          }
          .document-header .info-value {
            border-bottom: 1px solid #ccc;
            flex-grow: 1;
            min-width: 200px;
          }
          .document-title h2 {
            font-family: 'Playfair Display', serif;
            font-size: 20pt;
            margin: 0 0 1rem 0;
            color: #111827;
          }
          .item-block {
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 1rem;
              margin-bottom: 1.5rem;
              page-break-inside: avoid;
          }
          .item-header h3 {
              font-family: 'Playfair Display', serif;
              font-size: 14pt;
              margin: 0;
          }
          .item-header p {
              margin: 0;
              color: #6b7280;
          }
          .variants-table {
              margin-top: 1rem;
              width: 100%;
          }
          .variants-table th, .variants-table td {
              font-size: 9pt;
              padding: 6px 8px;
              background-color: #f9fafb;
          }
           .variants-table tr:last-child td {
               border-bottom: none;
           }
        `}</style>
        <main>
            <div className="document-header">
              <div className="info-block">
                <div className="info-item">
                  <span className="info-label">Date:</span>
                  <span className="info-value"></span>
                </div>
                <div className="info-item">
                  <span className="info-label">Inventoried By:</span>
                  <span className="info-value"></span>
                </div>
                <div className="info-item">
                  <span className="info-label">Checked By:</span>
                  <span className="info-value"></span>
                </div>
              </div>
            </div>
            
            {items.length > 0 ? (
                variants ? (
                    items.map(item => {
                        const itemVariants = variants[item.id] || [];
                        return (
                            <div key={item.id} className="item-block">
                                <div className="item-header">
                                    <h3>{item.name}</h3>
                                    <p>Category: {item.category} | Parent Total Stock: {item.totalStock}</p>
                                </div>
                                {itemVariants.length > 0 && (
                                    <table className="variants-table">
                                        <thead>
                                            <tr>
                                                <th>Variation</th>
                                                <th>Brand</th>
                                                <th>Model</th>
                                                <th className="text-right">Qty</th>
                                                <th style={{width: '100px'}}>Physical Count</th>
                                                <th style={{width: '270px'}}>Location</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {itemVariants.map(variant => (
                                                <tr key={variant.id}>
                                                    <td>{variant.variation}</td>
                                                    <td>{variant.brand}</td>
                                                    <td>{variant.model || 'N/A'}</td>
                                                    <td className="text-right">{variant.quantity}</td>
                                                    <td style={{border: '1px solid #ccc'}}></td>
                                                    <td style={{border: '1px solid #ccc'}}></td>
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
                      <th>Item Name</th>
                      <th>Category</th>
                      <th className="text-right">Total Stock</th>
                      <th style={{width: '120px'}}>Physical Count</th>
                      <th style={{width: '270px'}}>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                        <tr key={item.id}>
                            <td className="font-medium">{item.name}</td>
                            <td>{item.category}</td>
                            <td className="text-right">{item.totalStock || 0}</td>
                            <td style={{border: '1px solid #ccc'}}></td>
                            <td style={{border: '1px solid #ccc'}}></td>
                        </tr>
                    ))}
                  </tbody>
                </table>
                )
            ) : (
                <p style={{textAlign: 'center', padding: '20px'}}>No items selected for printing.</p>
            )}
        </main>
    </PrintLayoutWrapper>
  );
};

export default PrintInventoryListLayout;
