

'use client';

import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { collection, deleteDoc, doc, getDocs, writeBatch } from 'firebase/firestore';
import type { PurchaseOrder, PurchaseOrderItem } from '@/lib/types';
import { format, getQuarter } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Plus, Search, MoreHorizontal, Eye, Trash2, Edit, PackagePlus, Printer, X, ArrowUpDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FirebaseClientProvider } from '@/firebase/client-provider';


const AddEditPoDialog = lazy(() => import('@/components/po/add-edit-po-dialog'));
const ViewPoDetailsDialog = lazy(() => import('@/components/po/view-po-details-dialog'));
const ViewPoItemsDialog = lazy(() => import('@/components/po/view-po-items-dialog'));
const PrintPoListLayout = lazy(() => import('@/components/po/print-po-list-layout'));


type PoTotals = {
    allocated: number;
    utilized: number;
    itemCount: number;
}

export type DisplayPurchaseOrder = PurchaseOrder & {
    displayStatus: PurchaseOrder['status'];
};

type SortConfig = {
    key: keyof DisplayPurchaseOrder | 'totalAllocation' | 'amountUtilized' | 'balance';
    direction: 'ascending' | 'descending';
};


export default function PoPage() {
  const { firestore } = useFirebase();
  const { user, deleteFileByUrl, updatePoStatus } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'date', direction: 'descending' });
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [selectedQuarter, setSelectedQuarter] = useState('all');
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [poToEdit, setPoToEdit] = useState<PurchaseOrder | null>(null);
  const [poToDelete, setPoToDelete] = useState<PurchaseOrder | null>(null);
  const [poToView, setPoToView] = useState<DisplayPurchaseOrder | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [poItemsToView, setPoItemsToView] = useState<DisplayPurchaseOrder | null>(null);
  const [isViewItemsDialogOpen, setIsViewItemsDialogOpen] = useState(false);

  const [purchaseOrders, setPurchaseOrders] = useState<DisplayPurchaseOrder[]>([]);
  const [arePOsLoading, setArePOsLoading] = useState(true);

  const [totalAmounts, setTotalAmounts] = useState<Record<string, PoTotals>>({});
  const [areTotalsLoading, setAreTotalsLoading] = useState(true);
  
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [selectedPoIds, setSelectedPoIds] = useState<Set<string>>(new Set());
  const [printType, setPrintType] = useState<'parentOnly' | 'withChildren'>('parentOnly');


  const fetchPOs = async () => {
    if (!firestore) return;
    setArePOsLoading(true);
    setAreTotalsLoading(true);
    try {
        const poCollectionRef = collection(firestore, 'purchase_orders');
        const snapshot = await getDocs(poCollectionRef);
        const pos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder))
                              .filter(po => po.entryType !== 'manual'); 

        const totals: Record<string, PoTotals> = {};
        const displayPos: DisplayPurchaseOrder[] = [];

        for (const po of pos) {
            const itemsCollectionRef = collection(firestore, 'purchase_orders', po.id, 'items');
            const itemsSnapshot = await getDocs(itemsCollectionRef);
            
            let generalItemsCount = 0;
            let generalItemsWithActualAmount = 0;

            const poTotals = itemsSnapshot.docs.reduce((acc, doc) => {
                const item = doc.data() as PurchaseOrderItem;

                if (item.itemType === 'misc') {
                    acc.utilized += item.amount || 0;
                } else {
                    generalItemsCount++;
                    if (item.actualAmount && item.actualAmount > 0) {
                        generalItemsWithActualAmount++;
                    }
                    acc.allocated += (item.amount || 0) * (item.quantity || 0);
                    acc.utilized += ((item.actualAmount || 0) * (item.quantity || 0));
                }
                return acc;
            }, { allocated: 0, utilized: 0, itemCount: 0 });


            if (po.totalAllocation !== undefined && po.totalAllocation !== null) {
                poTotals.allocated = po.totalAllocation;
            }
            
            poTotals.itemCount = itemsSnapshot.size;
            totals[po.id] = poTotals;
            
            let displayStatus: PurchaseOrder['status'] = po.status;
             if (po.status === 'Lacking') {
                 if (generalItemsCount > 0 && generalItemsCount === generalItemsWithActualAmount) {
                    displayStatus = 'Completed';
                }
            }


            displayPos.push({ ...po, displayStatus });
        }
        
        setPurchaseOrders(displayPos);
        setTotalAmounts(totals);

    } catch (error) {
        console.error("Error fetching POs:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load purchase orders.' });
    } finally {
        setArePOsLoading(false);
        setAreTotalsLoading(false);
    }
  };

  useEffect(() => {
      if(firestore) {
        fetchPOs();
      }
  }, [firestore, toast]);
  
  const availableYears = useMemo(() => {
    if (!purchaseOrders) return [];
    const years = new Set(purchaseOrders.map(s => s.date.toDate().getFullYear()));
    return ["all", ...Array.from(years).sort((a, b) => b - a).map(String)];
  }, [purchaseOrders]);
  

  const sortedAndFilteredPos = useMemo(() => {
    let sortableItems = [...purchaseOrders];

    // Filtering
    sortableItems = sortableItems.filter(po => {
        const poDate = po.date.toDate();
        const yearMatch = selectedYear === 'all' || poDate.getFullYear() === parseInt(selectedYear);
        const quarterMatch = selectedQuarter === 'all' || getQuarter(poDate) === parseInt(selectedQuarter);

        const searchMatch = po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            po.careOf.toLowerCase().includes(searchTerm.toLowerCase());
        const statusMatch = statusFilter === 'all' || po.displayStatus === statusFilter;
        return searchMatch && statusMatch && yearMatch && quarterMatch;
    });

    // Sorting
    if (sortConfig !== null) {
        sortableItems.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            if (['totalAllocation', 'amountUtilized', 'balance'].includes(sortConfig.key)) {
                const aTotals = totalAmounts[a.id] || { allocated: 0, utilized: 0 };
                const bTotals = totalAmounts[b.id] || { allocated: 0, utilized: 0 };

                if (sortConfig.key === 'totalAllocation') {
                    aValue = aTotals.allocated;
                    bValue = bTotals.allocated;
                } else if (sortConfig.key === 'amountUtilized') {
                    aValue = aTotals.utilized;
                    bValue = bTotals.utilized;
                } else { // balance
                    aValue = aTotals.allocated - aTotals.utilized;
                    bValue = bTotals.allocated - bTotals.utilized;
                }
            } else {
                aValue = a[sortConfig.key as keyof DisplayPurchaseOrder];
                bValue = b[sortConfig.key as keyof DisplayPurchaseOrder];
            }

            if (aValue === null || aValue === undefined) aValue = '';
            if (bValue === null || bValue === undefined) bValue = '';

            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }

    return sortableItems;
  }, [purchaseOrders, totalAmounts, searchTerm, statusFilter, sortConfig, selectedYear, selectedQuarter]);
  
  const requestSort = (key: SortConfig['key']) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortConfig['key']) => {
    if (!sortConfig || sortConfig.key !== key) {
        return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    if (sortConfig.direction === 'ascending') {
        return <ArrowUpDown className="ml-2 h-4 w-4" />; // Using same icon for both for simplicity
    }
    return <ArrowUpDown className="ml-2 h-4 w-4" />; // Using same icon for both for simplicity
  };


  const handleItemsAction = (po: DisplayPurchaseOrder) => {
    if (po.status === 'Delivered') {
        setPoItemsToView(po);
        setIsViewItemsDialogOpen(true);
    } else {
        router.push(`/management/po/${po.id}`);
    }
  };

  const handleEdit = (po: PurchaseOrder) => {
    setPoToEdit(po);
    setIsAddDialogOpen(true);
  };
  
  const handleView = (po: DisplayPurchaseOrder) => {
    setPoToView(po);
    setIsViewDialogOpen(true);
  }
  
  const handleAddNew = () => {
    setPoToEdit(null);
    setIsAddDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
      if (!poToDelete) return;
      try {
        // Delete associated files from storage first
        if (poToDelete.salesInvoiceUrl) {
            await deleteFileByUrl(poToDelete.salesInvoiceUrl);
        }
        if (poToDelete.deliveryReceiptUrl) {
            await deleteFileByUrl(poToDelete.deliveryReceiptUrl);
        }

        const poRef = doc(firestore, 'purchase_orders', poToDelete.id);
        const itemsRef = collection(poRef, 'items');
        const itemsSnapshot = await getDocs(itemsRef);
        
        const batch = writeBatch(firestore);
        
        // Delete all items in the subcollection
        itemsSnapshot.forEach((itemDoc) => {
            batch.delete(itemDoc.ref);
        });

        // Delete the parent PO document
        batch.delete(poRef);

        await batch.commit();

        setPurchaseOrders(prev => prev.filter(po => po.id !== poToDelete.id));
        toast({
            title: "PO Deleted",
            description: `Purchase Order ${poToDelete.poNumber} and all its items have been deleted.`,
        });
        
      } catch (error) {
        console.error("Error deleting PO:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not delete the purchase order.",
        });
      } finally {
        setPoToDelete(null);
      }
  }
  
  const handleDialogClose = (open: boolean) => {
      if (!open) {
          fetchPOs(); // Refetch POs when the dialog closes
      }
      setPoToEdit(null);
      setIsAddDialogOpen(open);
  }

  const handleViewDialogClose = (changed: boolean) => {
      setIsViewDialogOpen(false);
      if (changed) {
          fetchPOs();
      }
  }
  
  const handleCheckboxChange = (poId: string, checked: boolean | 'indeterminate') => {
      setSelectedPoIds(prev => {
          const newSet = new Set(prev);
          if (checked) {
              newSet.add(poId);
          } else {
              newSet.delete(poId);
          }
          return newSet;
      });
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
      if (checked) {
          setSelectedPoIds(new Set(sortedAndFilteredPos.map(po => po.id)));
      } else {
          setSelectedPoIds(new Set());
      }
  }
  
  const handlePrintSelected = async () => {
    if (selectedPoIds.size === 0) {
      toast({
        variant: "destructive",
        title: "No POs Selected",
        description: "Please select at least one purchase order to print.",
      });
      return;
    }

    const selectedPOs = purchaseOrders.filter(po => selectedPoIds.has(po.id));
    
    let poItems: Record<string, PurchaseOrderItem[]> | undefined;

    if (printType === 'withChildren') {
        poItems = {};
        for (const po of selectedPOs) {
            const itemsCollectionRef = collection(firestore, 'purchase_orders', po.id, 'items');
            const itemsSnapshot = await getDocs(itemsCollectionRef);
            poItems[po.id] = itemsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrderItem));
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
            <FirebaseClientProvider>
                <PrintPoListLayout pos={selectedPOs} totals={totalAmounts} poItems={poItems} />
            </FirebaseClientProvider>
          </Suspense>
        );
      }
    }
  };

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'Completed': return <Badge className="bg-green-600 text-green-50">Completed</Badge>;
      case 'Lacking': return <Badge variant="secondary" className="bg-orange-500 text-orange-50">Lacking</Badge>;
      case 'Delivered': return <Badge className="bg-blue-500 text-blue-50">Delivered</Badge>;
      case 'For Delivery': return <Badge className="bg-purple-500 text-purple-50">For Delivery</Badge>;
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
  
  const isAllSelected = selectedPoIds.size > 0 && selectedPoIds.size === sortedAndFilteredPos.length;
  const PO_STATUS_OPTIONS = ['all', 'Completed', 'Lacking', 'Delivered', 'For Delivery', 'Cancelled'];

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
                <div className='flex items-center gap-2 flex-wrap'>
                    <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder="Search by PO #, Care Of..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10"
                    />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[150px]">
                        <SelectValue placeholder="Filter by status..." />
                    </SelectTrigger>
                    <SelectContent>
                        {PO_STATUS_OPTIONS.map(status => (
                        <SelectItem key={status} value={status}>
                            {status === 'all' ? 'All Statuses' : status}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-full md:w-[120px]">
                            <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableYears.map(year => (
                                <SelectItem key={year} value={String(year)}>{year === 'all' ? 'All Years' : year}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                        <SelectTrigger className="w-full md:w-[150px]">
                            <SelectValue placeholder="Select Quarter" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Quarters</SelectItem>
                            <SelectItem value="1">Quarter 1</SelectItem>
                            <SelectItem value="2">Quarter 2</SelectItem>
                            <SelectItem value="3">Quarter 3</SelectItem>
                            <SelectItem value="4">Quarter 4</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
              <div className="flex items-center gap-2 self-start md:self-center">
                 {isPrintMode ? (
                     <>
                        <RadioGroup value={printType} onValueChange={(v) => setPrintType(v as any)} className="flex items-center gap-4 border p-1.5 pr-3 rounded-lg bg-muted/50">
                            <Label className="pl-2 text-sm font-medium">Print Type:</Label>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="parentOnly" id="parentOnly" />
                                <Label htmlFor="parentOnly">Purchase Orders</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="withChildren" id="withChildren" />
                                <Label htmlFor="withChildren">w/ PO Items</Label>
                            </div>
                        </RadioGroup>
                        <Button variant="outline" onClick={() => { setIsPrintMode(false); setSelectedPoIds(new Set()); }}>
                            <X className="mr-2 h-4 w-4" /> Cancel
                        </Button>
                        <Button onClick={handlePrintSelected} disabled={selectedPoIds.size === 0}>
                            <Printer className="mr-2 h-4 w-4" /> Print Selected
                        </Button>
                     </>
                 ) : (
                    <>
                    <Button variant="outline" onClick={() => setIsPrintMode(true)}>
                        <Printer className="mr-2 h-4 w-4" /> Print
                    </Button>
                    <Button onClick={handleAddNew}>
                        <Plus className="mr-2 h-4 w-4" /> Add New PO
                    </Button>
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
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                  )}
                  <TableHead className="px-4">
                    <Button variant="ghost" className="p-0" onClick={() => requestSort('poNumber')}>
                      PO # {getSortIcon('poNumber')}
                    </Button>
                  </TableHead>
                  <TableHead className="px-4">
                    <Button variant="ghost" className="p-0" onClick={() => requestSort('date')}>
                        Date {getSortIcon('date')}
                    </Button>
                  </TableHead>
                  <TableHead className="px-4">
                    <Button variant="ghost" className="p-0" onClick={() => requestSort('careOf')}>
                      Care Of {getSortIcon('careOf')}
                    </Button>
                  </TableHead>
                  <TableHead className="px-4">
                     <Button variant="ghost" className="p-0" onClick={() => requestSort('displayStatus')}>
                      Status {getSortIcon('displayStatus')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right px-4">
                    <Button variant="ghost" className="p-0" onClick={() => requestSort('totalAllocation')}>
                      Total Allocation {getSortIcon('totalAllocation')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right px-4">
                    <Button variant="ghost" className="p-0" onClick={() => requestSort('amountUtilized')}>
                      Amount Utilized {getSortIcon('amountUtilized')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right px-4">
                    <Button variant="ghost" className="p-0" onClick={() => requestSort('balance')}>
                      Balance {getSortIcon('balance')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right px-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arePOsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {isPrintMode && <TableCell><Skeleton className="h-5 w-5" /></TableCell>}
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : sortedAndFilteredPos.length > 0 ? (
                  sortedAndFilteredPos.map((po) => (
                    <TableRow key={po.id} data-state={selectedPoIds.has(po.id) && "selected"}>
                       {isPrintMode && (
                        <TableCell>
                          <Checkbox
                            checked={selectedPoIds.has(po.id)}
                            onCheckedChange={(checked) => handleCheckboxChange(po.id, checked)}
                            aria-label={`Select PO ${po.poNumber}`}
                          />
                        </TableCell>
                       )}
                      <TableCell className="font-medium">{po.poNumber}</TableCell>
                      <TableCell>{format(po.date.toDate(), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{po.careOf}</TableCell>
                      <TableCell>{getStatusBadge(po.displayStatus)}</TableCell>
                       <TableCell className="text-right font-medium">
                        {areTotalsLoading ? <Skeleton className="h-5 w-24 ml-auto" /> : formatCurrency(totalAmounts[po.id]?.allocated || 0)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {areTotalsLoading ? <Skeleton className="h-5 w-24 ml-auto" /> : formatCurrency(totalAmounts[po.id]?.utilized || 0)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {areTotalsLoading ? (
                            <Skeleton className="h-5 w-24 ml-auto" />
                        ) : (
                            formatCurrency((totalAmounts[po.id]?.allocated || 0) - (totalAmounts[po.id]?.utilized || 0))
                        )}
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
                                <Eye className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                             <DropdownMenuItem onSelect={() => handleItemsAction(po)}>
                              <PackagePlus className="mr-2 h-4 w-4" /> 
                              {po.status === 'Delivered' ? 'View Items' : 'Add/Manage Items'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleEdit(po)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit PO
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
                    <TableCell colSpan={isPrintMode ? 9 : 8} className="h-24 text-center">
                      No purchase orders found for the selected filters.
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
                onOpenChange={handleDialogClose}
                poToEdit={poToEdit}
            />
            {poToView && (
                 <ViewPoDetailsDialog
                    isOpen={isViewDialogOpen}
                    onOpenChange={handleViewDialogClose}
                    po={poToView}
                    totals={totalAmounts[poToView.id]}
                />
            )}
             {poItemsToView && (
                <ViewPoItemsDialog
                    isOpen={isViewItemsDialogOpen}
                    onOpenChange={setIsViewItemsDialogOpen}
                    po={poItemsToView}
                />
            )}
        </Suspense>
     
       <AlertDialog open={!!poToDelete} onOpenChange={(open) => !open && setPoToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete PO #<span className="font-bold">{poToDelete?.poNumber}</span> and all of its associated items and uploaded files. This action cannot be undone.
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

