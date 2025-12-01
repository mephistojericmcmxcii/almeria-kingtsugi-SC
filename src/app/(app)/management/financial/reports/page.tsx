
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { format, getQuarter } from 'date-fns';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import type { PoFinancialSummary, PurchaseOrder, PurchaseOrderItem } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatsCard } from '@/components/dashboard/stats-card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Printer, Receipt, TrendingUp, ArrowLeft, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const PesoIcon = () => <span className="font-bold">₱</span>;

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
};

export default function FinancialReportsPage() {
    const { firestore } = useFirebase();
    const { user } = useAuth();
    const { toast } = useToast();
    const [summaries, setSummaries] = useState<PoFinancialSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
    const [selectedQuarter, setSelectedQuarter] = useState('all');

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
                    return {
                        id: po.id,
                        po,
                        totalAllocation,
                        totalExpenses,
                        profit: (po.amountDeposited || 0) - totalExpenses,
                        paymentStatus: po.paymentStatus,
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

        if (user?.role === 'admin') {
            fetchSummaries();
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

    const { paidCount, unpaidCount, totalTaxDeduction, totalProfitLoss, chartData, pieChartData } = useMemo(() => {
        const totals = filteredSummaries.reduce((acc, summary) => {
            if (summary.paymentStatus === 'Paid') acc.paidCount++;
            else if (summary.paymentStatus === 'Unpaid') acc.unpaidCount++;

            const allocation = summary.po.totalAllocation ?? summary.totalAllocation;
            const expenses = summary.totalExpenses;
            const taxDeduction = (summary.po.amountDeposited && summary.po.amountDeposited > 0) ? allocation - (summary.po.amountDeposited || 0) : 0;
            const ldCost = summary.po.liquidatedDamages?.reduce((sum, item) => sum + item.cost, 0) || 0;
            const profit = allocation - expenses - taxDeduction - ldCost;

            acc.totalTaxDeduction += taxDeduction;
            acc.totalProfitLoss += profit;
            
            acc.chartData.push({ name: summary.po.poNumber, profit });

            return acc;
        }, {
            paidCount: 0,
            unpaidCount: 0,
            totalTaxDeduction: 0,
            totalProfitLoss: 0,
            chartData: [] as { name: string; profit: number }[],
        });
        
        totals.chartData.sort((a,b) => a.name.localeCompare(b.name));

        return {
            ...totals,
            pieChartData: [{ name: 'Paid', value: totals.paidCount }, { name: 'Unpaid', value: totals.unpaidCount }],
        };
    }, [filteredSummaries]);

    const availableYears = useMemo(() => {
        const years = new Set(summaries.map(s => s.po.date.toDate().getFullYear()));
        return Array.from(years).sort((a, b) => b - a).map(String);
    }, [summaries]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background p-2 border rounded-md shadow-lg">
                    <p className="font-bold">{`PO #: ${label}`}</p>
                    <p style={{ color: payload[0].value >= 0 ? '#10b981' : '#ef4444' }}>
                        {`Profit/Loss: ${formatCurrency(payload[0].value)}`}
                    </p>
                </div>
            );
        }
        return null;
    };
    
    const PIE_COLORS = ['#10b981', '#f97316'];
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
                    body {
                        background-color: #fff;
                    }
                    #report-header, #report-filters, #main-header, #main-sidebar {
                        display: none !important;
                    }
                    .printable-card {
                        border: none;
                        box-shadow: none;
                    }
                     .recharts-wrapper {
                        width: 100% !important;
                    }
                }
            `}</style>
             <div id="report-header" className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/management/financial"><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
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
                    <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatsCard title="Total Profit / Loss" value={isLoading ? <Skeleton className="h-8 w-1/2" /> : formatCurrency(totalProfitLoss)} description="Sum of all PO profits and losses." icon={TrendingUp} isLoading={isLoading} />
                        <StatsCard title="Total Tax Deduction" value={isLoading ? <Skeleton className="h-8 w-1/2" /> : formatCurrency(totalTaxDeduction)} description="Total tax deductions from all POs." icon={Receipt} isLoading={isLoading} />
                        <StatsCard title="Paid POs" value={isLoading ? <Skeleton className="h-8 w-1/4" /> : paidCount} description="Total purchase orders marked as paid." icon={PesoIcon} isLoading={isLoading} />
                        <StatsCard title="Unpaid POs" value={isLoading ? <Skeleton className="h-8 w-1/4" /> : unpaidCount} description="Total purchase orders awaiting payment." icon={PesoIcon} isLoading={isLoading} />
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 printable-card">
                    <CardHeader><CardTitle>Profit/Loss per PO</CardTitle></CardHeader>
                    <CardContent>
                         {isLoading ? <Skeleton className="h-[350px] w-full" /> : (
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} interval={0} fontSize="10px" />
                                    <YAxis tickFormatter={(value) => formatCurrency(value)} fontSize="12px" />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(240, 240, 240, 0.5)' }} />
                                    <Bar dataKey="profit">
                                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#22c55e' : '#ef4444'} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                         )}
                    </CardContent>
                </Card>
                 <Card className="printable-card">
                    <CardHeader><CardTitle>PO Payment Status</CardTitle></CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-[350px] w-full" /> : (
                            <ResponsiveContainer width="100%" height={350}>
                                <PieChart>
                                    <Pie data={pieChartData} cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius={120} fill="#8884d8" dataKey="value">
                                        {pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                                    </Pie>
                                    <Legend />
                                    <Tooltip formatter={(value) => value} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="printable-card">
                 <CardHeader><CardTitle>Detailed Data</CardTitle></CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>PO #</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Care Of</TableHead>
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
                                filteredSummaries.map((summary) => {
                                    const allocation = summary.po.totalAllocation ?? summary.totalAllocation;
                                    const expenses = summary.totalExpenses;
                                    const taxDeduction = summary.po.amountDeposited && summary.po.amountDeposited > 0 ? allocation - (summary.po.amountDeposited || 0) : 0;
                                    const ldCost = summary.po.liquidatedDamages?.reduce((sum, item) => sum + item.cost, 0) || 0;
                                    const profitLoss = allocation - expenses - taxDeduction - ldCost;
                                    return (
                                        <TableRow key={summary.id}>
                                            <TableCell>{summary.po.poNumber}</TableCell>
                                            <TableCell>{format(summary.po.date.toDate(), 'dd-MMM-yyyy')}</TableCell>
                                            <TableCell>{summary.po.careOf}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(allocation)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(expenses)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(taxDeduction)}</TableCell>
                                            <TableCell className={cn("text-right font-bold", profitLoss >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(profitLoss)}</TableCell>
                                        </TableRow>
                                    );
                                })
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


    