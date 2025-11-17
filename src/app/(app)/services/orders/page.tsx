
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collectionGroup } from 'firebase/firestore';
import type { Order, OrderStatus, CartItem } from '@/lib/types';
import { format } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ShoppingCart, CheckCircle, XCircle, Search, Eye, ShieldAlert, Phone, Package, Plus, Percent } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';


const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
        case 'pending-quote': return <Badge variant="secondary" className="bg-yellow-500 text-yellow-50">Pending Quote</Badge>;
        case 'quote-ready': return <Badge className="bg-blue-500 text-blue-50">Quote Ready</Badge>;
        case 'confirmed': return <Badge className="bg-teal-500 text-teal-50">Confirmed</Badge>;
        case 'delivering': return <Badge className="bg-purple-500 text-purple-50">Delivering</Badge>;
        case 'completed': return <Badge className="bg-green-600 text-green-50">Completed</Badge>;
        case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
        case 'declined': return <Badge variant="destructive" className="bg-red-700 text-red-50">Declined</Badge>;
    }
};

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    'pending-quote': ['quote-ready', 'declined'],
    'quote-ready': ['confirmed', 'declined'],
    confirmed: ['delivering', 'declined'],
    delivering: [],
    completed: [],
    cancelled: [],
    declined: [],
};

const STATUS_DISPLAY_NAMES: Record<OrderStatus, string> = {
    'pending-quote': 'Pending Quote',
    'quote-ready': 'Approve Quotation',
    confirmed: 'Confirm Order',
    delivering: 'Mark as Delivering',
    completed: 'Mark as Completed',
    cancelled: 'Cancel Order',
    declined: 'Decline Order',
};


const REQUIRES_REASON: OrderStatus[] = ['declined'];

