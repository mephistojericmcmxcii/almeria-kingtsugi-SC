
'use client';

import { useState, useMemo, useEffect, lazy, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useFirebase } from '@/firebase';
import { collection, doc, deleteDoc, getDoc, getDocs, runTransaction, Transaction } from 'firebase/firestore';
import type { InventoryItem, InventoryVariant } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useParams, useRouter } from 'next/navigation';

import { ChevronLeft, PackagePlus, MoreHorizontal, Trash2, Edit, Package, Boxes, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AddEditVariantDialog = lazy(() => import('@/components/inventory/add-edit-variant-dialog').then(module => ({ default: module.AddEditVariantDialog })));

export default function ItemVariantsPage() {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const itemId = params.itemId as string;

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [variantToEdit, setVariantToEdit] = useState<InventoryVariant | null>(null);
  const [variantToDelete, setVariantToDelete] = useState<InventoryVariant | null>(null);
  
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [variants, setVariants] = useState<InventoryVariant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    if (!firestore || !itemId) return;
    setIsLoading(true);
    try {
      const itemRef = doc(firestore, 'inventory', itemId);
      const itemSnap = await getDoc(itemRef);

      if (itemSnap.exists()) {
        setItem({ id: itemSnap.id, ...itemSnap.data() } as InventoryItem);
      } else {
        toast({
          variant: "destructive",
          title: "Not Found",
          description: "The requested inventory item could not be found.",
        });
        router.push('/management/inventory');
        return;
      }

      const variantsCollectionRef = collection(firestore, 'inventory', itemId, 'variants');
      const variantsSnap = await getDocs(variantsCollectionRef);
      const variantsData = variantsSnap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryVariant));
      setVariants(variantsData);

    } catch (error) {
      console.error("Error fetching item and variants:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load item details. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [firestore, itemId, toast, router]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const totalQuantity = useMemo(() => {
    if (!variants) return 0;
    return variants.reduce((sum, variant) => sum + variant.quantity, 0);
  }, [variants]);

  const totalValue = useMemo(() => {
    if (!variants) return 0;
    return variants.reduce((sum, variant) => sum + variant.price * variant.quantity, 0);
  }, [variants]);


  const handleEdit = (variant: InventoryVariant) => {
    setVariantToEdit(variant);
    setIsAddDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!variantToDelete || !item) return;

    try {
        const itemRef = doc(firestore, 'inventory', item.id);
        const variantRef = doc(firestore, 'inventory', item.id, 'variants', variantToDelete.id);

        await runTransaction(firestore, async (transaction: Transaction) => {
            const itemDoc = await transaction.get(itemRef);
            if (!itemDoc.exists()) {
                throw new Error("Parent item not found.");
            }
            
            const currentTotalStock = itemDoc.data().totalStock || 0;
            const currentVariantCount = itemDoc.data().variantCount || 0;
            const stockToDecrement = variantToDelete.quantity || 0;

            transaction.delete(variantRef);
            
            transaction.update(itemRef, {
                totalStock: Math.max(0, currentTotalStock - stockToDecrement),
                variantCount: Math.max(0, currentVariantCount - 1),
                updatedAt: serverTimestamp()
            });
        });

      // Optimistically update UI
      setVariants(prev => prev.filter(v => v.id !== variantToDelete.id));
      setItem(prev => prev ? {
          ...prev,
          totalStock: prev.totalStock - variantToDelete.quantity,
          variantCount: prev.variantCount - 1,
      } : null);

      toast({
        title: "Variant Deleted",
        description: `The variant has been removed from ${item?.name}.`,
      });
      
    } catch (error) {
      console.error("Error deleting variant:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete the variant. Please try again.",
      });
    } finally {
       setVariantToDelete(null);
    }
  };

  const handleDialogClose = (wasChanged: boolean) => {
    setIsAddDialogOpen(false);
    setVariantToEdit(null);
    if (wasChanged) {
        fetchAllData(); // Refetch all data if a change was made
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

  const getStatusBadge = (variant: InventoryVariant) => {
    if (variant.quantity <= 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (variant.quantity <= variant.warningLimit) {
      return <Badge variant="secondary" className="bg-orange-500 text-orange-50 hover:bg-orange-600">Low</Badge>;
    }
    return <Badge className="bg-green-600 text-green-50 hover:bg-green-700 border-green-700">Good</Badge>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
            <Link href="/management/inventory">
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Back to Inventory</span>
            </Link>
        </Button>
        <div>
            {isLoading ? <Skeleton className="h-8 w-48" /> : <h1 className="text-3xl font-bold tracking-tight font-headline">{item?.name} Variants</h1>}
            {isLoading ? <Skeleton className="h-4 w-64 mt-2" /> : <p className="text-muted-foreground">Manage specific variants for {item?.name}</p>}
        </div>
      </div>
      
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Category</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{item?.category}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Variants</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{variants?.length || 0}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{totalQuantity}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <div className="h-4 w-4 text-muted-foreground font-bold">₱</div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>}
          </CardContent>
        </Card>
       </div>

      <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Variants List</CardTitle>
                    <CardDescription>All specific product variants under {item?.name || 'this item'}.</CardDescription>
                </div>
                 {user?.role === 'admin' && (
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                        <PackagePlus className="mr-2 h-4 w-4" /> Add Variant
                    </Button>
                 )}
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Cost Price</TableHead>
                <TableHead className="text-right">Selling Price</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : variants?.length ? (
                variants.map((variant) => (
                  <TableRow key={variant.id}>
                    <TableCell className="font-medium">{variant.brand}</TableCell>
                    <TableCell>{variant.source}</TableCell>
                    <TableCell className="text-muted-foreground">{variant.description || 'N/A'}</TableCell>
                    <TableCell className="text-right">{variant.quantity}</TableCell>
                    <TableCell>{getStatusBadge(variant)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(variant.costPrice)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(variant.price)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(variant.price * variant.quantity)}</TableCell>
                    <TableCell className="text-right">
                       {user?.role === 'admin' && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => handleEdit(variant)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => setVariantToDelete(variant)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                       )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    No variants found for this item.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {user?.role === 'admin' && (
        <Suspense fallback={<div>Loading...</div>}>
            <AddEditVariantDialog
                isOpen={isAddDialogOpen}
                onOpenChange={handleDialogClose}
                item={item}
                variantToEdit={variantToEdit}
            />
        </Suspense>
      )}

      <AlertDialog open={!!variantToDelete} onOpenChange={(open) => !open && setVariantToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the variant
                    <span className="font-bold"> {variantToDelete?.brand} </span>
                    from {item?.name}.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    </div>
  );
}
