
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collectionGroup } from 'firebase/firestore';
import type { Order, OrderStatus } from '@/lib/types';
import { format } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, CheckCircle, XCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AllOrdersPage() {
    const { user, updateOrderStatus } = useAuth();
    const { firestore } = useFirebase();
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    const allOrdersQuery = useMemoFirebase(() => {
        if (!firestore || user?.role !== 'admin') return null;
        return collectionGroup(firestore, 'orders');
    }, [firestore, user?.role]);

    const { data: orders, isLoading } = useCollection<Order>(allOrdersQuery);

    if (user?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">You do not have permission to view this page.</p>
            </div>
        );
    }
    
    const handleUpdateStatus = async (order: Order, status: OrderStatus) => {
        setIsUpdating(order.id);
        await updateOrderStatus(order, status);
        setIsUpdating(null);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
    };

    const getStatusBadge = (status: OrderStatus) => {
        switch (status) {
            case 'pending': return <Badge variant="secondary" className="bg-yellow-500 text-yellow-50">Pending</Badge>;
            case 'confirmed': return <Badge className="bg-blue-500 text-blue-50">Confirmed</Badge>;
            case 'delivering': return <Badge className="bg-purple-500 text-purple-50">Delivering</Badge>;
            case 'completed': return <Badge className="bg-green-600 text-green-50">Completed</Badge>;
            case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
        }
    };
    
    const sortedOrders = orders ? [...orders].sort((a, b) => b.orderDate.toMillis() - a.orderDate.toMillis()) : [];

    return (
        <div className="space-y-8">
             <div className="flex items-center gap-4">
                <ShoppingCart className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight font-headline">All Orders</h1>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Order Management</CardTitle>
                    <CardDescription>View and manage all customer orders.</CardDescription>
                </CardHeader>
                <CardContent>
                   {isLoading ? (
                         <div className="space-y-4">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                   ) : !sortedOrders || sortedOrders.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
                            <p className="mt-4">There are no orders yet.</p>
                        </div>
                   ) : (
                        <Accordion type="single" collapsible className="w-full space-y-4">
                            {sortedOrders.map(order => (
                                <AccordionItem value={order.id} key={order.id} className="border rounded-lg px-4">
                                    <AccordionTrigger>
                                        <div className="flex justify-between w-full items-center">
                                            <div className="flex flex-col text-left">
                                                <span className="font-semibold text-base font-mono hidden md:block">{order.id}</span>
                                                <span className="font-semibold text-base font-mono md:hidden">{order.id.substring(0,10)}...</span>
                                                <span className="text-sm text-muted-foreground">{format(order.orderDate.toDate(), 'MMMM d, yyyy')}</span>
                                                 <span className="text-xs text-muted-foreground pt-1">{order.userDisplayName} ({order.userEmail})</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                               <span className="font-semibold text-lg">{formatCurrency(order.totalAmount)}</span>
                                               {getStatusBadge(order.status)}
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-4">
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="font-semibold mb-2">Items</h4>
                                                <div className="space-y-2">
                                                {order.items.map((item, index) => (
                                                    <div key={index} className="flex justify-between items-center text-sm">
                                                        <span>{item.parentName} ({item.brand}) x {item.quantity}</span>
                                                        <span>{formatCurrency((item.price || 0) * item.quantity)}</span>
                                                    </div>
                                                ))}
                                                </div>
                                            </div>
                                            <div className="pt-2 border-t">
                                                <h4 className="font-semibold mb-1">Shipping Address</h4>
                                                <p className="text-sm text-muted-foreground">{order.shippingAddress}</p>
                                            </div>
                                           
                                            <div className="flex gap-2 justify-end pt-4">
                                                 {order.status === 'pending' && (
                                                     <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(order, 'confirmed')} disabled={isUpdating === order.id}>
                                                        {isUpdating === order.id ? '...' : 'Confirm'}
                                                    </Button>
                                                )}
                                                {order.status === 'confirmed' && (
                                                     <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(order, 'delivering')} disabled={isUpdating === order.id}>
                                                        {isUpdating === order.id ? '...' : 'Ship'}
                                                    </Button>
                                                )}
                                                {order.status === 'delivering' && (
                                                    <Button size="sm" onClick={() => handleUpdateStatus(order, 'completed')} disabled={isUpdating === order.id}>
                                                        <CheckCircle className="mr-2 h-4 w-4"/>
                                                        {isUpdating === order.id ? '...' : 'Mark as Completed'}
                                                    </Button>
                                                )}
                                                {(order.status === 'pending' || order.status === 'confirmed' || order.status === 'delivering') && (
                                                     <Button variant="destructive" size="sm" onClick={() => handleUpdateStatus(order, 'cancelled')} disabled={isUpdating === order.id}>
                                                         <XCircle className="mr-2 h-4 w-4" />
                                                        {isUpdating === order.id ? '...' : 'Cancel'}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                   )}
                </CardContent>
            </Card>
        </div>
    );
}

    