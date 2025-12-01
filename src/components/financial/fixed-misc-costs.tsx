
'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
import { useFirebase } from '@/firebase';
import { collection, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { FixedMiscCost } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, MoreHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

const AddFixedMiscCostDialog = lazy(() => import('./add-fixed-misc-cost-dialog').then(module => ({ default: module.AddFixedMiscCostDialog })));

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
};

export function FixedMiscCosts() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [costs, setCosts] = useState<FixedMiscCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [costToDelete, setCostToDelete] = useState<FixedMiscCost | null>(null);

  const fetchCosts = async () => {
    if (!firestore) return;
    setIsLoading(true);
    try {
      const costsQuery = query(collection(firestore, 'fixed_misc_costs'), orderBy('date', 'desc'));
      const snapshot = await getDocs(costsQuery);
      const fetchedCosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FixedMiscCost));
      setCosts(fetchedCosts);
    } catch (error) {
      console.error("Error fetching costs:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load miscellaneous costs.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCosts();
  }, [firestore]);

  const handleDeleteConfirm = async () => {
    if (!costToDelete) return;
    try {
        await deleteDoc(doc(firestore, 'fixed_misc_costs', costToDelete.id));
        setCosts(prev => prev.filter(c => c.id !== costToDelete.id));
        toast({ title: "Cost Deleted", description: `The expenditure "${costToDelete.expenditure}" has been removed.` });
    } catch (error) {
        console.error("Error deleting cost:", error);
        toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete the cost.' });
    } finally {
        setCostToDelete(null);
    }
  };


  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle>Fixed & Miscellaneous Costs</CardTitle>
                <CardDescription>
                A record of recurring and miscellaneous business expenditures.
                </CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Cost
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Expenditure</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : costs.length > 0 ? (
                    costs.map(cost => (
                        <TableRow key={cost.id}>
                            <TableCell className="font-medium">{cost.expenditure}</TableCell>
                            <TableCell>{format(cost.date.toDate(), 'dd-MMM-yyyy')}</TableCell>
                            <TableCell className="text-muted-foreground">{cost.description || 'N/A'}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(cost.cost)}</TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={() => setCostToDelete(cost)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            No costs have been recorded yet.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
      </CardContent>
    </Card>
    
    <Suspense fallback={null}>
        <AddFixedMiscCostDialog 
            isOpen={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            onSuccess={fetchCosts}
        />
    </Suspense>

    <AlertDialog open={!!costToDelete} onOpenChange={(open) => !open && setCostToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the expenditure for <span className="font-bold">{costToDelete?.expenditure}</span>. This action cannot be undone.
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
