
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirebase } from '@/firebase';
import { setDoc, doc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
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
import Image from 'next/image';

import type { AboutPageContent } from '@/app/(app)/about/page';


const formSchema = z.object({
  title: z.string().min(3),
  heading: z.string().min(3),
  body: z.string().min(10),
  missionHeading: z.string().min(3),
  missionP: z.string().min(5),
});


function getPathFromUrl(url: string) {
  try {
      const urlObj = new URL(url);
      const pathName = urlObj.pathname;
      const parts = pathName.split('/o/');
      if (parts.length > 1) {
          return decodeURIComponent(parts[1].split('?')[0]);
      }
      return null;
  } catch (error) {
      console.error("Invalid URL for getPathFromUrl:", error);
      return null;
  }
}


export function EditAboutDialog({ isOpen, onOpenChange, content }: { isOpen: boolean, onOpenChange: (open: boolean) => void, content: AboutPageContent }) {
  const { firestore, storage } = useFirebase();
  const { toast } = useToast();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: content.title,
      heading: content.heading,
      body: content.p1 && content.p2 ? `${content.p1}\n\n${content.p2}` : (content.body || ''),
      missionHeading: content.missionHeading,
      missionP: content.missionP,
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        title: content.title,
        heading: content.heading,
        body: content.p1 && content.p2 ? `${content.p1}\n\n${content.p2}` : (content.body || ''),
        missionHeading: content.missionHeading,
        missionP: content.missionP,
      });
      setImagePreview(content.imageUrl || null);
      setImageFile(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [isOpen, content, form]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ok = ["image/png", "image/jpeg", "image/webp"];

    if (!ok.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
      });
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!imageFile && !content.imageUrl) {
      toast({
        variant: "destructive",
        title: "Image required",
        description: "Please upload an image before saving.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
        let finalImageUrl = content.imageUrl;

        if (imageFile) {
            console.log("Starting image upload...");
            const path = `about-images/about-${Date.now()}`;
            console.log("Uploading to storage path:", path);
            const imgRef = storageRef(storage, path);
            
            await uploadBytes(imgRef, imageFile);
            console.log("Image uploaded successfully.");

            finalImageUrl = await getDownloadURL(imgRef);
            console.log("Got download URL:", finalImageUrl);

            if (content.imageUrl && content.imageUrl !== finalImageUrl) {
                const oldPath = getPathFromUrl(content.imageUrl);
                console.log("Old image path to delete:", oldPath);
                if (oldPath) {
                    try {
                        const oldRef = storageRef(storage, oldPath);
                        await deleteObject(oldRef);
                        console.log("Old image deleted successfully.");
                    } catch (deleteError: any) {
                        if (deleteError.code !== 'storage/object-not-found') {
                           console.warn("Could not delete old image:", deleteError);
                        }
                    }
                }
            }
        }
        
        const dataToSave = {
            ...values,
            imageUrl: finalImageUrl || '',
            p1: undefined, // remove old fields
            p2: undefined,
        };
        console.log("Data to save to Firestore:", dataToSave);
        const aboutRef = doc(firestore, "system_settings", "about_page");
        await setDoc(aboutRef, dataToSave, { merge: true });
        console.log("Firestore document saved.");

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
        console.log("isSubmitting set to false");
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <FormItem>
                    <FormLabel>Page Image</FormLabel>
                    <div className="flex gap-4 items-center">
                        <div className="relative h-28 w-40 border rounded overflow-hidden">
                        {imagePreview ? (
                            <Image src={imagePreview} fill alt="preview" style={{ objectFit: "cover" }} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                            No Image
                            </div>
                        )}
                        </div>

                        <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileRef}
                        onChange={handleImageChange}
                        />

                        <Button type="button" onClick={() => fileRef.current?.click()} disabled={isSubmitting}>
                        {imagePreview ? "Change Image" : "Upload Image"}
                        </Button>
                    </div>
                    </FormItem>
                </div>

                <FormField name="title" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Page Title</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                )}/>

                <FormField name="heading" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Primary Heading</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                )}/>
                
                <div className="md:col-span-2">
                    <FormField name="body" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Body Content</FormLabel><FormControl><Textarea rows={4} {...field}/></FormControl><FormMessage/></FormItem>
                    )}/>
                </div>

                <FormField name="missionHeading" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Mission Heading</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                )}/>

                <div className="md:col-span-2">
                    <FormField name="missionP" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Mission Paragraph</FormLabel><FormControl><Textarea rows={1} {...field}/></FormControl><FormMessage/></FormItem>
                    )}/>
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
