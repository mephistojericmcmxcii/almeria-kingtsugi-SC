
'use client';

import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { collection, getDocs } from 'firebase/firestore';
import type { InventoryItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Eye, Search, Package } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function ProductsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  useEffect(() => {
    const fetchAllData = async () => {
        if (!firestore) return;
        setIsDataLoading(true);

        try {
            const itemsCollectionRef = collection(firestore, 'inventory');
            const itemsSnapshot = await getDocs(itemsCollectionRef);
            
            const items = itemsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as InventoryItem));

            setInventoryItems(items);
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
  
  const handleViewVariants = (itemId: string) => {
    router.push(`/management/inventory/${itemId}`);
  };

  const getPlaceholderImage = (item: InventoryItem) => {
      if (item.category) {
        const categoryId = item.category.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-category';
        const categoryImage = PlaceHolderImages.find(p => p.id === categoryId);
        if (categoryImage) {
            return categoryImage;
        }
      }
      const itemImage = PlaceHolderImages.find(p => p.id === item.id);
      if (itemImage) {
        return itemImage;
      }
      return PlaceHolderImages.find(p => p.id === 'product-fallback')!;
  };
  
  const groupedAndFilteredItems = useMemo(() => {
    if (!inventoryItems) return {};
    
    const filtered = inventoryItems.filter(item => {
      const lowercasedTerm = searchTerm.toLowerCase();
      const hasName = item.name.toLowerCase().includes(lowercasedTerm);
      const hasCategory = item.category.toLowerCase().includes(lowercasedTerm);
      return hasName || hasCategory;
    });

    return filtered.reduce((acc, item) => {
        const category = item.category || 'Uncategorized';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(item);
        return acc;
    }, {} as Record<string, InventoryItem[]>);

  }, [inventoryItems, searchTerm]);

  const categories = Object.keys(groupedAndFilteredItems).sort();
  const defaultActiveCategories = useMemo(() => categories, [categories]);

  return (
    <>
    <div className="space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline">Product Catalog</h1>
            </div>
            <div className="relative w-full md:w-1/3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    placeholder="Search by name or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10"
                />
            </div>
        </div>

        {isDataLoading ? (
            <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
            </div>
        ) : categories.length > 0 ? (
           <Accordion type="multiple" defaultValue={defaultActiveCategories} className="space-y-4">
                {categories.map(category => (
                    <AccordionItem value={category} key={category} className="border rounded-lg overflow-hidden">
                        <AccordionTrigger className="px-6 py-4 bg-muted/50 hover:bg-muted">
                            <h2 className="text-xl font-headline font-semibold text-primary">{category}</h2>
                        </AccordionTrigger>
                        <AccordionContent className="p-6 bg-background">
                             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                {groupedAndFilteredItems[category].map((item) => {
                                    const placeholder = getPlaceholderImage(item);
                                    return (
                                        <Card key={item.id} className="flex flex-col overflow-hidden group">
                                            <div className="aspect-square relative">
                                                <img
                                                    src={placeholder.imageUrl}
                                                    alt={placeholder.description}
                                                    className="object-cover w-full h-full"
                                                    data-ai-hint={placeholder.imageHint}
                                                />
                                            </div>
                                            <CardHeader className="pb-2 flex-grow">
                                                <CardTitle className="font-headline text-lg">{item.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <Button variant="outline" size="sm" className="w-full" onClick={() => handleViewVariants(item.id)}>
                                                    <Eye className="mr-2 h-4 w-4" /> View Variants ({item.variantCount || 0})
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
           </Accordion>
        ) : (
            <div className="text-center py-24 border rounded-lg">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">
                    {searchTerm ? 'No products found matching your search.' : 'No products available in the catalog.'}
                </p>
            </div>
        )}
    </div>
    </>
  );
}
