
'use client';

import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { useFirebase, FirebaseClientProvider } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { format, getQuarter, getYear, getMonth } from 'date-fns';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import type { PurchaseOrder, PurchaseOrderItem, FixedMiscCost, Order } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatsCard } from '@/components/dashboard/stats-card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Printer, Receipt, TrendingUp, ShieldAlert, FileText, TrendingDown, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const PrintFinancialReportLayout = lazy(() => import('@/components/financial/print-financial-report'));
const PrintYearlyComparisonLayout = lazy(() => import('@/components/financial/print-yearly-comparison'));


export type PoFinancialSummary = {
  id: string;
  po: PurchaseOrder;
  totalAllocation: number;
  totalExpenses: number;
  taxDeduction: number;
  ldCost: number;
  profit: number;
  paymentStatus?: 'Paid' | 'Unpaid';
};

type ComparisonDataType = 'profit' | 'allocation' | 'expenses' | 'tax' | 'ld';

const COMPARISON_DATA_TYPES: { value: ComparisonDataType; label: string }[] = [
    { value: 'profit', label: 'Profit / Loss' },
    { value: 'allocation', label: 'Total Allocation' },
    { value: 'expenses', label: 'Total Expenses' },
    { value: 'tax', label: 'Tax Deduction' },
    { value: 'ld', label: 'Liquidated Damages' },
];


const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];


