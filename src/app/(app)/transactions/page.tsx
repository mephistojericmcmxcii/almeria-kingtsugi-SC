
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, History, Package, Plus, Minus, Trash2, CheckCircle, XCircle, Truck, Info, FileQuestion, CreditCard, Clock, RefreshCw, Send, Download, Eye } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useFirebase } from '@/firebase';
import type { CartItem, Order, OrderStatus, StatusHistory, QuotationRequest } from '@/lib/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const ConfirmOrderDialog = lazy(() => import('@/components/profile/confirm-order-dialog').then(module => ({ default: module.ConfirmOrderDialog })));
const OrderReviewDialog = lazy(() => import('@/components/profile/order-review-dialog').then(module => ({ default: module.OrderReviewDialog })));


const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
};


function CartList() {
    const { user, cart, isLoading: isAuthLoading, updateCartItemQuantity, removeCartItem } = useAuth();
    const router = useRouter();

    if (isAuthLoading) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Items to Quote</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12 text-muted-foreground">Loading your quotation...</div>
                </CardContent>
             </Card>
        );
    }
    
    if (!cart || cart.length === 0) {
        return null;
    }
    
    return (
        <Card>
            <CardHeader>
              <CardTitle>Items to Quote</CardTitle>
              <CardDescription>These items have not been submitted for a quote yet.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                        {cart.map(item => {
                            const isStockLimitReached = item.quantity >= (item.stock || 0);
                            return (
                            <div key={item.id} className="flex items-center gap-4 border-b pb-4 last:border-b-0">
                                <img 
                                    src={item.imageUrl} 
                                    alt={item.parentName || 'product'} 
                                    className="rounded-md object-cover w-16 h-16"
                                    data-ai-hint={item.imageHint}
                                    />
                                <div className="flex-grow">
                                    <p className="font-semibold">{item.parentName}</p>
                                    <p className="text-sm text-muted-foreground">{item.brand}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateCartItemQuantity(item, item.quantity - 1)} disabled={item.quantity <= 1}><Minus className="h-4 w-4" /></Button>
                                        <span className="w-8 text-center">{item.quantity}</span>
                                        <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateCartItemQuantity(item, item.quantity + 1)} disabled={isStockLimitReached}><Plus className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Button size="icon" variant="ghost" className="h-8 w-8 mt-1 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeCartItem(item.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            )
                        })}
                    </div>
                    <Alert>
                        <AlertTitle className="font-semibold">Price on Request</AlertTitle>
                        <AlertDescription>
                            Prices will be provided in the official quotation sent to your email.
                        </AlertDescription>
                    </Alert>
                </div>
            </CardContent>
             <CardFooter className="flex justify-end p-6 pt-0">
                <Button onClick={() => router.push('/checkout')} disabled={!cart || cart.length === 0}>Request Quotation</Button>
            </CardFooter>
        </Card>
    );
}

const statusDisplayMap: Record<OrderStatus, string> = {
  'pending-quote': 'Request for Quotation',
  'quote-ready': 'Quotation Received',
  'confirmed': 'Proceed to Purchase',
  'delivering': 'Out for Delivery',
  'completed': 'Delivered',
  'cancelled': 'Cancelled',
  'declined': 'Declined by Seller',
  'rescheduled': 'Rescheduled',
};


