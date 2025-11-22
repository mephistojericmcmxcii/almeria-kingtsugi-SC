
'use client';

import React from 'react';
import type { InventoryVariant } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

interface PrintBrochureLayoutProps {
  variant: InventoryVariant;
}

const PrintBrochureLayout: React.FC<PrintBrochureLayoutProps> = ({ variant }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };
  
  const getPlaceholderImage = (item: InventoryVariant) => {
      if (item.imageUrl) {
          return { imageUrl: item.imageUrl, description: item.parentName, imageHint: 'product' };
      }
      if (item.parentCategory) {
        const categoryId = item.parentCategory.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-category';
        const categoryImage = PlaceHolderImages.find(p => p.id === categoryId);
        if (categoryImage) {
            return categoryImage;
        }
      }
      const itemImage = PlaceHolderImages.find(p => p.id === item.parentItemId);
      if (itemImage) {
        return itemImage;
      }
      return PlaceHolderImages.find(p => p.id === 'product-fallback')!;
  };

  const placeholder = getPlaceholderImage(variant);

  return (
    <>
      <style>{`
          :root {
            --primary: 39 61% 57%;
            --muted-foreground: 240 3.8% 46.1%;
            --border: 0 0% 89.8%;
          }
          body {
            font-family: 'PT Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 0;
            padding: 2rem;
            font-size: 12pt;
            background-color: #f9fafb;
            color: #111827;
            -webkit-print-color-adjust: exact;
          }
          .print-container {
            width: 100%;
            max-width: 800px;
            margin: auto;
            background-color: white;
            padding: 2rem;
            border-radius: 0.5rem;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          }
          .header, .footer {
            text-align: center;
            font-size: 9pt;
            color: #6b7280;
          }
          .header {
             border-bottom: 1px solid #e5e7eb;
             padding-bottom: 1rem;
             margin-bottom: 2rem;
          }
          .header h1 {
              font-family: 'Playfair Display', serif;
              font-size: 24pt;
              margin: 0;
              color: hsl(var(--primary));
          }
          .footer {
              margin-top: 2rem;
              padding-top: 1rem;
              border-top: 1px solid #e5e7eb;
           }
          .brochure {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            align-items: flex-start;
          }
          .brochure-image {
              width: 100%;
              height: 350px;
              object-fit: cover;
              border-radius: 0.5rem;
              border: 1px solid #e5e7eb;
          }
          .brochure-details h2 {
              font-family: 'Playfair Display', serif;
              font-size: 28pt;
              margin: 0;
              color: #111827;
              line-height: 1.2;
          }
          .brochure-details .brand {
              font-size: 16pt;
              font-weight: 600;
              color: hsl(var(--primary));
              margin: 0.25rem 0 1rem 0;
          }
          .brochure-details .description {
              font-size: 11pt;
              color: #4b5563;
              margin-bottom: 1.5rem;
          }
          .specs-table {
            width: 100%;
            border-collapse: collapse;
          }
          .specs-table td {
            padding: 0.5rem 0;
            border-bottom: 1px solid #f3f4f6;
          }
          .specs-table td:first-child {
            font-weight: 600;
            color: #6b7280;
            width: 40%;
          }
          
          @media print {
            @page {
              size: A4 portrait;
              margin: 1cm;
            }
            body {
              background-color: white;
              padding: 0;
            }
            .print-container {
              box-shadow: none;
              border-radius: 0;
              padding: 0;
            }
          }
        `}</style>
        <div className="print-container">
          <header className="header">
             <h1>Kintsugi Variety Shop</h1>
          </header>
          
          <main className="brochure">
            <img src={placeholder.imageUrl} alt={variant.parentName} className="brochure-image" />
            <div className="brochure-details">
                <h2>{variant.parentName}</h2>
                <p className="brand">{variant.brand}</p>
                <p className="description">{variant.description || 'No description available.'}</p>
                
                <table className="specs-table">
                    <tbody>
                        <tr>
                            <td>Variation</td>
                            <td>{variant.variation}</td>
                        </tr>
                        {variant.model && (
                            <tr>
                                <td>Model</td>
                                <td>{variant.model}</td>
                            </tr>
                        )}
                        <tr>
                            <td>Category</td>
                            <td>{variant.parentCategory}</td>
                        </tr>
                        <tr>
                            <td>Quantity</td>
                            <td>{variant.quantity}</td>
                        </tr>
                        <tr>
                            <td>Price</td>
                            <td>{formatCurrency(variant.price)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
          </main>

           <footer className="footer">
            Product Information Slip - Printed on {new Date().toLocaleDateString()}
           </footer>
        </div>
    </>
  );
};

export default PrintBrochureLayout;
