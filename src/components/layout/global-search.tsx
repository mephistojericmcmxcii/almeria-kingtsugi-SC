
'use client';

import { useState, useMemo, useEffect, lazy, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { InventoryVariant } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
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
  const popoverRef = useRef<HTMLDivElement>(null);


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

  const handleSelect = (value: string) => {
    const variant = filteredProducts.find(p => p.id === value);
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
                        disabled={isProductsLoading}
                    />
                </div>
            </PopoverAnchor>
            
            <PopoverContent
                ref={popoverRef}
                className="w-[var(--radix-popover-trigger-width)] p-0"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onBlur={(e) => {
                    // This is the hardfix: Check if the new focused element is outside the popover.
                    // If it is, then we can safely close it.
                    if (!popoverRef.current?.contains(e.relatedTarget as Node)) {
                        setIsOpen(false);
                    }
                }}
            >
                <Command>
                    <CommandList>
                    {filteredProducts.length === 0 && searchTerm ? (
                         <CommandEmpty>No products found.</CommandEmpty>
                    ) : (
                        <CommandGroup>
                        {filteredProducts.map((variant) => (
                            <CommandItem
                                key={variant.id}
                                value={variant.id}
                                onSelect={handleSelect}
                                className="flex items-center gap-3 cursor-pointer"
                            >
                                <img 
                                    src={getPlaceholderImage(variant).imageUrl}
                                    alt={variant.parentName}
                                    className="h-8 w-8 object-cover rounded-sm"
                                />
                                <div>
                                    <p className="text-sm font-medium">{variant.parentName}</p>
                                    <p className="text-xs text-muted-foreground">{variant.brand} - {variant.variation}</p>
                                </div>
                            </CommandItem>
                        ))}
                        </CommandGroup>
                    )}
                    </CommandList>
                </Command>
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
