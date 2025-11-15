
'use client';

import { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { InventoryItem } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Eye, ShoppingCart, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const { firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');

  const inventoryCollectionRef = useMemoFirebase(() => collection(firestore, 'inventory'), [firestore]);
  const { data: inventoryItems, isLoading } = useCollection<InventoryItem>(inventoryCollectionRef);

  const filteredItems = useMemo(() => {
    if (!inventoryItems) return [];
    return inventoryItems.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [inventoryItems, searchTerm]);
  
  const handleOrderClick = (itemName: string) => {
    toast({
        title: "Coming Soon!",
        description: `Ordering functionality for ${itemName} is not yet available.`
    })
  }

  // A simple function to get a placeholder image based on the item ID
  const getPlaceholderImage = (itemId: string) => {
      const itemImage = PlaceHolderImages.find(p => p.id === itemId);
      const fallbackImage = PlaceHolderImages.find(p => p.id === 'product-fallback');
      return itemImage || fallbackImage!;
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
                    placeholder="Search by name or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10"
                />
            </div>
        </div>

        {isLoading ? (
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
                    const placeholder = getPlaceholderImage(item.id);
                    return (
                        <Card key={item.id} className="flex flex-col overflow-hidden">
                            <div className="aspect-video relative">
                                <Image
                                    src={placeholder.imageUrl}
                                    alt={placeholder.description}
                                    fill
                                    className="object-cover"
                                    data-ai-hint={placeholder.imageHint}
                                />
                            </div>
                            <CardHeader>
                                <CardTitle className="font-headline text-xl">{item.name}</CardTitle>
                                <CardDescription>
                                    <Badge variant="secondary">{item.category}</Badge>
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm text-muted-foreground line-clamp-3">
                                    {item.description || 'A unique item from our collection.'}
                                </p>
                            </CardContent>
                            <CardFooter className="flex-col sm:flex-row gap-2 pt-4">
                                <Button variant="outline" className="w-full" onClick={() => router.push(`/services/inventory/${item.id}`)}>
                                    <Eye className="mr-2" /> View Details
                                </Button>
                                <Button className="w-full" onClick={() => handleOrderClick(item.name)}>
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
