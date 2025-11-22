
'use client';

import { useAuth } from '@/hooks/use-auth';
import { setDoc, doc, collection, serverTimestamp, runTransaction, Transaction } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import type { InventoryItem, InventoryVariant } from '@/lib/types';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { useFirebase } from '@/firebase';

type VariantFormData = Omit<InventoryVariant, 'id' | 'createdAt' | 'updatedAt' | 'ref' | 'parentItemId' | 'parentName' | 'parentCategory'>;

interface AddEditVariantDialogProps {
  isOpen: boolean;
  onOpenChange: (changed: boolean) => void;
  item: InventoryItem | null;
  variantToEdit?: InventoryVariant | null;
}

const compressImage = (file: File, quality = 0.7, maxSizeKB = 300): Promise<File> => {
    return new Promise((resolve, reject) => {
        if (file.size / 1024 <= maxSizeKB) {
            resolve(file);
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }
                ctx.drawImage(img, 0, 0);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const newFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        // If it's still too large, we could add recursive compression logic here
                        // but for now, one pass is often enough.
                        resolve(newFile);
                    } else {
                        reject(new Error('Canvas to Blob conversion failed'));
                    }
                }, 'image/jpeg', quality);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};


export function AddEditVariantDialog({ isOpen, onOpenChange, item, variantToEdit }: AddEditVariantDialogProps) {
  const { firestore } = useFirebase();
  const { uploadFile } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialFormState: VariantFormData = {
      variation: '',
      brand: '',
      model: '',
      source: '',
      quantity: 0,
      price: 0,
      costPrice: 0,
      warningLimit: 10,
      description: '',
      imageUrl: '',
  };

  const [formState, setFormState] = useState<VariantFormData>(initialFormState);
  const [imageSource, setImageSource] = useState<'url' | 'upload'>('url');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  useEffect(() => {
    if (isOpen) {
        const initialState = variantToEdit ? {
            variation: variantToEdit.variation || '',
            brand: variantToEdit.brand || '',
            model: variantToEdit.model || '',
            source: variantToEdit.source || '',
            quantity: variantToEdit.quantity || 0,
            price: variantToEdit.price || 0,
            costPrice: variantToEdit.costPrice || 0,
            warningLimit: variantToEdit.warningLimit || 10,
            description: variantToEdit.description || '',
            imageUrl: variantToEdit.imageUrl || '',
        } : initialFormState;

        setFormState(initialState);
        setFileToUpload(null);
        setPreviewUrl(initialState.imageUrl || null);
        setImageSource(initialState.imageUrl ? 'url' : 'upload');

    }
  }, [variantToEdit, isOpen]);
  
  useEffect(() => {
    if (imageSource === 'url') {
      setPreviewUrl(formState.imageUrl || null);
    }
  }, [formState.imageUrl, imageSource]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prevState => ({ ...prevState, [name]: value }));
  };
  
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Parent item is missing.' });
        return;
    }
    if (!formState.variation) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Variation field is required.' });
        return;
    }

    setIsSubmitting(true);

    try {
        let finalImageUrl = formState.imageUrl;

        if (imageSource === 'upload' && fileToUpload) {
            toast({ title: 'Compressing Image...', description: 'Please wait.'});
            const compressedFile = await compressImage(fileToUpload);
            const downloadUrl = await uploadFile(compressedFile, `inventory_images/${item.id}`);
            if (downloadUrl) {
                finalImageUrl = downloadUrl;
            } else {
                throw new Error("File upload failed, please try again.");
            }
        }
        
        const itemRef = doc(firestore, 'inventory', item.id);

        await runTransaction(firestore, async (transaction: Transaction) => {
            const itemDoc = await transaction.get(itemRef);
            if (!itemDoc.exists()) {
                throw new Error("Parent item does not exist.");
            }

            const currentTotalStock = itemDoc.data().totalStock || 0;
            const currentVariantCount = itemDoc.data().variantCount || 0;
            const oldQuantity = variantToEdit ? variantToEdit.quantity : 0;
            const newQuantity = Number(formState.quantity) || 0;

            const variantCollectionRef = collection(firestore, 'inventory', item.id, 'variants');
            const variantId = variantToEdit ? variantToEdit.id : doc(variantCollectionRef).id;
            const variantRef = doc(variantCollectionRef, variantId);

            const dataToSave: Omit<InventoryVariant, 'id' | 'ref'> = {
                ...formState,
                imageUrl: finalImageUrl,
                parentItemId: item.id,
                parentName: item.name,
                parentCategory: item.category,
                quantity: newQuantity,
                price: Number(formState.price) || 0,
                costPrice: Number(formState.costPrice) || 0,
                warningLimit: Number(formState.warningLimit) || 0,
                updatedAt: serverTimestamp(),
                createdAt: variantToEdit ? variantToEdit.createdAt : serverTimestamp(),
            };

            transaction.set(variantRef, dataToSave, { merge: true });
            
            const stockDifference = newQuantity - oldQuantity;
            const newTotalStock = currentTotalStock + stockDifference;
            const newVariantCount = variantToEdit ? currentVariantCount : currentVariantCount + 1;

            transaction.update(itemRef, {
                totalStock: newTotalStock,
                variantCount: newVariantCount,
                updatedAt: serverTimestamp()
            });
        });

        toast({
            title: variantToEdit ? 'Variant Updated' : 'Variant Added',
            description: `The variant has been saved to ${item.name}.`,
        });
      
        onOpenChange(true); // Signal that a change was made

    } catch (error: any) {
        console.error('Failed to save variant:', error);
        toast({
            variant: 'destructive',
            title: 'Save Failed',
            description: error.message || 'Could not save the variant data. Please try again.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleDialogClose = (open: boolean) => {
    if (isSubmitting) return;
    onOpenChange(false); // Signal no change on manual close
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
        <form onSubmit={onSubmit} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
            <div className="space-y-3">
              <Label>Image Source</Label>
               <RadioGroup value={imageSource} onValueChange={(v) => setImageSource(v as 'url' | 'upload')} className="flex space-x-4">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="url" id="url" />
                        <Label htmlFor="url">From URL</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="upload" id="upload" />
                        <Label htmlFor="upload">Upload Image</Label>
                    </div>
                </RadioGroup>
            </div>

            {imageSource === 'url' ? (
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input id="imageUrl" name="imageUrl" placeholder="https://example.com/image.png" value={formState.imageUrl} onChange={handleInputChange} disabled={isSubmitting} />
                </div>
            ) : (
                <div className="space-y-2">
                    <Label htmlFor="imageUpload">Upload File</Label>
                    <Input id="imageUpload" name="imageUpload" type="file" accept="image/*" onChange={handleFileChange} disabled={isSubmitting} />
                </div>
            )}
            
            {previewUrl && (
              <div className="space-y-2">
                <Label>Image Preview</Label>
                <div className="relative mt-2 h-40 w-full border rounded-lg overflow-hidden bg-muted">
                    <img src={previewUrl} alt="preview" className="object-cover w-full h-full" />
                </div>
              </div>
            )}

            <div className="space-y-2"><Label htmlFor="variation">Variation</Label><Input id="variation" name="variation" placeholder="e.g., Red, XL, 500g" value={formState.variation} onChange={handleInputChange} disabled={isSubmitting} required /></div>
            <div className="space-y-2"><Label htmlFor="brand">Brand</Label><Input id="brand" name="brand" placeholder="e.g., Pilot" value={formState.brand} onChange={handleInputChange} disabled={isSubmitting} /></div>
            <div className="space-y-2"><Label htmlFor="model">Model (Optional)</Label><Input id="model" name="model" placeholder="e.g., G2" value={formState.model} onChange={handleInputChange} disabled={isSubmitting} /></div>
            <div className="space-y-2"><Label htmlFor="source">Source</Label><Input id="source" name="source" placeholder="e.g., National Bookstore" value={formState.source} onChange={handleInputChange} disabled={isSubmitting} /></div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="quantity">Quantity</Label><Input id="quantity" name="quantity" type="number" value={formState.quantity} onChange={handleInputChange} disabled={isSubmitting} /></div>
             <div className="space-y-2"><Label htmlFor="warningLimit">Warning Limit</Label><Input id="warningLimit" name="warningLimit" type="number" value={formState.warningLimit} onChange={handleInputChange} disabled={isSubmitting} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="costPrice">Cost Price (₱)</Label><Input id="costPrice" name="costPrice" type="number" step="0.01" value={formState.costPrice} onChange={handleInputChange} disabled={isSubmitting} /></div>
            <div className="space-y-2"><Label htmlFor="price">Selling Price (₱)</Label><Input id="price" name="price" type="number" step="0.01" value={formState.price} onChange={handleInputChange} disabled={isSubmitting} /></div>
          </div>
          
          <div className="space-y-2"><Label htmlFor="description">Description / Specifications (Optional)</Label><Textarea id="description" name="description" placeholder="e.g., 0.5mm, Black Ink" value={formState.description} onChange={handleInputChange} disabled={isSubmitting} /></div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || (imageSource === 'upload' && !fileToUpload && !variantToEdit?.imageUrl) || !formState.variation}>
              {isSubmitting ? "Saving..." : (variantToEdit ? "Save Changes" : "Add Variant")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    