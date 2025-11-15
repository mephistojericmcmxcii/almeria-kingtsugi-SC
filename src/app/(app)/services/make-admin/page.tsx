
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ShieldAlert, UserCog } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';


const formSchema = z.object({
  uid: z.string().min(10, { message: 'Please enter a valid UID.' }),
});

type MakeAdminFormValues = z.infer<typeof formSchema>;

export default function MakeAdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MakeAdminFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      uid: '',
    },
  });

  const onSubmit = async (values: MakeAdminFormValues) => {
    setIsSubmitting(true);
    const functions = getFunctions();
    const setAdminRole = httpsCallable(functions, "setAdminRole");

    try {
      const result = await setAdminRole({ uid: values.uid });
      toast({
          title: "Success!",
          description: `User ${values.uid} has been made an admin.`,
      });
      form.reset();
    } catch (err: any) {
        toast({
            variant: "destructive",
            title: "Operation Failed",
            description: err.message || "Could not set admin role.",
        });
      console.error(err);
    } finally {
        setIsSubmitting(false);
    }
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
            <UserCog className="w-8 h-8 text-primary" />
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline">Make User Admin</h1>
                <p className="text-muted-foreground">Grant administrative privileges to an existing user by their UID.</p>
            </div>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card>
                <CardHeader>
                    <CardTitle>Target User</CardTitle>
                    <CardDescription>
                        Enter the UID of the user you wish to promote to an admin. This action is reversible in the User Management table.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                    control={form.control}
                    name="uid"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>User ID (UID)</FormLabel>
                        <FormControl>
                            <Input placeholder="Enter the user's UID..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Processing..." : "Make Admin"}
                    </Button>
                </CardFooter>
            </Card>
        </form>
       </Form>
    </div>
  );
}
