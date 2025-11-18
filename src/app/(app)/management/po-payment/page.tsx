
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { collection, getDocs } from 'firebase/firestore';
import type { PurchaseOrder, PurchaseOrderItem } from '@/lib/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, Eye, ShieldAlert } from "lucide-react";
import { cn } from '@/lib/utils';

type PoFinancialSummary = {
  id: string;
  poNumber: string;
  status: PurchaseOrder['status'];
  totalAllocation: number;
  totalExpenses: number;
  profit: number;
};

export default function PoPaymentPage() {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [summaries, setSummaries] = useState<PoFinancialSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSummaries = async () => {
      if (!firestore || user?.role !== 'admin') {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);

      try {
        const poCollectionRef = collection(firestore, 'purchase_orders');
        const poSnapshot = await getDocs(poCollectionRef);
        const pos = poSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder));

        const summaryPromises = pos.map(async (po) => {
          const itemsCollectionRef = collection(firestore, 'purchase_orders', po.id, 'items');
          const itemsSnapshot = await getDocs(itemsCollectionRef);
          
          let totalAllocation = 0;
          let totalExpenses = 0;

          itemsSnapshot.forEach(itemDoc => {
            const item = itemDoc.data() as PurchaseOrderItem;
            totalAllocation += (item.amount || 0) * (item.quantity || 0);
            totalExpenses += (item.actualAmount || 0) * (item.quantity || 0);
          });
          
          return {
            id: po.id,
            poNumber: po.poNumber,
            status: po.status,
            totalAllocation,
            totalExpenses,
            profit: totalAllocation - totalExpenses,
          };
        });

        const calculatedSummaries = await Promise.all(summaryPromises);
        setSummaries(calculatedSummaries);

      } catch (error) {
        console.error("Error fetching PO summaries:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load PO payment summaries.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummaries();
  }, [firestore, user, toast]);

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'Approved': return <Badge className="bg-blue-500 text-blue-50">Approved</Badge>;
      case 'Completed': return <Badge className="bg-green-600 text-green-50">Completed</Badge>;
      case 'Cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };
  
  const handleView = (poId: string) => {
    router.push(`/management/po/${poId}`);
  };

  if (user?.role !== 'admin' && !isLoading) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
             <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-3xl font-bold font-headline text-destructive">Access Denied</h1>
            <p className="text-muted-foreground mt-2">
                You do not have permission to view this page.
            </p>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <CreditCard className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight font-headline">PO Payment Summary</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Purchase Order Financials</CardTitle>
          <CardDescription>
            A summary of allocated budget vs. actual expenses for each PO.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO #</TableHead>
                <TableHead className="text-right">Total Allocation</TableHead>
                <TableHead className="text-right">Total Expenses</TableHead>
                <TableHead className="text-right">Profit / Loss</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : summaries.length > 0 ? (
                summaries.map((summary) => (
                  <TableRow key={summary.id}>
                    <TableCell className="font-medium">{summary.poNumber}</TableCell>
                    <TableCell className="text-right">{formatCurrency(summary.totalAllocation)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(summary.totalExpenses)}</TableCell>
                    <TableCell className={cn(
                        "text-right font-bold",
                        summary.profit >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                        {formatCurrency(summary.profit)}
                    </TableCell>
                    <TableCell>{getStatusBadge(summary.status)}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleView(summary.id)}>
                            <Eye className="mr-2 h-4 w-4" /> View
                        </Button>
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
  );
}
