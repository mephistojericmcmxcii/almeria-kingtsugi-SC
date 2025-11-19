
'use client';

import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import type { PurchaseOrder, PurchaseOrderItem } from '@/lib/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Plus, Search, MoreHorizontal, Eye, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const AddEditPoDialog = lazy(() => import('@/components/po/add-edit-po-dialog').then(module => ({ default: module.AddEditPoDialog })));

export default function PoPage() {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [poToEdit, setPoToEdit] = useState<PurchaseOrder | null>(null);
  const [poToDelete, setPoToDelete] = useState<PurchaseOrder | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [arePOsLoading, setArePOsLoading] = useState(true);

  const [totalAmounts, setTotalAmounts] = useState<Record<string, number>>({});
  const [areTotalsLoading, setAreTotalsLoading] = useState(true);

  useEffect(() => {
      const fetchPOs = async () => {
          if (!firestore) return;
          setArePOsLoading(true);
          try {
              const poCollectionRef = collection(firestore, 'purchase_orders');
              const snapshot = await getDocs(poCollectionRef);
              const pos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder))
                                    .filter(po => po.entryType !== 'manual'); // Exclude manual entries
              setPurchaseOrders(pos);
          } catch (error) {
              console.error("Error fetching POs:", error);
              toast({ variant: 'destructive', title: 'Error', description: 'Could not load purchase orders.' });
          } finally {
              setArePOsLoading(false);
          }
      };
      fetchPOs();
  }, [firestore, toast]);
  
  useEffect(() => {
    if (arePOsLoading || purchaseOrders.length === 0) {
        setAreTotalsLoading(false);
        return;
    }

    const fetchTotals = async () => {
        setAreTotalsLoading(true);
        const totals: Record<string, number> = {};
        for (const po of purchaseOrders) {
            const itemsCollectionRef = collection(firestore, 'purchase_orders', po.id, 'items');
            const itemsSnapshot = await getDocs(itemsCollectionRef);
            const total = itemsSnapshot.docs.reduce((sum, doc) => {
                const item = doc.data() as PurchaseOrderItem;
                return sum + ((item.amount || 0) * (item.quantity || 0));
            }, 0);
            totals[po.id] = total;
        }
        setTotalAmounts(totals);
        setAreTotalsLoading(false);
    };

    fetchTotals();
  }, [purchaseOrders, firestore, arePOsLoading]);


  const filteredPos = useMemo(() => {
    if (!purchaseOrders) return [];
    return purchaseOrders.filter(po => 
      po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.careOf.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [purchaseOrders, searchTerm]);

  const handleView = (po: PurchaseOrder) => {
    router.push(`/management/po/${po.id}`);
  };
  
  const handleAddNew = () => {
    setPoToEdit(null);
    setIsAddDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
      if (!poToDelete) return;
      try {
        await deleteDoc(doc(firestore, 'purchase_orders', poToDelete.id));
        setPurchaseOrders(prev => prev.filter(po => po.id !== poToDelete.id));
        toast({
            title: "PO Deleted",
            description: `Purchase Order ${poToDelete.poNumber} has been deleted.`,
        });
        setPoToDelete(null);
      } catch (error) {
        console.error("Error deleting PO:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not delete the purchase order.",
        });
      }
      setPoToDelete(null);
  }

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'Completed': return <Badge className="bg-green-600 text-green-50">Completed</Badge>;
      case 'Lacking': return <Badge variant="secondary" className="bg-orange-500 text-orange-50">Lacking</Badge>;
      case 'Delivered': return <Badge className="bg-blue-500 text-blue-50">Delivered</Badge>;
      case 'Cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

  if (user?.role !== 'admin') {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <h1 className="text-2xl font-bold">Access Denied</h1>
            <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <FileText className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight font-headline">Purchase Orders</h1>
        </div>
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className='w-full md:w-1/3'>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                    placeholder="Search by PO #, Care Of..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10"
                  />
                </div>
              </div>
              <Button onClick={handleAddNew}>
                <Plus className="mr-2 h-4 w-4" /> Add New PO
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Care Of</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arePOsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredPos.length > 0 ? (
                  filteredPos.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium">{po.poNumber}</TableCell>
                      <TableCell>{format(po.date.toDate(), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{po.careOf}</TableCell>
                      <TableCell>{getStatusBadge(po.status)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {areTotalsLoading ? <Skeleton className="h-5 w-24 ml-auto" /> : formatCurrency(totalAmounts[po.id] || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                             <DropdownMenuItem onSelect={() => handleView(po)}>
                              <Eye className="mr-2 h-4 w-4" /> View/Add Items
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setPoToDelete(po)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No purchase orders found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
        <Suspense fallback={<div>Loading...</div>}>
            <AddEditPoDialog
                isOpen={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                poToEdit={poToEdit}
            />
        </Suspense>
     
       <AlertDialog open={!!poToDelete} onOpenChange={(open) => !open && setPoToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete PO #<span className="font-bold">{poToDelete?.poNumber}</span>. This action cannot be undone.
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
    </>
  );
}
