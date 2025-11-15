
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirebase } from '@/firebase';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { setDoc, doc, collection, serverTimestamp } from 'firebase/firestore';
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
import type { InventoryItem, InventoryVariant } from '@/lib/types';
import { Upload, X } from 'lucide-react';
import Image from 'next/image';

const formSchema = z.object({
  brand: z.string().min(2, { message: 'Brand must be at least 2 characters.' }),
  source: z.string().min(2, { message: 'Source is required.' }),
  quantity: z.coerce.number().int().min(0, { message: 'Quantity must be a positive number.' }),
  price: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
  warningLimit: z.coerce.number().int().min(0, { message: 'Warning limit must be a positive number.' }),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
});

type AddEditVariantFormValues = z.infer<typeof formSchema>;

interface AddEditVariantDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  variantToEdit?: InventoryVariant | null;
}

export function AddEditVariantDialog({ isOpen, onOpenChange, item, variantToEdit }: AddEditVariantDialogProps) {
  const { firebaseApp, firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<AddEditVariantFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      brand: '',
      source: '',
      quantity: 0,
      price: 0,
      warningLimit: 10,
      description: '',
      imageUrl: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
        if (variantToEdit) {
            form.reset({
                brand: variantToEdit.brand || '',
                source: variantToEdit.source || '',
                quantity: variantToEdit.quantity || 0,
                price: variantToEdit.price || 0,
                warningLimit: variantToEdit.warningLimit || 0,
                description: variantToEdit.description || '',
                imageUrl: variantToEdit.imageUrl || '',
            });
            if (variantToEdit.imageUrl) {
                setImagePreview(variantToEdit.imageUrl);
            }
        } else {
            form.reset({
                brand: '',
                source: '',
                quantity: 0,
                price: 0,
                warningLimit: 10,
                description: '',
                imageUrl: '',
            });
        }
    } else {
        // Reset image state when dialog closes
        setImagePreview(null);
        setImageFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  }, [variantToEdit, form, isOpen]);


  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    if (file.size > 2 * 1024 * 1024) { // 2MB
        toast({
            variant: "destructive",
            title: "Image Too Large",
            description: "Please select an image smaller than 2MB.",
        });
        return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    form.setValue('imageUrl', '');
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };


  const onSubmit = async (values: AddEditVariantFormValues) => {
      if (!item) {
          toast({ variant: "destructive", title: "Error", description: "Parent item not found." });
          return;
      }

    setIsSubmitting(true);
    let finalImageUrl = variantToEdit?.imageUrl || '';

    try {
        if (imageFile) {
            const storage = getStorage(firebaseApp);
            const imageFileName = `${item.id}-${Date.now()}-${imageFile.name}`;
            const imageStorageRef = storageRef(storage, `inventory-variant-images/${imageFileName}`);
            
            const uploadResult = await uploadBytes(imageStorageRef, imageFile);
            finalImageUrl = await getDownloadURL(uploadResult.ref);
        } else if (!imagePreview && variantToEdit?.imageUrl) {
            // Image was removed, so clear the URL
            finalImageUrl = '';
        }

      const variantCollectionRef = collection(firestore, 'inventory', item.id, 'variants');
      const variantRef = variantToEdit ? doc(variantCollectionRef, variantToEdit.id) : doc(variantCollectionRef);

      const dataToSave = {
        brand: values.brand,
        source: values.source,
        quantity: values.quantity,
        price: values.price,
        warningLimit: values.warningLimit,
        imageUrl: finalImageUrl,
        description: values.description || '',
        updatedAt: serverTimestamp(),
        ...(!variantToEdit && { createdAt: serverTimestamp() })
      };

      await setDoc(variantRef, dataToSave, { merge: true });

      toast({
        title: variantToEdit ? "Variant Updated" : "Variant Added",
        description: `The variant has been saved to ${item.name}.`,
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving variant:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save the variant. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDialogClose = (open: boolean) => {
    if (isSubmitting) return;
    onOpenChange(open);
  }

  const title = variantToEdit ? `Edit Variant` : `Add New Variant to ${item?.name}`;
  const description = "Fill in the details for this specific item variant.";

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        {isSubmitting && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-20 rounded-lg">
                <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-4 text-muted-foreground">Saving variant...</p>
            </div>
        )}
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormItem>
              <FormLabel>Variant Image</FormLabel>
              <FormControl>
                <div className="flex items-center gap-4">
                  <div className="relative h-24 w-24 rounded-md border-dashed border-2 flex items-center justify-center text-muted-foreground overflow-hidden">
                    {imagePreview ? (
                      <>
                        <Image src={imagePreview} alt="Variant preview" fill style={{objectFit: "cover"}} />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-0 right-0 h-6 w-6 z-10"
                          onClick={removeImage}
                          disabled={isSubmitting}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
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
                  />
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                    {imagePreview ? 'Change Image' : 'Upload Image'}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>

            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Pilot" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., National Bookstore" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (₱)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
              control={form.control}
              name="warningLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Warning Limit</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., G2, 0.5mm, Black Ink" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleDialogClose(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : (variantToEdit ? "Save Changes" : "Add Variant")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
