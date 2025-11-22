

'use client';

import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, History, User, Package, Plus, Minus, Trash2, CheckCircle, XCircle, Truck, Info, FileQuestion, CreditCard, Clock, RefreshCw, Send, Link as LinkIcon, Download, Eye } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useFirebase } from '@/firebase';
import type { CartItem, Order, OrderStatus, StatusHistory, QuotationRequest } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const ConfirmOrderDialog = lazy(() => import('@/components/profile/confirm-order-dialog').then(module => ({ default: module.ConfirmOrderDialog })));

const profileFormSchema = z.object({
  displayName: z.string().min(2, { message: 'Display name must be at least 2 characters.' }),
  address: z.string().optional(),
  contactNumber: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;


const getInitials = (name?: string) => {
  if (!name) return '';
  const names = name.split(' ');
  if (names.length > 1) {
    return `${names[0][0]}${names[1][0]}`;
  }
  return name.substring(0, 2);
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
};


function CartList() {
    const { user, cart: cartItems, isLoading: isAuthLoading, updateCartItemQuantity, removeCartItem } = useAuth();
    const router = useRouter();

    if (isAuthLoading) {
        return <div className="text-center py-12 text-muted-foreground">Loading your quotation...</div>;
    }
    
    if (!cartItems || cartItems.length === 0) {
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
                        {cartItems.map(item => {
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
                <Button onClick={() => router.push('/checkout')} disabled={!cartItems || cartItems.length === 0}>Request Quotation</Button>
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
};


function OrderList({ orders, title, description, emptyMessage }: { orders: Order[], title: string, description: string, emptyMessage: React.ReactNode }) {
    const { user, updateOrderStatus } = useAuth();
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [orderToConfirm, setOrderToConfirm] = useState<Order | null>(null);
    const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

    const handleUpdateStatus = async (order: Order, status: OrderStatus) => {
        setIsUpdating(order.id);
        await updateOrderStatus(order, status);
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
        const isFileBasedOrder = !!order.quotationFileUrl;
        const showPricing = order.status !== 'pending-quote' && !isFileBasedOrder;
        const subtotal = order.items.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);
        const totalDiscount = order.discount || 0;
        const finalTotal = order.totalAmount;
        const totalDiscountPercentage = subtotal > 0 ? (totalDiscount / subtotal) * 100 : 0;

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
                                        <span>Total Item Discounts</span>
                                        <span>- {formatCurrency(totalDiscount)} ({totalDiscountPercentage.toFixed(1)}%)</span>
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
                                        <span>{format(h.timestamp.toDate(), 'MMM d, yyyy, h:mm a')}</span>
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
                        <Button size="sm" onClick={() => handleUpdateStatus(order, 'completed')} disabled={isUpdating === order.id}>
                            <CheckCircle className="mr-2 h-4 w-4"/>
                            {isUpdating === order.id ? 'Updating...' : 'Mark as Received'}
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
                                    <TableCell>{format(order.orderDate.toDate(), 'MMM d, yyyy')}</TableCell>
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
        </>
    );
}

function RfqList() {
    const { user, firestore } = useAuth();
    const [rfqs, setRfqs] = useState<QuotationRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewingRfq, setViewingRfq] = useState<QuotationRequest | null>(null);

    useEffect(() => {
        const fetchRfqs = async () => {
            if (!user || !firestore) {
                setIsLoading(false);
                return;
            };
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
    }, [user, firestore]);
    
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
        return <div className="text-center py-12 text-muted-foreground">Loading your quotation requests...</div>;
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
                                <TableCell>{format(rfq.createdAt.toDate(), 'MMM d, yyyy')}</TableCell>
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

export default function ProfilePage() {
  const { user, cart, orders, updateUserProfile, isLoading: isAuthLoading, showCartBadge, showQuoteReadyBadge, showNewPurchaseBadge, showNewHistoryBadge, dismissUserNotifications, fetchOrders } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const cartItemCount = cart?.length || 0;

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: '',
      address: '',
      contactNumber: '',
    },
  });
  
  useEffect(() => {
    if (user) {
      form.reset({
        displayName: user.displayName,
        address: user.address || '',
        contactNumber: user.contactNumber || '',
      });
    }
  }, [user, form]);

  const { quotationOrders, activeOrders, completedOrders } = useMemo(() => {
    if (!orders) return { quotationOrders: [], activeOrders: [], completedOrders: [] };
    
    const quotationOrders = orders.filter(o => ['pending-quote', 'quote-ready'].includes(o.status));
    const activeOrders = orders.filter(o => ['confirmed', 'delivering'].includes(o.status));
    const completedOrders = orders.filter(o => ['completed', 'cancelled', 'declined'].includes(o.status));
    
    return { quotationOrders, activeOrders, completedOrders };
  }, [orders]);
  
  const handleTabChange = (value: string) => {
    if (['quotation', 'purchases', 'orders', 'rfq'].includes(value)) {
        dismissUserNotifications();
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchOrders();
    setIsRefreshing(false);
  };

  const onSubmit = async (values: ProfileFormValues) => {
    setIsSubmitting(true);
    await updateUserProfile(values);
    setIsSubmitting(false);
  };


  if (!user) {
    return null;
  }
  
  const noQuotations = (!cart || cart.length === 0) && quotationOrders.length === 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-4">
        <Avatar className="h-24 w-24">
          <AvatarImage src={user.profileImageUrl} alt={user.displayName} />
          <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">{user.displayName}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4" onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="profile">
            <User className="mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="rfq">
            <Send className="mr-2" />
            Request Quotations
          </TabsTrigger>
           <TabsTrigger value="quotation" className="relative">
            <FileQuestion className="mr-2" />
            My Quotation
            {showCartBadge && cartItemCount > 0 ? (
              <span className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                {cartItemCount}
              </span>
            ) : showQuoteReadyBadge && (
               <span className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-destructive"></span>
            )}
          </TabsTrigger>
           <TabsTrigger value="purchases" className="relative">
            <Truck className="mr-2" />
            My Purchases
             {showNewPurchaseBadge && (
                <span className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-destructive"></span>
             )}
          </TabsTrigger>
          <TabsTrigger value="orders" className="relative">
            <History className="mr-2" />
            Order History
             {showNewHistoryBadge && (
                <span className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-destructive"></span>
             )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal details here.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" defaultValue={user.email} disabled />
                  </div>
                  <FormField
                    control={form.control}
                    name="contactNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Number</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="e.g., 09171234567" {...field} />
                        </FormControl>
                         <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea placeholder="123 Main St, Anytown, PH" {...field} />
                        </FormControl>
                         <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isSubmitting || isAuthLoading}>
                    {isSubmitting ? 'Updating...' : 'Update Profile'}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </TabsContent>

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
                    <div className="text-center py-12 text-muted-foreground border rounded-lg">
                        <FileQuestion className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-4">Your quotation list is empty.</p>
                        <Button variant="link" onClick={() => router.push('/products')}>Add items to get a quote</Button>
                    </div>
                )}
                {quotationOrders.length > 0 && (
                    <OrderList 
                        orders={quotationOrders}
                        title="Submitted Quotations"
                        description="These are your active quotation requests. You will be notified when the seller responds."
                        emptyMessage={<></>} // This won't be shown if orders exist
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


