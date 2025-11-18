
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { useFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { PurchaseOrder, PoPaymentStatus } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';

const PAYMENT_STATUSES: PoPaymentStatus[] = ['Paid', 'Unpaid'];

const formSchema = z.object({
  paymentDate: z.date().optional(),
  agency: z.string().optional(),
  careOf: z.string().min(1, "Care Of is required"),
  taxDeduction: z.preprocess(
    (val) => val === '' ? undefined : (typeof val === 'string' ? parseFloat(val) : val),
    z.number().optional()
  ),
  amountDeposited: z.preprocess(
    (val) => val === '' ? undefined : (typeof val === 'string' ? parseFloat(val) : val),
    z.number().optional()
  ),
  bank: z.string().optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PaymentDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  summary: {
    id: string;
    po: PurchaseOrder;
    totalAllocation: number;
    totalExpenses: number;
  };
  onSuccess: () => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
};

export function PaymentDetailsDialog({ isOpen, onOpenChange, summary, onSuccess }: PaymentDetailsDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { po, totalAllocation, totalExpenses } = summary;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (isOpen && po) {
      form.reset({
        paymentDate: po.paymentDate?.toDate(),
        agency: po.agency || '',
        careOf: po.careOf || '',
        taxDeduction: po.taxDeduction,
        amountDeposited: po.amountDeposited,
        bank: po.bank || '',
        paymentStatus: po.paymentStatus || 'Unpaid',
      });
    }
  }, [po, isOpen, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    const poRef = doc(firestore, 'purchase_orders', po.id);

    const dataToUpdate: any = {
      ...values,
      paymentDate: values.paymentDate ? Timestamp.fromDate(values.paymentDate) : null,
      updatedAt: serverTimestamp(),
    };

    // Ensure empty strings for numbers become null or undefined in Firestore
    if (values.taxDeduction === undefined) dataToUpdate.taxDeduction = null;
    if (values.amountDeposited === undefined) dataToUpdate.amountDeposited = null;


    try {
      await updateDoc(poRef, dataToUpdate);
      toast({
        title: 'Payment Details Updated',
        description: `Details for PO #${po.poNumber} have been saved.`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to update PO payment details:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'Could not save payment details.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
    const handleNumberInputOnWheel = (e: React.WheelEvent<HTMLInputElement>) => {
      e.currentTarget.blur();
    };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Payment for PO #{po.poNumber}</DialogTitle>
          <DialogDescription>Update payment and deposit information for this purchase order.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 py-4 border-y">
            <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Total Allocation</p>
                <p className="text-lg font-bold">{formatCurrency(totalAllocation)}</p>
            </div>
             <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                <p className="text-lg font-bold">{formatCurrency(totalExpenses)}</p>
            </div>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[50vh] overflow-y-auto pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="agency" render={({ field }) => (
                <FormItem>
                    <FormLabel>Agency / Institution</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
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
            </div>

            <FormField control={form.control} name="paymentDate" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
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
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )} />
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="taxDeduction" render={({ field }) => (
                <FormItem>
                    <FormLabel>Tax Deduction</FormLabel>
                    <FormControl><Input type="number" onWheel={handleNumberInputOnWheel} {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
                 <FormField control={form.control} name="amountDeposited" render={({ field }) => (
                <FormItem>
                    <FormLabel>Amount Deposited</FormLabel>
                    <FormControl><Input type="number" onWheel={handleNumberInputOnWheel} {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="bank" render={({ field }) => (
                <FormItem>
                    <FormLabel>Bank</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
                <FormField control={form.control} name="paymentStatus" render={({ field }) => (
                <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
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

            <DialogFooter className="pt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Details'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
