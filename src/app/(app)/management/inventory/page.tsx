
'use client';

import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { collection, doc, deleteDoc, getDocs, writeBatch, collectionGroup } from 'firebase/firestore';
import type { InventoryItem, InventoryVariant } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

import { Boxes, PackageSearch, PackagePlus, DollarSign, MoreHorizontal, Trash2, Edit, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
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

const AddEditItemDialog = lazy(() => import('@/components/inventory/add-edit-item-dialog').then(module => ({ default: module.AddEditItemDialog })));

export default function InventoryPage() {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [allVariants, setAllVariants] = useState<InventoryVariant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

  useEffect(() => {
    const fetchItems = async () => {
      if (!firestore) return;
      setIsLoading(true);
      try {
        const inventoryCollectionRef = collection(firestore, 'inventory');
        const snapshot = await getDocs(inventoryCollectionRef);
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
        setInventoryItems(items);

        // Also fetch all variants for the total value calculation
        const variantsCollectionGroup = collectionGroup(firestore, 'variants');
        const variantsSnapshot = await getDocs(variantsCollectionGroup);
        const variants = variantsSnapshot.docs.map(doc => doc.data() as InventoryVariant);
        setAllVariants(variants);

      } catch (error) {
        console.error("Error fetching inventory items:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load inventory.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchItems();
  }, [firestore, toast, isAddDialogOpen]); // Refetch when dialog closes

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

  const totalValue = useMemo(() => {
    return allVariants.reduce((sum, variant) => {
      return sum + (variant.price || 0) * (variant.quantity || 0);
    }, 0);
  }, [allVariants]);


  const handleEdit = (item: InventoryItem) => {
    setItemToEdit(item);
    setIsAddDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    
    // In a real-world scenario with many variants, this operation should be
    // handled by a Cloud Function to prevent client-side timeouts and ensure atomicity.
    try {
      const variantsCollectionRef = collection(firestore, 'inventory', itemToDelete.id, 'variants');
      const variantsSnapshot = await getDocs(variantsCollectionRef);
      
      const batch = writeBatch(firestore);
      
      // Delete all variants in the subcollection
      variantsSnapshot.forEach(variantDoc => {
        batch.delete(variantDoc.ref);
      });
      
      // Delete the parent item
      const parentItemRef = doc(firestore, 'inventory', itemToDelete.id);
      batch.delete(parentItemRef);
      
      await batch.commit();

      setInventoryItems(prev => prev.filter(item => item.id !== itemToDelete.id));
      toast({
        title: "Item Deleted",
        description: `${itemToDelete.name} and all its variants have been removed.`,
      });
    } catch (error) {
      console.error("Error deleting item and its variants:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete the item. Please try again.",
      });
    } finally {
      setItemToDelete(null);
    }
  };

  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    setItemToEdit(null);
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
             {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>}
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
                <TableHead>Total Stock</TableHead>
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
                       {item.variantCount ?? 0}
                    </TableCell>
                     <TableCell>
                       {item.totalStock ?? 0}
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
                                <DropdownMenuItem onSelect={() => router.push(`/management/inventory/${item.id}`)}>
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
                         <Button variant="outline" size="sm" onClick={() => router.push(`/management/inventory/${item.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                         </Button>
                       )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No parent items found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {user?.role === 'admin' && (
        <Suspense fallback={<div>Loading...</div>}>
            <AddEditItemDialog
                isOpen={isAddDialogOpen}
                onOpenChange={handleDialogClose}
                itemToEdit={itemToEdit}
            />
        </Suspense>
      )}

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the item
                    <span className="font-bold"> {itemToDelete?.name} </span>
                    and all of its variants. This is an irreversible action.
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
