
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { PurchaseOrderItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const formSchema = z.object({
  actualAmount: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().min(0, 'Actual amount cannot be negative.')
  ),
  miscCost: z.preprocess(
    (a) => a === '' ? 0 : parseFloat(z.string().parse(a)),
    z.number().min(0, 'Miscellaneous cost cannot be negative.').optional()
  ),
});

type FormValues = z.infer<typeof formSchema>;

interface UpdateActualAmountDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  poId: string;
  item: PurchaseOrderItem;
  onSuccess: () => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
};


export function UpdateActualAmountDialog({ isOpen, onOpenChange, poId, item, onSuccess }: UpdateActualAmountDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      actualAmount: 0,
      miscCost: 0,
    },
  });

  useEffect(() => {
    if (item) {
      form.reset({ 
          actualAmount: item.actualAmount || 0,
          miscCost: item.miscCost || 0,
      });
    }
  }, [item, form, isOpen]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    const itemRef = doc(firestore, 'purchase_orders', poId, 'items', item.id);

    try {
      await updateDoc(itemRef, {
        actualAmount: values.actualAmount,
        miscCost: values.miscCost || 0,
      });
      toast({
        title: 'Costs Updated',
        description: `The actual costs for ${item.name} have been saved.`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to update costs:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'Could not update the costs.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Item Costs</DialogTitle>
          <DialogDescription>
            Enter the final costs for the item: <span className="font-semibold">{item.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 text-sm">
            <span className="font-medium text-muted-foreground">Allocated Amount (per Unit): </span>
            <span className="font-bold">{formatCurrency(item.amount)}</span>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="actualAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Actual Amount (per Unit)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="miscCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Miscellaneous Cost (Total)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                   <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Costs'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
