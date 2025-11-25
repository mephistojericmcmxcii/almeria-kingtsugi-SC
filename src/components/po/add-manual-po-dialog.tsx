

'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parse } from 'date-fns';
import { useFirebase } from '@/firebase';
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

const PO_STATUSES: PurchaseOrderStatus[] = ['Approved', 'Completed', 'Cancelled'];
const PAYMENT_STATUSES: PoPaymentStatus[] = ['Paid', 'Unpaid'];

const formSchema = z.object({
  poNumber: z.string().min(1, 'PO Number is required.'),
  date: z.date({ required_error: 'A date is required.' }),
  careOf: z.string().min(2, 'Care Of is required.'),
  source: z.string().min(2, 'Agency / Company is required.'),
  status: z.enum(PO_STATUSES),
  paymentStatus: z.enum(PAYMENT_STATUSES),
});

type FormValues = z.infer<typeof formSchema>;

interface AddManualPoDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddManualPoDialog({ isOpen, onOpenChange, onSuccess }: AddManualPoDialogProps) {
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
      status: 'Completed',
      paymentStatus: 'Paid',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        poNumber: '',
        date: new Date(),
        careOf: '',
        source: '',
        status: 'Completed',
        paymentStatus: 'Paid',
      });
    }
  }, [isOpen, form]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    if (!isNaN(date.getTime())) {
      form.setValue('date', date, { shouldValidate: true });
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    const docId = doc(collection(firestore, 'purchase_orders')).id;
    const poRef = doc(firestore, 'purchase_orders', docId);

    const dataToSave: Omit<PurchaseOrder, 'id'> = {
      ...values,
      date: Timestamp.fromDate(values.date),
      entryType: 'manual',
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(poRef, dataToSave);
      toast({
        title: 'Manual Entry Created',
        description: `Manual entry for ${values.poNumber} has been saved.`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to save manual PO:', error);
        toast({
            variant: 'destructive',
            title: 'Save Failed',
            description: error.message || 'Could not save the manual entry. Please try again.',
        });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Manual PO Payment</DialogTitle>
          <DialogDescription>Manually add a payment record that does not have an associated PO in the system.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
            <FormField control={form.control} name="poNumber" render={({ field }) => (
              <FormItem>
                <FormLabel>P.O. # or Reference #</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
             <FormField control={form.control} name="source" render={({ field }) => (
              <FormItem>
                <FormLabel>Agency / Company</FormLabel>
                <FormControl><Input placeholder="e.g., National Bookstore" {...field} /></FormControl>
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
             <FormField control={form.control} name="date" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <FormControl>
                    <Input 
                      type="date" 
                      value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                      onChange={handleDateChange}
                      className="w-full"
                    />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
             <div className="grid grid-cols-2 gap-4">
                 <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                    <FormLabel>PO Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {PO_STATUSES.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )} />
                 <FormField control={form.control} name="paymentStatus" render={({ field }) => (
                <FormItem>
                    <FormLabel>Payment Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {PAYMENT_STATUSES.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )} />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Entry'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
