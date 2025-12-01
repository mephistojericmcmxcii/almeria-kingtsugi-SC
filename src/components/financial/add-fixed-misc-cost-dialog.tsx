
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { useFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp, Timestamp, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { FixedMiscCost } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '../ui/textarea';

const formSchema = z.object({
  expenditure: z.string().min(1, 'Expenditure name is required.'),
  cost: z.coerce.number().min(0.01, 'Cost must be greater than zero.'),
  date: z.date({ required_error: 'A date is required.' }),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddFixedMiscCostDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddFixedMiscCostDialog({ isOpen, onOpenChange, onSuccess }: AddFixedMiscCostDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      expenditure: '',
      cost: 0,
      description: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        expenditure: '',
        cost: 0,
        date: new Date(),
        description: '',
      });
    }
  }, [isOpen, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    const costRef = doc(collection(firestore, 'fixed_misc_costs'));

    const dataToSave: Omit<FixedMiscCost, 'id'> = {
      ...values,
      date: Timestamp.fromDate(values.date),
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(costRef, dataToSave);
      toast({
        title: 'Cost Added',
        description: `The expenditure "${values.expenditure}" has been saved.`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to save cost:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error.message || 'Could not save the cost. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Fixed/Miscellaneous Cost</DialogTitle>
          <DialogDescription>Record a new business expenditure.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="expenditure" render={({ field }) => (
              <FormItem>
                <FormLabel>Expenditure</FormLabel>
                <FormControl><Input placeholder="e.g., Internet Bill" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

             <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="cost" render={({ field }) => (
                <FormItem>
                    <FormLabel>Cost (₱)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
                <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                    <PopoverTrigger asChild>
                        <FormControl>
                        <Button
                            variant={"outline"}
                            className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                            )}
                        >
                            {field.value ? format(field.value, "dd-MMM-yyyy") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                        </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        />
                    </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
                )} />
            </div>
            
            <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl><Textarea placeholder="e.g., Monthly subscription for office internet." {...field} /></FormControl>
                <FormMessage />
                </FormItem>
            )} />
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Add Cost'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
