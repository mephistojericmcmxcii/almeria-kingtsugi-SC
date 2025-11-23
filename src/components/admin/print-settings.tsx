
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { setDoc, doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Skeleton } from '../ui/skeleton';

const formSchema = z.object({
  headerImageUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  footerImageUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

type PrintSettingsFormValues = z.infer<typeof formSchema>;

export function PrintSettings() {
  const { firestore } = useFirebase();
  const { uploadFile } = useAuth();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [footerFile, setFooterFile] = useState<File | null>(null);

  const form = useForm<PrintSettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      headerImageUrl: '',
      footerImageUrl: '',
    },
  });

  const { setValue, watch } = form;
  const headerPreview = watch('headerImageUrl');
  const footerPreview = watch('footerImageUrl');

  useEffect(() => {
    const fetchPrintSettings = async () => {
      setIsLoading(true);
      try {
        const settingsRef = doc(firestore, 'system_settings', 'print_settings');
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
          form.reset(docSnap.data());
        }
      } catch (error) {
        console.error("Failed to fetch print settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrintSettings();
  }, [firestore, form]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'header' | 'footer') => {
      const file = e.target.files?.[0];
      if (file) {
          if (field === 'header') setHeaderFile(file);
          if (field === 'footer') setFooterFile(file);
          
          const reader = new FileReader();
          reader.onloadend = () => {
              setValue(field === 'header' ? 'headerImageUrl' : 'footerImageUrl', reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const onSubmit = async (values: PrintSettingsFormValues) => {
    setIsSubmitting(true);
    try {
      let { headerImageUrl, footerImageUrl } = values;

      if (headerFile) {
        const url = await uploadFile(headerFile, 'print_assets', 'print-header');
        if (url) headerImageUrl = url;
        else throw new Error('Header upload failed.');
      }
      
      if (footerFile) {
        const url = await uploadFile(footerFile, 'print_assets', 'print-footer');
        if (url) footerImageUrl = url;
        else throw new Error('Footer upload failed.');
      }

      const settingsRef = doc(firestore, 'system_settings', 'print_settings');
      await setDoc(settingsRef, { headerImageUrl, footerImageUrl }, { merge: true });

      toast({
        title: "Success",
        description: "Print settings have been updated.",
      });
      setHeaderFile(null);
      setFooterFile(null);

    } catch (error: any) {
      console.error("Error saving print settings:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.message || "Could not save settings.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
      return (
           <Card>
                <CardHeader><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-64 mt-2" /></CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                    <Skeleton className="h-24 w-full border" />
                    <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                    <Skeleton className="h-12 w-full border" />
                </CardContent>
                 <CardFooter><Skeleton className="h-10 w-32" /></CardFooter>
            </Card>
      )
  }

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="font-headline">Print Layout Settings</CardTitle>
            <CardDescription>Manage the header and footer images for all printable documents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <FormField control={form.control} name="headerImageUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Header Image URL</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://example.com/header.png" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormItem>
                <FormLabel>Or Upload Header Image</FormLabel>
                <FormControl>
                  <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'header')} />
                </FormControl>
              </FormItem>
               {headerPreview && (
                <div>
                  <FormLabel>Header Preview</FormLabel>
                  <div className="mt-2 border rounded-lg p-2 bg-muted">
                    <img src={headerPreview} alt="Header Preview" className="max-w-full h-auto" />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <FormField control={form.control} name="footerImageUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Footer Image URL</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://example.com/footer.png" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormItem>
                <FormLabel>Or Upload Footer Image</FormLabel>
                <FormControl>
                  <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'footer')} />
                </FormControl>
              </FormItem>
              {footerPreview && (
                <div>
                  <FormLabel>Footer Preview</FormLabel>
                  <div className="mt-2 border rounded-lg p-2 bg-muted">
                    <img src={footerPreview} alt="Footer Preview" className="max-w-full h-auto" />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
