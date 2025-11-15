
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ShieldAlert, UserPlus } from 'lucide-react';

const formSchema = z.object({
  displayName: z.string().min(2, { message: 'Display name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type AddAdminFormValues = z.infer<typeof formSchema>;

export default function CreateAdminPage() {
  const { user, createAdminUser } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AddAdminFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: AddAdminFormValues) => {
    setIsSubmitting(true);
    const success = await createAdminUser(values.email, values.password, values.displayName);
    if (success) {
      form.reset();
      router.push('/admin'); // Redirect to user management on success
    }
    setIsSubmitting(false);
  };

  if (user?.role !== 'admin') {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
             <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-3xl font-bold font-headline text-destructive">Access Denied</h1>
            <p className="text-muted-foreground mt-2">
                You do not have permission to view this page.
            </p>
        </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-4">
            <UserPlus className="w-8 h-8 text-primary" />
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline">Create New Admin User</h1>
                <p className="text-muted-foreground">Add a new user with administrative privileges to the portal.</p>
            </div>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card>
                <CardHeader>
                    <CardTitle>User Details</CardTitle>
                    <CardDescription>
                        Enter the details for the new admin account. An invitation will not be sent; you must provide the credentials to the user directly.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Jane Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input placeholder="user@kintsugi.com" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Creating User..." : "Create Admin User"}
                    </Button>
                </CardFooter>
            </Card>
          </form>
        </Form>
    </div>
  );
}
