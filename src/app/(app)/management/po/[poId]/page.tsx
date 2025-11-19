
'use client';

import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import Link from 'next/link';
import { useFirebase } from '@/firebase';
import { collection, doc, deleteDoc, getDoc, getDocs } from 'firebase/firestore';
import type { PurchaseOrder, PurchaseOrderItem } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useParams } from 'next/navigation';

import { ChevronLeft, Plus, Trash2, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

const AddPoItemDialog = lazy(() => import('@/components/po/add-po-item-dialog').then(module => ({ default: module.AddPoItemDialog })));
const UpdateActualAmountDialog = lazy(() => import('@/components/po/update-actual-amount-dialog').then(module => ({ default: module.UpdateActualAmountDialog })));


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
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Purchase Order Items</CardTitle>
                            <CardDescription>List of all items included in this PO.</CardDescription>
                        </div>
                        {user?.role === 'admin' && (
                            <Button onClick={() => setIsAddDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" /> Add Items
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item Name</TableHead>
                                <TableHead>Brand</TableHead>
                                <TableHead>Model/Description</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead className="text-right">Allocated Amount</TableHead>
                                <TableHead className="text-right">Actual Amount</TableHead>
                                <TableHead className="text-right">Total Allocation</TableHead>
                                <TableHead className="text-right">Total Actual Cost</TableHead>
                                {user?.role === 'admin' && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                                        {user?.role === 'admin' && <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>}
                                    </TableRow>
                                ))
                            ) : poItems?.length ? (
                                poItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{item.brand || 'N/A'}</TableCell>
                                        <TableCell className="text-muted-foreground">{item.model || 'N/A'}</TableCell>
                                        <TableCell><Badge variant="secondary">{item.unit}</Badge></TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.actualAmount || 0)}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(item.amount * item.quantity)}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency((item.actualAmount || 0) * item.quantity)}</TableCell>
                                        {user?.role === 'admin' && (
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
                                    <TableCell colSpan={10} className="h-24 text-center">
                                        No items have been added to this purchase order yet.
                                    </TableCell>
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