export default function AllOrdersPage() {
    const { user, updateOrderStatus, dismissAdminOrderBadge } = useAuth();
    const { firestore } = useFirebase();
    
    const [isUpdating, setIsUpdating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [cancellationReason, setCancellationReason] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null);
    
    // State for detailed billing
    const [deliveryFee, setDeliveryFee] = useState<number>(0);
    const [packagingFee, setPackagingFee] = useState<number>(0);
    const [itemPrices, setItemPrices] = useState<Record<string, number>>({});
    const [itemDiscounts, setItemDiscounts] = useState<Record<string, number>>({});


    useEffect(() => {
        dismissAdminOrderBadge();
    }, [dismissAdminOrderBadge]);
    
    useEffect(() => {
        if (selectedOrder) {
            setSelectedStatus(null);
            setCancellationReason('');
            setDeliveryFee(selectedOrder.deliveryFee || 0);
            setPackagingFee(selectedOrder.packagingFee || 0);

            const initialPrices = selectedOrder.items.reduce((acc, item) => {
                acc[item.id] = item.price || 0;
                return acc;
            }, {} as Record<string, number>);
            setItemPrices(initialPrices);
            
            const initialDiscounts = selectedOrder.items.reduce((acc, item) => {
                acc[item.id] = item.discount || 0;
                return acc;
            }, {} as Record<string, number>);
            setItemDiscounts(initialDiscounts);
        }
    }, [selectedOrder]);

    const allOrdersQuery = useMemoFirebase(() => {
        if (!firestore || user?.role !== 'admin') return null;
        return collectionGroup(firestore, 'orders');
    }, [firestore, user?.role]);

    const { data: orders, isLoading } = useCollection<Order>(allOrdersQuery);
    
    const handleItemDiscountChange = (itemId: string, discount: number) => {
        setItemDiscounts(prev => ({ ...prev, [itemId]: discount }));
    };

    const handleUpdateStatus = async () => {
        if (!selectedOrder || !selectedStatus) return;

        if (REQUIRES_REASON.includes(selectedStatus) && !cancellationReason.trim()) {
            alert('A reason is required to decline an order.');
            return;
        }

        setIsUpdating(true);

        const updatedItems: CartItem[] = selectedOrder.items.map(item => ({
            ...item,
            price: itemPrices[item.id] || item.price || 0,
            discount: itemDiscounts[item.id] || 0,
        }));
        
        const subtotal = updatedItems.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);
        const totalDiscount = updatedItems.reduce((acc, item) => acc + (item.discount || 0), 0);
        const finalTotal = subtotal - totalDiscount + deliveryFee + packagingFee;

        const success = await updateOrderStatus(
            selectedOrder, 
            selectedStatus, 
            cancellationReason || undefined,
            updatedItems,
            finalTotal,
            totalDiscount,
            deliveryFee,
            packagingFee
        );
        
        if (success) {
             setSelectedOrder(prev => prev ? { 
                ...prev, 
                status: selectedStatus, 
                cancellationReason: cancellationReason || prev.cancellationReason,
                items: updatedItems,
                totalAmount: finalTotal,
                discount: totalDiscount,
                deliveryFee,
                packagingFee,
            } : null);
            setIsModalOpen(false);
        }
        setIsUpdating(false);
    };
    
    const handleViewDetails = (order: Order) => {
        setSelectedOrder(order);
        setIsModalOpen(true);
    };
    
    const isStatusUpdateDisabled = (order: Order | null): boolean => {
        if (!order) return true;
        return ['completed', 'cancelled', 'declined'].includes(order.status) || isUpdating;
    };
    
    const availableActions = selectedOrder ? STATUS_TRANSITIONS[selectedOrder.status] : [];
    const showReasonInput = selectedStatus && REQUIRES_REASON.includes(selectedStatus);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
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
                 <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
                <h1 className="text-3xl font-bold font-headline text-destructive">Access Denied</h1>
                <p className="text-muted-foreground mt-2">
                    You do not have permission to view this page.
                </p>
            </div>
        );
    }
    
    const { subtotal, totalDiscount, finalTotal } = useMemo(() => {
        if (!selectedOrder) return { subtotal: 0, totalDiscount: 0, finalTotal: 0 };
        
        const currentSubtotal = selectedOrder.items.reduce((acc, item) => {
            const price = itemPrices[item.id] || item.price || 0;
            return acc + (price * item.quantity);
        }, 0);
        
        const currentTotalDiscount = Object.values(itemDiscounts).reduce((acc, discount) => acc + (discount || 0), 0);

        const currentFinalTotal = currentSubtotal - currentTotalDiscount + deliveryFee + packagingFee;
        
        return { subtotal: currentSubtotal, totalDiscount: currentTotalDiscount, finalTotal: currentFinalTotal };
    }, [selectedOrder, itemPrices, itemDiscounts, deliveryFee, packagingFee]);

    const isPricingEditable = selectedOrder?.status === 'pending-quote';


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
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle className="font-headline text-2xl">Order Details</DialogTitle>
                        <DialogDescription>
                            Order ID: <span className="font-mono">{selectedOrder.id}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <h3 className="font-semibold mb-2">Customer</h3>
                                <p>{selectedOrder.userDisplayName}</p>
                                <p className="text-sm text-muted-foreground">{selectedOrder.userEmail}</p>
                                {selectedOrder.shippingContactNumber && (
                                    <p className="text-sm text-muted-foreground flex items-center gap-2 pt-1">
                                        <Phone className="w-3 h-3"/>
                                        {selectedOrder.shippingContactNumber}
                                    </p>
                                )}
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
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-2/5">Item</TableHead>
                                        <TableHead className="text-right">Price</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Discount (₱)</TableHead>
                                        <TableHead className="text-right">Total Price</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedOrder.items.map((item) => {
                                        const price = itemPrices[item.id] || 0;
                                        const discount = itemDiscounts[item.id] || 0;
                                        const totalPrice = (price * item.quantity) - discount;

                                        return (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <p className="font-medium">{item.parentName}</p>
                                                <p className="text-xs text-muted-foreground">{item.brand}</p>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                 <Input 
                                                    type="number" 
                                                    className="h-8 w-24 ml-auto text-right"
                                                    value={price}
                                                    disabled // Price is non-editable
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-right">
                                                <Input 
                                                    type="number" 
                                                    className="h-8 w-24 ml-auto text-right"
                                                    value={discount}
                                                    onChange={(e) => handleItemDiscountChange(item.id, Number(e.target.value))}
                                                    disabled={isUpdating || !isPricingEditable}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(totalPrice)}</TableCell>
                                        </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                        
                         <div className="space-y-4 pt-4 border-t">
                            <div className="flex justify-end text-sm">
                                <div className="w-1/2 space-y-2">
                                     <div className="flex justify-between items-center">
                                        <Label htmlFor="deliveryFee">Delivery Fee</Label>
                                        <Input id="deliveryFee" type="number" className="h-8 w-24 text-right" value={deliveryFee} onChange={(e) => setDeliveryFee(Number(e.target.value))} disabled={isUpdating || !isPricingEditable} />
                                    </div>
                                     <div className="flex justify-between items-center">
                                        <Label htmlFor="packagingFee">Packaging Fee</Label>
                                        <Input id="packagingFee" type="number" className="h-8 w-24 text-right" value={packagingFee} onChange={(e) => setPackagingFee(Number(e.target.value))} disabled={isUpdating || !isPricingEditable} />
                                    </div>
                                     <div className="flex justify-between items-center font-medium">
                                        <p>Subtotal</p>
                                        <p>{formatCurrency(subtotal)}</p>
                                    </div>
                                    {totalDiscount > 0 && (
                                        <div className="flex justify-between items-center text-green-600">
                                            <p>Total Discount</p>
                                            <p>- {formatCurrency(totalDiscount)}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total Amount</span>
                                <span>{formatCurrency(finalTotal)}</span>
                            </div>
                        </div>


                        {showReasonInput && (
                            <div className="pt-4 border-t">
                                <h3 className="font-semibold mb-2">Reason for Decline/Cancellation</h3>
                                <Textarea 
                                    value={cancellationReason}
                                    onChange={(e) => setCancellationReason(e.target.value)}
                                    placeholder={`Provide a reason for declining or cancelling the order...`}
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter className="sm:justify-between items-center">
                         <div className="font-semibold flex items-center gap-2">
                            Status: {getStatusBadge(selectedOrder.status)}
                        </div>
                        {!isStatusUpdateDisabled(selectedOrder) && (
                            <div className="flex items-center gap-2">
                                <Select 
                                    onValueChange={(newStatus) => setSelectedStatus(newStatus as OrderStatus)}
                                    disabled={isUpdating}
                                    value={selectedStatus || ''}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Update status..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableActions.map(status => (
                                            <SelectItem key={status} value={status}>
                                                {STATUS_DISPLAY_NAMES[status] || status}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button onClick={handleUpdateStatus} disabled={!selectedStatus || isUpdating || (REQUIRES_REASON.includes(selectedStatus!) && !cancellationReason.trim())}>
                                    {isUpdating ? "Saving..." : "Save"}
                                </Button>
                            </div>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}
        </>
    );
}

    