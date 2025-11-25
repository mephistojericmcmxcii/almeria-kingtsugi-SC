
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parse } from 'date-fns';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
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
import { Calendar as CalendarIcon, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';

const PAYMENT_STATUSES: PoPaymentStatus[] = ['Paid', 'Unpaid'];

const formSchema = z.object({
  paymentDate: z.date().optional(),
  amountDeposited: z.preprocess(
    (val) => val === '' ? undefined : (typeof val === 'string' ? parseFloat(val) : val),
    z.number().optional()
  ),
  bank: z.string().optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  depositReceipt: z.any().optional(),
  // Manual fields
  totalAllocation: z.preprocess(
    (val) => val === '' ? undefined : (typeof val === 'string' ? parseFloat(val) : val),
    z.number().optional()
  ),
  totalExpenses: z.preprocess(
    (val) => val === '' ? undefined : (typeof val === 'string' ? parseFloat(val) : val),
    z.number().optional()
  ),
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
  const { uploadFile } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { po, totalAllocation, totalExpenses } = summary;
  const isManualEntry = po.entryType === 'manual';


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (isOpen && po) {
      form.reset({
        paymentDate: po.paymentDate?.toDate(),
        amountDeposited: po.amountDeposited,
        bank: po.bank || '',
        paymentStatus: po.paymentStatus || 'Unpaid',
        totalAllocation: po.totalAllocation ?? totalAllocation,
        totalExpenses: po.totalExpenses ?? totalExpenses,
      });
    }
  }, [po, isOpen, form, totalAllocation, totalExpenses]);

  const watchedValues = form.watch();

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    const poRef = doc(firestore, 'purchase_orders', po.id);

    try {
        const dataToUpdate: any = {
            ...values,
            paymentDate: values.paymentDate ? Timestamp.fromDate(values.paymentDate) : null,
            updatedAt: serverTimestamp(),
        };

        if (values.depositReceipt && values.depositReceipt.length > 0) {
            const file = values.depositReceipt[0] as File;
            const downloadURL = await uploadFile(file, `po_payment_documents/${po.id}`);
            if (downloadURL) {
                dataToUpdate.depositReceiptUrl = downloadURL;
            } else {
                throw new Error("File upload failed.");
            }
        }

        if (values.amountDeposited === undefined) dataToUpdate.amountDeposited = null;
        if (isManualEntry) {
            dataToUpdate.totalAllocation = values.totalAllocation ?? 0;
            dataToUpdate.totalExpenses = values.totalExpenses ?? 0;
        }

        delete dataToUpdate.depositReceipt; // Don't save the file object itself

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
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
            <div className="py-4 border-y">
                {isManualEntry ? (
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <FormField control={form.control} name="totalAllocation" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Total Allocation</FormLabel>
                        <FormControl><Input type="number" onWheel={handleNumberInputOnWheel} {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )} />
                    <FormField control={form.control} name="totalExpenses" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Total Expenses</FormLabel>
                        <FormControl><Input type="number" onWheel={handleNumberInputOnWheel} {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )} />
                </div>
                ) : (
                    <div className="grid grid-cols-2 gap-x-8">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Total Allocation</p>
                            <p className="text-lg font-bold">{formatCurrency(totalAllocation)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                            <p className="text-lg font-bold">{formatCurrency(totalExpenses)}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Agency / Company</p>
                    <p className="font-semibold">{po.source}</p>
                </div>
                 <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Care Of</p>
                    <p className="font-semibold">{po.careOf}</p>
                </div>
            </div>

            <FormField control={form.control} name="paymentDate" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Payment Date</FormLabel>
                 <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <div className="relative w-[240px]">
                      <FormControl>
                        <Input
                          value={field.value ? format(field.value, 'PPP') : ''}
                          onChange={(e) => {
                              const parsedDate = parse(e.target.value, 'PPP', new Date());
                              if (!isNaN(parsedDate.getTime())) {
                                  field.onChange(parsedDate);
                              }
                          }}
                          onFocus={() => setIsCalendarOpen(true)}
                          placeholder="Select a date"
                          className="pl-3 pr-10 text-left font-normal"
                        />
                      </FormControl>
                      <PopoverTrigger asChild>
                         <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground">
                            <CalendarIcon className="h-4 w-4" />
                         </Button>
                      </PopoverTrigger>
                    </div>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          if (date) field.onChange(date);
                          setIsCalendarOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                <FormMessage />
              </FormItem>
            )} />
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="amountDeposited" render={({ field }) => (
                <FormItem>
                    <FormLabel>Amount Deposited</FormLabel>
                    <FormControl><Input type="number" onWheel={handleNumberInputOnWheel} {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
                 <FormField control={form.control} name="bank" render={({ field }) => (
                <FormItem>
                    <FormLabel>Bank</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
            </div>
            
            <FormField control={form.control} name="paymentStatus" render={({ field }) => (
            <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                    <SelectTrigger className="w-[240px]">
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

            <div className="space-y-2">
                <FormField
                    control={form.control}
                    name="depositReceipt"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Deposit Receipt/Document</FormLabel>
                            <FormControl>
                                <Input
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={(e) => field.onChange(e.target.files)}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {po.depositReceiptUrl && (
                    <a href={po.depositReceiptUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="link" size="sm" className="p-0 h-auto">
                            <Download className="mr-2 h-3 w-3" /> View Uploaded Receipt
                        </Button>
                    </a>
                )}
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
