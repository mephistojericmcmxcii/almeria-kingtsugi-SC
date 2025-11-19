
'use client';

import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirebase } from '@/firebase';
import { collectionGroup, getDocs } from 'firebase/firestore';
import type { Order, OrderStatus, CartItem, QuotationRequest } from '@/lib/types';
import { format } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ShoppingCart, Search, Eye, ShieldAlert, Phone, Package, Plus, Percent, MessageSquare, Info, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

const ViewRfqDetailsDialog = lazy(() => import('@/components/orders/view-rfq-details-dialog').then(module => ({ default: module.ViewRfqDetailsDialog })));


type UnifiedTransaction = (Order | QuotationRequest) & { transactionType: 'order' | 'rfq' };

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
    delivering: ['completed'],
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


const REQUIRES_REASON: OrderStatus[] = ['declined', 'cancelled'];

export default function AllOrdersPage() {
    const { user, updateOrderStatus, dismissAdminOrderBadge, dismissAdminRfqBadge } = useAuth();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    
    const [isUpdating, setIsUpdating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [selectedRfq, setSelectedRfq] = useState<QuotationRequest | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isRfqModalOpen, setIsRfqModalOpen] = useState(false);
    const [cancellationReason, setCancellationReason] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null);
    
    // State for detailed billing
    const [deliveryFee, setDeliveryFee] = useState<number>(0);
    const [packagingFee, setPackagingFee] = useState<number>(0);
    const [itemPrices, setItemPrices] = useState<Record<string, number>>({});
    const [itemDiscounts, setItemDiscounts] = useState<Record<string, number>>({});

    const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTransactions = async () => {
            if (!firestore || user?.role !== 'admin') {
                setIsLoading(false);
                return;
            }
            
            try {
                // Fetch Orders
                const allOrdersQuery = collectionGroup(firestore, 'orders');
                const ordersSnapshot = await getDocs(allOrdersQuery);
                const fetchedOrders = ordersSnapshot.docs.map(doc => ({ ...doc.data() as Order, transactionType: 'order' } as UnifiedTransaction));

                // Fetch RFQs
                const allRfqsQuery = collection(firestore, 'rfq-records');
                const rfqsSnapshot = await getDocs(allRfqsQuery);
                const fetchedRfqs = rfqsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as QuotationRequest, transactionType: 'rfq' } as UnifiedTransaction));
                
                // Combine and sort
                const combined = [...fetchedOrders, ...fetchedRfqs];
                combined.sort((a, b) => {
                    const dateA = a.transactionType === 'order' ? (a as Order).orderDate.toMillis() : (a as QuotationRequest).createdAt.toMillis();
                    const dateB = b.transactionType === 'order' ? (b as Order).orderDate.toMillis() : (b as QuotationRequest).createdAt.toMillis();
                    return dateB - dateA;
                });
                
                setTransactions(combined);

            } catch (error) {
                console.error("Error fetching transactions:", error);
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Could not load transaction records.'
                });
            } finally {
                setIsLoading(false);
            }
        }

        if (user) { 
            fetchTransactions();
            dismissAdminOrderBadge();
            dismissAdminRfqBadge();
        } else if (user === null) {
             setIsLoading(false);
        }
    }, [firestore, user, toast, dismissAdminOrderBadge, dismissAdminRfqBadge]);
    
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

    const handleItemPriceChange = (itemId: string, price: number) => {
        setItemPrices(prev => ({ ...prev, [itemId]: price }));
    };

    const handleItemDiscountChange = (itemId: string, discount: number) => {
        setItemDiscounts(prev => ({ ...prev, [itemId]: discount }));
    };

    const handleUpdateStatus = async () => {
        if (!selectedOrder || !selectedStatus) return;

        if (REQUIRES_REASON.includes(selectedStatus) && !cancellationReason.trim()) {
            alert('A reason is required to decline or cancel an order.');
            return;
        }

        setIsUpdating(true);

        const updatedItems: CartItem[] = selectedOrder.items.map(item => ({
            ...item,
            price: itemPrices[item.id] || item.price || 0,
            discount: itemDiscounts[item.id] || 0,
        }));
        
        const subtotal = updatedItems.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);
        const totalDiscountAmount = updatedItems.reduce((acc, item) => {
            const itemTotal = (item.price || 0) * item.quantity;
            const discountValue = itemTotal * ((item.discount || 0) / 100);
            return acc + discountValue;
        }, 0);
        const finalTotal = subtotal - totalDiscountAmount + deliveryFee + packagingFee;

        const success = await updateOrderStatus(
            selectedOrder, 
            selectedStatus, 
            {
              reason: cancellationReason || undefined,
              items: updatedItems,
              totalAmount: finalTotal,
              discount: totalDiscountAmount,
              deliveryFee,
              packagingFee
            }
        );
        
        if (success) {
            setTransactions(prev => prev.map(t => {
                if (t.transactionType === 'order' && t.id === selectedOrder.id) {
                    return { ...t, 
                        status: selectedStatus, 
                        cancellationReason: cancellationReason || t.cancellationReason,
                        items: updatedItems,
                        totalAmount: finalTotal,
                        discount: totalDiscountAmount,
                        deliveryFee,
                        packagingFee,
                    };
                }
                return t;
            }));
            setIsModalOpen(false);
        }
        setIsUpdating(false);
    };
    
    const handleViewDetails = (transaction: UnifiedTransaction) => {
        if (transaction.transactionType === 'order') {
            setSelectedOrder(transaction as Order);
            setIsModalOpen(true);
        } else {
            setSelectedRfq(transaction as QuotationRequest);
            setIsRfqModalOpen(true);
        }
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
    
    const filteredTransactions = useMemo(() => {
        if (!transactions) return [];
        if (!searchTerm) return transactions;
        
        return transactions.filter(t => {
            const lowerSearchTerm = searchTerm.toLowerCase();
            if (t.transactionType === 'order') {
                return t.id.toLowerCase().includes(lowerSearchTerm) ||
                       t.userDisplayName.toLowerCase().includes(lowerSearchTerm) ||
                       t.userEmail.toLowerCase().includes(lowerSearchTerm);
            } else { // RFQ
                return t.id.toLowerCase().includes(lowerSearchTerm) ||
                       t.customerName.toLowerCase().includes(lowerSearchTerm) ||
                       t.emailAddress.toLowerCase().includes(lowerSearchTerm);
            }
        });
    }, [transactions, searchTerm]);


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
    
    const { subtotal, totalDiscount, finalTotal, totalDiscountPercentage } = useMemo(() => {
        if (!selectedOrder) return { subtotal: 0, totalDiscount: 0, finalTotal: 0, totalDiscountPercentage: 0 };
        
        const currentSubtotal = selectedOrder.items.reduce((acc, item) => {
            const price = itemPrices[item.id] || item.price || 0;
            return acc + (price * item.quantity);
        }, 0);
        
        const currentTotalDiscount = selectedOrder.items.reduce((acc, item) => {
            const price = itemPrices[item.id] || item.price || 0;
            const discountPercent = itemDiscounts[item.id] || 0;
            const itemTotal = price * item.quantity;
            const discountValue = itemTotal * (discountPercent / 100);
            return acc + discountValue;
        }, 0);
        
        const currentFinalTotal = currentSubtotal - currentTotalDiscount + deliveryFee + packagingFee;
        const discountPercentage = currentSubtotal > 0 ? (currentTotalDiscount / currentSubtotal) * 100 : 0;
        
        return { subtotal: currentSubtotal, totalDiscount: currentTotalDiscount, finalTotal: currentFinalTotal, totalDiscountPercentage: discountPercentage };
    }, [selectedOrder, itemPrices, itemDiscounts, deliveryFee, packagingFee]);

    const isPricingEditable = selectedOrder?.status === 'pending-quote';
    
    const handleNumberInputOnWheel = (e: React.WheelEvent<HTMLInputElement>) => {
      e.currentTarget.blur();
    };

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
                         <CardDescription>{isLoading ? "Loading records..." : `${filteredTransactions.length} record(s) found.`}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Reference ID</TableHead>
                                <TableHead>Type</TableHead>
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
                                    <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : filteredTransactions.length > 0 ? (
                            filteredTransactions.map((t) => (
                            <TableRow key={t.id}>
                                <TableCell className="font-mono text-sm">{t.id.substring(0, 8)}...</TableCell>
                                <TableCell>
                                    {t.transactionType === 'order' ? <Badge variant="secondary"><ShoppingCart className="mr-2 h-3 w-3"/>Standard Order</Badge> : <Badge><FileText className="mr-2 h-3 w-3"/>Quotation Request</Badge>}
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium">{t.transactionType === 'order' ? (t as Order).userDisplayName : (t as QuotationRequest).customerName}</div>
                                    <div className="text-xs text-muted-foreground">{t.transactionType === 'order' ? (t as Order).userEmail : (t as QuotationRequest).emailAddress}</div>
                                </TableCell>
                                <TableCell>{format(t.transactionType === 'order' ? (t as Order).orderDate.toDate() : (t as QuotationRequest).createdAt.toDate(), 'MMM d, yyyy')}</TableCell>
                                <TableCell>{t.transactionType === 'order' ? formatCurrency((t as Order).totalAmount) : <span className="text-muted-foreground">N/A</span>}</TableCell>
                                <TableCell>{t.transactionType === 'order' ? getStatusBadge((t as Order).status) : <Badge variant="outline">Submitted</Badge>}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(t)}>
                                        <Eye className="mr-2 h-4 w-4" /> View
                                    </Button>
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    {searchTerm ? 'No records match your search.' : 'No records found.'}
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
                        {selectedOrder.notes && (
                            <div>
                                <h3 className="font-semibold mb-2 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Customer Notes</h3>
                                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md whitespace-pre-wrap">{selectedOrder.notes}</p>
                            </div>
                        )}
                        <div>
                            <h3 className="font-semibold mb-2">Items ({selectedOrder.items.length})</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-2/5">Item</TableHead>
                                        <TableHead className="text-right">Price</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Discount (%)</TableHead>
                                        <TableHead className="text-right">Total Price</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedOrder.items.map((item) => {
                                        const price = itemPrices[item.id] || 0;
                                        const discountPercent = itemDiscounts[item.id] || 0;
                                        const itemTotal = price * item.quantity;
                                        const discountValue = itemTotal * (discountPercent / 100);
                                        const totalPrice = itemTotal - discountValue;

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
                                                    onChange={(e) => handleItemPriceChange(item.id, Number(e.target.value))}
                                                    onWheel={handleNumberInputOnWheel}
                                                    onFocus={(e) => e.target.select()}
                                                    disabled={isUpdating || !isPricingEditable}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-right">
                                                <Input 
                                                    type="number" 
                                                    className="h-8 w-20 ml-auto text-right"
                                                    value={discountPercent}
                                                    onChange={(e) => handleItemDiscountChange(item.id, Number(e.target.value))}
                                                    onWheel={handleNumberInputOnWheel}
                                                    onFocus={(e) => e.target.select()}
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
                                        <Input id="deliveryFee" type="number" className="h-8 w-24 text-right" value={deliveryFee} onChange={(e) => setDeliveryFee(Number(e.target.value))} onWheel={handleNumberInputOnWheel} onFocus={(e) => e.target.select()} disabled={isUpdating || !isPricingEditable} />
                                    </div>
                                     <div className="flex justify-between items-center">
                                        <Label htmlFor="packagingFee">Packaging Fee</Label>
                                        <Input id="packagingFee" type="number" className="h-8 w-24 text-right" value={packagingFee} onChange={(e) => setPackagingFee(Number(e.target.value))} onWheel={handleNumberInputOnWheel} onFocus={(e) => e.target.select()} disabled={isUpdating || !isPricingEditable} />
                                    </div>
                                     <div className="flex justify-between items-center font-medium">
                                        <p>Subtotal</p>
                                        <p>{formatCurrency(subtotal)}</p>
                                    </div>
                                    {totalDiscount > 0 && (
                                        <div className="flex justify-between items-center text-green-600">
                                            <span>Total Item Discounts</span>
                                            <span>- {formatCurrency(totalDiscount)} ({totalDiscountPercentage.toFixed(1)}%)</span>
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
        
        {selectedRfq && (
            <Suspense fallback={<div>Loading...</div>}>
                <ViewRfqDetailsDialog
                    isOpen={isRfqModalOpen}
                    onOpenChange={setIsRfqModalOpen}
                    rfq={selectedRfq}
                />
            </Suspense>
        )}
        </>
    );
}

    