
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import type { PurchaseOrder, PurchaseOrderItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


interface ViewPoItemsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  po: PurchaseOrder;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
};

export function ViewPoItemsDialog({ isOpen, onOpenChange, po }: ViewPoItemsDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();
    const [items, setItems] = useState<PurchaseOrderItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    useEffect(() => {
        if (isOpen && po?.id) {
            const fetchItems = async () => {
                setIsLoading(true);
                try {
                    const itemsRef = collection(firestore, 'purchase_orders', po.id, 'items');
                    const snapshot = await getDocs(itemsRef);
                    const fetchedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrderItem));
                    setItems(fetchedItems);
                } catch (error) {
                    console.error("Error fetching PO items:", error);
                    toast({
                        variant: 'destructive',
                        title: 'Error',
                        description: 'Could not load items for this purchase order.'
                    });
                } finally {
                    setIsLoading(false);
                }
            };
            fetchItems();
        }
    }, [isOpen, po, firestore, toast]);

    const handleConfirmEdit = () => {
        setIsConfirmOpen(false);
        onOpenChange(false);
        router.push(`/management/po/${po.id}`);
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader className="flex-row items-center justify-between">
                        <div className="space-y-1.5">
                            <DialogTitle>Items for PO #{po.poNumber}</DialogTitle>
                            <DialogDescription>Read-only view of items for this delivered purchase order.</DialogDescription>
                        </div>
                         <AlertDialogTrigger asChild>
                            <Button variant="outline">
                                <Edit className="mr-2 h-4 w-4" /> Edit PO Items
                            </Button>
                        </AlertDialogTrigger>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item Name</TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead className="text-right">Allocated Amount</TableHead>
                                    <TableHead className="text-right">Actual Amount</TableHead>
                                    <TableHead className="text-right">Total Actual Cost</TableHead>
                                    <TableHead>Description</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : items.length > 0 ? (
                                    items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell><Badge variant="secondary">{item.unit}</Badge></TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.actualAmount || 0)}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency((item.actualAmount || 0) * (item.quantity || 0))}</TableCell>
                                            <TableCell className="text-muted-foreground">{item.description || 'N/A'}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            No items were found for this purchase order.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will take you to the edit page for PO #{po.poNumber}. Modifying a delivered PO may have unintended consequences.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Close</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmEdit}>Confirm</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export default ViewPoItemsDialog;
