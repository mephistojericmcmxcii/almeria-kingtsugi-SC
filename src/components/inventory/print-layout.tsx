

'use client';

import React from 'react';
import type { InventoryItem, InventoryVariant } from '@/lib/types';
import PrintLayoutWrapper from '@/components/layout/print-layout-wrapper';

interface PrintLayoutProps {
  item: InventoryItem;
  variants: InventoryVariant[];
}

const PrintLayout: React.FC<PrintLayoutProps> = ({ item, variants }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };
  
  return (
    <PrintLayoutWrapper title="Inventory Variant List">
        <main>
          <div className="document-title">
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{textAlign: 'center', padding: '20px'}}>No variants found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </main>
    </PrintLayoutWrapper>
  );
};

export default PrintLayout;
