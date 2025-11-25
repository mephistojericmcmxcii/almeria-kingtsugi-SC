
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { setDoc, doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Skeleton } from '../ui/skeleton';

const formSchema = z.object({
  logoUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

type BrandSettingsFormValues = z.infer<typeof formSchema>;

export function BrandSettings() {
  const { firestore } = useFirebase();
  const { uploadFile } = useAuth();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const form = useForm<BrandSettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      logoUrl: '',
    },
  });

  const { setValue, watch } = form;
  const logoPreview = watch('logoUrl');

  useEffect(() => {
    const fetchBrandSettings = async () => {
      setIsLoading(true);
      try {
        const settingsRef = doc(firestore, 'system_settings', 'brand_logo');
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
          form.reset(docSnap.data());
        }
      } catch (error) {
        console.error("Failed to fetch brand settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBrandSettings();
  }, [firestore, form]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setLogoFile(file);
          const reader = new FileReader();
          reader.onloadend = () => {
              setValue('logoUrl', reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const onSubmit = async (values: BrandSettingsFormValues) => {
    setIsSubmitting(true);
    try {
      let finalLogoUrl = values.logoUrl;

      if (logoFile) {
        const url = await uploadFile(logoFile, 'brand_assets', 'brand-logo');
        if (url) {
          finalLogoUrl = url;
        } else {
          throw new Error('Logo upload failed.');
        }
      }

      const settingsRef = doc(firestore, 'system_settings', 'brand_logo');
      await setDoc(settingsRef, { logoUrl: finalLogoUrl }, { merge: true });

      toast({
        title: "Success",
        description: "Branding settings have been updated.",
      });
      setLogoFile(null);
      // Manually trigger a reload to ensure the new logo shows up in the sidebar
      window.location.reload(); 

    } catch (error: any) {
      console.error("Error saving brand settings:", error);
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
            <CardTitle className="font-headline">Branding</CardTitle>
            <CardDescription>Manage the brand logo for the sidebar header.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <FormField control={form.control} name="logoUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand Logo URL</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://example.com/logo.png" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormItem>
                <FormLabel>Or Upload Logo</FormLabel>
                <FormControl>
                  <Input type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={handleFileChange} />
                </FormControl>
                 <FormDescription>Recommended height: 40-50px. The image will be constrained by height.</FormDescription>
              </FormItem>
               {logoPreview && (
                <div>
                  <FormLabel>Logo Preview</FormLabel>
                  <div className="mt-2 border rounded-lg p-4 bg-muted flex items-center justify-center">
                    <img src={logoPreview} alt="Logo Preview" className="max-h-12" />
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
