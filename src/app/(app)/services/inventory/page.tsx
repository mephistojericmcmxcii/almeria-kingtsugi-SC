
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, getDocs } from 'firebase/firestore';
import type { InventoryItem, InventoryVariant } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

import { Boxes, PackageSearch, PackagePlus, DollarSign, MoreHorizontal, Trash2, Edit, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AddEditItemDialog } from '@/components/inventory/add-edit-item-dialog';
import { Skeleton } from '@/components/ui/skeleton';
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

export default function InventoryPage() {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [totalValue, setTotalValue] = useState(0);
  const [isValueLoading, setIsValueLoading] = useState(true);
  const [variantCounts, setVariantCounts] = useState<Record<string, number>>({});
  const [areCountsLoading, setAreCountsLoading] = useState(true);


  const inventoryCollectionRef = useMemoFirebase(() => collection(firestore, 'inventory'), [firestore]);
  const { data: inventoryItems, isLoading } = useCollection<InventoryItem>(inventoryCollectionRef);

  useEffect(() => {
    if (!inventoryItems) {
      setIsValueLoading(false);
      setAreCountsLoading(false);
      return;
    }

    const fetchAllVariants = async () => {
        setIsValueLoading(true);
        setAreCountsLoading(true);
        let accumulatedValue = 0;
        const counts: Record<string, number> = {};
        
        try {
            for (const item of inventoryItems) {
                const variantsCollectionRef = collection(firestore, 'inventory', item.id, 'variants');
                const variantsSnapshot = await getDocs(variantsCollectionRef);
                counts[item.id] = variantsSnapshot.size;
                variantsSnapshot.forEach(variantDoc => {
                    const variant = variantDoc.data() as InventoryVariant;
                    accumulatedValue += (variant.quantity || 0) * (variant.price || 0);
                });
            }
            setTotalValue(accumulatedValue);
            setVariantCounts(counts);
        } catch (error) {
            console.error("Error calculating total inventory value:", error);
            setTotalValue(0);
            setVariantCounts({});
        } finally {
            setIsValueLoading(false);
            setAreCountsLoading(false);
        }
    };

    fetchAllVariants();

  }, [inventoryItems, firestore]);

  const filteredItems = useMemo(() => {
    if (!inventoryItems) return [];
    return inventoryItems.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [inventoryItems, searchTerm]);

  const totalItems = useMemo(() => inventoryItems?.length || 0, [inventoryItems]);
  const categories = useMemo(() => {
    if (!inventoryItems) return [];
    return [...new Set(inventoryItems.map(item => item.category))];
  }, [inventoryItems]);

  const handleEdit = (item: InventoryItem) => {
    setItemToEdit(item);
    setIsAddDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      // Note: In a real app, you'd also want to delete all variants in the subcollection.
      // This typically requires a Cloud Function for atomicity and efficiency.
      await deleteDoc(doc(firestore, 'inventory', itemToDelete.id));
      toast({
        title: "Item Deleted",
        description: `${itemToDelete.name} has been removed from the inventory.`,
      });
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete the item. Please try again.",
      });
      setItemToDelete(null);
    }
  };

  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    setItemToEdit(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Boxes className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight font-headline">Inventory</h1>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unique Items</CardTitle>
            <PackageSearch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{totalItems}</div>}
            <p className="text-xs text-muted-foreground">Total unique parent items in inventory</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Item Categories</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{categories.length}</div>}
             <p className="text-xs text-muted-foreground">Total unique categories</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
            <div className="h-4 w-4 text-muted-foreground font-bold">₱</div>
          </CardHeader>
          <CardContent>
            {isLoading || isValueLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>}
             <p className="text-xs text-muted-foreground">Sum of all variant quantities and prices</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className='w-full md:w-1/3'>
                    <Input 
                        placeholder="Search by name or category..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                    />
                </div>
                 {user?.role === 'admin' && (
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                        <PackagePlus className="mr-2 h-4 w-4" /> Add Parent Item
                    </Button>
                 )}
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead># Variants</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.category}</Badge>
                    </TableCell>
                    <TableCell>
                        {areCountsLoading ? <Skeleton className="h-5 w-5" /> : variantCounts[item.id] ?? 0}
                    </TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-sm">{item.description || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                       {user?.role === 'admin' ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => router.push(`/services/inventory/${item.id}`)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Variants
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleEdit(item)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => setItemToDelete(item)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                       ) : (
                         <Button variant="outline" size="sm" onClick={() => router.push(`/services/inventory/${item.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                         </Button>
                       )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No parent items found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {user?.role === 'admin' && (
        <AddEditItemDialog
            isOpen={isAddDialogOpen}
            onOpenChange={handleDialogClose}
            itemToEdit={itemToEdit}
        />
      )}

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the item
                    <span className="font-bold"> {itemToDelete?.name} </span>
                    and all of its variants.
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
