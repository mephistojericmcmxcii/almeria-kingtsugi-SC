
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parse } from 'date-fns';
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
  source: z.string().min(2, 'Agency / Company is required.'),
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

export default function AddEditPoDialog({ isOpen, onOpenChange, poToEdit }: AddEditPoDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      poNumber: '',
      careOf: '',
      source: '',
      totalAllocation: 0,
    },
  });

  const [dateString, setDateString] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (poToEdit) {
        form.reset({
          poNumber: poToEdit.poNumber,
          date: poToEdit.date.toDate(),
          careOf: poToEdit.careOf,
          source: poToEdit.source,
          totalAllocation: poToEdit.totalAllocation || 0,
        });
        setDateString(format(poToEdit.date.toDate(), 'dd-MMM-yyyy'));
      } else {
        const newDate = new Date();
        form.reset({
          poNumber: '',
          date: newDate,
          careOf: '',
          source: '',
          totalAllocation: 0,
        });
        setDateString(format(newDate, 'dd-MMM-yyyy'));
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
             <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                    <div className="relative flex items-center">
                        <FormControl>
                             <Input
                                value={dateString}
                                onChange={(e) => setDateString(e.target.value)}
                                onBlur={(e) => {
                                    try {
                                        const parsedDate = parse(e.target.value, 'dd-MMM-yyyy', new Date());
                                        if (!isNaN(parsedDate.getTime())) {
                                            field.onChange(parsedDate);
                                        } else {
                                            // Revert if invalid
                                            setDateString(field.value ? format(field.value, 'dd-MMM-yyyy') : '');
                                        }
                                    } catch {
                                        // Revert if parsing throws error
                                        setDateString(field.value ? format(field.value, 'dd-MMM-yyyy') : '');
                                    }
                                }}
                                placeholder="dd-MMM-yyyy"
                            />
                        </FormControl>
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="icon" className="absolute right-1 h-8 w-8">
                                    <CalendarIcon className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={(date) => {
                                        if (date) {
                                            field.onChange(date);
                                            setDateString(format(date, 'dd-MMM-yyyy'));
                                        }
                                        setIsCalendarOpen(false);
                                    }}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="careOf" render={({ field }) => (
              <FormItem>
                <FormLabel>Care Of</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="source" render={({ field }) => (
              <FormItem>
                <FormLabel>Agency / Company</FormLabel>
                <FormControl><Input placeholder="e.g. DepEd, Local Supplier" {...field} /></FormControl>
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
