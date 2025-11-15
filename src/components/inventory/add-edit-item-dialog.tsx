
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirebase } from '@/firebase';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import type { InventoryItem } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Item name must be at least 2 characters.' }),
  category: z.string().min(2, { message: 'Category is required.' }),
  otherCategory: z.string().optional(),
  description: z.string().optional(),
}).refine(data => {
    if (data.category === 'Other' && (!data.otherCategory || data.otherCategory.length < 2)) {
        return false;
    }
    return true;
}, {
    message: 'Please specify the other category (min. 2 characters).',
    path: ['otherCategory'],
});


type AddEditItemFormValues = z.infer<typeof formSchema>;

interface AddEditItemDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  itemToEdit?: InventoryItem | null;
}

const PREDEFINED_CATEGORIES = ["Pottery", "Textiles", "Woodcraft", "Jewelry", "Other"];

export function AddEditItemDialog({ isOpen, onOpenChange, itemToEdit }: AddEditItemDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AddEditItemFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      category: '',
      otherCategory: '',
      description: '',
    },
  });

  const categoryValue = form.watch('category');
  
  useEffect(() => {
    if (itemToEdit) {
      const isPredefined = PREDEFINED_CATEGORIES.includes(itemToEdit.category);
      form.reset({
        name: itemToEdit.name,
        category: isPredefined ? itemToEdit.category : 'Other',
        otherCategory: isPredefined ? '' : itemToEdit.category,
        description: itemToEdit.description || '',
      });
    } else {
      form.reset({
        name: '',
        category: '',
        otherCategory: '',
        description: '',
      });
    }
  }, [itemToEdit, form, isOpen]);


  const onSubmit = async (values: AddEditItemFormValues) => {
    setIsSubmitting(true);
    try {
      const docId = itemToEdit ? itemToEdit.id : values.name.toLowerCase().replace(/\s+/g, '-');
      const itemRef = doc(firestore, 'inventory', docId);

      const finalCategory = values.category === 'Other' ? values.otherCategory : values.category;

      const dataToSave = {
        name: values.name,
        category: finalCategory,
        description: values.description || '',
        updatedAt: serverTimestamp(),
        ...( !itemToEdit && { createdAt: serverTimestamp() })
      };

      await setDoc(itemRef, dataToSave, { merge: true });

      toast({
        title: itemToEdit ? "Item Updated" : "Item Added",
        description: `${values.name} has been ${itemToEdit ? 'updated' : 'added'}.`,
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving item:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save the item. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDialogClose = (open: boolean) => {
    if (isSubmitting) return;
    onOpenChange(open);
  }

  const title = itemToEdit ? "Edit Parent Item" : "Add New Parent Item";
  const description = itemToEdit ? "Update the details for this parent item." : "Fill in the details below to add a new parent item to your inventory.";

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Ceramic Bowl" {...field} disabled={!!itemToEdit} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PREDEFINED_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat === 'Other' ? 'Other...' : cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {categoryValue === 'Other' && (
               <FormField
                control={form.control}
                name="otherCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Category</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Kintsugi Art" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
           
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the parent item..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleDialogClose(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : (itemToEdit ? "Save Changes" : "Add Item")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
