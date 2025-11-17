
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

import type { HomePageSettings } from '@/app/(app)/home/page';

const formSchema = z.object({
  welcomeTitle: z.string().optional(),
  welcomeSubtitle: z.string().optional(),
  backgroundUrl: z.string().url({ message: "Please enter a valid URL." }),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  verticalAlign: z.enum(['top', 'center', 'bottom']).optional(),
  titleSize: z.number().min(4).max(9).optional(),
});


export function EditHomeDialog({ isOpen, onOpenChange, content }: { isOpen: boolean, onOpenChange: (open: boolean) => void, content: HomePageSettings }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      welcomeTitle: content.welcomeTitle || '',
      welcomeSubtitle: content.welcomeSubtitle || '',
      backgroundUrl: content.backgroundUrl || '',
      textAlign: content.textAlign || 'center',
      verticalAlign: content.verticalAlign || 'center',
      titleSize: content.titleSize || 7,
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
      });
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
          <DialogDescription>Update your home page background and welcome text.</DialogDescription>
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

    