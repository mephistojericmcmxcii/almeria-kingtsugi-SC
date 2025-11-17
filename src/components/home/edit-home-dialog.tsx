
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/hooks/use-auth';
import { Separator } from '../ui/separator';

import type { HomePageSettings } from '@/app/(app)/home/page';

const formSchema = z.object({
  welcomeTitle: z.string().optional(),
  welcomeSubtitle: z.string().optional(),
  backgroundUrl: z.string().url({ message: "Please enter a valid URL." }),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  verticalAlign: z.enum(['top', 'center', 'bottom']).optional(),
  titleSize: z.number().min(4).max(9).optional(),
  footerText: z.string().optional(),
  footerTextAlign: z.enum(['left', 'center', 'right']).optional(),
});


export function EditHomeDialog({ isOpen, onOpenChange, content }: { isOpen: boolean, onOpenChange: (open: boolean) => void, content: HomePageSettings }) {
  const { firestore } = useFirebase();
  const { uploadImage } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageSource, setImageSource] = useState<'url' | 'upload'>('url');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      welcomeTitle: content.welcomeTitle || '',
      welcomeSubtitle: content.welcomeSubtitle || '',
      backgroundUrl: content.backgroundUrl || '',
      textAlign: content.textAlign || 'center',
      verticalAlign: content.verticalAlign || 'center',
      titleSize: content.titleSize || 7,
      footerText: content.footerText || '',
      footerTextAlign: content.footerTextAlign || 'center',
    },
  });
  
  const backgroundUrl = form.watch('backgroundUrl');
  const titleSize = form.watch('titleSize');

  useEffect(() => {
    if (isOpen) {
      form.reset({
        welcomeTitle: content.welcomeTitle || '',
        welcomeSubtitle: content.welcomeSubtitle || '',
        backgroundUrl: content.backgroundUrl || '',
        textAlign: content.textAlign || 'center',
        verticalAlign: content.verticalAlign || 'center',
        titleSize: content.titleSize || 7,
        footerText: content.footerText || `© ${new Date().getFullYear()} Kintsugi Variety Shop. All Rights Reserved.`,
        footerTextAlign: content.footerTextAlign || 'center',
      });
      setPreviewUrl(content.backgroundUrl);
      setImageSource('url');
      setFileToUpload(null);
    }
  }, [isOpen, content, form]);
  
  useEffect(() => {
      if (imageSource === 'url') {
          setPreviewUrl(backgroundUrl);
      }
  }, [backgroundUrl, imageSource]);

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
    let finalBackgroundUrl = values.backgroundUrl;

    try {
        if (imageSource === 'upload' && fileToUpload) {
            const downloadUrl = await uploadImage(fileToUpload, 'homepage_backgrounds');
            if (downloadUrl) {
                finalBackgroundUrl = downloadUrl;
            } else {
                throw new Error("File upload failed, please try again.");
            }
        }
        
        const homeRef = doc(firestore, "system_settings", "home_page");
        await setDoc(homeRef, { ...values, backgroundUrl: finalBackgroundUrl }, { merge: true });

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
  
  const isSaveDisabled = isSubmitting || (imageSource === 'upload' && !fileToUpload);

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Home Page</DialogTitle>
          <DialogDescription>Update your home page background, text, and footer.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
            
            <FormField name="welcomeTitle" control={form.control} render={({ field }) => (
            <FormItem><FormLabel>Welcome Title (Optional)</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
            )}/>
            
            <FormField name="welcomeSubtitle" control={form.control} render={({ field }) => (
            <FormItem><FormLabel>Welcome Subtitle (Optional)</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
            )}/>

             <FormField
                control={form.control}
                name="titleSize"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Title Size: {titleSize}</FormLabel>
                        <FormControl>
                            <Slider
                                min={4}
                                max={9}
                                step={1}
                                value={[field.value || 7]}
                                onValueChange={(vals) => field.onChange(vals[0])}
                            />
                        </FormControl>
                    </FormItem>
                )}
            />

            <div className="grid grid-cols-2 gap-6">
                 <FormField
                    control={form.control}
                    name="textAlign"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>Horizontal Align</FormLabel>
                            <FormControl>
                                <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex space-x-2"
                                >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="left" /></FormControl>
                                    <FormLabel className="font-normal">Left</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="center" /></FormControl>
                                    <FormLabel className="font-normal">Center</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="right" /></FormControl>
                                    <FormLabel className="font-normal">Right</FormLabel>
                                </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
                 <FormField
                    control={form.control}
                    name="verticalAlign"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>Vertical Align</FormLabel>
                            <FormControl>
                                <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex space-x-2"
                                >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="top" /></FormControl>
                                    <FormLabel className="font-normal">Top</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="center" /></FormControl>
                                    <FormLabel className="font-normal">Center</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="bottom" /></FormControl>
                                    <FormLabel className="font-normal">Bottom</FormLabel>
                                </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
            </div>
            
            <FormItem className="space-y-3">
                <FormLabel>Background Image</FormLabel>
                <FormControl>
                    <RadioGroup value={imageSource} onValueChange={(v) => setImageSource(v as 'url' | 'upload')} className="flex space-x-4">
                         <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="url" /></FormControl>
                            <FormLabel className="font-normal">From URL</FormLabel>
                        </FormItem>
                         <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="upload" /></FormControl>
                            <FormLabel className="font-normal">Upload Image</FormLabel>
                        </FormItem>
                    </RadioGroup>
                </FormControl>
            </FormItem>


            {imageSource === 'url' ? (
                <FormField
                control={form.control}
                name="backgroundUrl"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                        <Input placeholder="https://images.unsplash.com/..." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            ) : (
                 <FormItem>
                    <FormLabel>Upload File</FormLabel>
                    <FormControl>
                        <Input type="file" accept="image/*" onChange={handleFileChange} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}

            <div>
              <FormLabel>Image Preview</FormLabel>
                <div className="relative mt-2 h-40 w-full border rounded-lg overflow-hidden bg-muted">
                  {previewUrl ? (
                      <img src={previewUrl} alt="preview" className="object-cover w-full h-full" onError={(e) => (e.currentTarget.style.display = 'none')}/>
                  ) : (
                      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                        No Image
                      </div>
                  )}
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Footer Settings</h3>
                <FormField name="footerText" control={form.control} render={({ field }) => (
                    <FormItem>
                        <FormLabel>Footer Text (Optional)</FormLabel>
                        <FormControl><Input placeholder="e.g. © 2024 My Company" {...field}/></FormControl>
                        <FormMessage/>
                    </FormItem>
                )}/>
                 <FormField
                    control={form.control}
                    name="footerTextAlign"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>Footer Text Align</FormLabel>
                            <FormControl>
                                <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex space-x-2"
                                >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="left" /></FormControl>
                                    <FormLabel className="font-normal">Left</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="center" /></FormControl>
                                    <FormLabel className="font-normal">Center</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="right" /></FormControl>
                                    <FormLabel className="font-normal">Right</FormLabel>
                                </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
            </div>


            <DialogFooter className="pt-4">
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
