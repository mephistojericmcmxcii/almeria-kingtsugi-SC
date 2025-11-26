
'use client';

import { useState, useMemo, useEffect, lazy, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { InventoryVariant } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover';
import { Search } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useIsMobile } from '@/hooks/use-mobile';

const ViewProductModal = lazy(() => import('@/components/dashboard/view-product-modal').then(module => ({ default: module.ViewProductModal })));

export function GlobalSearch() {
  const { products, isProductsLoading, addToCart } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<InventoryVariant | null>(null);
  
  useEffect(() => {
    if (searchTerm.trim() !== '') {
        setIsOpen(true);
    } else {
        setIsOpen(false);
    }
  }, [searchTerm]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm || !products) return [];
    
    const lowercasedTerm = searchTerm.toLowerCase();
    
    return products.filter(variant => 
      variant.parentName.toLowerCase().startsWith(lowercasedTerm) ||
      variant.brand.toLowerCase().startsWith(lowercasedTerm) ||
      variant.variation.toLowerCase().startsWith(lowercasedTerm)
    ).slice(0, 7); // Limit to 7 results
  }, [searchTerm, products]);

  const handleSelect = (variantId: string) => {
    const variant = filteredProducts.find(p => p.id === variantId);
    if (!variant) return;

    setIsOpen(false);
    setSearchTerm('');
    if (isMobile) {
        router.push(`/products/${variant.id}`);
    } else {
        setSelectedVariant(variant);
    }
  };

  const handleAddToCart = (variant: InventoryVariant) => {
    addToCart(variant);
    setSelectedVariant(null);
  };

  const getPlaceholderImage = (item: InventoryVariant) => {
    if (item.imageUrl) {
        return { imageUrl: item.imageUrl };
    }
    if (item.parentCategory) {
      const categoryId = item.parentCategory.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-category';
      const categoryImage = PlaceHolderImages.find(p => p.id === categoryId);
      if (categoryImage) {
          return { imageUrl: categoryImage.imageUrl };
      }
    }
    const itemImage = PlaceHolderImages.find(p => p.id === item.parentItemId);
    if (itemImage) {
      return { imageUrl: itemImage.imageUrl };
    }
    return { imageUrl: PlaceHolderImages.find(p => p.id === 'product-fallback')!.imageUrl };
  };

  return (
    <>
    <div className="w-full max-w-sm">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverAnchor asChild>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search products..."
                        className="pl-9 bg-background/80 hover:bg-background/90 focus:bg-background"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onBlur={() => {
                            // Delay closing to allow click events to register
                            setTimeout(() => {
                                if (!document.activeElement?.closest('[data-radix-popover-content-wrapper]')) {
                                    setIsOpen(false);
                                }
                            }, 150);
                        }}
                        onFocus={() => {
                             if (searchTerm.trim() !== '') {
                                setIsOpen(true);
                            }
                        }}
                        disabled={isProductsLoading}
                    />
                </div>
            </PopoverAnchor>
            
            <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <div className="max-h-[300px] overflow-y-auto overflow-x-hidden">
                    {filteredProducts.length > 0 ? (
                        <div className="p-1">
                            {filteredProducts.map((variant) => (
                                <button
                                    key={variant.id}
                                    onClick={() => handleSelect(variant.id)}
                                    className="flex w-full items-center gap-3 cursor-pointer rounded-sm p-2 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                >
                                    <img 
                                        src={getPlaceholderImage(variant).imageUrl}
                                        alt={variant.parentName}
                                        className="h-8 w-8 object-cover rounded-sm"
                                    />
                                    <div>
                                        <p className="font-medium">{variant.parentName}</p>
                                        <p className="text-xs text-muted-foreground">{variant.brand} - {variant.variation}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : searchTerm ? (
                         <div className="py-6 text-center text-sm">No products found.</div>
                    ) : null}
                </div>
            </PopoverContent>
        </Popover>
    </div>
    
    {!isMobile && selectedVariant && (
        <Suspense fallback={<div>Loading...</div>}>
            <ViewProductModal 
                isOpen={!!selectedVariant}
                onOpenChange={() => setSelectedVariant(null)}
                variant={selectedVariant}
                onAddToCart={handleAddToCart}
            />
        </Suspense>
    )}
    </>
  );
}
