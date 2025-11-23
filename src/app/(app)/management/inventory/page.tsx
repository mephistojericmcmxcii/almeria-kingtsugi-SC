
'use client';

import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { collection, doc, deleteDoc, getDocs, writeBatch, collectionGroup } from 'firebase/firestore';
import type { InventoryItem, InventoryVariant } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

import { Boxes, PackageSearch, PackagePlus, MoreHorizontal, Trash2, Edit, Eye, Printer, X, FileText } from "lucide-react";
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const AddEditItemDialog = lazy(() => import('@/components/inventory/add-edit-item-dialog').then(module => ({ default: module.AddEditItemDialog })));
const PrintInventoryListLayout = lazy(() => import('@/components/inventory/print-inventory-list-layout'));


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
  const [isLoading, setIsLoading] = useState(true);
  const [totalInventoryValue, setTotalInventoryValue] = useState<number>(0);
  const [isTotalValueLoading, setIsTotalValueLoading] = useState(true);

  // Print Mode State
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [printType, setPrintType] = useState<'parentOnly' | 'withVariants'>('parentOnly');


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

  useEffect(() => {
    const fetchItemsAndValue = async () => {
      if (!firestore) return;
      setIsLoading(true);
      setIsTotalValueLoading(true);
      try {
        // Fetch parent items
        const inventoryCollectionRef = collection(firestore, 'inventory');
        const itemsSnapshot = await getDocs(inventoryCollectionRef);
        const items = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
        setInventoryItems(items);

        // Fetch all variants using a collection group query to calculate total value
        const variantsQuery = collectionGroup(firestore, 'variants');
        const variantsSnapshot = await getDocs(variantsQuery);
        const totalValue = variantsSnapshot.docs.reduce((sum, doc) => {
            const variant = doc.data() as InventoryVariant;
            return sum + (variant.price * variant.quantity);
        }, 0);
        setTotalInventoryValue(totalValue);

      } catch (error) {
        console.error("Error fetching inventory items and value:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load inventory data.",
        });
      } finally {
        setIsLoading(false);
        setIsTotalValueLoading(false);
      }
    };
    fetchItemsAndValue();
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
  
  const handleCheckboxChange = (itemId: string, checked: boolean | 'indeterminate') => {
      setSelectedItemIds(prev => {
        const newSet = new Set(prev);
        if (checked) {
          newSet.add(itemId);
        } else {
          newSet.delete(itemId);
        }
        return newSet;
      });
    };

    const handleSelectAll = (checked: boolean | 'indeterminate') => {
      if (checked) {
        setSelectedItemIds(new Set(filteredItems.map(item => item.id)));
      } else {
        setSelectedItemIds(new Set());
      }
    };
    
    const handlePrintSelected = async () => {
        if (selectedItemIds.size === 0) {
            toast({ variant: "destructive", title: "No Items Selected", description: "Please select at least one item to print." });
            return;
        }

        const selectedItems = inventoryItems.filter(item => selectedItemIds.has(item.id));
        let itemVariants: Record<string, InventoryVariant[]> | undefined;

        if (printType === 'withVariants') {
            itemVariants = {};
            toast({ title: "Fetching Variant Data...", description: "Please wait while we prepare your document." });
            for (const item of selectedItems) {
                const variantsCollectionRef = collection(firestore, 'inventory', item.id, 'variants');
                const variantsSnapshot = await getDocs(variantsCollectionRef);
                itemVariants[item.id] = variantsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryVariant));
            }
        }

        const features = "width=1100,height=800,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes";
        const printWindow = window.open('', '_blank', features);
        if (printWindow) {
            printWindow.document.write('<div id="print-root"></div>');
            printWindow.document.close();
            const printRoot = printWindow.document.getElementById('print-root');
            if (printRoot) {
                const root = createRoot(printRoot);
                root.render(
                    <Suspense fallback={<div>Loading print view...</div>}>
                        <PrintInventoryListLayout items={selectedItems} variants={itemVariants} />
                    </Suspense>
                );
            }
        }
    };

    const isAllSelected = selectedItemIds.size > 0 && selectedItemIds.size === filteredItems.length;

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
             {isTotalValueLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{formatCurrency(totalInventoryValue)}</div>}
            <p className="text-xs text-muted-foreground">Sum of (price * quantity) for all variants</p>
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
                 <div className="flex items-center gap-2">
                    {isPrintMode ? (
                        <>
                            <RadioGroup value={printType} onValueChange={(v) => setPrintType(v as any)} className="flex items-center gap-4 border p-1.5 pr-3 rounded-lg bg-muted/50">
                                <Label className="pl-2 text-sm font-medium">Print Type:</Label>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="parentOnly" id="parentOnly" /><Label htmlFor="parentOnly">Main Item</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="withVariants" id="withVariants" /><Label htmlFor="withVariants">With Variants</Label></div>
                            </RadioGroup>
                            <Button variant="outline" onClick={() => { setIsPrintMode(false); setSelectedItemIds(new Set()); }}><X className="mr-2 h-4 w-4" /> Cancel</Button>
                            <Button onClick={handlePrintSelected} disabled={selectedItemIds.size === 0}><FileText className="mr-2 h-4 w-4" /> Print Selected</Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setIsPrintMode(true)}><Printer className="mr-2 h-4 w-4" /> Inventory Print List</Button>
                             {user?.role === 'admin' && (
                                <Button onClick={() => setIsAddDialogOpen(true)}>
                                    <PackagePlus className="mr-2 h-4 w-4" /> Add Parent Item
                                </Button>
                             )}
                        </>
                    )}
                 </div>
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                 {isPrintMode && (
                    <TableHead className="w-[50px]"><Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} aria-label="Select all" /></TableHead>
                 )}
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
                    {isPrintMode && <TableCell><Skeleton className="h-5 w-5" /></TableCell>}
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
                  <TableRow key={item.id} data-state={selectedItemIds.has(item.id) && "selected"}>
                     {isPrintMode && (
                        <TableCell><Checkbox checked={selectedItemIds.has(item.id)} onCheckedChange={(checked) => handleCheckboxChange(item.id, checked)} /></TableCell>
                     )}
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
                  <TableCell colSpan={isPrintMode ? 7 : 6} className="h-24 text-center">
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

    