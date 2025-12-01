

'use client';

import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { useRouter } from 'next/navigation';
import { useFirebase, FirebaseClientProvider } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { collection, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import type { PurchaseOrder, PurchaseOrderItem, PoPaymentStatus, PurchaseOrderStatus, LiquidatedDamageItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { getQuarter, format } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, Eye, ShieldAlert, MoreHorizontal, Plus, Trash2, CircleDollarSign, BadgeDollarSign, TrendingUp, Search, ArrowUpDown, Receipt, FileText } from "lucide-react";
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { StatsCard } from '@/components/dashboard/stats-card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FixedMiscCosts } from '@/components/financial/fixed-misc-costs';

const PaymentDetailsDialog = lazy(() => import('@/components/po/payment-details-dialog').then(module => ({ default: module.PaymentDetailsDialog })));
const AddManualPoDialog = lazy(() => import('@/components/po/add-manual-po-dialog').then(module => ({ default: module.AddManualPoDialog })));
const PrintFinancialReport = lazy(() => import('@/components/financial/print-financial-report').then(module => ({ default: module.PrintFinancialReport })));


export type PoFinancialSummary = {
  id: string;
  po: PurchaseOrder;
  totalAllocation: number;
  totalExpenses: number;
  profit: number;
  paymentStatus?: PoPaymentStatus;
};

type SortConfig = {
    key: keyof PoFinancialSummary['po'] | 'totalAllocation' | 'totalExpenses' | 'profit' | 'taxDeduction' | 'ld';
    direction: 'ascending' | 'descending';
};

const PesoIcon = () => <span className="font-bold">₱</span>;


export default function FinancialPage() {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [summaries, setSummaries] = useState<PoFinancialSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSummary, setSelectedSummary] = useState<PoFinancialSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddManualDialogOpen, setIsAddManualDialogOpen] = useState(false);
  const [poToDelete, setPoToDelete] = useState<PoFinancialSummary | null>(null);
  
  // Filter and Sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [selectedQuarter, setSelectedQuarter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'date', direction: 'descending' });

  // Reset month filter when quarter changes to 'all'
  useEffect(() => {
    if (selectedQuarter === 'all') {
      setSelectedMonth('all');
    }
  }, [selectedQuarter]);


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
          
          let totalAllocation = 0;
          let totalExpenses = 0;

          if (po.entryType === 'manual') {
              totalAllocation = po.totalAllocation || 0;
              totalExpenses = po.totalExpenses || 0;
          } else {
              const itemsCollectionRef = collection(firestore, 'purchase_orders', po.id, 'items');
              const itemsSnapshot = await getDocs(itemsCollectionRef);
              
              const totals = itemsSnapshot.docs.reduce((acc, itemDoc) => {
                const item = itemDoc.data() as PurchaseOrderItem;
                
                acc.allocation += (item.amount || 0) * (item.quantity || 1);
                acc.expenses += (item.actualAmount || 0) * (item.quantity || 1);
                
                return acc;
              }, { allocation: 0, expenses: 0});

              totalAllocation = po.totalAllocation ?? totals.allocation;
              totalExpenses = totals.expenses;
          }

          const amountDeposited = po.amountDeposited || 0;
          
          return {
            id: po.id,
            po: po,
            totalAllocation,
            totalExpenses,
            profit: amountDeposited - totalExpenses,
            paymentStatus: po.paymentStatus,
          };
        });

        const calculatedSummaries = await Promise.all(summaryPromises);
        calculatedSummaries.sort((a,b) => b.po.date.toMillis() - a.po.date.toMillis());
        setSummaries(calculatedSummaries);

      } catch (error) {
        console.error("Error fetching PO summaries:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load PO payment summaries.' });
      } finally {
        setIsLoading(false);
      }
    };


  useEffect(() => {
    if (user?.role === 'admin') {
        fetchSummaries();
    } else {
        setIsLoading(false);
    }
  }, [firestore, user]);
  
  const availableYears = useMemo(() => {
    if (!summaries) return [];
    const years = new Set(summaries.map(s => s.po.date.toDate().getFullYear()));
    return Array.from(years).sort((a, b) => b - a).map(String);
  }, [summaries]);

  const QUARTER_MONTHS: Record<string, { name: string; value: number }[]> = {
    '1': [{ name: 'January', value: 0 }, { name: 'February', value: 1 }, { name: 'March', value: 2 }],
    '2': [{ name: 'April', value: 3 }, { name: 'May', value: 4 }, { name: 'June', value: 5 }],
    '3': [{ name: 'July', value: 6 }, { name: 'August', value: 7 }, { name: 'September', value: 8 }],
    '4': [{ name: 'October', value: 9 }, { name: 'November', value: 10 }, { name: 'December', value: 11 }],
  };

  const availableMonths = useMemo(() => {
    if (selectedQuarter === 'all' || !QUARTER_MONTHS[selectedQuarter]) {
        return [];
    }
    return [{ name: 'All Months', value: 'all' }, ...QUARTER_MONTHS[selectedQuarter]];
  }, [selectedQuarter]);
  
  const sortedAndFilteredSummaries = useMemo(() => {
    let sortableItems = [...summaries];
    
    // Filtering
    sortableItems = sortableItems.filter(summary => {
        const poDate = summary.po.date.toDate();
        const yearMatch = selectedYear === 'all' || poDate.getFullYear() === parseInt(selectedYear);
        const quarterMatch = selectedQuarter === 'all' || getQuarter(poDate) === parseInt(selectedQuarter);
        const monthMatch = selectedMonth === 'all' || poDate.getMonth() === parseInt(selectedMonth);
        
        const lowerSearchTerm = searchTerm.toLowerCase();
        const searchMatch = !searchTerm ||
                              summary.po.poNumber.toLowerCase().includes(lowerSearchTerm) ||
                              (summary.po.source && summary.po.source.toLowerCase().includes(lowerSearchTerm)) ||
                              summary.po.careOf.toLowerCase().includes(lowerSearchTerm);

        return yearMatch && quarterMatch && monthMatch && searchMatch;
    });

    // Sorting
    if (sortConfig !== null) {
        sortableItems.sort((a, b) => {
            let aValue: any;
            let bValue: any;
            
            const aPo = a.po;
            const bPo = b.po;

            if (['totalAllocation', 'totalExpenses', 'profit', 'taxDeduction', 'ld'].includes(sortConfig.key)) {
                const aAllocation = a.po.totalAllocation ?? a.totalAllocation;
                const bAllocation = b.po.totalAllocation ?? b.totalAllocation;
                
                const aTax = a.po.amountDeposited && a.po.amountDeposited > 0 ? aAllocation - (a.po.amountDeposited || 0) : 0;
                const bTax = b.po.amountDeposited && b.po.amountDeposited > 0 ? bAllocation - (b.po.amountDeposited || 0) : 0;
                
                const aLd = a.po.liquidatedDamages?.reduce((sum, item) => sum + item.cost, 0) || 0;
                const bLd = b.po.liquidatedDamages?.reduce((sum, item) => sum + item.cost, 0) || 0;

                if(sortConfig.key === 'totalAllocation') {
                    aValue = aAllocation;
                    bValue = bAllocation;
                } else if(sortConfig.key === 'totalExpenses') {
                    aValue = a.totalExpenses;
                    bValue = b.totalExpenses;
                } else if (sortConfig.key === 'taxDeduction') {
                    aValue = aTax;
                    bValue = bTax;
                } else if (sortConfig.key === 'ld') {
                    aValue = aLd;
                    bValue = bLd;
                } else { // profit
                    const aProfit = aAllocation - a.totalExpenses - aTax - aLd;
                    const bProfit = bAllocation - b.totalExpenses - bTax - bLd;
                    aValue = aProfit;
                    bValue = bProfit;
                }
            } else {
                 aValue = aPo[sortConfig.key as keyof PurchaseOrder];
                 bValue = bPo[sortConfig.key as keyof PurchaseOrder];
            }

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
  }, [summaries, searchTerm, selectedYear, selectedQuarter, selectedMonth, sortConfig]);
  
    const { paidCount, unpaidCount, totalTaxDeduction, totalProfitLoss } = useMemo(() => {
        if (!sortedAndFilteredSummaries) return { paidCount: 0, unpaidCount: 0, totalTaxDeduction: 0, totalProfitLoss: 0 };
        
        return sortedAndFilteredSummaries.reduce((acc, summary) => {
            if (summary.paymentStatus === 'Paid') {
                acc.paidCount++;
            } else if (summary.paymentStatus === 'Unpaid') {
                acc.unpaidCount++;
            }
            const allocation = summary.po.totalAllocation ?? summary.totalAllocation;
            const expenses = summary.totalExpenses;
            
            const taxDeduction = summary.po.amountDeposited && summary.po.amountDeposited > 0 ? allocation - (summary.po.amountDeposited || 0) : 0;
            
            const ldCost = summary.po.liquidatedDamages?.reduce((sum, item) => sum + item.cost, 0) || 0;
            const profit = allocation - expenses - taxDeduction - ldCost;

            acc.totalTaxDeduction += taxDeduction;
            acc.totalProfitLoss += profit;
            return acc;
        }, { paidCount: 0, unpaidCount: 0, totalTaxDeduction: 0, totalProfitLoss: 0 });

    }, [sortedAndFilteredSummaries]);
  
  const requestSort = (key: SortConfig['key']) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: SortConfig['key']) => {
    if (!sortConfig || sortConfig.key !== key) {
        return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    }
    if (sortConfig.direction === 'ascending') {
        return <ArrowUpDown className="h-4 w-4" />;
    }
    return <ArrowUpDown className="h-4 w-4" />;
  };


  const handleDeleteConfirm = async () => {
    if (!poToDelete) return;

    try {
        const poRef = doc(firestore, 'purchase_orders', poToDelete.id);
        await deleteDoc(poRef);
        toast({ title: "Manual Entry Deleted", description: `Entry ${poToDelete.po.poNumber} has been deleted.`});
        setPoToDelete(null);
        fetchSummaries(); // Refetch the list
    } catch (error) {
        console.error("Error deleting manual PO entry:", error);
        toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete the manual entry.' });
    }
  };

  const getStatusBadge = (status: PurchaseOrderStatus | PoPaymentStatus | undefined) => {
    switch (status) {
      case 'Approved': return <Badge className="bg-blue-500 text-blue-50 hover:bg-blue-600">Approved</Badge>;
      case 'Completed': return <Badge className="bg-green-600 text-green-50 hover:bg-green-700">Completed</Badge>;
      case 'Cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      case 'Paid': return <Badge className="bg-teal-500 text-teal-50 hover:bg-teal-600">Paid</Badge>;
      case 'Unpaid': return <Badge variant="secondary" className="bg-orange-500 text-orange-50 hover:bg-orange-600">Unpaid</Badge>;
      default: return <Badge variant="secondary">{status || 'N/A'}</Badge>;
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };
  
  const handleViewDetails = (summary: PoFinancialSummary) => {
    setSelectedSummary(summary);
    setIsModalOpen(true);
  };
  
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setSelectedSummary(null);
    }
    setIsModalOpen(open);
  }

  const handlePrintReport = () => {
    const features = "width=1200,height=800,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes";
    const printWindow = window.open('', '_blank', features);

    if (printWindow) {
      printWindow.document.write('<div id="print-root"></div>');
      printWindow.document.close();
      const printRoot = printWindow.document.getElementById('print-root');
      if (printRoot) {
        const root = createRoot(printRoot);
        root.render(
          <Suspense fallback={<div>Loading Report...</div>}>
            <FirebaseClientProvider>
                <PrintFinancialReport 
                    data={sortedAndFilteredSummaries}
                    totals={{ paidCount, unpaidCount, totalTaxDeduction, totalProfitLoss }}
                />
            </FirebaseClientProvider>
          </Suspense>
        );
      }
    }
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
    <>
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <CreditCard className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight font-headline">Financials</h1>
        </div>
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
            title="Paid POs"
            value={isLoading ? <Skeleton className="h-8 w-1/4" /> : paidCount}
            description="Total purchase orders marked as paid."
            icon={PesoIcon}
            isLoading={isLoading}
        />
        <StatsCard
            title="Unpaid POs"
            value={isLoading ? <Skeleton className="h-8 w-1/4" /> : unpaidCount}
            description="Total purchase orders awaiting payment."
            icon={PesoIcon}
            isLoading={isLoading}
        />
        <StatsCard
            title="Total Tax Deduction"
            value={isLoading ? <Skeleton className="h-8 w-1/2" /> : formatCurrency(totalTaxDeduction)}
            description="Total tax deductions from all POs."
            icon={Receipt}
            isLoading={isLoading}
        />
        <StatsCard
            title="Total Profit / Loss"
            value={isLoading ? <Skeleton className="h-8 w-1/2" /> : formatCurrency(totalProfitLoss)}
            description="Sum of all PO profits and losses."
            icon={TrendingUp}
            isLoading={isLoading}
        />
       </div>

      <Tabs defaultValue="po-payment" className="space-y-4">
        <TabsList>
          <TabsTrigger value="po-payment">PO Payment</TabsTrigger>
          <TabsTrigger value="fixed-misc-costs">Fixed Miscellaneous Costs</TabsTrigger>
        </TabsList>
        <TabsContent value="po-payment" className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="font-headline">PO Payment</CardTitle>
                            <CardDescription>
                                A summary of allocated budget vs. actual expenses for each PO.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={handlePrintReport}>
                                <FileText className="mr-2 h-4 w-4" /> Generate Report
                            </Button>
                            <Button onClick={() => setIsAddManualDialogOpen(true)}>
                                Add Manual Payment
                            </Button>
                        </div>
                    </div>
                <div className="flex flex-col md:flex-row items-center gap-4 pt-4">
                        <div className="flex items-center gap-4 w-full">
                            <div className="relative w-full md:w-1/2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input 
                                    placeholder="Search by PO #, Source, Care Of..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10"
                                />
                            </div>
                            <Select value={selectedYear} onValueChange={setSelectedYear}>
                                <SelectTrigger className="w-full md:w-[180px]">
                                    <SelectValue placeholder="Select Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Years</SelectItem>
                                    {availableYears.map(year => (
                                        <SelectItem key={year} value={year}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                                <SelectTrigger className="w-full md:w-[180px]">
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
                            {selectedQuarter !== 'all' && (
                                <Select value={String(selectedMonth)} onValueChange={setSelectedMonth}>
                                    <SelectTrigger className="w-full md:w-[180px]">
                                        <SelectValue placeholder="Select Month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableMonths.map(month => (
                                            <SelectItem key={month.value} value={String(month.value)}>{month.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="px-2"><Button variant="ghost" className="p-0" onClick={() => requestSort('poNumber')}>{getSortIcon('poNumber')}PO #</Button></TableHead>
                        <TableHead className="px-2"><Button variant="ghost" className="p-0" onClick={() => requestSort('date')}>{getSortIcon('date')}Date</Button></TableHead>
                        <TableHead className="px-2"><Button variant="ghost" className="p-0" onClick={() => requestSort('careOf')}>{getSortIcon('careOf')}Care Of</Button></TableHead>
                        <TableHead className="text-right px-2"><Button variant="ghost" className="p-0 justify-end w-full" onClick={() => requestSort('totalAllocation')}>{getSortIcon('totalAllocation')}Total Allocation</Button></TableHead>
                        <TableHead className="text-right px-2"><Button variant="ghost" className="p-0 justify-end w-full" onClick={() => requestSort('totalExpenses')}>{getSortIcon('totalExpenses')}Total Expenses</Button></TableHead>
                        <TableHead className="text-right px-2"><Button variant="ghost" className="p-0 justify-end w-full" onClick={() => requestSort('taxDeduction')}>{getSortIcon('taxDeduction')}Tax Deduction</Button></TableHead>
                        <TableHead className="text-right px-2"><Button variant="ghost" className="p-0 justify-end w-full" onClick={() => requestSort('amountDeposited')}>{getSortIcon('amountDeposited')}Amount Deposited</Button></TableHead>
                        <TableHead className="text-right px-2"><Button variant="ghost" className="p-0 justify-end w-full" onClick={() => requestSort('ld')}>LD</Button></TableHead>
                        <TableHead className="text-right px-2"><Button variant="ghost" className="p-0 justify-end w-full" onClick={() => requestSort('profit')}>{getSortIcon('profit')}Profit / Loss</Button></TableHead>
                        <TableHead className="text-center px-2"><Button variant="ghost" className="p-0 justify-center w-full" onClick={() => requestSort('paymentStatus')}>{getSortIcon('paymentStatus')}Payment Status</Button></TableHead>
                        <TableHead className="text-right px-4">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32 ml-auto" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32 ml-auto" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32 ml-auto" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32 ml-auto" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32 ml-auto" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32 ml-auto" /></TableCell>
                            <TableCell className="text-center"><Skeleton className="h-6 w-24 mx-auto" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                        </TableRow>
                        ))
                    ) : sortedAndFilteredSummaries.length > 0 ? (
                        sortedAndFilteredSummaries.map((summary) => {
                            const allocation = summary.po.totalAllocation ?? summary.totalAllocation;
                            const expenses = summary.totalExpenses;
                            const taxDeduction = summary.po.amountDeposited && summary.po.amountDeposited > 0 ? allocation - (summary.po.amountDeposited || 0) : 0;
                            const ldCost = summary.po.liquidatedDamages?.reduce((sum, item) => sum + item.cost, 0) || 0;
                            const profitLoss = allocation - expenses - taxDeduction - ldCost;

                            return (
                                <TableRow key={summary.id}>
                                    <TableCell className="font-medium">{summary.po.poNumber}</TableCell>
                                    <TableCell>{format(summary.po.date.toDate(), 'dd-MMM-yyyy')}</TableCell>
                                    <TableCell>{summary.po.careOf}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(allocation)}</TableCell>
                                    <TableCell className="text-right font-semibold">{formatCurrency(expenses)}</TableCell>
                                    <TableCell className="text-right text-orange-600">{formatCurrency(taxDeduction)}</TableCell>
                                    <TableCell className="text-right text-blue-600">{formatCurrency(summary.po.amountDeposited || 0)}</TableCell>
                                     <TableCell className={cn(
                                        "text-right font-bold",
                                        ldCost > 0 ? "text-red-600" : "text-muted-foreground"
                                    )}>
                                        {formatCurrency(ldCost)}
                                    </TableCell>
                                    <TableCell className={cn(
                                        "text-right font-bold",
                                        profitLoss >= 0 ? "text-green-600" : "text-red-600"
                                    )}>
                                        {formatCurrency(profitLoss)}
                                    </TableCell>
                                    <TableCell className="text-center">{getStatusBadge(summary.paymentStatus)}</TableCell>
                                    <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onSelect={() => handleViewDetails(summary)}>
                                            <Eye className="mr-2 h-4 w-4" /> Manage Payment
                                            </DropdownMenuItem>
                                            {summary.po.entryType === 'manual' && (
                                                <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onSelect={() => setPoToDelete(summary)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Entry
                                                </DropdownMenuItem>
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    ) : (
                        <TableRow>
                        <TableCell colSpan={11} className="h-24 text-center">
                            No purchase orders found for the selected filters.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="fixed-misc-costs" className="space-y-4">
            <FixedMiscCosts />
        </TabsContent>
      </Tabs>
    </div>
    
    {selectedSummary && (
      <Suspense fallback={<div>Loading...</div>}>
          <PaymentDetailsDialog
              isOpen={isModalOpen}
              onOpenChange={handleDialogClose}
              summary={selectedSummary}
              onSuccess={fetchSummaries}
          />
      </Suspense>
    )}
    
    <Suspense fallback={<div>Loading...</div>}>
        <AddManualPoDialog
            isOpen={isAddManualDialogOpen}
            onOpenChange={setIsAddManualDialogOpen}
            onSuccess={fetchSummaries}
        />
    </Suspense>

    <AlertDialog open={!!poToDelete} onOpenChange={(open) => !open && setPoToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the manual payment entry for PO #<span className="font-bold">{poToDelete?.po.poNumber}</span>. This action cannot be undone.
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

    
