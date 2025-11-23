
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/hooks/use-auth';

import type { AboutPageContent } from '@/app/about/page';


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
  const { uploadFile } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageSource, setImageSource] = useState<'url' | 'upload'>('url');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: content,
  });
  
  const imageUrlFromForm = form.watch('imageUrl');

  useEffect(() => {
    if (isOpen) {
      form.reset(content);
      setPreviewUrl(content.imageUrl);
      setImageSource('url');
      setFileToUpload(null);
    }
  }, [isOpen, content, form]);

  useEffect(() => {
      if (imageSource === 'url') {
          setPreviewUrl(imageUrlFromForm);
      }
  }, [imageUrlFromForm, imageSource]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileToUpload(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    let finalImageUrl = values.imageUrl;

    try {
        if (imageSource === 'upload' && fileToUpload) {
            const downloadUrl = await uploadFile(fileToUpload, 'about_page_images');
            if (downloadUrl) {
                finalImageUrl = downloadUrl;
            } else {
                throw new Error("File upload failed, please try again.");
            }
        }
        
        const aboutRef = doc(firestore, "system_settings", "about_page");
        await setDoc(aboutRef, { ...values, imageUrl: finalImageUrl }, { merge: true });

        toast({
            title: "Success",
            description: "About Page updated.",
        });

        onOpenChange(false);

    } catch (err: any) {
        if (err.code === 'permission-denied') {
            const contextualError = new FirestorePermissionError({
                path: aboutRef.path,
                operation: 'update',
                requestResourceData: values,
            });
            errorEmitter.emit('permission-error', contextualError);
        } else {
             toast({
                variant: "destructive",
                title: "Error",
                description: err.message || "An unknown error occurred.",
            });
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  const isSaveDisabled = isSubmitting || (imageSource === 'upload' && !fileToUpload);

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit About Page</DialogTitle>
          <DialogDescription>Update your About page content and image.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="max-h-[70vh] overflow-y-auto pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 py-4">
                {/* Left Column: Image Settings */}
                <div className="space-y-4">
                    <FormItem className="space-y-3">
                        <FormLabel>Image Source</FormLabel>
                        <FormControl>
                            <RadioGroup value={imageSource} onValueChange={(v) => setImageSource(v as 'url' | 'upload')} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="url" /></FormControl><FormLabel className="font-normal">From URL</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="upload" /></FormControl><FormLabel className="font-normal">Upload Image</FormLabel></FormItem>
                            </RadioGroup>
                        </FormControl>
                    </FormItem>

                    {imageSource === 'url' ? (
                        <FormField control={form.control} name="imageUrl" render={({ field }) => (
                            <FormItem><FormLabel>Image URL</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    ) : (
                        <FormItem><FormLabel>Upload File</FormLabel><FormControl><Input type="file" accept="image/*" onChange={handleFileChange} /></FormControl><FormMessage /></FormItem>
                    )}

                    <div>
                        <FormLabel>Image Preview</FormLabel>
                        <div className="relative mt-2 h-48 w-full border rounded-lg overflow-hidden bg-muted">
                            {previewUrl ? (
                                <img src={previewUrl} alt="preview" className="object-cover w-full h-full" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.querySelector('.no-image-text')?.removeAttribute('style')}}/>
                            ) : (
                                <div className="no-image-text flex items-center justify-center h-full text-sm text-muted-foreground">No Image</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Text Content */}
                <div className="space-y-4">
                    <FormField name="title" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Page Title</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                    )}/>
                    <FormField name="heading" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Primary Heading</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                    )}/>
                    <FormField name="body" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Body Content</FormLabel><FormControl><Textarea rows={6} {...field}/></FormControl><FormMessage/></FormItem>
                    )}/>
                    <FormField name="missionHeading" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Mission Heading</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                    )}/>
                    <FormField name="missionP" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Mission Paragraph</FormLabel><FormControl><Textarea rows={3} {...field}/></FormControl><FormMessage/></FormItem>
                    )}/>
                </div>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaveDisabled}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
