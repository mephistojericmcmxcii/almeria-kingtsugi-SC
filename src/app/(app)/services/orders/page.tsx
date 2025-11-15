
'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collectionGroup } from 'firebase/firestore';
import type { Order, OrderStatus } from '@/lib/types';
import { format } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ShoppingCart, CheckCircle, XCircle, MoreHorizontal, Search, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AllOrdersPage() {
    const { user, updateOrderStatus } = useAuth();
    const { firestore } = useFirebase();
    
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const allOrdersQuery = useMemoFirebase(() => {
        if (!firestore || user?.role !== 'admin') return null;
        return collectionGroup(firestore, 'orders');
    }, [firestore, user?.role]);

    const { data: orders, isLoading } = useCollection<Order>(allOrdersQuery);

    const handleUpdateStatus = async (order: Order, status: OrderStatus) => {
        setIsUpdating(order.id);
        const success = await updateOrderStatus(order, status);
        if (success) {
            // Optimistically update the selected order in the modal
            setSelectedOrder(prev => prev ? { ...prev, status } : null);
        }
        setIsUpdating(null);
    };
    
    const handleViewDetails = (order: Order) => {
        setSelectedOrder(order);
        setIsModalOpen(true);
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
    
    const filteredOrders = useMemo(() => {
        if (!orders) return [];
        const sorted = [...orders].sort((a, b) => b.orderDate.toMillis() - a.orderDate.toMillis());
        if (!searchTerm) return sorted;
        
        return sorted.filter(order =>
            order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.userDisplayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [orders, searchTerm]);


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
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <ShoppingCart className="w-8 h-8 text-primary" />
                    <h1 className="text-3xl font-bold tracking-tight font-headline">Order Management</h1>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className='w-full md:w-1/3'>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input 
                                    placeholder="Search by ID, name, or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10"
                                />
                            </div>
                        </div>
                         <CardDescription>{filteredOrders.length} order(s) found.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : filteredOrders.length > 0 ? (
                            filteredOrders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell className="font-mono text-sm">{order.id.substring(0, 8)}...</TableCell>
                                <TableCell>
                                    <div className="font-medium">{order.userDisplayName}</div>
                                    <div className="text-xs text-muted-foreground">{order.userEmail}</div>
                                </TableCell>
                                <TableCell>{format(order.orderDate.toDate(), 'MMM d, yyyy')}</TableCell>
                                <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                                <TableCell>{getStatusBadge(order.status)}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(order)}>
                                        <Eye className="mr-2 h-4 w-4" /> View
                                    </Button>
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    {searchTerm ? 'No orders match your search.' : 'No orders found.'}
                                </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>

        {selectedOrder && (
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-headline text-2xl">Order Details</DialogTitle>
                        <DialogDescription>
                            Order ID: <span className="font-mono">{selectedOrder.id}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <h3 className="font-semibold mb-2">Customer</h3>
                                <p>{selectedOrder.userDisplayName}</p>
                                <p className="text-sm text-muted-foreground">{selectedOrder.userEmail}</p>
                            </div>
                             <div>
                                <h3 className="font-semibold mb-2">Order Info</h3>
                                <p>{format(selectedOrder.orderDate.toDate(), 'MMMM d, yyyy, h:mm a')}</p>
                                <p className="text-sm text-muted-foreground">Payment: {selectedOrder.paymentMethod}</p>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2">Shipping Address</h3>
                            <p className="text-sm text-muted-foreground">{selectedOrder.shippingAddress}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2">Items ({selectedOrder.items.length})</h3>
                            <div className="space-y-2 rounded-md border p-2 max-h-48 overflow-y-auto">
                            {selectedOrder.items.map((item, index) => (
                                <div key={index} className="flex justify-between items-center text-sm">
                                    <div>
                                        <p className="font-medium">{item.parentName} ({item.brand})</p>
                                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                                    </div>
                                    <span>{formatCurrency((item.price || 0) * item.quantity)}</span>
                                </div>
                            ))}
                            </div>
                        </div>

                         <div className="flex justify-between items-center pt-4 border-t font-bold text-lg">
                            <span>Total Amount</span>
                            <span>{formatCurrency(selectedOrder.totalAmount)}</span>
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-between items-center">
                         <div className="font-semibold">
                            Status: {getStatusBadge(selectedOrder.status)}
                        </div>
                        <div className="flex gap-2">
                             {selectedOrder.status === 'pending' && (
                                 <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(selectedOrder, 'confirmed')} disabled={isUpdating === selectedOrder.id}>
                                    {isUpdating === selectedOrder.id ? 'Confirming...' : 'Confirm'}
                                </Button>
                            )}
                            {selectedOrder.status === 'confirmed' && (
                                 <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(selectedOrder, 'delivering')} disabled={isUpdating === selectedOrder.id}>
                                    {isUpdating === selectedOrder.id ? 'Shipping...' : 'Ship'}
                                </Button>
                            )}
                            {selectedOrder.status === 'delivering' && (
                                <Button size="sm" onClick={() => handleUpdateStatus(selectedOrder, 'completed')} disabled={isUpdating === selectedOrder.id}>
                                    <CheckCircle className="mr-2 h-4 w-4"/>
                                    {isUpdating === selectedOrder.id ? 'Completing...' : 'Mark as Completed'}
                                </Button>
                            )}
                            {(selectedOrder.status === 'pending' || selectedOrder.status === 'confirmed' || selectedOrder.status === 'delivering') && (
                                 <Button variant="destructive" size="sm" onClick={() => handleUpdateStatus(selectedOrder, 'cancelled')} disabled={isUpdating === selectedOrder.id}>
                                     <XCircle className="mr-2 h-4 w-4" />
                                    {isUpdating === selectedOrder.id ? 'Cancelling...' : 'Cancel'}
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}
        </>
    );
}
