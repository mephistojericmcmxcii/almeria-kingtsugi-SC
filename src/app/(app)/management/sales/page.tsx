
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collectionGroup, getDocs, query, where } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { format, getYear, getMonth } from 'date-fns';
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Order } from '@/lib/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';


const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function SalesReportPage() {
    const { firestore } = useFirebase();
    const { user } = useAuth();
    const { toast } = useToast();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [selectedYears, setSelectedYears] = useState<number[]>([]);

    useEffect(() => {
        const fetchSalesData = async () => {
            if (!firestore || user?.role !== 'admin') {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);

            try {
                const ordersQuery = query(collectionGroup(firestore, 'orders'), where('status', '==', 'completed'));
                const querySnapshot = await getDocs(ordersQuery);
                const fetchedOrders = querySnapshot.docs.map(doc => doc.data() as Order);
                setOrders(fetchedOrders);

                if (fetchedOrders.length > 0) {
                    const years = Array.from(new Set(fetchedOrders.map(order => getYear(order.orderDate.toDate()))));
                    const sortedYears = years.sort((a, b) => b - a);
                    setAvailableYears(sortedYears);
                    setSelectedYears(sortedYears.slice(0, 2)); // Select the most recent 2 years by default
                }
            } catch (error) {
                console.error("Error fetching sales data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load sales data.' });
            } finally {
                setIsLoading(false);
            }
        };

        if (user?.role === 'admin') {
            fetchSalesData();
        } else {
            setIsLoading(false);
        }
    }, [firestore, user, toast]);

    const salesChartData = useMemo(() => {
        const dataByMonth: any[] = MONTH_NAMES.map(month => ({ month }));

        orders.forEach(order => {
            const orderDate = order.orderDate.toDate();
            const year = getYear(orderDate);
            const month = getMonth(orderDate);
            const monthName = MONTH_NAMES[month];

            if (!dataByMonth[month][year]) {
                dataByMonth[month][year] = 0;
            }
            dataByMonth[month][year] += order.totalAmount;
        });

        return dataByMonth;
    }, [orders]);
    
    const handleYearToggle = (year: number) => {
        setSelectedYears(prev => 
            prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
        );
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background p-2 border rounded-md shadow-lg">
                    <p className="font-bold">{label}</p>
                    {payload.map((entry: any) => (
                        <p key={entry.dataKey} style={{ color: entry.stroke }}>
                            {`${entry.dataKey}: ${formatCurrency(entry.value)}`}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
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
    
    // Assign colors to years for consistent chart rendering
    const lineColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'];

    return (
        <div className="space-y-6">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <TrendingUp className="w-8 h-8 text-primary" />
                    <h1 className="text-3xl font-bold tracking-tight font-headline">Sales Report</h1>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Multi-Year Sales Comparison</CardTitle>
                    <CardDescription>Compare monthly sales revenue across different years.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <Skeleton className="h-[400px] w-full" />
                    ) : (
                        <>
                            <div className="flex items-center justify-center gap-6 pb-4">
                                {availableYears.map(year => (
                                    <div key={year} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`year-${year}`}
                                            checked={selectedYears.includes(year)}
                                            onCheckedChange={() => handleYearToggle(year)}
                                        />
                                        <Label htmlFor={`year-${year}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            {year}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={salesChartData} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="month" fontSize="12px" />
                                    <YAxis tickFormatter={(value) => formatCurrency(value as number)} fontSize="12px" />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    {selectedYears.map((year, index) => (
                                        <Line 
                                            key={year}
                                            type="monotone" 
                                            dataKey={year} 
                                            stroke={lineColors[index % lineColors.length]}
                                            strokeWidth={2}
                                            activeDot={{ r: 8 }} 
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </>
                    )}
                </CardContent>
            </Card>

        </div>
    );
}