function OrderList({ orders, title, description, emptyMessage }: { orders: Order[], title: string, description: string, emptyMessage: React.ReactNode }) {
    const { user, updateOrderStatus } = useAuth();
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [orderToConfirm, setOrderToConfirm] = useState<Order | null>(null);
    const [orderToReview, setOrderToReview] = useState<Order | null>(null);
    const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

    const handleUpdateStatus = async (order: Order, status: OrderStatus, details?: { review?: string; rating?: number; }) => {
        setIsUpdating(order.id);
        await updateOrderStatus(order, status, details);
        setIsUpdating(null);
        if (status === 'cancelled' || status === 'completed') {
            setViewingOrder(prev => prev ? {...prev, status: status} : null);
        }
    };

    const getStatusBadge = (status: OrderStatus) => {
        const displayName = statusDisplayMap[status] || status;
        switch (status) {
            case 'pending-quote': return <Badge variant="secondary" className="bg-yellow-500 text-yellow-50">{displayName}</Badge>;
            case 'quote-ready': return <Badge className="bg-blue-500 text-blue-50">{displayName}</Badge>;
            case 'confirmed': return <Badge className="bg-teal-500 text-teal-50">{displayName}</Badge>;
            case 'delivering': return <Badge className="bg-purple-500 text-purple-50">{displayName}</Badge>;
            case 'completed': return <Badge className="bg-green-600 text-green-50">{displayName}</Badge>;
            case 'cancelled': return <Badge variant="destructive">{displayName}</Badge>;
            case 'declined': return <Badge variant="destructive" className="bg-red-700 text-red-50">{displayName}</Badge>;
            case 'rescheduled': return <Badge variant="secondary" className="bg-gray-500 text-gray-50">{displayName}</Badge>;
        }
    };
    

    if (!orders || orders.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent>
                    {emptyMessage}
                </CardContent>
            </Card>
        );
    }
    
    // Modal Content
    const renderOrderDetailsModal = () => {
        if (!viewingOrder) return null;

        const order = viewingOrder;
        const isFileBasedOrder = !!order.quotationFileUrl && order.items.length === 0;
        const showPricing = order.status !== 'pending-quote';

        let subtotal = 0;
        let totalDiscount = order.discount || 0;
        let finalTotal = order.totalAmount;
        let totalDiscountPercentage = 0;

        if (isFileBasedOrder) {
            // For file-based orders, derive the original subtotal from the final amount.
             subtotal = finalTotal + totalDiscount - (order.deliveryFee || 0) - (order.packagingFee || 0);
            if(subtotal > 0) {
                totalDiscountPercentage = (totalDiscount / subtotal) * 100;
            }
        } else {
            subtotal = order.items.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);
            if(subtotal > 0) {
                totalDiscountPercentage = (totalDiscount / subtotal) * 100;
            }
        }
        
        return (
             <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl">Order Details</DialogTitle>
                    <DialogDescription>
                        Order ID: <span className="font-mono">{order.id}</span>
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4 py-4">
                     {order.notes && (
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>Notes from you</AlertTitle>
                            <AlertDescription className="whitespace-pre-wrap">{order.notes}</AlertDescription>
                        </Alert>
                    )}
                    
                    {(order.quotationFileUrl || order.customerRevisionUrl) && (
                        <div className="pt-4 border-t space-y-4">
                            <h4 className="font-semibold">Attached Files</h4>
                            <div className="flex gap-4">
                                {order.quotationFileUrl && (
                                    <a href={order.quotationFileUrl} target="_blank" rel="noopener noreferrer">
                                        <Button variant="outline" size="sm">
                                            <Download className="mr-2 h-4 w-4" /> View Original Quotation
                                        </Button>
                                    </a>
                                )}
                                {order.customerRevisionUrl && (
                                    <a href={order.customerRevisionUrl} target="_blank" rel="noopener noreferrer">
                                        <Button variant="outline" size="sm">
                                            <Download className="mr-2 h-4 w-4" /> View Your Revision
                                        </Button>
                                    </a>
                                )}
                            </div>
                        </div>
                    )}


                    {order.items && order.items.length > 0 && (
                        <div>
                            <h4 className="font-semibold mb-2">Items</h4>
                            <div className="space-y-2">
                            {order.items.map(item => {
                                const itemTotal = (item.price || 0) * item.quantity;
                                const discountValue = itemTotal * ((item.discount || 0) / 100);
                                const finalItemPrice = itemTotal - discountValue;

                                return (
                                <div key={item.id} className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <img src={item.imageUrl} alt={item.parentName || 'item'} className="w-10 h-10 rounded object-cover" data-ai-hint={item.imageHint} />
                                        <div>
                                            <p>{item.parentName} ({item.brand}) x {item.quantity}</p>
                                            {showPricing && (item.discount || 0) > 0 && (
                                                <p className="text-xs text-green-600">Discount: {item.discount}% (-{formatCurrency(discountValue)})</p>
                                            )}
                                        </div>
                                    </div>
                                    {showPricing && <span>{formatCurrency(finalItemPrice)}</span>}
                                </div>
                                )
                            })}
                            </div>
                        </div>
                    )}

                    {showPricing && (
                        <>
                            <div className="space-y-2 pt-4 border-t">
                                <h4 className="font-semibold mb-2">Billing Summary</h4>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>{formatCurrency(subtotal)}</span>
                                </div>
                                {(totalDiscount) > 0 && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>Total Discount</span>
                                        <span>- {formatCurrency(totalDiscount)}{totalDiscountPercentage > 0 ? ` (${totalDiscountPercentage.toFixed(1)}%)` : ''}</span>
                                    </div>
                                )}
                                {(order.deliveryFee || 0) > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Delivery Fee</span>
                                        <span>{formatCurrency(order.deliveryFee!)}</span>
                                    </div>
                                )}
                                {(order.packagingFee || 0) > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Packaging Fee</span>
                                        <span>{formatCurrency(order.packagingFee!)}</span>
                                    </div>
                                )}
                                <Separator />
                                <div className="flex justify-between font-bold">
                                    <span>Total</span>
                                    <span>{formatCurrency(finalTotal)}</span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                                <div>
                                    <h4 className="font-semibold mb-2">Shipping Information</h4>
                                    <p className="text-sm text-muted-foreground">{order.shippingAddress}</p>
                                    <p className="text-sm text-muted-foreground">{order.shippingContactNumber}</p>
                                </div>
                                {order.status !== 'pending-quote' && (
                                    <div>
                                        <h4 className="font-semibold mb-2 flex items-center gap-2"><CreditCard className="w-4 h-4"/>Payment Method</h4>
                                        <p className="text-sm text-muted-foreground">{order.paymentMethod.toUpperCase()}</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                    
                    {order.statusHistory && order.statusHistory.length > 0 && (
                        <div className="pt-4 border-t">
                            <h4 className="font-semibold mb-2 flex items-center gap-2"><Clock className="w-4 h-4"/>Status History</h4>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                                {order.statusHistory.map((h: StatusHistory, index: number) => (
                                    <li key={index} className="flex items-center justify-between">
                                        <span className="font-medium capitalize">{statusDisplayMap[h.status] || h.status.replace('-', ' ')}</span>
                                        <span>{format(h.timestamp.toDate(), 'dd-MMM-yyyy, h:mm a')}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    {(order.status === 'cancelled' || order.status === 'declined') && order.cancellationReason && (
                        <Alert variant="destructive">
                            <Info className="h-4 w-4" />
                            <AlertTitle>Reason for {order.status === 'cancelled' ? 'Cancellation' : 'Decline'}</AlertTitle>
                            <AlertDescription>{order.cancellationReason}</AlertDescription>
                        </Alert>
                    )}
                </div>
                <DialogFooter>
                    {order.status === 'quote-ready' && (
                        <Button size="sm" onClick={() => { setViewingOrder(null); setOrderToConfirm(order); }} disabled={isUpdating === order.id}>
                            <CheckCircle className="mr-2 h-4 w-4"/>
                            Confirm Order & Purchase
                        </Button>
                    )}
                    {order.status === 'pending-quote' && user?.id === order.userId && (
                        <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(order, 'cancelled')} disabled={isUpdating === order.id}>
                            <XCircle className="mr-2 h-4 w-4"/>
                            {isUpdating === order.id ? 'Cancelling...' : 'Cancel Request'}
                        </Button>
                    )}
                    {order.status === 'delivering' && user?.id === order.userId && (
                         <Button size="sm" onClick={() => { setViewingOrder(null); setOrderToReview(order); }} disabled={isUpdating === order.id}>
                            <CheckCircle className="mr-2 h-4 w-4"/>
                            Mark as Received
                        </Button>
                    )}
                     <Button variant="secondary" onClick={() => setViewingOrder(null)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[25%]">Order ID</TableHead>
                                <TableHead className="w-[20%]">Date</TableHead>
                                <TableHead className="w-[20%]">Status</TableHead>
                                <TableHead className="w-[20%] text-right">Total</TableHead>
                                <TableHead className="w-[15%] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.map(order => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-mono text-xs">{order.id}</TableCell>
                                    <TableCell>{format(order.orderDate.toDate(), 'dd-MMM-yyyy')}</TableCell>
                                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                                    <TableCell className="text-right font-medium">
                                        {order.status !== 'pending-quote' ? formatCurrency(order.totalAmount) : 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => setViewingOrder(order)}>
                                            <Eye className="mr-2 h-4 w-4" /> View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
                {renderOrderDetailsModal()}
            </Dialog>

            {orderToConfirm && (
                <Suspense fallback={<div>Loading...</div>}>
                    <ConfirmOrderDialog
                        isOpen={!!orderToConfirm}
                        onOpenChange={() => setOrderToConfirm(null)}
                        order={orderToConfirm}
                    />
                </Suspense>
            )}

            {orderToReview && (
                 <Suspense fallback={<div>Loading...</div>}>
                    <OrderReviewDialog
                        isOpen={!!orderToReview}
                        onOpenChange={() => setOrderToReview(null)}
                        order={orderToReview}
                        onSubmit={async (details) => {
                            await handleUpdateStatus(orderToReview, 'completed', details);
                            setOrderToReview(null);
                        }}
                    />
                </Suspense>
            )}
        </>
    );
}

function RfqList() {
    const { user, firestore } = useAuth();
    const [rfqs, setRfqs] = useState<QuotationRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewingRfq, setViewingRfq] = useState<QuotationRequest | null>(null);

    useEffect(() => {
        if (!user?.id || !firestore) {
            setIsLoading(false);
            return;
        }

        const fetchRfqs = async () => {
            setIsLoading(true);
            try {
                const q = query(collection(firestore, 'users', user.id, 'rfq'));
                const querySnapshot = await getDocs(q);
                const fetchedRfqs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuotationRequest))
                                                    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
                setRfqs(fetchedRfqs);
            } catch (error) {
                console.error("Error fetching RFQs:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRfqs();
    }, [user?.id, firestore]);
    
     const renderRfqDetailsModal = () => {
        if (!viewingRfq) return null;
        const rfq = viewingRfq;
        return (
            <DialogContent className="sm:max-w-2xl">
                 <DialogHeader>
                    <DialogTitle className="font-headline text-2xl">Quotation Request Details</DialogTitle>
                    <DialogDescription>
                        Request ID: <span className="font-mono">{rfq.id}</span>
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4 py-4">
                     <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><span className="font-semibold">Name:</span> {rfq.customerName}</div>
                        <div><span className="font-semibold">Contact:</span> {rfq.contactNumber}</div>
                        <div><span className="font-semibold">Email:</span> {rfq.emailAddress}</div>
                        {rfq.companyName && <div><span className="font-semibold">Company:</span> {rfq.companyName}</div>}
                    </div>
                     {rfq.requestType === 'list' && rfq.items && rfq.items.length > 0 && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item Name</TableHead>
                                    <TableHead className="text-center">Quantity</TableHead>
                                    <TableHead>Specifications</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rfq.items.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell className="text-center">{item.quantity}</TableCell>
                                        <TableCell>{item.specs || 'N/A'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                    {rfq.requestType === 'attachment' && rfq.fileAttachment && (
                        <a href={rfq.fileAttachment} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm">
                                <Download className="mr-2 h-4 w-4" /> View Attachment
                            </Button>
                        </a>
                    )}
                    {rfq.additionalDetails && (
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>Additional Message</AlertTitle>
                            <AlertDescription className="whitespace-pre-wrap">{rfq.additionalDetails}</AlertDescription>
                        </Alert>
                    )}
                </div>
                 <DialogFooter>
                    <Button variant="secondary" onClick={() => setViewingRfq(null)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        );
    }


    if (isLoading) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="text-center py-12 text-muted-foreground">Loading your quotation requests...</div>
                </CardContent>
            </Card>
        );
    }

    if (rfqs.length === 0) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="text-center py-12 text-muted-foreground">
                        <Send className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-4">You have not submitted any custom quotation requests.</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
         <>
         <Card>
            <CardHeader>
                <CardTitle>Custom Quotation Requests</CardTitle>
                <CardDescription>A history of your special quotation requests sent to the seller.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Request ID</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rfqs.map(rfq => (
                            <TableRow key={rfq.id}>
                                <TableCell className="font-mono text-xs">{rfq.id}</TableCell>
                                <TableCell>{format(rfq.createdAt.toDate(), 'dd-MMM-yyyy')}</TableCell>
                                <TableCell>
                                    <Badge variant={rfq.requestType === 'list' ? 'secondary' : 'default'}>
                                        {rfq.requestType === 'list' ? 'Listed Items' : 'File Attachment'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => setViewingRfq(rfq)}>
                                        <Eye className="mr-2 h-4 w-4" /> View
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
            </CardContent>
         </Card>
         <Dialog open={!!viewingRfq} onOpenChange={() => setViewingRfq(null)}>
            {renderRfqDetailsModal()}
         </Dialog>
         </>
    );
}

export default function TransactionsPage() {
  const { user, orders, fetchOrders } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const defaultTab = searchParams.get('tab') || 'rfq';
  
  const { quotationOrders, activeOrders, completedOrders } = useMemo(() => {
    if (!orders) return { quotationOrders: [], activeOrders: [], completedOrders: [] };
    
    const quotationOrders = orders.filter(o => ['pending-quote', 'quote-ready'].includes(o.status));
    const activeOrders = orders.filter(o => ['confirmed', 'delivering', 'rescheduled'].includes(o.status));
    const completedOrders = orders.filter(o => ['completed', 'cancelled', 'declined'].includes(o.status));
    
    return { quotationOrders, activeOrders, completedOrders };
  }, [orders]);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchOrders();
    setIsRefreshing(false);
  };

  if (!user) {
    // Or a loading spinner
    return null;
  }
  
  const noQuotations = !quotationOrders || quotationOrders.length === 0;

  return (
    <div className="space-y-8">
       <h1 className="text-3xl font-bold tracking-tight font-headline">My Transactions</h1>

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="rfq">
            <Send className="mr-2" />
            Request Quotations
          </TabsTrigger>
           <TabsTrigger value="quotation">
            <FileQuestion className="mr-2" />
            My Quotation
          </TabsTrigger>
           <TabsTrigger value="purchases">
            <Truck className="mr-2" />
            My Purchases
          </TabsTrigger>
          <TabsTrigger value="orders">
            <History className="mr-2" />
            Order History
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="quotation">
            <div className="space-y-6">
                <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
                <CartList />
                {noQuotations && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center py-12 text-muted-foreground">
                                <FileQuestion className="mx-auto h-12 w-12 text-muted-foreground" />
                                <p className="mt-4">Your quotation list is empty.</p>
                                <Button variant="link" onClick={() => router.push('/products')}>Add items to get a quote</Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
                {quotationOrders.length > 0 && (
                    <OrderList 
                        orders={quotationOrders}
                        title="Submitted Quotations"
                        description="These are your active quotation requests. You will be notified when the seller responds."
                        emptyMessage={<></>}
                    />
                )}
            </div>
        </TabsContent>

        <TabsContent value="purchases">
            <div className="space-y-6">
                 <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
                <OrderList 
                    orders={activeOrders}
                    title="My Purchases"
                    description="Track your active and ongoing orders here."
                    emptyMessage={
                        <div className="text-center py-12 text-muted-foreground">
                            <Truck className="mx-auto h-12 w-12 text-muted-foreground" />
                            <p className="mt-4">You have no active purchases.</p>
                        </div>
                    }
                />
            </div>
        </TabsContent>
        <TabsContent value="orders">
           <div className="space-y-6">
                <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
               <OrderList 
                    orders={completedOrders}
                    title="Order History"
                    description="A record of your completed or cancelled purchases."
                    emptyMessage={
                        <div className="text-center py-12 text-muted-foreground">
                            <History className="mx-auto h-12 w-12 text-muted-foreground" />
                            <p className="mt-4">You have no past orders.</p>
                        </div>
                    }
               />
           </div>
        </TabsContent>
         <TabsContent value="rfq">
            <div className="space-y-6">
                 <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
                <RfqList />
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
