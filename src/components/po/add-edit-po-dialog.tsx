

'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { useFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, setDoc, serverTimestamp, Timestamp, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { PurchaseOrder, PurchaseOrderStatus, PoPaymentStatus } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  poNumber: z.string().min(1, 'PO Number is required.'),
  date: z.date({ required_error: 'A date is required.' }),
  careOf: z.string().min(2, 'Care Of is required.'),
  totalAllocation: z.preprocess(
    (val) => (val === '' ? undefined : (typeof val === 'string' ? parseFloat(val) : val)),
    z.number().optional()
  ),
  // Status is removed from the form schema but will be handled in submission
});

type FormValues = z.infer<typeof formSchema>;

interface AddEditPoDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  poToEdit?: PurchaseOrder | null;
}

export function AddEditPoDialog({ isOpen, onOpenChange, poToEdit }: AddEditPoDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      poNumber: '',
      careOf: '',
      totalAllocation: 0,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (poToEdit) {
        form.reset({
          poNumber: poToEdit.poNumber,
          date: poToEdit.date.toDate(),
          careOf: poToEdit.careOf,
          totalAllocation: poToEdit.totalAllocation || 0,
        });
      } else {
        form.reset({
          poNumber: '',
          date: new Date(),
          careOf: '',
          totalAllocation: 0,
        });
      }
    }
  }, [poToEdit, isOpen, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    const docId = poToEdit ? poToEdit.id : doc(collection(firestore, 'purchase_orders')).id;
    const poRef = doc(firestore, 'purchase_orders', docId);

    const dataToSave: Partial<PurchaseOrder> = {
      ...values,
      date: Timestamp.fromDate(values.date),
      source: '', // Set source to empty string
      updatedAt: serverTimestamp(),
    };
    
    if (!poToEdit) {
      dataToSave.createdAt = serverTimestamp();
      dataToSave.paymentStatus = 'Unpaid';
      dataToSave.status = 'Lacking'; // Default status for new POs
    } else {
      // Preserve existing status if editing
      dataToSave.status = poToEdit.status;
    }


    try {
      await setDoc(poRef, dataToSave, { merge: true });
      toast({
        title: poToEdit ? 'PO Updated' : 'PO Created',
        description: `Purchase Order ${values.poNumber} has been saved.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to save PO:', error);
      if (error.code === 'permission-denied') {
        const contextualError = new FirestorePermissionError({
            path: poRef.path,
            operation: poToEdit ? 'update' : 'create',
            requestResourceData: dataToSave,
        });
        errorEmitter.emit('permission-error', contextualError);
      } else {
        toast({
            variant: 'destructive',
            title: 'Save Failed',
            description: error.message || 'Could not save the PO. Please try again.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = poToEdit ? 'Edit Purchase Order' : 'Add New Purchase Order';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Fill in the details for the purchase order.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="poNumber" render={({ field }) => (
              <FormItem>
                <FormLabel>P.O. #</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="date" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar 
                      mode="single" 
                      selected={field.value} 
                      onSelect={(date) => {
                          field.onChange(date);
                          setIsCalendarOpen(false);
                      }} 
                      initialFocus 
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="careOf" render={({ field }) => (
              <FormItem>
                <FormLabel>Care Of</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="totalAllocation" render={({ field }) => (
                <FormItem>
                    <FormLabel>Total Amount Allocated (Optional)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save PO'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
