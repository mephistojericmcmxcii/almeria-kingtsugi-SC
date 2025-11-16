
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirebase } from '@/firebase';
import { setDoc, doc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
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
import { useState, useEffect, useRef } from 'react';
import type { AboutPageContent } from '@/app/(app)/about/page';
import { Upload } from 'lucide-react';
import Image from 'next/image';

const formSchema = z.object({
  title: z.string().min(5, 'Title is required.'),
  heading: z.string().min(5, 'Heading is required.'),
  p1: z.string().min(10, 'Paragraph 1 is required.'),
  p2: z.string().min(10, 'Paragraph 2 is required.'),
  missionHeading: z.string().min(5, 'Mission heading is required.'),
  missionP: z.string().min(10, 'Mission paragraph is required.'),
  imageUrl: z.string().url('A valid image URL is required.').optional().or(z.literal('')),
});

type EditAboutFormValues = z.infer<typeof formSchema>;

interface EditAboutDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  content: AboutPageContent;
}

export function EditAboutDialog({ isOpen, onOpenChange, content }: EditAboutDialogProps) {
  const { firestore, storage } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<EditAboutFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: content,
  });
  
  useEffect(() => {
    if (isOpen) {
        form.reset(content);
        setImagePreview(content.imageUrl);
        setImageFile(null);
        if(fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  }, [content, form, isOpen]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const acceptedTypes = ['image/jpeg', 'image/png'];
    if (!acceptedTypes.includes(file.type)) {
        toast({
            variant: "destructive",
            title: "Invalid File Type",
            description: "Please select a PNG or JPEG image.",
        });
        return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };


  const onSubmit = async (values: EditAboutFormValues) => {
    if (!storage || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firebase services not available.' });
      return;
    }
    setIsSubmitting(true);

    try {
        let finalImageUrl = content.imageUrl || ''; // Start with the original image URL or an empty string

        if (imageFile) {
            const imageStoragePath = `about-page-images/about-us-image-${Date.now()}`;
            const imageStorageRef = storageRef(storage, imageStoragePath);
            
            await uploadBytes(imageStorageRef, imageFile);
            
            finalImageUrl = await getDownloadURL(imageStorageRef);
        }

        const aboutRef = doc(firestore, 'system_settings', 'about_page');
        const dataToSave: AboutPageContent = { 
            title: values.title || '',
            heading: values.heading || '',
            p1: values.p1 || '',
            p2: values.p2 || '',
            missionHeading: values.missionHeading || '',
            missionP: values.missionP || '',
            imageUrl: finalImageUrl 
        };

        await setDoc(aboutRef, dataToSave, { merge: true });

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
         {isSubmitting && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-20 rounded-lg">
                <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-4 text-muted-foreground">Saving changes...</p>
            </div>
        )}
        <DialogHeader>
          <DialogTitle>Edit About Page</DialogTitle>
          <DialogDescription>Update the content displayed on the About page.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
            <FormItem>
              <FormLabel>Page Image</FormLabel>
              <FormControl>
                <div className="flex items-center gap-4">
                  <div className="relative h-24 w-40 rounded-md border-dashed border-2 flex items-center justify-center text-muted-foreground overflow-hidden">
                    {imagePreview ? (
                      <Image src={imagePreview} alt="About page preview" fill style={{objectFit: "cover"}} />
                    ) : (
                      <Upload className="h-8 w-8" />
                    )}
                  </div>
                  <Input 
                    type="file" 
                    accept="image/png, image/jpeg" 
                    onChange={handleImageChange}
                    className="hidden"
                    ref={fileInputRef}
                    disabled={isSubmitting}
                  />
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                    {imagePreview ? 'Change Image' : 'Upload Image'}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>

            <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Page Title</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="heading" render={({ field }) => (
                <FormItem><FormLabel>Main Heading</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
            )}/>
             <FormField control={form.control} name="p1" render={({ field }) => (
                <FormItem><FormLabel>Paragraph 1</FormLabel><FormControl><Textarea {...field} rows={5} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="p2" render={({ field }) => (
                <FormItem><FormLabel>Paragraph 2</FormLabel><FormControl><Textarea {...field} rows={4} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="missionHeading" render={({ field }) => (
                <FormItem><FormLabel>Mission Heading</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="missionP" render={({ field }) => (
                <FormItem><FormLabel>Mission Paragraph</FormLabel><FormControl><Textarea {...field} rows={3} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
            )}/>
            
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
