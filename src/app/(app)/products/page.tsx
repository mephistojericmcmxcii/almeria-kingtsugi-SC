
'use client';

import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { collectionGroup, getDocs, query } from 'firebase/firestore';
import type { InventoryVariant } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { FileQuestion, Package, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ViewProductModal = lazy(() => import('@/components/dashboard/view-product-modal').then(module => ({ default: module.ViewProductModal })));

export default function ProductsPage() {
  const { firestore } = useFirebase();
  const { addToCart } = useAuth();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [allVariants, setAllVariants] = useState<InventoryVariant[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<InventoryVariant | null>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!firestore) return;
      setIsDataLoading(true);

      try {
        const variantsQuery = query(collectionGroup(firestore, 'variants'));
        const variantsSnapshot = await getDocs(variantsQuery);
        
        const variants = variantsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          ref: doc.ref,
        } as InventoryVariant));

        setAllVariants(variants);
      } catch (error) {
        console.error("Error fetching product data:", error);
        toast({
          variant: 'destructive',
          title: 'Error Fetching Products',
          description: 'Could not load the product catalog.'
        });
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchAllData();
  }, [firestore, toast]);
  
  const categories = useMemo(() => {
    const uniqueCategories = new Set(allVariants.map(v => v.parentCategory));
    return ['All Categories', ...Array.from(uniqueCategories).sort()];
  }, [allVariants]);

  const filteredItems = useMemo(() => {
    return allVariants.filter(variant => {
      const lowercasedTerm = searchTerm.toLowerCase();
      const inCategory = selectedCategory === 'all' || variant.parentCategory === selectedCategory;
      const matchesSearch = variant.parentName.toLowerCase().includes(lowercasedTerm) ||
                              variant.brand.toLowerCase().includes(lowercasedTerm) ||
                              (variant.description && variant.description.toLowerCase().includes(lowercasedTerm));
      return inCategory && matchesSearch;
    });
  }, [allVariants, searchTerm, selectedCategory]);

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
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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
                                className="overflow-hidden group cursor-pointer"
                                onClick={() => setSelectedVariant(variant)}
                            >
                                <div className="aspect-square relative">
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
                                <CardHeader className="p-4 pb-2">
                                    <CardTitle className="font-headline text-lg leading-tight truncate" title={variant.parentName}>
                                        {variant.parentName}
                                    </CardTitle>
                                    <CardDescription className="truncate" title={variant.brand}>
                                        {variant.brand}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <Button variant="outline" size="sm" className="w-full">
                                        <FileQuestion className="mr-2 h-4 w-4" /> Get a Quote
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

    {selectedVariant && (
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
