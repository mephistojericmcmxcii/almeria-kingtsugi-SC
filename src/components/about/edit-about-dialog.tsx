
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

// --- ZOD FOR TEXT ONLY ---
const formSchema = z.object({
  title: z.string().min(3),
  heading: z.string().min(3),
  p1: z.string().min(5),
  p2: z.string().min(5),
  missionHeading: z.string().min(3),
  missionP: z.string().min(5),
});

// convert URL → storage path
function getPathFromUrl(url: string) {
  const base = "https://firebasestorage.googleapis.com/v0/b/";
  if (!url.startsWith(base)) return null;
  const parts = url.split("/o/");
  if (parts.length < 2) return null;
  return decodeURIComponent(parts[1].split("?")[0]);
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
    defaultValues: content,
  });

  // reset when dialog opens
  useEffect(() => {
    if (isOpen) {
      form.reset(content);
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

      // upload new image
      if (imageFile) {
        const path = `about-images/about-${Date.now()}`;
        const imgRef = storageRef(storage, path);

        await uploadBytes(imgRef, imageFile);
        finalImageUrl = await getDownloadURL(imgRef);

        // delete old image if exists
        if (content.imageUrl) {
          const oldPath = getPathFromUrl(content.imageUrl);
          if (oldPath) {
            const oldRef = storageRef(storage, oldPath);
            deleteObject(oldRef).catch(() => {});
          }
        }
      }

      // save to Firestore
      const aboutRef = doc(firestore, "system_settings", "about_page");

      await setDoc(
        aboutRef,
        {
          ...values,
          imageUrl: finalImageUrl,
        },
        { merge: true }
      );

      toast({
        title: "Success",
        description: "About Page updated.",
      });

      onOpenChange(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      });
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit About Page</DialogTitle>
          <DialogDescription>Update your About page content.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* IMAGE REQUIRED */}
            <FormItem>
              <FormLabel>Page Image (Required)</FormLabel>
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

                <Button type="button" onClick={() => fileRef.current?.click()}>
                  {imagePreview ? "Change Image" : "Upload Image"}
                </Button>
              </div>
            </FormItem>

            {/* FIELDS */}
            <FormField name="title" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Page Title</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
            )}/>

            <FormField name="heading" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Heading</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
            )}/>

            <FormField name="p1" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Paragraph 1</FormLabel><FormControl><Textarea rows={4} {...field}/></FormControl><FormMessage/></FormItem>
            )}/>

            <FormField name="p2" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Paragraph 2</FormLabel><FormControl><Textarea rows={4} {...field}/></FormControl><FormMessage/></FormItem>
            )}/>

            <FormField name="missionHeading" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Mission Heading</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
            )}/>

            <FormField name="missionP" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Mission Paragraph</FormLabel><FormControl><Textarea rows={3} {...field}/></FormControl><FormMessage/></FormItem>
            )}/>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
