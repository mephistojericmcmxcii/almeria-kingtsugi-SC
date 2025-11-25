
'use client';

import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { InventoryVariant } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Eye, Package, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';

const ViewProductModal = lazy(() => import('@/components/dashboard/view-product-modal').then(module => ({ default: module.ViewProductModal })));

export default function ProductsPage() {
  const { user, products: allVariants, isProductsLoading: isDataLoading, addToCart } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedVariant, setSelectedVariant] = useState<InventoryVariant | null>(null);
  const isMobile = useIsMobile();

  const categories = useMemo(() => {
    if (!allVariants) return [];
    const uniqueCategories = new Set(allVariants.map(v => v.parentCategory));
    return ['All Categories', ...Array.from(uniqueCategories).sort()];
  }, [allVariants]);

  const filteredItems = useMemo(() => {
    if (!allVariants) return [];
    return allVariants.filter(variant => {
      const lowercasedTerm = searchTerm.toLowerCase();
      const inCategory = selectedCategory === 'all' || variant.parentCategory === selectedCategory;
      const matchesSearch = variant.parentName.toLowerCase().includes(lowercasedTerm) ||
                              variant.brand.toLowerCase().includes(lowercasedTerm) ||
                              (variant.description && variant.description.toLowerCase().includes(lowercasedTerm));
      return inCategory && matchesSearch;
    });
  }, [allVariants, searchTerm, selectedCategory]);

  const handleViewItemClick = (variant: InventoryVariant) => {
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

  return (
    <>
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Product Catalog</h1>
      </div>
      
      <Card>
        <CardHeader>
           <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="relative w-full md:w-1/2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    placeholder="Search by name, brand, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10"
                />
              </div>
              <div className="w-full md:w-1/2">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={isDataLoading}>
                      <SelectTrigger className="w-full">
                          <SelectValue placeholder="Filter by category..." />
                      </SelectTrigger>
                      <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat} value={cat === 'All Categories' ? 'all' : cat}>
                                {cat}
                            </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
            </div>
        </CardHeader>
        <CardContent>
            {isDataLoading ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="space-y-2">
                           <Skeleton className="h-48 w-full" />
                           <Skeleton className="h-6 w-3/4" />
                           <Skeleton className="h-4 w-1/2" />
                        </div>
                    ))}
                </div>
            ) : filteredItems.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {filteredItems.map((variant) => {
                        const placeholder = getPlaceholderImage(variant);
                        return (
                            <Card 
                                key={variant.ref?.path || variant.id} 
                                className="overflow-hidden group cursor-pointer flex flex-col"
                                onClick={() => handleViewItemClick(variant)}
                            >
                                <div className="aspect-square relative w-full">
                                    <img
                                        src={placeholder.imageUrl}
                                        alt={placeholder.description}
                                        className="object-cover w-full h-full transition-transform group-hover:scale-105"
                                        data-ai-hint={placeholder.imageHint}
                                    />
                                    {variant.quantity <= 0 && (
                                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <p className="text-white font-bold bg-destructive px-3 py-1 rounded">OUT OF STOCK</p>
                                      </div>
                                    )}
                                </div>
                                <CardHeader className="p-4 pb-2 flex-grow">
                                    <CardTitle className="font-headline text-lg leading-tight truncate" title={variant.parentName}>
                                        {variant.parentName}
                                    </CardTitle>
                                    <CardDescription className="truncate" title={variant.brand}>
                                        {variant.brand}
                                    </CardDescription>
                                    {variant.description && (
                                        <p className="text-xs text-muted-foreground pt-1 truncate" title={variant.description}>
                                            {variant.description}
                                        </p>
                                    )}
                                </CardHeader>
                                <CardContent className="p-4 pt-0 mt-auto">
                                    <Button variant="outline" size="sm" className="w-full">
                                        <Eye className="mr-2 h-4 w-4" /> View Item
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-24">
                    <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">
                        {searchTerm ? 'No products found matching your search.' : 'No products available in this category.'}
                    </p>
                </div>
            )}
        </CardContent>
      </Card>
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
