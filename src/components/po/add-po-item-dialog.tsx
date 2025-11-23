
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirebase } from '@/firebase';
import { writeBatch, doc, collection, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { cn } from '@/lib/utils';
import type { PurchaseOrderItem } from '@/lib/types';


const poItemSchema = z.object({
  itemType: z.enum(['general', 'misc']),
  name: z.string().min(1, 'Item name is required.'),
  unit: z.string().optional(),
  quantity: z.preprocess(
    (val) => (val === '' ? undefined : parseInt(String(val), 10)),
    z.number().optional()
  ),
  amount: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().min(0, 'Cost/Amount cannot be negative.')
  ),
  description: z.string().optional(),
});

const formSchema = z.object({
  items: z.array(poItemSchema).min(1, 'You must add at least one item.'),
}).refine(data => {
    return data.items.every(item => {
        if (item.itemType === 'general') {
            return item.unit && item.unit.length > 0 && item.quantity && item.quantity > 0;
        }
        return true;
    });
}, {
    message: "Unit and Quantity are required for General items.",
    // This path is tricky for field arrays. We'll show a general error at the bottom.
});

type FormValues = z.infer<typeof formSchema>;

interface AddPoItemDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  poId: string;
  onSuccess: () => void;
}

export function AddPoItemDialog({ isOpen, onOpenChange, poId, onSuccess }: AddPoItemDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: [{ itemType: 'general', name: '', unit: '', quantity: 1, amount: 0, description: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  
  const watchedItems = form.watch('items');

  useEffect(() => {
    if (!isOpen) {
      form.reset({ items: [{ itemType: 'general', name: '', unit: '', quantity: 1, amount: 0, description: '' }] });
    }
  }, [isOpen, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    const batch = writeBatch(firestore);
    const poItemsCollectionRef = collection(firestore, 'purchase_orders', poId, 'items');

    values.items.forEach(item => {
      const newItemRef = doc(poItemsCollectionRef);
      const dataToSave: Partial<PurchaseOrderItem> = {
          itemType: item.itemType,
          name: item.name,
          amount: item.amount,
          description: item.description,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
      };
      
      if (item.itemType === 'general') {
        dataToSave.unit = item.unit;
        dataToSave.quantity = item.quantity;
        dataToSave.actualAmount = 0; // Default actualAmount for general items
      } else {
        // For misc items, amount is the total cost
        dataToSave.actualAmount = item.amount;
      }
      
      batch.set(newItemRef, dataToSave);
    });

    try {
      await batch.commit();
      toast({
        title: 'Items Added',
        description: 'The new items have been added to the purchase order.',
      });
      onSuccess();
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
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add Items to Purchase Order</DialogTitle>
          <DialogDescription>Add general items or miscellaneous costs to this PO.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4">
              {fields.map((field, index) => {
                const itemType = watchedItems[index]?.itemType;
                return (
                <div key={field.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <FormField
                        control={form.control}
                        name={`items.${index}.itemType`}
                        render={({ field }) => (
                           <FormItem>
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex items-center space-x-4"
                                    >
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value="general" /></FormControl>
                                            <FormLabel className="font-normal">General Item</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value="misc" /></FormControl>
                                            <FormLabel className="font-normal">Miscellaneous Cost</FormLabel>
                                        </FormItem>
                                    </RadioGroup>
                                </FormControl>
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
                  <div className={cn(
                    "grid items-end gap-2",
                    itemType === 'general' ? "grid-cols-[2fr,1fr,1fr,1fr,2fr]" : "grid-cols-[2fr,2fr,1fr]"
                  )}>
                    <FormField control={form.control} name={`items.${index}.name`} render={({ field }) => (
                        <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="e.g., Bond Paper" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    
                    {itemType === 'general' && (
                        <>
                        <FormField control={form.control} name={`items.${index}.unit`} render={({ field }) => (
                            <FormItem><FormLabel>Unit</FormLabel><FormControl><Input placeholder="ream" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (
                            <FormItem><FormLabel>Qty</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        </>
                    )}
                    
                    <FormField control={form.control} name={`items.${index}.amount`} render={({ field }) => (
                      <FormItem>
                          <FormLabel>{itemType === 'general' ? 'Allocated' : 'Cost'}</FormLabel>
                          <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                          <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`items.${index}.description`} render={({ field }) => (
                      <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl><Input placeholder={itemType === 'general' ? 'Brand/Model' : 'e.g., Transportation'} {...field} /></FormControl>
                          <FormMessage />
                      </FormItem>
                    )}/>
                  </div>
                </div>
              )})}
            </div>
            {form.formState.errors.items?.root && <p className="text-sm font-medium text-destructive">{form.formState.errors.items.root.message}</p>}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ itemType: 'general', name: '', unit: '', quantity: 1, amount: 0, description: '' })}
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
