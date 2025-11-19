
'use client';

import { useFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
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

type VariantFormData = Omit<InventoryVariant, 'id' | 'createdAt' | 'updatedAt' | 'ref' | 'parentItemId' | 'parentName' | 'parentCategory'>;

interface AddEditVariantDialogProps {
  isOpen: boolean;
  onOpenChange: (changed: boolean) => void;
  item: InventoryItem | null;
  variantToEdit?: InventoryVariant | null;
}


export function AddEditVariantDialog({ isOpen, onOpenChange, item, variantToEdit }: AddEditVariantDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialFormState: VariantFormData = {
      brand: '',
      source: '',
      quantity: 0,
      price: 0,
      costPrice: 0,
      warningLimit: 10,
      description: '',
      imageUrl: '',
  };

  const [formState, setFormState] = useState<VariantFormData>(initialFormState);

  useEffect(() => {
    if (isOpen) {
        if (variantToEdit) {
            setFormState({
                brand: variantToEdit.brand || '',
                source: variantToEdit.source || '',
                quantity: variantToEdit.quantity || 0,
                price: variantToEdit.price || 0,
                costPrice: variantToEdit.costPrice || 0,
                warningLimit: variantToEdit.warningLimit || 10,
                description: variantToEdit.description || '',
                imageUrl: variantToEdit.imageUrl || '',
            });
        } else {
            setFormState(initialFormState);
        }
    }
  }, [variantToEdit, isOpen]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prevState => ({ ...prevState, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Parent item is missing.' });
        return;
    }

    setIsSubmitting(true);

    try {
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
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input id="imageUrl" name="imageUrl" placeholder="https://example.com/image.png" value={formState.imageUrl} onChange={handleInputChange} disabled={isSubmitting} />
            </div>

            <div className="space-y-2"><Label htmlFor="brand">Brand</Label><Input id="brand" name="brand" placeholder="e.g., Pilot" value={formState.brand} onChange={handleInputChange} disabled={isSubmitting} /></div>
            <div className="space-y-2"><Label htmlFor="source">Source</Label><Input id="source" name="source" placeholder="e.g., National Bookstore" value={formState.source} onChange={handleInputChange} disabled={isSubmitting} /></div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="quantity">Quantity</Label><Input id="quantity" name="quantity" type="number" value={formState.quantity} onChange={handleInputChange} disabled={isSubmitting} /></div>
             <div className="space-y-2"><Label htmlFor="warningLimit">Warning Limit</Label><Input id="warningLimit" name="warningLimit" type="number" value={formState.warningLimit} onChange={handleInputChange} disabled={isSubmitting} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="costPrice">Cost Price (₱)</Label><Input id="costPrice" name="costPrice" type="number" step="0.01" value={formState.costPrice} onChange={handleInputChange} disabled={isSubmitting} /></div>
            <div className="space-y-2"><Label htmlFor="price">Selling Price (₱)</Label><Input id="price" name="price" type="number" step="0.01" value={formState.price} onChange={handleInputChange} disabled={isSubmitting} /></div>
          </div>
          
          <div className="space-y-2"><Label htmlFor="description">Description (Optional)</Label><Textarea id="description" name="description" placeholder="e.g., G2, 0.5mm, Black Ink" value={formState.description} onChange={handleInputChange} disabled={isSubmitting} /></div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : (variantToEdit ? "Save Changes" : "Add Variant")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
