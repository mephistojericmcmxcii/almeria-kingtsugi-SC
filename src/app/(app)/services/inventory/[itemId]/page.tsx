
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useFirebase, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import type { InventoryItem, InventoryVariant } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useParams } from 'next/navigation';

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
import { AddEditVariantDialog } from '@/components/inventory/add-edit-variant-dialog';

export default function ItemVariantsPage() {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const { toast } = useToast();
  const params = useParams();
  const itemId = params.itemId as string;

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [variantToEdit, setVariantToEdit] = useState<InventoryVariant | null>(null);
  const [variantToDelete, setVariantToDelete] = useState<InventoryVariant | null>(null);

  const itemRef = useMemoFirebase(() => doc(firestore, 'inventory', itemId), [firestore, itemId]);
  const { data: item, isLoading: isItemLoading } = useDoc<InventoryItem>(itemRef);

  const variantsCollectionRef = useMemoFirebase(() => collection(firestore, 'inventory', itemId, 'variants'), [firestore, itemId]);
  const { data: variants, isLoading: areVariantsLoading } = useCollection<InventoryVariant>(variantsCollectionRef);

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
    if (!variantToDelete) return;
    try {
      await deleteDoc(doc(firestore, 'inventory', itemId, 'variants', variantToDelete.id));
      toast({
        title: "Variant Deleted",
        description: `The variant has been removed from ${item?.name}.`,
      });
      setVariantToDelete(null);
    } catch (error) {
      console.error("Error deleting variant:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete the variant. Please try again.",
      });
      setVariantToDelete(null);
    }
  };

  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    setVariantToEdit(null);
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
  
  const isLoading = isItemLoading || areVariantsLoading;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
            <Link href="/services/inventory">
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Back to Inventory</span>
            </Link>
        </Button>
        <div>
            {isItemLoading ? <Skeleton className="h-8 w-48" /> : <h1 className="text-3xl font-bold tracking-tight font-headline">{item?.name} Variants</h1>}
            {isItemLoading ? <Skeleton className="h-4 w-64 mt-2" /> : <p className="text-muted-foreground">Manage specific variants for {item?.name}</p>}
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
                <TableHead className="text-right">Price</TableHead>
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
                  <TableCell colSpan={8} className="h-24 text-center">
                    No variants found for this item.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {user?.role === 'admin' && (
        <AddEditVariantDialog
            isOpen={isAddDialogOpen}
            onOpenChange={handleDialogClose}
            item={item}
            variantToEdit={variantToEdit}
        />
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
