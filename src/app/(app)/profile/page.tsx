
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, History, User, Package } from 'lucide-react';
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

    return (
        <div className="space-y-4">
            {cartItems.map(item => {
                const placeholder = getPlaceholderImage(item.parentItemId);
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
                        <p className="text-sm">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-semibold">{formatCurrency((item.price || 0) * item.quantity)}</p>
                        <p className="text-sm text-muted-foreground">({formatCurrency(item.price || 0)} each)</p>
                    </div>
                </div>
                )
            })}
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
