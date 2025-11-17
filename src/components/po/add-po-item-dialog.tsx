
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirebase } from '@/firebase';
import { writeBatch, doc, collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';

const poItemSchema = z.object({
  name: z.string().min(1, 'Item name is required.'),
  brand: z.string().optional(),
  model: z.string().optional(),
  unit: z.string().min(1, 'Unit is required.'),
  quantity: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().positive('Quantity must be positive.')
  ),
  amount: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().positive('Amount must be positive.')
  ),
});

const formSchema = z.object({
  items: z.array(poItemSchema).min(1, 'You must add at least one item.'),
});

type FormValues = z.infer<typeof formSchema>;

interface AddPoItemDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  poId: string;
}

export function AddPoItemDialog({ isOpen, onOpenChange, poId }: AddPoItemDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: [{ name: '', brand: '', model: '', unit: '', quantity: 1, amount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset({ items: [{ name: '', brand: '', model: '', unit: '', quantity: 1, amount: 0 }] });
    }
  }, [isOpen, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    const batch = writeBatch(firestore);
    const poItemsCollectionRef = collection(firestore, 'purchase_orders', poId, 'items');

    values.items.forEach(item => {
      const newItemRef = doc(poItemsCollectionRef);
      batch.set(newItemRef, item);
    });

    try {
      await batch.commit();
      toast({
        title: 'Items Added',
        description: 'The new items have been added to the purchase order.',
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to add PO items:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error.message || 'Could not add the items. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Add Items to Purchase Order</DialogTitle>
          <DialogDescription>Add one or more line items to this PO.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-2 p-2 border rounded-lg">
                  <FormField
                    control={form.control}
                    name={`items.${index}.name`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        {index === 0 && <label className="text-sm font-medium">Item Name</label>}
                        <FormControl>
                          <Input placeholder="e.g., Bond Paper" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name={`items.${index}.brand`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        {index === 0 && <label className="text-sm font-medium">Brand (Optional)</label>}
                        <FormControl>
                          <Input placeholder="e.g., Pilot" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name={`items.${index}.model`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        {index === 0 && <label className="text-sm font-medium">Model (Optional)</label>}
                        <FormControl>
                          <Input placeholder="e.g., G2" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.unit`}
                    render={({ field }) => (
                      <FormItem className="w-24">
                        {index === 0 && <label className="text-sm font-medium">Unit</label>}
                        <FormControl>
                          <Input placeholder="e.g., ream" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem className="w-20">
                        {index === 0 && <label className="text-sm font-medium">Qty</label>}
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.amount`}
                    render={({ field }) => (
                      <FormItem className="w-28">
                        {index === 0 && <label className="text-sm font-medium">Amount (per unit)</label>}
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
             <FormMessage>{form.formState.errors.items?.root?.message}</FormMessage>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: '', brand: '', model: '', unit: '', quantity: 1, amount: 0 })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Another Item
            </Button>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Items'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    