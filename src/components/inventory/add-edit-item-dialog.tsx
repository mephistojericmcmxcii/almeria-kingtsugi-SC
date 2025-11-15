
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
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Item name must be at least 2 characters.' }),
  category: z.string().min(2, { message: 'Category is required.' }),
  quantity: z.coerce.number().int().min(0, { message: 'Quantity must be a positive number.' }),
  price: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
  description: z.string().optional(),
});

type AddEditItemFormValues = z.infer<typeof formSchema>;

interface AddEditItemDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddEditItemDialog({ isOpen, onOpenChange }: AddEditItemDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AddEditItemFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      category: '',
      quantity: 0,
      price: 0,
      description: '',
    },
  });

  const onSubmit = async (values: AddEditItemFormValues) => {
    setIsSubmitting(true);
    try {
      const docId = values.name.toLowerCase().replace(/\s+/g, '-');
      const itemRef = doc(firestore, 'inventory', docId);

      await setDoc(itemRef, {
        name: values.name,
        category: values.category,
        quantity: values.quantity,
        price: values.price,
        description: values.description || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Item Added",
        description: `${values.name} has been added to the inventory.`,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding item:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not add the item. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDialogClose = (open: boolean) => {
    if (isSubmitting) return;
    form.reset();
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Inventory Item</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new item to your inventory. The item name will be used as its unique ID.
          </DialogDescription>
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
                    <Input placeholder="e.g., Ceramic Bowl" {...field} />
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
                  <FormControl>
                    <Input placeholder="e.g., Pottery" {...field} />
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the item..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleDialogClose(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Item"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
    