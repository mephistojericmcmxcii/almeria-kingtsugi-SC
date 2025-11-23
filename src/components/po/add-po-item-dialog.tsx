
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
  name: z.string().min(1, 'Item name is required.'),
  unit: z.string().optional(),
  quantity: z.preprocess(
    (val) => (val === '' ? undefined : parseInt(String(val), 10)),
    z.number().optional()
  ),
  amount: z.preprocess(
    (a) => parseFloat(z.string().parse(a === '' ? '0' : a)),
    z.number().min(0, 'Cost/Amount cannot be negative.')
  ),
  description: z.string().optional(),
});

const formSchema = z.object({
  itemType: z.enum(['general', 'misc']),
  items: z.array(poItemSchema).min(1, 'You must add at least one item.'),
}).refine(data => {
    if (data.itemType === 'general') {
        return data.items.every(item => item.unit && item.unit.length > 0 && item.quantity && item.quantity > 0);
    }
    return true;
}, {
    message: "Unit and Quantity are required for General items.",
    path: ['items']
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
      itemType: 'general',
      items: [{ name: '', unit: '', quantity: 1, amount: 0, description: '' }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  
  const itemType = form.watch('itemType');

  useEffect(() => {
    if (!isOpen) {
      form.reset({
        itemType: 'general',
        items: [{ name: '', unit: '', quantity: 1, amount: 0, description: '' }] 
      });
    }
  }, [isOpen, form]);
  
  useEffect(() => {
    if (itemType === 'general') {
      replace([{ name: '', unit: '', quantity: 1, amount: 0, description: '' }]);
    } else {
      replace([{ name: '', amount: 0, description: '' }]);
    }
  }, [itemType, replace]);


  const handleAddRow = () => {
    if (itemType === 'general') {
        append({ name: '', unit: '', quantity: 1, amount: 0, description: '' });
    } else {
        append({ name: '', amount: 0, description: '' });
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    const batch = writeBatch(firestore);
    const poItemsCollectionRef = collection(firestore, 'purchase_orders', poId, 'items');

    values.items.forEach(item => {
      const newItemRef = doc(poItemsCollectionRef);
      const dataToSave: Partial<PurchaseOrderItem> = {
          itemType: values.itemType,
          name: item.name,
          amount: item.amount,
          description: item.description,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
      };
      
      if (values.itemType === 'general') {
        dataToSave.unit = item.unit;
        dataToSave.quantity = item.quantity;
        dataToSave.actualAmount = 0;
      } else {
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

            <FormField
                control={form.control}
                name="itemType"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Item Type</FormLabel>
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

            <div className="space-y-2">
                <div className={cn(
                    "grid items-end gap-2 px-1 text-sm font-semibold text-foreground",
                     itemType === 'general' ? "grid-cols-[2fr_1fr_1fr_1fr_2fr_auto]" : "grid-cols-[2fr_2fr_1fr_auto]"
                )}>
                    <p>Name</p>
                    {itemType === 'general' && <p>Unit</p>}
                    {itemType === 'general' && <p>Qty</p>}
                    <p>{itemType === 'general' ? 'Allocated' : 'Cost'}</p>
                    <p>Description</p>
                </div>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                  {fields.map((field, index) => {
                    return (
                    <div key={field.id} className={cn(
                        "grid items-start gap-2",
                        itemType === 'general' ? "grid-cols-[2fr_1fr_1fr_1fr_2fr_auto]" : "grid-cols-[2fr_2fr_1fr_auto]"
                      )}>
                        <FormField control={form.control} name={`items.${index}.name`} render={({ field }) => (
                            <FormItem><FormControl><Input placeholder="e.g., Bond Paper" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        
                        {itemType === 'general' && (
                            <>
                            <FormField control={form.control} name={`items.${index}.unit`} render={({ field }) => (
                                <FormItem><FormControl><Input placeholder="ream" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (
                                <FormItem><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            </>
                        )}
                        
                        <FormField control={form.control} name={`items.${index}.amount`} render={({ field }) => (
                          <FormItem>
                              <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                              <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`items.${index}.description`} render={({ field }) => (
                          <FormItem>
                              <FormControl><Input placeholder={itemType === 'general' ? 'Brand/Model' : 'e.g., Transportation'} {...field} /></FormControl>
                              <FormMessage />
                          </FormItem>
                        )}/>
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
                  )})}
                </div>
            </div>
            {form.formState.errors.items?.root && <p className="text-sm font-medium text-destructive">{form.formState.errors.items.root.message}</p>}
             {form.formState.errors.items && typeof form.formState.errors.items === 'object' && !Array.isArray(form.formState.errors.items) && <p className="text-sm font-medium text-destructive">{form.formState.errors.items.message}</p>}


            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddRow}
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