export default function FinancialReportsPage() {
    const { firestore } = useFirebase();
    const { user } = useAuth();
    const { toast } = useToast();
    const [summaries, setSummaries] = useState<PoFinancialSummary[]>([]);
    const [fixedCosts, setFixedCosts] = useState<FixedMiscCost[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
    const [selectedQuarter, setSelectedQuarter] = useState('all');
    const [selectedMonth, setSelectedMonth] = useState('all');
    const [activeTab, setActiveTab] = useState('financial-reports');
    
    // State for profit/loss chart
    const [plAvailableYears, setPlAvailableYears] = useState<number[]>([]);
    const [selectedPlYear1, setSelectedPlYear1] = useState<number | undefined>();
    const [selectedPlYear2, setSelectedPlYear2] = useState<number | undefined>();
    const [comparisonDataType, setComparisonDataType] = useState<ComparisonDataType>('profit');

    useEffect(() => {
        if (selectedQuarter === 'all') {
            setSelectedMonth('all');
        }
    }, [selectedQuarter]);


    useEffect(() => {
        const fetchAllFinancialData = async () => {
            if (!firestore || user?.role !== 'admin') {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);

            try {
                // Fetch POs and their items
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
                             if (item.itemType === 'misc') {
                                acc.expenses += item.amount || 0;
                            } else {
                                acc.allocation += (item.amount || 0) * (item.quantity || 1);
                                acc.expenses += (item.actualAmount || 0) * (item.quantity || 1);
                            }
                            return acc;
                        }, { allocation: 0, expenses: 0 });
                        totalAllocation = po.totalAllocation ?? totals.allocation;
                        totalExpenses = totals.expenses;
                    }
                    const taxDeduction = (po.amountDeposited && po.amountDeposited > 0) ? totalAllocation - (po.amountDeposited || 0) : 0;
                    const ldCost = po.liquidatedDamages?.reduce((sum, item) => sum + item.cost, 0) || 0;
                    const profit = totalAllocation - totalExpenses - taxDeduction - ldCost;
                    
                    return {
                        id: po.id, po, totalAllocation, totalExpenses, taxDeduction, ldCost, profit, paymentStatus: po.paymentStatus
                    };
                });

                const calculatedSummaries = await Promise.all(summaryPromises);
                setSummaries(calculatedSummaries);
                
                if (calculatedSummaries.length > 0) {
                    const years = Array.from(new Set(calculatedSummaries.map(s => getYear(s.po.date.toDate()))));
                    const sortedYears = years.sort((a, b) => b - a);
                    setPlAvailableYears(sortedYears);
                    setSelectedPlYear1(sortedYears[0]);
                    if (sortedYears.length > 1) {
                      setSelectedPlYear2(sortedYears[1]);
                    }
                }


                // Fetch Fixed/Misc Costs
                const costsQuery = query(collection(firestore, 'fixed_misc_costs'), orderBy('date', 'desc'));
                const costsSnapshot = await getDocs(costsQuery);
                setFixedCosts(costsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FixedMiscCost)));

            } catch (error) {
                console.error("Error fetching financial data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load financial data.' });
            } finally {
                setIsLoading(false);
            }
        };

        if (user?.role === 'admin') {
            fetchAllFinancialData();
        } else {
            setIsLoading(false);
        }
    }, [firestore, user, toast]);

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

    const filteredSummaries = useMemo(() => {
        return summaries.filter(summary => {
            const poDate = summary.po.date.toDate();
            const yearMatch = selectedYear === 'all' || poDate.getFullYear() === parseInt(selectedYear);
            const quarterMatch = selectedQuarter === 'all' || getQuarter(poDate) === parseInt(selectedQuarter);
            const monthMatch = selectedMonth === 'all' || poDate.getMonth() === parseInt(selectedMonth);

            const lowerSearchTerm = searchTerm.toLowerCase();
            const searchMatch = !searchTerm ||
                summary.po.poNumber.toLowerCase().includes(lowerSearchTerm) ||
                (summary.po.source && summary.po.source.toLowerCase().includes(lowerSearchTerm));
            return yearMatch && quarterMatch && monthMatch && searchMatch;
        });
    }, [summaries, searchTerm, selectedYear, selectedQuarter, selectedMonth]);
    
    const filteredFixedCosts = useMemo(() => {
        return fixedCosts.filter(cost => {
            const costDate = cost.date.toDate();
            const yearMatch = selectedYear === 'all' || costDate.getFullYear() === parseInt(selectedYear);
            const quarterMatch = selectedQuarter === 'all' || getQuarter(costDate) === parseInt(selectedQuarter);
            const monthMatch = selectedMonth === 'all' || costDate.getMonth() === parseInt(selectedMonth);
            return yearMatch && quarterMatch && monthMatch;
        });
    }, [fixedCosts, selectedYear, selectedQuarter, selectedMonth]);

    const { totalProfitLoss, totalTaxDeduction, totalLdCost, totalAllocation, totalExpenses, profitLossChartData, expensesByCategoryData } = useMemo(() => {
        const poTotals = filteredSummaries.reduce((acc, s) => {
            acc.totalProfitLoss += s.profit;
            acc.totalTaxDeduction += s.taxDeduction;
            acc.totalLdCost += s.ldCost;
            acc.totalAllocation += s.totalAllocation;
            acc.totalExpenses += s.totalExpenses;

            return acc;
        }, { totalProfitLoss: 0, totalTaxDeduction: 0, totalLdCost: 0, totalAllocation: 0, totalExpenses: 0 });

        const totalFixedCosts = filteredFixedCosts.reduce((sum, cost) => sum + cost.cost, 0);
        
        const totalPurchaseOrderExpenses = poTotals.totalExpenses + poTotals.totalLdCost;
        
        return {
            totalProfitLoss: poTotals.totalProfitLoss,
            totalTaxDeduction: poTotals.totalTaxDeduction,
            totalLdCost: poTotals.totalLdCost,
            totalAllocation: poTotals.totalAllocation,
            totalExpenses: totalPurchaseOrderExpenses + totalFixedCosts + poTotals.totalTaxDeduction,
            profitLossChartData: filteredSummaries.map(s => ({ name: s.po.poNumber, profit: s.profit })).sort((a,b) => a.name.localeCompare(b.name)),
            expensesByCategoryData: [
                { name: 'Purchase Orders', value: totalPurchaseOrderExpenses },
                { name: 'Fixed/Misc Costs', value: totalFixedCosts },
                { name: 'Tax Deductions', value: poTotals.totalTaxDeduction },
            ].filter(item => item.value > 0),
        };

    }, [filteredSummaries, filteredFixedCosts]);
    
     const profitLossComparisonData = useMemo(() => {
        const dataByMonth: any[] = MONTH_NAMES.map(month => ({ month }));
        summaries.forEach(summary => {
            const poDate = summary.po.date.toDate();
            const year = getYear(poDate);
            const month = getMonth(poDate);

            if (year === selectedPlYear1 || year === selectedPlYear2) {
                if (!dataByMonth[month][year]) {
                    dataByMonth[month][year] = 0;
                }
                
                let valueToSum = 0;
                switch (comparisonDataType) {
                    case 'profit':
                        valueToSum = summary.profit;
                        break;
                    case 'allocation':
                        valueToSum = summary.totalAllocation;
                        break;
                    case 'expenses':
                        valueToSum = summary.totalExpenses;
                        break;
                    case 'tax':
                        valueToSum = summary.taxDeduction;
                        break;
                    case 'ld':
                        valueToSum = summary.ldCost;
                        break;
                }
                dataByMonth[month][year] += valueToSum;
            }
        });
        return dataByMonth;
    }, [summaries, selectedPlYear1, selectedPlYear2, comparisonDataType]);

    const availableYears = useMemo(() => {
        const years = new Set([...summaries.map(s => s.po.date.toDate().getFullYear()), ...fixedCosts.map(c => c.date.toDate().getFullYear())]);
        return Array.from(years).sort((a, b) => b - a).map(String);
    }, [summaries, fixedCosts]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background p-2 border rounded-md shadow-lg">
                    <p className="font-bold">{`${label}`}</p>
                    {payload.map((p: any, i: number) => (
                         <p key={i} style={{ color: p.stroke || p.fill }}>
                            {`${p.name}: ${formatCurrency(p.value)}`}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };
    
    const PIE_COLORS = ['#10b981', '#f97316', '#3b82f6', '#8b5cf6', '#ef4444'];
    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        if (percent < 0.001) return null; // Don't render label for very small slices
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        const displayPercent = (percent * 100).toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3
        });
        
        return (
            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                {`${displayPercent}%`}
            </text>
        );
    };

    const lineColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'];

    const handlePrint = () => {
        const features = "width=1200,height=800,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes";
        const printWindow = window.open('', '_blank', features);
        if (printWindow) {
            printWindow.document.write('<div id="print-root"></div>');
            printWindow.document.close();
            const printRoot = printWindow.document.getElementById('print-root');
            if (printRoot) {
                const root = createRoot(printRoot);
                let contentToPrint;
                if (activeTab === 'financial-reports') {
                    const stats = { totalAllocation, totalExpenses, totalTaxDeduction, totalProfitLoss };
                    contentToPrint = (
                        <PrintFinancialReportLayout
                            summaries={filteredSummaries}
                            stats={stats}
                            expensesByCategoryData={expensesByCategoryData}
                            profitLossChartData={profitLossChartData}
                        />
                    );
                } else { // yearly-comparison
                    const selectedType = COMPARISON_DATA_TYPES.find(t => t.value === comparisonDataType);
                    contentToPrint = (
                        <PrintYearlyComparisonLayout
                            data={profitLossComparisonData}
                            year1={selectedPlYear1}
                            year2={selectedPlYear2}
                            dataTypeLabel={selectedType?.label || ''}
                        />
                    );
                }

                root.render(
                    <Suspense fallback={<div>Loading print view...</div>}>
                        <FirebaseClientProvider>{contentToPrint}</FirebaseClientProvider>
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
                <p className="text-muted-foreground mt-2">You do not have permission to view this page.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-6" id="report-content">
             <style>{`
                @media print {
                    body { background-color: #fff !important; }
                    #report-header, #report-filters, #main-header, #main-sidebar { display: none !important; }
                    .printable-card { border: none; box-shadow: none; break-inside: avoid; }
                     .recharts-wrapper { width: 100% !important; }
                }
            `}</style>
             <div id="report-header" className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold tracking-tight font-headline">Expenditure & Profit Analysis</h1>
                </div>
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" /> Print Report
                </Button>
            </div>
            
             <Tabs defaultValue="financial-reports" onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="financial-reports">Financial Reports</TabsTrigger>
                    <TabsTrigger value="yearly-comparison">Yearly Profit Comparison</TabsTrigger>
                </TabsList>
                <TabsContent value="financial-reports" className="space-y-6">
                    <Card id="report-filters" className="printable-card">
                        <CardHeader>
                            <CardTitle>Filters</CardTitle>
                            <CardDescription>Filter the expenditure data for your report.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="flex flex-col md:flex-row items-center gap-4">
                                <div className="relative w-full md:w-1/2">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input placeholder="Search by PO #, Source..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10" />
                                </div>
                                <Select value={selectedYear} onValueChange={setSelectedYear}>
                                    <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Select Year" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Years</SelectItem>
                                        {availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                                    <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Select Quarter" /></SelectTrigger>
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
                        </CardContent>
                    </Card>

                    <Card className="printable-card">
                        <CardHeader>
                            <CardTitle>Expenditure & Profit Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <StatsCard title="Total PO Allocation" value={isLoading ? <Skeleton className="h-8 w-1/2" /> : formatCurrency(totalAllocation)} description="Total budgeted amount for all POs." icon={DollarSign} isLoading={isLoading} />
                                <StatsCard title="Total Expenses" value={isLoading ? <Skeleton className="h-8 w-1/2" /> : formatCurrency(totalExpenses)} description="PO actual costs + Fixed costs + Tax." icon={TrendingDown} isLoading={isLoading} />
                                <StatsCard title="Total Tax Deduction" value={isLoading ? <Skeleton className="h-8 w-1/2" /> : formatCurrency(totalTaxDeduction)} description="Total tax deductions from all POs." icon={Receipt} isLoading={isLoading} />
                                <StatsCard title="Net Profit / Loss" value={isLoading ? <Skeleton className="h-8 w-1/2" /> : formatCurrency(totalProfitLoss)} description="Sum of all PO profits and losses." icon={TrendingUp} isLoading={isLoading} />
                            </div>
                        </CardContent>
                    </Card>


                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2 printable-card">
                            <CardHeader><CardTitle>Profit/Loss per PO</CardTitle></CardHeader>
                            <CardContent>
                                {isLoading ? <Skeleton className="h-[350px] w-full" /> : (
                                    <ResponsiveContainer width="100%" height={350}>
                                        <BarChart data={profitLossChartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} interval={0} fontSize="10px" />
                                            <YAxis tickFormatter={(value) => formatCurrency(value)} fontSize="12px" />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(240, 240, 240, 0.5)' }} />
                                            <Bar dataKey="profit" name="Profit/Loss">
                                                {profitLossChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#22c55e' : '#ef4444'} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>
                        <Card className="printable-card">
                            <CardHeader><CardTitle>Expenses by Category</CardTitle></CardHeader>
                            <CardContent>
                                {isLoading ? <Skeleton className="h-[350px] w-full" /> : (
                                    <ResponsiveContainer width="100%" height={350}>
                                        <PieChart>
                                            <Pie data={expensesByCategoryData} cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius={120} fill="#8884d8" dataKey="value">
                                                {expensesByCategoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                                            </Pie>
                                            <Legend />
                                            <Tooltip formatter={(value) => formatCurrency(value as number)} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                    
                    <Card className="printable-card">
                        <CardHeader><CardTitle>Detailed Expenditure Data</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>PO #</TableHead>
                                        <TableHead>Source</TableHead>
                                        <TableHead className="text-right">Allocation</TableHead>
                                        <TableHead className="text-right">Expenses</TableHead>
                                        <TableHead className="text-right">Tax</TableHead>
                                        <TableHead className="text-right">LD</TableHead>
                                        <TableHead className="text-right">Profit/Loss</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                                    )) : filteredSummaries.length > 0 ? (
                                        filteredSummaries.map((summary) => (
                                            <TableRow key={summary.id}>
                                                <TableCell>{summary.po.poNumber}</TableCell>
                                                <TableCell>{summary.po.source}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(summary.totalAllocation)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(summary.totalExpenses)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(summary.taxDeduction)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(summary.ldCost)}</TableCell>
                                                <TableCell className={cn("text-right font-bold", summary.profit >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(summary.profit)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={7} className="h-24 text-center">No data found for the selected filters.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="yearly-comparison">
                     <Card className="printable-card">
                        <CardHeader>
                            <CardTitle>Multi-Year PO Financial Comparison</CardTitle>
                            <CardDescription>Compare financial metrics from Purchase Orders across different years.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? ( <Skeleton className="h-[400px] w-full" /> ) : (
                                <>
                                    <div className="flex items-center justify-center gap-6 pb-4">
                                        <Select value={String(selectedPlYear1)} onValueChange={(v) => setSelectedPlYear1(Number(v))}>
                                            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select Year 1" /></SelectTrigger>
                                            <SelectContent>
                                                {plAvailableYears.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <span className="font-semibold text-muted-foreground">vs.</span>
                                        <Select value={String(selectedPlYear2)} onValueChange={(v) => setSelectedPlYear2(Number(v))}>
                                            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select Year 2" /></SelectTrigger>
                                            <SelectContent>
                                                {plAvailableYears.filter(y => y !== selectedPlYear1).map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <Select value={comparisonDataType} onValueChange={(v) => setComparisonDataType(v as ComparisonDataType)}>
                                            <SelectTrigger className="w-[220px]">
                                                <SelectValue placeholder="Select Data Type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {COMPARISON_DATA_TYPES.map(type => (
                                                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <ResponsiveContainer width="100%" height={400}>
                                        <LineChart data={profitLossComparisonData} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="month" fontSize="12px" />
                                            <YAxis tickFormatter={(value) => formatCurrency(value as number)} fontSize="12px" />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend formatter={(value, entry) => {
                                                const selectedType = COMPARISON_DATA_TYPES.find(t => t.value === comparisonDataType);
                                                return `${selectedType?.label || ''} ${value}`;
                                            }}/>
                                            {selectedPlYear1 && <Line type="monotone" name={String(selectedPlYear1)} dataKey={selectedPlYear1} stroke={lineColors[0]} strokeWidth={2} activeDot={{ r: 8 }} />}
                                            {selectedPlYear2 && <Line type="monotone" name={String(selectedPlYear2)} dataKey={selectedPlYear2} stroke={lineColors[1]} strokeWidth={2} activeDot={{ r: 8 }} />}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
