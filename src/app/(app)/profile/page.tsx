
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, History, User, Package, Plus, Minus, Trash2, CheckCircle, XCircle, Truck, Info, FileQuestion } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useEffect, useState, useMemo } from 'react';
import { useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { collection, collectionGroup } from 'firebase/firestore';
import type { CartItem, Order, OrderStatus } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

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

function OrderList({ orders, title, description, emptyMessage }: { orders: Order[], title: string, description: string, emptyMessage: React.ReactNode }) {
    const { user, updateOrderStatus } = useAuth();
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    const handleUpdateStatus = async (order: Order, status: OrderStatus) => {
        setIsUpdating(order.id);
        await updateOrderStatus(order, status);
        setIsUpdating(null);
    };

    const getStatusBadge = (status: OrderStatus) => {
        switch (status) {
            case 'pending-quote': return <Badge variant="secondary" className="bg-yellow-500 text-yellow-50">Pending Quote</Badge>;
            case 'quote-ready': return <Badge className="bg-blue-500 text-blue-50">Quote Ready</Badge>;
            case 'confirmed': return <Badge className="bg-teal-500 text-teal-50">Confirmed</Badge>;
            case 'delivering': return <Badge className="bg-purple-500 text-purple-50">Delivering</Badge>;
            case 'completed': return <Badge className="bg-green-600 text-green-50">Completed</Badge>;
            case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
            case 'declined': return <Badge variant="destructive" className="bg-red-700 text-red-50">Declined by Seller</Badge>;
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

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full space-y-4">
                    {orders.map(order => {
                        const isQuoteReady = order.status === 'quote-ready';
                        const subtotal = order.items.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);
                        const totalDiscount = order.discount || 0;
                        const finalTotal = order.totalAmount;
                        const totalDiscountPercentage = subtotal > 0 ? (totalDiscount / subtotal) * 100 : 0;

                        return (
                        <AccordionItem value={order.id} key={order.id} className="border rounded-lg px-4">
                            <AccordionTrigger>
                                <div className="flex justify-between w-full items-center">
                                    <div className="flex flex-col text-left">
                                        <span className="font-semibold text-sm font-mono break-all">{order.id}</span>
                                        <span className="text-sm text-muted-foreground">{format(order.orderDate.toDate(), 'MMMM d, yyyy')}</span>
                                        {user?.role === 'admin' && order.userId !== user.id && <span className="text-xs text-muted-foreground pt-1">{order.userDisplayName} ({order.userEmail})</span>}
                                    </div>
                                    <div className="flex items-center gap-4">
                                    {isQuoteReady ? <span className="font-bold text-lg text-primary">{formatCurrency(finalTotal)}</span> : null}
                                    {getStatusBadge(order.status)}
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4">
                                <div className="space-y-4">
                                    {order.notes && (
                                        <Alert>
                                            <Info className="h-4 w-4" />
                                            <AlertTitle>Notes from you</AlertTitle>
                                            <AlertDescription className="whitespace-pre-wrap">{order.notes}</AlertDescription>
                                        </Alert>
                                    )}
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
                                                        {isQuoteReady && (item.discount || 0) > 0 && (
                                                            <p className="text-xs text-green-600">Discount: {item.discount}% (-{formatCurrency(discountValue)})</p>
                                                        )}
                                                    </div>
                                                </div>
                                                {isQuoteReady && <span>{formatCurrency(finalItemPrice)}</span>}
                                            </div>
                                            )
                                        })}
                                        </div>
                                    </div>

                                    {isQuoteReady && (
                                        <div className="space-y-2 pt-4 border-t">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Subtotal</span>
                                                <span>{formatCurrency(subtotal)}</span>
                                            </div>
                                            {(totalDiscount) > 0 && (
                                                <div className="flex justify-between text-sm text-green-600">
                                                    <span className="text-muted-foreground">Total Item Discounts</span>
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
                                    )}

                                    <div className="pt-2 border-t">
                                        <h4 className="font-semibold mb-1">Shipping Address</h4>
                                        <p className="text-sm text-muted-foreground">{order.shippingAddress}</p>
                                    </div>
                                    
                                    {(order.status === 'cancelled' || order.status === 'declined') && order.cancellationReason && (
                                        <Alert variant="destructive">
                                            <Info className="h-4 w-4" />
                                            <AlertTitle>Reason for {order.status === 'cancelled' ? 'Cancellation' : 'Decline'}</AlertTitle>
                                            <AlertDescription>{order.cancellationReason}</AlertDescription>
                                        </Alert>
                                    )}
                                
                                    {/* User action buttons */}
                                    <div className="flex gap-2 justify-end pt-4">
                                        {isQuoteReady && (
                                            <>
                                            <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(order, 'cancelled')} disabled={isUpdating === order.id}>
                                                <XCircle className="mr-2 h-4 w-4"/>
                                                {isUpdating === order.id ? 'Cancelling...' : 'Cancel Order'}
                                            </Button>
                                            <Button size="sm" onClick={() => handleUpdateStatus(order, 'confirmed')} disabled={isUpdating === order.id}>
                                                <CheckCircle className="mr-2 h-4 w-4"/>
                                                {isUpdating === order.id ? 'Confirming...' : 'Confirm Order & Purchase'}
                                            </Button>
                                            </>
                                        )}
                                        {(order.status === 'pending-quote') && (
                                            <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(order, 'cancelled')} disabled={isUpdating === order.id}>
                                                <XCircle className="mr-2 h-4 w-4"/>
                                                {isUpdating === order.id ? 'Cancelling...' : 'Cancel Request'}
                                            </Button>
                                        )}
                                        {order.status === 'delivering' && (
                                            <Button size="sm" onClick={() => handleUpdateStatus(order, 'completed')} disabled={isUpdating === order.id}>
                                                <CheckCircle className="mr-2 h-4 w-4"/>
                                                {isUpdating === order.id ? 'Updating...' : 'Mark as Received'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )})}
                </Accordion>
            </CardContent>
        </Card>
    );
}


export default function ProfilePage() {
  const { user, cart, orders, updateUserProfile, isLoading: isAuthLoading, showCartBadge, dismissCartBadge, showOrderHistoryBadge, dismissOrderHistoryBadge } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    const sorted = [...orders].sort((a, b) => b.orderDate.toMillis() - a.orderDate.toMillis());
    
    const quotationOrders = sorted.filter(o => ['pending-quote', 'quote-ready'].includes(o.status));
    const activeOrders = sorted.filter(o => ['confirmed', 'delivering'].includes(o.status));
    const completedOrders = sorted.filter(o => ['completed', 'cancelled', 'declined'].includes(o.status));
    
    return { quotationOrders, activeOrders, completedOrders };
  }, [orders]);
  
  const handleTabChange = (value: string) => {
    if (value === 'quotation') {
      dismissCartBadge();
    }
    if (value === 'purchases' || value === 'orders') {
        dismissOrderHistoryBadge();
    }
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
           <TabsTrigger value="quotation" className="relative">
            <FileQuestion className="mr-2" />
            My Quotation
            {showCartBadge && cartItemCount > 0 && (
              <span className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                {cartItemCount}
              </span>
            )}
          </TabsTrigger>
           <TabsTrigger value="purchases" className="relative">
            <Truck className="mr-2" />
            My Purchases
             {showOrderHistoryBadge && (
                <span className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-destructive"></span>
             )}
          </TabsTrigger>
          <TabsTrigger value="orders">
            <History className="mr-2" />
            Order History
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
        </TabsContent>
        <TabsContent value="orders">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

    

    

