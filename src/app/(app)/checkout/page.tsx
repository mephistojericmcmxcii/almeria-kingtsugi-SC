
'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import type { CartItem } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChevronLeft, CreditCard, Home, ShoppingCart, Phone, FileQuestion, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
};

export default function CheckoutPage() {
    const { user, firestore, placeOrder } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [shippingOption, setShippingOption] = useState<'profile' | 'custom'>('profile');
    const [customAddress, setCustomAddress] = useState('');
    const [customContact, setCustomContact] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cod' | 'gcash' | 'instapay'>('cod');
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [notes, setNotes] = useState('');

    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchCartItems = async () => {
            if (!firestore || !user) {
                setIsLoading(false);
                return;
            };
            setIsLoading(true);
            try {
                const cartCollectionRef = collection(firestore, 'users', user.id, 'cart');
                const snapshot = await getDocs(cartCollectionRef);
                const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CartItem));
                setCartItems(items);
            } catch (error) {
                console.error("Error fetching cart items:", error);
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Could not load your cart items.'
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchCartItems();
    }, [firestore, user, toast]);

    const subtotal = useMemo(() => {
        if (!cartItems) return 0;
        return cartItems.reduce((total, item) => total + (item.price || 0) * item.quantity, 0);
    }, [cartItems]);
    
    const shippingFee = 0; // No shipping fee for quotations
    const total = subtotal + shippingFee;

    const finalShippingAddress = useMemo(() => {
        if (shippingOption === 'profile') {
            return user?.address;
        }
        return customAddress;
    }, [shippingOption, user?.address, customAddress]);
    
    const finalContactNumber = useMemo(() => {
        if (shippingOption === 'profile') {
            return user?.contactNumber;
        }
        return customContact;
    }, [shippingOption, user?.contactNumber, customContact]);


    const isPlaceOrderDisabled = !finalShippingAddress || finalShippingAddress.trim() === '' || !finalContactNumber || finalContactNumber.trim() === '' || !cartItems || cartItems.length === 0 || isPlacingOrder;

    const handlePlaceOrder = async () => {
        if (!finalShippingAddress || !finalContactNumber || !cartItems) return;
        setIsPlacingOrder(true);

        const success = await placeOrder(cartItems, total, finalShippingAddress, finalContactNumber, paymentMethod, notes);

        if (success) {
            toast({
                title: "Quotation Request Sent!",
                description: "Thank you for your request. We will get back to you shortly with a quotation.",
            });
            router.push('/profile');
        }
        // If it fails, the placeOrder function will have already shown an error toast.
        setIsPlacingOrder(false);
    }

    if (isLoading) {
        return (
             <div className="space-y-8">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-24 w-full" />
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
                 <FileQuestion className="w-16 h-16 text-muted-foreground mb-4" />
                <h1 className="text-3xl font-bold font-headline">Your Quotation List is Empty</h1>
                <p className="text-muted-foreground mt-2">
                    Looks like you haven't added anything to your list yet.
                </p>
                <Button asChild className="mt-6">
                    <Link href="/products">Continue Browsing</Link>
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
                    <h1 className="text-3xl font-bold tracking-tight font-headline">Quotation Request</h1>
                    <p className="text-muted-foreground">Review your items and submit your request for a quotation.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                    {/* Shipping Information */}
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-4">
                            <Home className="w-6 h-6 text-primary" />
                            <CardTitle className="font-headline text-2xl">Contact & Delivery Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <RadioGroup value={shippingOption} onValueChange={(value) => setShippingOption(value as 'profile' | 'custom')}>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="profile" id="profile" disabled={!user?.address} />
                                    <Label htmlFor="profile" className={!user?.address ? 'text-muted-foreground' : ''}>
                                        Use Profile Address & Contact
                                    </Label>
                                </div>
                                {user?.address ? (
                                    <div className="pl-6 text-sm text-muted-foreground border-l ml-2 py-2 space-y-2">
                                        <div>
                                            <p className='font-semibold text-foreground'>{user.displayName}</p>
                                            <p>{user.address}</p>
                                        </div>
                                        {user.contactNumber && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-4 h-4"/>
                                                <p>{user.contactNumber}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                     <p className="pl-6 text-sm text-muted-foreground">
                                        No address found. Please <Link href="/profile" className="underline text-primary">add one to your profile</Link>.
                                    </p>
                                )}

                                <div className="flex items-center space-x-2 pt-2">
                                    <RadioGroupItem value="custom" id="custom" />
                                    <Label htmlFor="custom">Use a Different Address & Contact</Label>
                                </div>
                                {shippingOption === 'custom' && (
                                     <div className="pl-6 border-l ml-2 py-2 space-y-4">
                                        <Textarea 
                                            placeholder="Enter your full shipping address..."
                                            value={customAddress}
                                            onChange={(e) => setCustomAddress(e.target.value)}
                                        />
                                        <Input
                                            type="tel"
                                            placeholder="Enter contact number..."
                                            value={customContact}
                                            onChange={(e) => setCustomContact(e.target.value)}
                                        />
                                    </div>
                                )}
                           </RadioGroup>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center gap-4">
                           <MessageSquare className="w-6 h-6 text-primary" />
                           <CardTitle className="font-headline text-2xl">Notes for the Seller</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Textarea 
                                placeholder="Add any special instructions, questions, or requests for your quotation here..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={4}
                            />
                        </CardContent>
                    </Card>

                </div>

                {/* Order Summary */}
                <Card className="lg:sticky lg:top-24">
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">Quotation Summary</CardTitle>
                        <CardDescription>Here's what's in your list.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                        {cartItems.map(item => (
                            <div key={item.id} className="flex items-center gap-4">
                                <img 
                                    src={item.imageUrl!} 
                                    alt={item.parentName || 'product'} 
                                    className="rounded-md object-cover w-12 h-12"
                                    data-ai-hint={item.imageHint}
                                />
                                <div className="flex-grow">
                                    <p className="font-semibold text-sm">{item.parentName}</p>
                                    <p className="text-xs text-muted-foreground">{item.brand}</p>
                                </div>
                                <div className="text-right text-sm">
                                    <p className="font-medium">x {item.quantity}</p>
                                </div>
                            </div>
                        ))}
                        </div>
                        <Separator />
                        <Alert>
                            <AlertTitle className="font-semibold">Price on Request</AlertTitle>
                            <AlertDescription>
                                Prices will be provided in the official quotation sent to your email.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" size="lg" onClick={handlePlaceOrder} disabled={isPlaceOrderDisabled}>
                            {isPlacingOrder ? 'Submitting...' : (isPlaceOrderDisabled ? 'Complete Contact Info' : 'Submit Quotation Request')}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
