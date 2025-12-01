
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useEffect, useState } from 'react';

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

export default function ProfilePage() {
  const { user, updateUserProfile, isLoading: isAuthLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    </div>
  );
}
