
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { format, getQuarter } from 'date-fns';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import type { PurchaseOrder, PurchaseOrderItem, FixedMiscCost } from '@/lib/types';

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

type PoFinancialSummary = {
  id: string;
  po: PurchaseOrder;
  totalAllocation: number;
  totalExpenses: number;
  taxDeduction: number;
  ldCost: number;
  profit: number;
  paymentStatus?: 'Paid' | 'Unpaid';
};


const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
};

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
                            acc.allocation += (item.amount || 0) * (item.quantity || 1);
                            acc.expenses += (item.actualAmount || 0) * (item.quantity || 1);
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

    const filteredSummaries = useMemo(() => {
        return summaries.filter(summary => {
            const poDate = summary.po.date.toDate();
            const yearMatch = selectedYear === 'all' || poDate.getFullYear() === parseInt(selectedYear);
            const quarterMatch = selectedQuarter === 'all' || getQuarter(poDate) === parseInt(selectedQuarter);
            const lowerSearchTerm = searchTerm.toLowerCase();
            const searchMatch = !searchTerm ||
                summary.po.poNumber.toLowerCase().includes(lowerSearchTerm) ||
                (summary.po.source && summary.po.source.toLowerCase().includes(lowerSearchTerm));
            return yearMatch && quarterMatch && searchMatch;
        });
    }, [summaries, searchTerm, selectedYear, selectedQuarter]);
    
    const filteredFixedCosts = useMemo(() => {
        return fixedCosts.filter(cost => {
            const costDate = cost.date.toDate();
            const yearMatch = selectedYear === 'all' || costDate.getFullYear() === parseInt(selectedYear);
            const quarterMatch = selectedQuarter === 'all' || getQuarter(costDate) === parseInt(selectedQuarter);
            return yearMatch && quarterMatch;
        });
    }, [fixedCosts, selectedYear, selectedQuarter]);

    const { totalProfitLoss, totalTaxDeduction, totalAllocation, totalExpenses, profitLossChartData, expensesBySourceData, expensesByCategoryData } = useMemo(() => {
        const poTotals = filteredSummaries.reduce((acc, s) => {
            acc.totalProfitLoss += s.profit;
            acc.totalTaxDeduction += s.taxDeduction;
            acc.totalAllocation += s.totalAllocation;
            acc.totalExpenses += s.totalExpenses;
            
            const source = s.po.source || 'Unknown';
            acc.expensesBySource[source] = (acc.expensesBySource[source] || 0) + s.totalExpenses;

            return acc;
        }, { totalProfitLoss: 0, totalTaxDeduction: 0, totalAllocation: 0, totalExpenses: 0, expensesBySource: {} as Record<string, number> });

        const totalFixedCosts = filteredFixedCosts.reduce((sum, cost) => sum + cost.cost, 0);

        return {
            totalProfitLoss: poTotals.totalProfitLoss,
            totalTaxDeduction: poTotals.totalTaxDeduction,
            totalAllocation: poTotals.totalAllocation,
            totalExpenses: poTotals.totalExpenses + totalFixedCosts,
            profitLossChartData: filteredSummaries.map(s => ({ name: s.po.poNumber, profit: s.profit })).sort((a,b) => a.name.localeCompare(b.name)),
            expensesBySourceData: Object.entries(poTotals.expensesBySource).map(([name, value]) => ({ name, value })),
            expensesByCategoryData: [
                { name: 'Purchase Orders', value: poTotals.totalExpenses },
                { name: 'Fixed/Misc Costs', value: totalFixedCosts }
            ].filter(item => item.value > 0),
        };

    }, [filteredSummaries, filteredFixedCosts]);

    const availableYears = useMemo(() => {
        const years = new Set([...summaries.map(s => s.po.date.toDate().getFullYear()), ...fixedCosts.map(c => c.date.toDate().getFullYear())]);
        return Array.from(years).sort((a, b) => b - a).map(String);
    }, [summaries, fixedCosts]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background p-2 border rounded-md shadow-lg">
                    <p className="font-bold">{`${label}`}</p>
                    <p style={{ color: payload[0].fill }}>
                        {`${payload[0].name}: ${formatCurrency(payload[0].value)}`}
                    </p>
                </div>
            );
        }
        return null;
    };
    
    const PIE_COLORS = ['#10b981', '#f97316', '#3b82f6', '#8b5cf6'];
    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        if (percent === 0) return null;
        return (
            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
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
                    body { background-color: #fff; }
                    #report-header, #report-filters, #main-header, #main-sidebar { display: none !important; }
                    .printable-card { border: none; box-shadow: none; }
                     .recharts-wrapper { width: 100% !important; }
                }
            `}</style>
             <div id="report-header" className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold tracking-tight font-headline">Financial Reports</h1>
                </div>
                <Button onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" /> Print Report
                </Button>
            </div>

            <Card id="report-filters" className="printable-card">
                 <CardHeader>
                    <CardTitle>Filters</CardTitle>
                    <CardDescription>Filter the data for your report.</CardDescription>
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
                    </div>
                </CardContent>
            </Card>

            <Card className="printable-card">
                <CardHeader>
                    <CardTitle>Summary Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatsCard title="Total PO Allocation" value={isLoading ? <Skeleton className="h-8 w-1/2" /> : formatCurrency(totalAllocation)} description="Total budgeted amount for all POs." icon={DollarSign} isLoading={isLoading} />
                        <StatsCard title="Total Expenses" value={isLoading ? <Skeleton className="h-8 w-1/2" /> : formatCurrency(totalExpenses)} description="PO actual costs + Fixed costs." icon={TrendingDown} isLoading={isLoading} />
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
                <CardHeader><CardTitle>Expenses by PO Source</CardTitle></CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-[350px] w-full" /> : (
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={expensesBySourceData} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} fontSize="10px"/>
                                <YAxis type="category" dataKey="name" width={100} interval={0} fontSize="10px" />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(240, 240, 240, 0.5)' }} />
                                <Bar dataKey="value" name="Total Expenses" fill="#8884d8" barSize={20}>
                                     {expensesBySourceData.map((entry, index) => <Cell key={`cell-${index}`} fill={'#8884d8'} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            <Card className="printable-card">
                 <CardHeader><CardTitle>Detailed Data</CardTitle></CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>PO #</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Allocation</TableHead>
                                <TableHead className="text-right">Expenses</TableHead>
                                <TableHead className="text-right">Tax</TableHead>
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
                                        <TableCell><Badge variant="outline">{summary.po.paymentStatus}</Badge></TableCell>
                                        <TableCell className="text-right">{formatCurrency(summary.totalAllocation)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(summary.totalExpenses)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(summary.taxDeduction)}</TableCell>
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

        </div>
    );
}
