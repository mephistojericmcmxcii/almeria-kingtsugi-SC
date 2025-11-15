
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, History, User, Package, Plus, Minus, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useEffect, useState } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { CartItem } from '@/lib/types';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

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
    const { firestore, user } = useFirebase();
    const { updateCartItemQuantity, removeCartItem } = useAuth();
    const cartCollectionRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'cart') : null, [firestore, user]);
    const { data: cartItems, isLoading } = useCollection<CartItem>(cartCollectionRef);

    if (isLoading) {
        return <div className="text-center py-12 text-muted-foreground">Loading your cart...</div>;
    }

    if (!cartItems || cartItems.length === 0) {
        return <div className="text-center py-12 text-muted-foreground"><p>Your cart is empty.</p></div>;
    }
    
    const getPlaceholderImage = (itemId: string | undefined) => {
      const itemImage = PlaceHolderImages.find(p => p.id === itemId);
      const fallbackImage = PlaceHolderImages.find(p => p.id === 'product-fallback');
      return itemImage || fallbackImage!;
    }
    
    const totalCartPrice = cartItems.reduce((total, item) => total + (item.price || 0) * item.quantity, 0);

    return (
        <div className="space-y-4">
            {cartItems.map(item => {
                const placeholder = getPlaceholderImage(item.parentItemId);
                const isStockLimitReached = item.quantity >= (item.stock || 0);
                return (
                <div key={item.id} className="flex items-center gap-4 border-b pb-4">
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
             <div className="flex justify-end items-center pt-4 font-semibold text-lg">
                <span>Total:</span>
                <span className="ml-4">{formatCurrency(totalCartPrice)}</span>
            </div>
        </div>
    );
}


export default function ProfilePage() {
  const { user, updateUserProfile, isLoading: isAuthLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="mr-2" />
            Profile
          </TabsTrigger>
           <TabsTrigger value="cart">
            <ShoppingCart className="mr-2" />
            My Cart
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
              <div className="text-center py-12 text-muted-foreground">
                <p>You have no past orders.</p>
              </div>
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
             <CardFooter className="flex justify-end">
                <Button>Proceed to Checkout</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
