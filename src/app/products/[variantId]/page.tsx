
'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { InventoryVariant, Specification } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LoginRedirectDialog } from '@/components/auth/login-redirect-dialog';
import { ArrowLeft, Tag, FileQuestion, Info, ListTree, Package } from 'lucide-react';
import Link from 'next/link';

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { products, isProductsLoading, addToCart, user } = useAuth();
  const [isLoginRedirectOpen, setIsLoginRedirectOpen] = useState(false);

  const variantId = params.variantId as string;

  const variant = useMemo(() => {
    if (!products) return null;
    return products.find(v => v.id === variantId) || null;
  }, [products, variantId]);

  const handleAddToCartClick = () => {
    if (!user) {
      setIsLoginRedirectOpen(true);
    } else if (variant) {
      addToCart(variant);
    }
  };

  const getPlaceholderImage = (item: InventoryVariant) => {
    if (item.imageUrl) {
      return { imageUrl: item.imageUrl, description: item.parentName, imageHint: 'product' };
    }
    if (item.parentCategory) {
      const categoryId = item.parentCategory.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-category';
      const categoryImage = PlaceHolderImages.find(p => p.id === categoryId);
      if (categoryImage) return categoryImage;
    }
    const itemImage = PlaceHolderImages.find(p => p.id === item.parentItemId);
    if (itemImage) return itemImage;
    return PlaceHolderImages.find(p => p.id === 'product-fallback')!;
  };

  const getStatusBadge = (v: InventoryVariant) => {
    if (v.quantity <= 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (v.quantity <= v.warningLimit) return <Badge variant="secondary" className="bg-orange-500 text-orange-50 hover:bg-orange-600">Low Stock</Badge>;
    return <Badge className="bg-green-600 text-green-50 hover:bg-green-700 border-green-700">In Stock</Badge>;
  };
  
  const renderSpecifications = () => {
    if (!variant || !variant.specifications || (Array.isArray(variant.specifications) && variant.specifications.length === 0)) return null;

    let specsContent;
    if (typeof variant.specifications === 'string' && variant.specifications) {
      specsContent = <p className="text-sm text-muted-foreground whitespace-pre-wrap">{variant.specifications}</p>;
    } else if (Array.isArray(variant.specifications)) {
      specsContent = (
        <table className="w-full text-sm">
          <tbody>
            {variant.specifications.map((spec: Specification, index: number) => (
              <tr key={index} className="border-b last:border-b-0">
                <td className="py-2 pr-2 font-medium text-muted-foreground w-1/3">{spec.title}</td>
                <td className="py-2 pr-2">{spec.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    return (
      <div className="space-y-2">
        <h4 className="font-semibold flex items-center gap-2 text-muted-foreground"><ListTree className="w-4 h-4" /> Specifications</h4>
        {specsContent}
      </div>
    );
  };
  
  if (isProductsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <div className="space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </div>
      </div>
    )
  }

  if (!variant) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12">
        <Package className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-3xl font-bold font-headline">Product Not Found</h1>
        <p className="text-muted-foreground mt-2">
          The product you're looking for might have been moved or deleted.
        </p>
        <Button asChild className="mt-6">
          <Link href="/products">Back to Catalog</Link>
        </Button>
      </div>
    );
  }

  const placeholder = getPlaceholderImage(variant);

  return (
    <>
    <div className="space-y-6">
      <Button variant="outline" size="sm" asChild>
        <Link href="/products"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Catalog</Link>
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* Left Column: Image & Actions */}
        <div className="space-y-6 sticky top-8">
          <div className="aspect-square relative w-full">
            <img
              src={placeholder.imageUrl}
              alt={placeholder.description || 'Product Image'}
              className="object-cover rounded-lg w-full h-full"
              data-ai-hint={placeholder.imageHint}
            />
          </div>
          <div className="mt-6 pt-6 border-t space-y-4">
            <div className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Tag className="w-5 h-5" />
                    <span className="font-bold text-xl text-foreground">Price on Request</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {getStatusBadge(variant)}
                {variant.quantity > 0 && <span className="text-xs text-muted-foreground">({variant.quantity} available)</span>}
            </div>
            <Button size="lg" className="w-full" disabled={variant.quantity <= 0} onClick={handleAddToCartClick}>
                <FileQuestion className="mr-2" /> Add to Quotation
            </Button>
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Badge variant="secondary">{variant.parentCategory || 'Uncategorized'}</Badge>
            <h1 className="font-headline text-3xl md:text-4xl text-primary">{variant.parentName}</h1>
          </div>
          
          <div className="space-y-4">
             <table className="w-full text-sm">
                <tbody>
                    <tr className="border-b"><td className="py-2 font-medium text-muted-foreground w-1/3">Variation</td><td className="py-2 font-semibold">{variant.variation}</td></tr>
                    <tr className="border-b"><td className="py-2 font-medium text-muted-foreground">Brand</td><td className="py-2 font-semibold">{variant.brand}</td></tr>
                    {variant.model && (<tr className="border-b"><td className="py-2 font-medium text-muted-foreground">Model</td><td className="py-2 font-semibold">{variant.model}</td></tr>)}
                </tbody>
            </table>

            {variant.description && (
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2 text-muted-foreground"><Info className="w-4 h-4"/>Description</h4>
                <p className="text-sm text-muted-foreground">{variant.description}</p>
              </div>
            )}
            
            {renderSpecifications()}
          </div>
        </div>
      </div>
    </div>
    <LoginRedirectDialog isOpen={isLoginRedirectOpen} onOpenChange={setIsLoginRedirectOpen} />
    </>
  );
}
