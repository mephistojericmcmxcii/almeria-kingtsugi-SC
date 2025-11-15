

'use client';

import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, History, User, Package, Plus, Minus, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useEffect, useState, useMemo } from 'react';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { CartItem, Order, OrderStatus } from '@/lib/types';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const profileFormSchema = z.object({
  displayName: z.string().min(2, { message: 'Display name must be at least 2 characters.' }),
  address: z.string().optional(),
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
        return <div className="text-center py-12 text-muted-foreground">Loading your cart...</div>;
    }
    
    const totalCartPrice = useMemo(() => {
        if (!cartItems) return 0;
        return cartItems.reduce((total, item) => total + (item.price || 0) * item.quantity, 0);
    }, [cartItems]);

    if (!cartItems || cartItems.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4">Your cart is empty.</p>
            </div>
        );
    }
    
    const getPlaceholderImage = (itemId: string | undefined) => {
      const itemImage = PlaceHolderImages.find(p => p.id === itemId);
      const fallbackImage = PlaceHolderImages.find(p => p.id === 'product-fallback');
      return itemImage || fallbackImage!;
    }

    return (
        <div className="space-y-4">
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                {cartItems.map(item => {
                    const placeholder = getPlaceholderImage(item.parentItemId);
                    const isStockLimitReached = item.quantity >= (item.stock || 0);
                    return (
                    <div key={item.id} className="flex items-center gap-4 border-b pb-4 last:border-b-0">
                         <Image 
                            src={placeholder.imageUrl} 
                            alt={item.parentName || 'product'} 
                            width={64} 
                            height={64} 
                            className="rounded-md object-cover"
                            data-ai-hint={placeholder.imageHint}
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
                            <p className="font-semibold">{formatCurrency((item.price || 0) * item.quantity)}</p>
                            <p className="text-sm text-muted-foreground">({formatCurrency(item.price || 0)} each)</p>
                             <Button size="icon" variant="ghost" className="h-8 w-8 mt-1 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeCartItem(item.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    )
                })}
            </div>
             <div className="flex justify-end items-center pt-4 font-semibold text-lg border-t">
                <span>Total:</span>
                <span className="ml-4">{formatCurrency(totalCartPrice)}</span>
            </div>
             <CardFooter className="flex justify-end p-0 pt-6">
                <Button onClick={() => router.push('/checkout')} disabled={!cartItems || cartItems.length === 0}>Proceed to Checkout</Button>
            </CardFooter>
        </div>
    );
}

function OrderHistory() {
    const { user, firestore, updateOrderStatus } = useAuth();
    const ordersCollectionRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.id, 'orders') : null, [firestore, user]);
    const { data: orders, isLoading } = useCollection<Order>(ordersCollectionRef);
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    const handleUpdateStatus = async (order: Order, status: OrderStatus) => {
        setIsUpdating(order.id);
        await updateOrderStatus(order, status);
        setIsUpdating(null);
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

    if (isLoading) {
        return <div className="text-center py-12 text-muted-foreground">Loading order history...</div>;
    }

    if (!orders || orders.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <History className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4">You have no past orders.</p>
            </div>
        );
    }

    return (
        <Accordion type="single" collapsible className="w-full space-y-4">
            {orders.sort((a, b) => b.orderDate.toMillis() - a.orderDate.toMillis()).map(order => (
                <AccordionItem value={order.id} key={order.id} className="border rounded-lg px-4">
                    <AccordionTrigger>
                        <div className="flex justify-between w-full items-center">
                            <div className="flex flex-col text-left">
                                <span className="font-semibold text-base font-mono">{order.id}</span>
                                <span className="text-sm text-muted-foreground">{format(order.orderDate.toDate(), 'MMMM d, yyyy')}</span>
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
                                {order.items.map(item => (
                                    <div key={item.id} className="flex justify-between items-center text-sm">
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
                                {(order.status === 'pending' || order.status === 'confirmed') && (
                                     <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(order, 'cancelled')} disabled={isUpdating === order.id}>
                                        <XCircle className="mr-2 h-4 w-4"/>
                                        {isUpdating === order.id ? 'Cancelling...' : 'Cancel Order'}
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
            ))}
        </Accordion>
    );
}


export default function ProfilePage() {
  const { user, cart, updateUserProfile, isLoading: isAuthLoading, showCartBadge, dismissCartBadge } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cartItemCount = cart?.length || 0;

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: '',
      address: '',
    },
  });
  
  useEffect(() => {
    if (user) {
      form.reset({
        displayName: user.displayName,
        address: user.address || '',
      });
    }
  }, [user, form]);
  
  const handleTabChange = (value: string) => {
    if (value === 'cart') {
      dismissCartBadge();
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
           <TabsTrigger value="cart" className="relative">
            <ShoppingCart className="mr-2" />
            My Cart
            {showCartBadge && cartItemCount > 0 && (
              <span className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                {cartItemCount}
              </span>
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
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <CardDescription>A record of your past purchases.</CardDescription>
            </CardHeader>
            <CardContent>
              <OrderHistory />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="cart">
          <Card>
            <CardHeader>
              <CardTitle>My Cart</CardTitle>
              <CardDescription>Items you have added to your cart.</CardDescription>
            </CardHeader>
            <CardContent>
               <CartList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
