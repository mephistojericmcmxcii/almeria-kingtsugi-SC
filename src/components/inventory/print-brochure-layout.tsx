

'use client';

import React from 'react';
import type { InventoryVariant, Specification } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import PrintLayoutWrapper from '@/components/layout/print-layout-wrapper';

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
  
  const renderSpecifications = () => {
    if (!variant.specifications) return null;

    if (typeof variant.specifications === 'string' && variant.specifications) {
      return (
        <div className="description-section">
          <h3>Specifications</h3>
          <p>{variant.specifications}</p>
        </div>
      );
    }
    
    if (Array.isArray(variant.specifications) && variant.specifications.length > 0) {
      return (
        <div className="description-section">
          <h3>Specifications</h3>
          <table className="structured-specs-table">
            <tbody>
              {variant.specifications.map((spec: Specification, index: number) => (
                <tr key={index}>
                  <td>{spec.title}</td>
                  <td>{spec.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return null;
  };

  return (
    <PrintLayoutWrapper>
      <style>{`
          .brochure-main {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            align-items: flex-start;
          }
          .brochure-image {
              width: 100%;
              height: auto;
              aspect-ratio: 1 / 1;
              object-fit: cover;
              border-radius: 0.5rem;
              border: 1px solid #e5e7eb;
          }
          .brochure-details {
            display: flex;
            flex-direction: column;
            height: 100%;
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
          .description-section {
              margin-top: 2rem;
              padding-top: 1rem;
              border-top: 1px solid #f3f4f6;
          }
          .description-section h3 {
              font-weight: 600;
              font-size: 11pt;
              color: #6b7280;
              margin-bottom: 0.5rem;
              margin-top: 1rem;
              text-transform: uppercase;
              letter-spacing: 0.5px;
          }
          .description-section p {
              font-size: 10pt;
              color: #4b5563;
              white-space: pre-wrap;
              margin: 0;
          }
          .specs-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 1.5rem;
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
          .structured-specs-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 0.5rem;
            font-size: 10pt;
          }
          .structured-specs-table td {
            padding: 0.4rem 0.8rem;
            border: 1px solid #e5e7eb;
          }
          .structured-specs-table td:first-child {
            font-weight: 600;
            width: 30%;
            background-color: #f9fafb;
          }
      `}</style>
      <main>
        <div className="brochure-main">
            <img src={placeholder.imageUrl} alt={variant.parentName} className="brochure-image" />
            <div className="brochure-details">
                <div>
                    <h2>{variant.parentName}</h2>
                    <p className="brand">{variant.brand}</p>
                </div>
                
                <table className="specs-table">
                    <tbody>
                        <tr>
                            <td>Brand</td>
                            <td>{variant.brand}</td>
                        </tr>
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
                    </tbody>
                </table>
            </div>
        </div>

        <div className="full-width-section">
            {variant.description && (
                <div className="description-section">
                    <h3>Description</h3>
                    <p>{variant.description}</p>
                </div>
            )}
            {renderSpecifications()}
        </div>
      </main>
    </PrintLayoutWrapper>
  );
};

export default PrintBrochureLayout;
