
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useFirebase, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import type { PurchaseOrder, PurchaseOrderItem } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useParams } from 'next/navigation';

import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AddPoItemDialog } from '@/components/po/add-po-item-dialog';


export default function PoDetailsPage() {
    const { firestore } = useFirebase();
    const { user } = useAuth();
    const { toast } = useToast();
    const params = useParams();
    const poId = params.poId as string;

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<PurchaseOrderItem | null>(null);

    const poRef = useMemoFirebase(() => doc(firestore, 'purchase_orders', poId), [firestore, poId]);
    const { data: po, isLoading: isPoLoading } = useDoc<PurchaseOrder>(poRef);

    const itemsCollectionRef = useMemoFirebase(() => collection(firestore, 'purchase_orders', poId, 'items'), [firestore, poId]);
    const { data: poItems, isLoading: areItemsLoading } = useCollection<PurchaseOrderItem>(itemsCollectionRef);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
    };

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return;
        try {
            const itemRef = doc(firestore, 'purchase_orders', poId, 'items', itemToDelete.id);
            await deleteDoc(itemRef);
            toast({ title: "Item Deleted", description: "The item has been removed from this PO." });
            setItemToDelete(null);
        } catch (error) {
            console.error("Error deleting PO item:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not delete the item." });
        }
    };
    
    const isLoading = isPoLoading || areItemsLoading;

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/services/po">
                        <ChevronLeft className="h-4 w-4" />
                        <span className="sr-only">Back to Purchase Orders</span>
                    </Link>
                </Button>
                <div>
                    {isPoLoading ? <Skeleton className="h-8 w-48" /> : <h1 className="text-3xl font-bold tracking-tight font-headline">PO # {po?.poNumber}</h1>}
                    {isPoLoading ? <Skeleton className="h-4 w-64 mt-2" /> : <p className="text-muted-foreground">Manage items for this purchase order.</p>}
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
                                <TableHead>Model</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead className="text-right">Amount (per Unit)</TableHead>
                                <TableHead className="text-right">Total Amount</TableHead>
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
                                        <TableCell className="text-right font-medium">{formatCurrency(item.amount * item.quantity)}</TableCell>
                                        {user?.role === 'admin' && (
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setItemToDelete(item)}>
                                                    <Trash2 className="h-4 w-4" />
                                                    <span className="sr-only">Delete Item</span>
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        No items have been added to this purchase order yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {user?.role === 'admin' && (
                <AddPoItemDialog
                    isOpen={isAddDialogOpen}
                    onOpenChange={setIsAddDialogOpen}
                    poId={poId}
                />
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

    