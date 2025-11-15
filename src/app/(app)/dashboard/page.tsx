
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup, getDoc, doc } from 'firebase/firestore';
import type { InventoryItem, InventoryVariant } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Eye, ShoppingCart, Search, Tag, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type CombinedVariant = InventoryVariant & {
    parentName: string;
    parentCategory: string;
    parentItemId: string;
};


export default function DashboardPage() {
  const { firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [combinedVariants, setCombinedVariants] = useState<CombinedVariant[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const variantsCollectionGroup = useMemoFirebase(() => collectionGroup(firestore, 'variants'), [firestore]);
  const { data: variants, isLoading: areVariantsLoading } = useCollection<InventoryVariant>(variantsCollectionGroup);

  useEffect(() => {
    const fetchParentData = async () => {
        if (!variants) {
            setIsDataLoading(areVariantsLoading);
            if (!areVariantsLoading) setCombinedVariants([]);
            return;
        }

        setIsDataLoading(true);
        const parentPromises = variants.map(async (variant) => {
            // variant.ref.parent.parent is how you get the parent doc from a subcollection doc
            const parentDocRef = variant.ref?.parent.parent;
            if (!parentDocRef) return null;

            const parentSnap = await getDoc(parentDocRef);
            if (parentSnap.exists()) {
                const parentData = parentSnap.data() as InventoryItem;
                return {
                    ...variant,
                    parentName: parentData.name,
                    parentCategory: parentData.category,
                    parentItemId: parentSnap.id,
                };
            }
            return null;
        });

        const settledVariants = await Promise.all(parentPromises);
        setCombinedVariants(settledVariants.filter((v): v is CombinedVariant => v !== null));
        setIsDataLoading(false);
    };

    fetchParentData();
  }, [variants, areVariantsLoading]);


  const filteredItems = useMemo(() => {
    if (!combinedVariants) return [];
    return combinedVariants.filter(item =>
      item.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.parentCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [combinedVariants, searchTerm]);
  
  const handleOrderClick = (itemName: string, brand: string) => {
    toast({
        title: "Coming Soon!",
        description: `Ordering for ${itemName} - ${brand} is not yet available.`
    })
  }

  const getPlaceholderImage = (itemId: string) => {
      const itemImage = PlaceHolderImages.find(p => p.id === itemId);
      const fallbackImage = PlaceHolderImages.find(p => p.id === 'product-fallback');
      return itemImage || fallbackImage!;
  }
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };
  
    const getStatusBadge = (variant: CombinedVariant) => {
        if (variant.quantity <= 0) {
        return <Badge variant="destructive">Out of Stock</Badge>;
        }
        if (variant.quantity <= variant.warningLimit) {
        return <Badge variant="secondary" className="bg-orange-500 text-orange-50 hover:bg-orange-600">Low Stock</Badge>;
        }
        return <Badge className="bg-green-600 text-green-50 hover:bg-green-700 border-green-700">In Stock</Badge>;
    }


  return (
    <div className="space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline">Product Catalog</h1>
                <p className="text-muted-foreground">Browse our collection of unique, handcrafted items.</p>
            </div>
            <div className="relative w-full md:w-1/3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    placeholder="Search by name, category, brand..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10"
                />
            </div>
        </div>

        {isDataLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                        <Skeleton className="h-48 w-full" />
                        <CardHeader>
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-10 w-full" />
                        </CardContent>
                        <CardFooter className="gap-2">
                             <Skeleton className="h-10 w-full" />
                             <Skeleton className="h-10 w-full" />
                        </CardFooter>
                    </Card>
                ))}
            </div>
        ) : filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredItems.map((item) => {
                    const placeholder = getPlaceholderImage(item.parentItemId);
                    return (
                        <Card key={item.id} className="flex flex-col overflow-hidden group">
                            <div className="aspect-video relative">
                                <Image
                                    src={placeholder.imageUrl}
                                    alt={placeholder.description}
                                    fill
                                    className="object-cover"
                                    data-ai-hint={placeholder.imageHint}
                                />
                                <div className="absolute top-2 right-2">
                                    {getStatusBadge(item)}
                                </div>
                            </div>
                            <CardHeader className="pb-2">
                                <CardDescription>
                                    <Badge variant="secondary">{item.parentCategory}</Badge>
                                </CardDescription>
                                <CardTitle className="font-headline text-xl">{item.parentName}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-2">
                                <p className="text-lg font-semibold text-primary">{item.brand}</p>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                    {item.description || 'A unique variant from our collection.'}
                                </p>
                                <div className="flex items-center justify-between text-sm pt-2">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Tag className="w-4 h-4" />
                                        <span className="font-medium text-foreground">{formatCurrency(item.price)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                         <Package className="w-4 h-4" />
                                        <span className="font-medium text-foreground">{item.quantity} left</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex-col sm:flex-row gap-2 pt-4">
                                <Button variant="outline" className="w-full" onClick={() => router.push(`/services/inventory/${item.parentItemId}`)}>
                                    <Eye className="mr-2" /> View Details
                                </Button>
                                <Button className="w-full" onClick={() => handleOrderClick(item.parentName, item.brand)} disabled={item.quantity <= 0}>
                                    <ShoppingCart className="mr-2" /> Add to Order
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
        ) : (
            <div className="text-center py-24">
                <p className="text-muted-foreground">No products found matching your search.</p>
            </div>
        )}
    </div>
  );
}
