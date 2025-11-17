
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirebase } from '@/firebase';
import { setDoc, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

import type { HomePageSettings } from '@/app/(app)/home/page';


const formSchema = z.object({
  welcomeTitle: z.string().min(3, 'Title must be at least 3 characters.'),
  backgroundUrl: z.string().url({ message: "Please enter a valid URL." }),
});


export function EditHomeDialog({ isOpen, onOpenChange, content }: { isOpen: boolean, onOpenChange: (open: boolean) => void, content: HomePageSettings }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: content,
  });
  
  const backgroundUrl = form.watch('backgroundUrl');

  useEffect(() => {
    if (isOpen) {
      form.reset(content);
    }
  }, [isOpen, content, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    try {
        const homeRef = doc(firestore, "system_settings", "home_page");
        await setDoc(homeRef, values, { merge: true });

        toast({
            title: "Success",
            description: "Home Page updated.",
        });

        onOpenChange(false);

    } catch (err: any) {
        console.error("An error occurred during submission:", err);
        toast({
            variant: "destructive",
            title: "Error",
            description: err.message || "An unknown error occurred.",
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Home Page</DialogTitle>
          <DialogDescription>Update your home page background and welcome title.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField name="welcomeTitle" control={form.control} render={({ field }) => (
            <FormItem><FormLabel>Welcome Title</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
            )}/>

            <FormField
              control={form.control}
              name="backgroundUrl"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Background Image URL</FormLabel>
                  <FormControl>
                      <Input placeholder="https://images.unsplash.com/..." {...field} />
                  </FormControl>
                  <FormMessage />
                  </FormItem>
              )}
            />

            <div>
              <FormLabel>Image Preview</FormLabel>
                <div className="relative mt-2 h-40 w-full border rounded-lg overflow-hidden bg-muted">
                  {backgroundUrl ? (
                      <img src={backgroundUrl} alt="preview" className="object-cover w-full h-full" onError={(e) => (e.currentTarget.style.display = 'none')}/>
                  ) : (
                      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                        No Image URL Provided
                      </div>
                  )}
              </div>
            </div>


            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    