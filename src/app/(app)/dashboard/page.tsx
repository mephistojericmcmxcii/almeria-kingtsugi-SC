
'use client';

import { useState, useEffect } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import type { InventoryItem, InventoryVariant } from '@/lib/types';

import { StatsCard } from "@/components/dashboard/stats-card";
import { Boxes, PackageSearch, PackageX, Tag } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
};

export default function DashboardPage() {
  const { firestore } = useFirebase();
  const [totalValue, setTotalValue] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [isValueLoading, setIsValueLoading] = useState(true);

  const inventoryCollectionRef = useMemoFirebase(() => collection(firestore, 'inventory'), [firestore]);
  const { data: inventoryItems, isLoading: areItemsLoading } = useCollection<InventoryItem>(inventoryCollectionRef);

  const recentItemsQuery = useMemoFirebase(() => {
    if (!inventoryCollectionRef) return null;
    return query(inventoryCollectionRef, orderBy('updatedAt', 'desc'), limit(5));
  }, [inventoryCollectionRef]);

  const { data: recentItems, isLoading: areRecentItemsLoading } = useCollection<InventoryItem>(recentItemsQuery);

  useEffect(() => {
    if (!inventoryItems) {
      setIsValueLoading(false);
      return;
    }

    const fetchVariantData = async () => {
        setIsValueLoading(true);
        let accumulatedValue = 0;
        let lowStockItems = 0;
        
        try {
            for (const item of inventoryItems) {
                const variantsCollectionRef = collection(firestore, 'inventory', item.id, 'variants');
                const variantsSnapshot = await getDocs(variantsCollectionRef);
                variantsSnapshot.forEach(variantDoc => {
                    const variant = variantDoc.data() as InventoryVariant;
                    accumulatedValue += (variant.quantity || 0) * (variant.price || 0);
                    if (variant.quantity > 0 && variant.quantity <= variant.warningLimit) {
                        lowStockItems++;
                    }
                });
            }
            setTotalValue(accumulatedValue);
            setLowStockCount(lowStockItems);
        } catch (error) {
            console.error("Error calculating inventory stats:", error);
            setTotalValue(0);
            setLowStockCount(0);
        } finally {
            setIsValueLoading(false);
        }
    };

    fetchVariantData();

  }, [inventoryItems, firestore]);

  const totalItems = inventoryItems?.length || 0;
  const categoriesCount = inventoryItems ? [...new Set(inventoryItems.map(item => item.category))].length : 0;
  const isLoading = areItemsLoading || isValueLoading;

  return (
    <div className="space-y-8">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
                title="Total Inventory Value"
                value={isLoading ? <Skeleton className="h-8 w-3/4" /> : formatCurrency(totalValue)}
                description="Estimated value of all current stock"
                icon={() => <span className='font-bold'>₱</span>}
                isLoading={isLoading}
            />
            <StatsCard
                title="Total Unique Items"
                value={isLoading ? <Skeleton className="h-8 w-1/4" /> : totalItems}
                description="Number of parent product lines"
                icon={PackageSearch}
                isLoading={isLoading}
            />
            <StatsCard
                title="Item Categories"
                value={isLoading ? <Skeleton className="h-8 w-1/4" /> : categoriesCount}
                description="Total number of unique categories"
                icon={Boxes}
                 isLoading={isLoading}
            />
            <StatsCard
                title="Low Stock Items"
                value={isLoading ? <Skeleton className="h-8 w-1/4" /> : lowStockCount}
                description="Variants needing restock"
                icon={PackageX}
                isLoading={isLoading}
            />
        </div>
        <div className="grid gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Recently Updated Items</CardTitle>
                    <CardDescription>
                        The last 5 parent items that were created or updated.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Last Updated</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {areRecentItemsLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                                </TableRow>
                                ))
                            ) : recentItems?.length ? (
                                recentItems.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell><Badge variant="secondary">{item.category}</Badge></TableCell>
                                    <TableCell className="text-muted-foreground truncate max-w-sm">{item.description || 'N/A'}</TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {item.updatedAt ? format(item.updatedAt.toDate(), 'PPp') : 'N/A'}
                                    </TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No inventory items found.
                                </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
