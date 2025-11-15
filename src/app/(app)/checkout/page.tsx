
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { CartItem } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChevronLeft, CreditCard, Home, ShoppingCart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
};

export default function CheckoutPage() {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();

    const cartCollectionRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'cart') : null, [firestore, user]);
    const { data: cartItems, isLoading } = useCollection<CartItem>(cartCollectionRef);

    const subtotal = useMemo(() => {
        if (!cartItems) return 0;
        return cartItems.reduce((total, item) => total + (item.price || 0) * item.quantity, 0);
    }, [cartItems]);
    
    // Placeholder values
    const shippingFee = subtotal > 0 ? 50 : 0;
    const total = subtotal + shippingFee;

    const handlePlaceOrder = () => {
        // In a real app, this would trigger payment processing and order creation.
        // For now, we'll just show a success message and redirect.
        toast({
            title: "Order Placed!",
            description: "Thank you for your purchase. Your order is being processed.",
        });
        // Here you would typically clear the cart after a successful order.
        router.push('/dashboard');
    }

    if (isLoading) {
        return (
             <div className="space-y-8">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                    <div className="space-y-6">
                        <Skeleton className="h-64 w-full" />
                    </div>
                </div>
            </div>
        )
    }

    if (!cartItems || cartItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
                 <ShoppingCart className="w-16 h-16 text-muted-foreground mb-4" />
                <h1 className="text-3xl font-bold font-headline">Your Cart is Empty</h1>
                <p className="text-muted-foreground mt-2">
                    Looks like you haven't added anything to your cart yet.
                </p>
                <Button asChild className="mt-6">
                    <Link href="/dashboard">Continue Shopping</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/profile">
                        <ChevronLeft className="h-4 w-4" />
                        <span className="sr-only">Back to Profile</span>
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline">Checkout</h1>
                    <p className="text-muted-foreground">Review your order and complete your purchase.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                    {/* Shipping Information */}
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-4">
                            <Home className="w-6 h-6 text-primary" />
                            <CardTitle className="font-headline text-2xl">Shipping Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {user?.address ? (
                                <>
                                    <p className="font-semibold">{user.displayName}</p>
                                    <p className="text-muted-foreground">{user.address}</p>
                                </>
                            ) : (
                                <p className="text-muted-foreground">
                                    No address found. Please <Link href="/profile" className="underline text-primary">add one to your profile</Link>.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Payment Method */}
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-4">
                             <CreditCard className="w-6 h-6 text-primary" />
                            <CardTitle className="font-headline text-2xl">Payment Method</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Alert>
                                <AlertTitle className="font-semibold">Coming Soon!</AlertTitle>
                                <AlertDescription>
                                    GCash and Instapay payment options will be available in the future. For now, all orders are processed upon placement.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </div>

                {/* Order Summary */}
                <Card className="lg:sticky lg:top-24">
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">Order Summary</CardTitle>
                        <CardDescription>Here's what's in your cart.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                        {cartItems.map(item => (
                            <div key={item.id} className="flex items-center gap-4">
                                <Image 
                                    src={item.imageUrl!} 
                                    alt={item.parentName || 'product'} 
                                    width={48} 
                                    height={48} 
                                    className="rounded-md object-cover"
                                    data-ai-hint={item.imageHint}
                                />
                                <div className="flex-grow">
                                    <p className="font-semibold text-sm">{item.parentName}</p>
                                    <p className="text-xs text-muted-foreground">{item.brand}</p>
                                </div>
                                <div className="text-right text-sm">
                                    <p className="font-medium">{formatCurrency((item.price || 0) * item.quantity)}</p>
                                    <p className="text-xs text-muted-foreground">{item.quantity} x {formatCurrency(item.price || 0)}</p>
                                </div>
                            </div>
                        ))}
                        </div>
                        <Separator />
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Shipping</span>
                                <span>{formatCurrency(shippingFee)}</span>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>{formatCurrency(total)}</span>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" size="lg" onClick={handlePlaceOrder} disabled={!user?.address}>
                            {user?.address ? 'Place Order' : 'Add Address to Continue'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}

