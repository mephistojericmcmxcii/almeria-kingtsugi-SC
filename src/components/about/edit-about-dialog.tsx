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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import type { AboutPageContent } from '@/app/(app)/about/page';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const formSchema = z.object({
  title: z.string().min(5, 'Title is required.'),
  heading: z.string().min(5, 'Heading is required.'),
  p1: z.string().min(10, 'Paragraph 1 is required.'),
  p2: z.string().min(10, 'Paragraph 2 is required.'),
  missionHeading: z.string().min(5, 'Mission heading is required.'),
  missionP: z.string().min(10, 'Mission paragraph is required.'),
  imageId: z.string().min(1, 'An image is required.'),
});

type EditAboutFormValues = z.infer<typeof formSchema>;

interface EditAboutDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  content: AboutPageContent;
}

export function EditAboutDialog({ isOpen, onOpenChange, content }: EditAboutDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditAboutFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: content,
  });
  
  useEffect(() => {
    if (content) {
      form.reset(content);
    }
  }, [content, form]);


  const onSubmit = async (values: EditAboutFormValues) => {
    setIsSubmitting(true);
    try {
        const aboutRef = doc(firestore, 'system_settings', 'about_page');
        await setDoc(aboutRef, values, { merge: true });
        toast({
            title: "Success",
            description: "The About page has been updated.",
        });
        onOpenChange(false);
    } catch (error: any) {
        console.error("Failed to update About page:", error);
         toast({
            variant: "destructive",
            title: "Error",
            description: "Could not update the About page. Please try again.",
        });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDialogClose = (open: boolean) => {
    if (isSubmitting) return;
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit About Page</DialogTitle>
          <DialogDescription>Update the content displayed on the About page.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
            <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Page Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="heading" render={({ field }) => (
                <FormItem><FormLabel>Main Heading</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
             <FormField control={form.control} name="p1" render={({ field }) => (
                <FormItem><FormLabel>Paragraph 1</FormLabel><FormControl><Textarea {...field} rows={5} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="p2" render={({ field }) => (
                <FormItem><FormLabel>Paragraph 2</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="missionHeading" render={({ field }) => (
                <FormItem><FormLabel>Mission Heading</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="missionP" render={({ field }) => (
                <FormItem><FormLabel>Mission Paragraph</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem>
            )}/>
             <FormField
              control={form.control}
              name="imageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an image" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PlaceHolderImages.map(img => (
                        <SelectItem key={img.id} value={img.id}>{img.description}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

             <DialogFooter className="mt-8">
              <Button type="button" variant="outline" onClick={() => handleDialogClose(false)} disabled={isSubmitting}>Cancel</Button>
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
