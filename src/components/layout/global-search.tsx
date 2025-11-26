
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { InventoryVariant } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Search } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function GlobalSearch() {
  const { products, isProductsLoading } = useAuth();
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

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
      variant.parentName.toLowerCase().includes(lowercasedTerm) ||
      variant.brand.toLowerCase().includes(lowercasedTerm) ||
      variant.variation.toLowerCase().includes(lowercasedTerm)
    ).slice(0, 7); // Limit to 7 results
  }, [searchTerm, products]);

  const handleSelect = (variantId: string) => {
    setIsOpen(false);
    setSearchTerm('');
    router.push(`/products/${variantId}`);
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
                        onFocus={() => { if(searchTerm) setIsOpen(true); }}
                        disabled={isProductsLoading}
                    />
                </div>
            </PopoverAnchor>
            
            <PopoverContent 
                className="w-[var(--radix-popover-trigger-width)] p-0" 
                onOpenAutoFocus={(e) => e.preventDefault()}
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
                                onSelect={() => handleSelect(variant.id)}
                                value={`${variant.parentName} ${variant.brand} ${variant.variation}`}
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
  );
}
