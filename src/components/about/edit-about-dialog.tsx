
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import Image from 'next/image';

import type { AboutPageContent } from '@/app/(app)/about/page';


const formSchema = z.object({
  title: z.string().min(3),
  heading: z.string().min(3),
  body: z.string().min(10),
  missionHeading: z.string().min(3),
  missionP: z.string().min(5),
  imageUrl: z.string().url({ message: "Please enter a valid URL." }),
});


export function EditAboutDialog({ isOpen, onOpenChange, content }: { isOpen: boolean, onOpenChange: (open: boolean) => void, content: AboutPageContent }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: content,
  });
  
  const imageUrl = form.watch('imageUrl');

  useEffect(() => {
    if (isOpen) {
      form.reset(content);
    }
  }, [isOpen, content, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    try {
        const aboutRef = doc(firestore, "system_settings", "about_page");
        await setDoc(aboutRef, values, { merge: true });

        toast({
            title: "Success",
            description: "About Page updated.",
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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit About Page</DialogTitle>
          <DialogDescription>Update your About page content.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                      <Input placeholder="https://example.com/image.jpg" {...field} />
                  </FormControl>
                  <FormMessage />
                  </FormItem>
              )}
            />

            <div>
              <FormLabel>Image Preview</FormLabel>
                <div className="relative mt-2 h-48 w-full border rounded overflow-hidden">
                  {imageUrl ? (
                      <Image src={imageUrl} fill alt="preview" style={{ objectFit: "cover" }} onError={(e) => e.currentTarget.style.display = 'none'}/>
                  ) : (
                      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                      No Image URL Provided
                      </div>
                  )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4">

                <FormField name="title" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Page Title</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                )}/>

                <FormField name="heading" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Primary Heading</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                )}/>
                
                <div className="md:col-span-2">
                  <FormField name="body" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Body Content</FormLabel><FormControl><Textarea rows={6} {...field}/></FormControl><FormMessage/></FormItem>
                  )}/>
                </div>

                <FormField name="missionHeading" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Mission Heading</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                )}/>

                <FormField name="missionP" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Mission Paragraph</FormLabel><FormControl><Textarea rows={1} {...field}/></FormControl><FormMessage/></FormItem>
                )}/>

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
