
'use client';

import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import Link from 'next/link';
import { useFirebase } from '@/firebase';
import { collection, doc, deleteDoc, getDoc, getDocs } from 'firebase/firestore';
import type { PurchaseOrder, PurchaseOrderItem } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useParams } from 'next/navigation';

import { ChevronLeft, Plus, Trash2, Edit, Printer, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AddPoItemDialog = lazy(() => import('@/components/po/add-po-item-dialog').then(module => ({ default: module.AddPoItemDialog })));
const UpdateActualAmountDialog = lazy(() => import('@/components/po/update-actual-amount-dialog').then(module => ({ default: module.UpdateActualAmountDialog })));
const PrintBoxListLayout = lazy(() => import('@/components/po/print-box-list-layout'));


export default function PoDetailsPage() {
    const { firestore } = useFirebase();
    const { user } = useAuth();
    const { toast } = useToast();
    const params = useParams();
    const poId = params.poId as string;

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<PurchaseOrderItem | null>(null);
    const [itemToUpdate, setItemToUpdate] = useState<PurchaseOrderItem | null>(null);
    const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
    
    const [po, setPo] = useState<PurchaseOrder | null>(null);
    const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isPrintMode, setIsPrintMode] = useState(false);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [boxIdentity, setBoxIdentity] = useState('');

    const refetchItems = async () => {
        if (!firestore || !poId) return;
        try {
            const itemsCollectionRef = collection(firestore, 'purchase_orders', poId, 'items');
            const itemsSnap = await getDocs(itemsCollectionRef);
            setPoItems(itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrderItem)));
        } catch (error) {
             toast({ variant: "destructive", title: "Error", description: "Could not refresh item list." });
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!firestore || !poId) return;
            setIsLoading(true);
            try {
                const poRef = doc(firestore, 'purchase_orders', poId);
                const poSnap = await getDoc(poRef);
                if (poSnap.exists()) {
                    setPo({ id: poSnap.id, ...poSnap.data() } as PurchaseOrder);
                }

                const itemsCollectionRef = collection(firestore, 'purchase_orders', poId, 'items');
                const itemsSnap = await getDocs(itemsCollectionRef);
                setPoItems(itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrderItem)));

            } catch (error) {
                console.error("Error fetching PO details:", error);
                toast({ variant: "destructive", title: "Error", description: "Could not load PO details." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [firestore, poId, toast]);
    
    const { generalItems, miscItems } = useMemo(() => {
        const general: PurchaseOrderItem[] = [];
        const misc: PurchaseOrderItem[] = [];
        poItems.forEach(item => {
            if (item.itemType === 'misc') {
                misc.push(item);
            } else {
                general.push(item);
            }
        });
        return { generalItems: general, miscItems: misc };
    }, [poItems]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
    };

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return;
        try {
            const itemRef = doc(firestore, 'purchase_orders', poId, 'items', itemToDelete.id);
            await deleteDoc(itemRef);
            setPoItems(prev => prev.filter(item => item.id !== itemToDelete.id));
            toast({ title: "Item Deleted", description: "The item has been removed from this PO." });
            setItemToDelete(null);
        } catch (error) {
            console.error("Error deleting PO item:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not delete the item." });
        }
    };
    
    const handleOpenUpdateDialog = (item: PurchaseOrderItem) => {
        setItemToUpdate(item);
        setIsUpdateDialogOpen(true);
    };

    const handleUpdateSuccess = () => {
        refetchItems();
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
          setSelectedItemIds(new Set(poItems.map(v => v.id)));
        } else {
          setSelectedItemIds(new Set());
        }
    };
    
    const handlePrintSelected = () => {
        if (selectedItemIds.size === 0) {
          toast({
            variant: "destructive",
            title: "No Items Selected",
            description: "Please select at least one item to print.",
          });
          return;
        }
        const selected = poItems.filter(v => selectedItemIds.has(v.id));
        const features = "width=800,height=600,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes";
        const printWindow = window.open('', '_blank', features);
        if (printWindow) {
          printWindow.document.write('<div id="print-root"></div>');
          printWindow.document.close();
          const printRoot = printWindow.document.getElementById('print-root');
          if (printRoot) {
            const root = createRoot(printRoot);
            root.render(
              <Suspense fallback={<div>Loading print view...</div>}>
                <PrintBoxListLayout po={po} items={selected} boxIdentity={boxIdentity} />
              </Suspense>
            );
          }
        }
    };

    const isAllSelected = selectedItemIds.size > 0 && selectedItemIds.size === poItems.length;

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/management/po">
                        <ChevronLeft className="h-4 w-4" />
                        <span className="sr-only">Back to Purchase Orders</span>
                    </Link>
                </Button>
                <div>
                    {isLoading ? <Skeleton className="h-8 w-48" /> : <h1 className="text-3xl font-bold tracking-tight font-headline">PO # {po?.poNumber}</h1>}
                    {isLoading ? <Skeleton className="h-4 w-64 mt-2" /> : <p className="text-muted-foreground">Manage items for this purchase order.</p>}
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle>General Items</CardTitle>
                            <CardDescription>List of all general items included in this PO.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                             {isPrintMode ? (
                                <>
                                    <Button variant="outline" onClick={() => { setIsPrintMode(false); setSelectedItemIds(new Set()); setBoxIdentity(''); }}>
                                        <X className="mr-2 h-4 w-4" /> Cancel
                                    </Button>
                                    <Button onClick={handlePrintSelected} disabled={selectedItemIds.size === 0}>
                                        <Printer className="mr-2 h-4 w-4" /> Print Selected List
                                    </Button>
                                </>
                            ) : (
                                <>
                                    {user?.role === 'admin' && (
                                        <Button onClick={() => setIsAddDialogOpen(true)}>
                                            <Plus className="mr-2 h-4 w-4" /> Add Items
                                        </Button>
                                    )}
                                     <Button variant="outline" onClick={() => setIsPrintMode(true)} disabled={isLoading || poItems.length === 0}>
                                        <Printer className="mr-2 h-4 w-4" /> Print Box List
                                    </Button>
                                </>
                             )}
                        </div>
                    </div>
                     {isPrintMode && (
                        <div className="mt-4 space-y-2 max-w-xs">
                            <Label htmlFor="box-identity">Box Identity</Label>
                            <Input
                                id="box-identity"
                                placeholder="e.g., Box 2 of 4"
                                value={boxIdentity}
                                onChange={(e) => setBoxIdentity(e.target.value)}
                            />
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {isPrintMode && (
                                    <TableHead className="w-[50px]">
                                        <Checkbox
                                        checked={isAllSelected}
                                        onCheckedChange={handleSelectAll}
                                        aria-label="Select all"
                                        />
                                    </TableHead>
                                )}
                                <TableHead className="w-[15%]">Item Name</TableHead>
                                <TableHead className="w-[5%]">Unit</TableHead>
                                <TableHead className="text-right w-[5%]">Quantity</TableHead>
                                <TableHead className="text-right w-[10%]">Allocated Amount</TableHead>
                                <TableHead className="text-right w-[10%]">Actual Amount</TableHead>
                                <TableHead className="text-right w-[10%]">Total Allocation</TableHead>
                                <TableHead className="text-right w-[10%]">Total Actual Cost</TableHead>
                                <TableHead>Description</TableHead>
                                {user?.role === 'admin' && !isPrintMode && <TableHead className="text-right w-[5%]">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 2 }).map((_, i) => (
                                    <TableRow key={i}>
                                        {isPrintMode && <TableCell><Skeleton className="h-5 w-5" /></TableCell>}
                                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                        {user?.role === 'admin' && !isPrintMode && <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>}
                                    </TableRow>
                                ))
                            ) : generalItems?.length ? (
                                generalItems.map((item) => (
                                    <TableRow key={item.id}>
                                         {isPrintMode && (
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedItemIds.has(item.id)}
                                                    onCheckedChange={(checked) => handleCheckboxChange(item.id, checked)}
                                                    aria-label={`Select item ${item.name}`}
                                                />
                                            </TableCell>
                                        )}
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell><Badge variant="secondary">{item.unit}</Badge></TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.actualAmount || 0)}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(item.amount * item.quantity!)}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(((item.actualAmount || 0) * item.quantity!))}</TableCell>
                                        <TableCell className="text-muted-foreground">{item.description || 'Brand/Model/etc.'}</TableCell>
                                        {user?.role === 'admin' && !isPrintMode && (
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onSelect={() => handleOpenUpdateDialog(item)}>
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
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={isPrintMode ? 10 : 9} className="h-24 text-center">
                                        No general items have been added to this purchase order yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Miscellaneous Costs</CardTitle>
                    <CardDescription>Additional costs like transportation, services, etc.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-1/3">Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Cost</TableHead>
                                {user?.role === 'admin' && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell>
                                </TableRow>
                            ) : miscItems.length > 0 ? (
                                miscItems.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{item.description}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                                        {user?.role === 'admin' && (
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => setItemToDelete(item)} className="text-destructive hover:bg-destructive/10">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">No miscellaneous costs added.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {user?.role === 'admin' && (
                <Suspense fallback={<div>Loading...</div>}>
                    <AddPoItemDialog
                        isOpen={isAddDialogOpen}
                        onOpenChange={setIsAddDialogOpen}
                        poId={poId}
                        onSuccess={refetchItems}
                    />
                    {itemToUpdate && (
                        <UpdateActualAmountDialog
                            isOpen={isUpdateDialogOpen}
                            onOpenChange={setIsUpdateDialogOpen}
                            poId={poId}
                            item={itemToUpdate}
                            onSuccess={handleUpdateSuccess}
                        />
                    )}
                </Suspense>
            )}

            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the item <span className="font-bold">{itemToDelete?.name}</span> from this PO. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
