
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { doc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const itemSchema = z.object({
  name: z.string().min(1, 'Item name is required.'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1.').default(1),
  specs: z.string().optional(),
});

const baseSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required.'),
  contactNumber: z.string().min(1, 'Contact number is required.'),
  emailAddress: z.string().email(),
  companyName: z.string().optional(),
  additionalDetails: z.string().optional(),
});

const formSchema = z.discriminatedUnion('requestType', [
    z.object({
        requestType: z.literal('list'),
        items: z.array(itemSchema).min(1, 'Please add at least one item.'),
        fileAttachment: z.any().optional(),
    }),
    z.object({
        requestType: z.literal('attachment'),
        fileAttachment: z.any().refine(file => file instanceof File, 'Please attach a file.'),
        items: z.array(itemSchema).optional(),
    })
]).and(baseSchema);


type FormValues = z.infer<typeof formSchema>;

interface SendRfqFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendRfqForm({ isOpen, onOpenChange }: SendRfqFormProps) {
  const { user, firestore, uploadImage } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState<FormValues | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      requestType: 'list',
      items: [{ name: '', quantity: 1, specs: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const requestType = form.watch('requestType');

  useEffect(() => {
    if (isOpen) {
      form.reset({
        customerName: user?.displayName || '',
        contactNumber: user?.contactNumber || '',
        emailAddress: user?.email || '',
        companyName: '',
        requestType: 'list',
        items: [{ name: '', quantity: 1, specs: '' }],
        additionalDetails: '',
        fileAttachment: undefined,
      });
    }
  }, [user, isOpen, form]);
  
  const onFormSubmit = (data: FormValues) => {
    setFormData(data);
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    if (!formData || !user) return;
    setIsSubmitting(true);
    setShowConfirmation(false);

    try {
        let fileUrl = '';
        if (formData.requestType === 'attachment' && formData.fileAttachment) {
            const file = formData.fileAttachment as File;
            const downloadUrl = await uploadImage(file, 'rfq-attachments');
            if (!downloadUrl) {
                throw new Error("File upload failed. Please try again.");
            }
            fileUrl = downloadUrl;
        }

        const rfqRef = doc(collection(firestore, 'users', user.id, 'rfq'));
        const { fileAttachment, ...restOfData } = formData;
        
        const dataToSave = {
            ...restOfData,
            userId: user.id,
            createdAt: serverTimestamp(),
            fileAttachment: fileUrl,
            items: formData.requestType === 'list' ? formData.items : [],
        };
        
        await setDoc(rfqRef, dataToSave);

        toast({
            title: "Request Sent!",
            description: "Your Request for Quotation has been successfully submitted.",
        });

        onOpenChange(false);
        form.reset();

    } catch (err: any) {
        console.error("An error occurred during submission:", err);
        toast({
            variant: "destructive",
            title: "Error",
            description: err.message || "An unknown error occurred.",
        });
    } finally {
        setIsSubmitting(false);
        setFormData(null);
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Request for Quotation</DialogTitle>
          <DialogDescription>Send a special request for items not in our catalog. Fill out the form below and we'll get back to you.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
            <div className="grid md:grid-cols-2 gap-4">
                <FormField name="customerName" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Customer Name</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField name="companyName" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Company Name (Optional)</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField name="contactNumber" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField name="emailAddress" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" {...field}/></FormControl><FormMessage/></FormItem>
                )}/>
            </div>
            
            <FormField control={form.control} name="requestType" render={({ field }) => (
                <FormItem className="space-y-3">
                    <FormLabel>How would you like to provide your item list?</FormLabel>
                     <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                            <FormItem className="flex-1">
                                <Label htmlFor="list" className="flex items-center gap-2 border p-4 rounded-md has-[:checked]:bg-primary/10 has-[:checked]:border-primary transition-all cursor-pointer">
                                    <RadioGroupItem value="list" id="list" />
                                    Type Item List
                                </Label>
                            </FormItem>
                             <FormItem className="flex-1">
                                <Label htmlFor="attachment" className="flex items-center gap-2 border p-4 rounded-md has-[:checked]:bg-primary/10 has-[:checked]:border-primary transition-all cursor-pointer">
                                    <RadioGroupItem value="attachment" id="attachment" />
                                    Attach File
                                </Label>
                            </FormItem>
                        </RadioGroup>
                    </FormControl>
                </FormItem>
            )}/>
            
            {requestType === 'list' && (
                <div className="space-y-4">
                    <Label>Item List</Label>
                    <div className="space-y-2">
                    {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-[2fr_1fr_2fr_auto] gap-2 items-end">
                             <FormField control={form.control} name={`items.${index}.name`} render={({ field }) => (
                                <FormItem><FormControl><Input placeholder="Item Name" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (
                                <FormItem><FormControl><Input type="number" placeholder="Qty" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name={`items.${index}.specs`} render={({ field }) => (
                                <FormItem><FormControl><Input placeholder="Brand/Model/Specs" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                <Trash2 className="h-4 w-4 text-destructive"/>
                            </Button>
                        </div>
                    ))}
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', quantity: 1, specs: '' })}>
                        <Plus className="mr-2"/> Add Row
                    </Button>
                    {form.formState.errors.items?.root && <p className="text-sm font-medium text-destructive">{form.formState.errors.items.root.message}</p>}
                </div>
            )}
            
            {requestType === 'attachment' && (
                <FormField control={form.control} name="fileAttachment" render={({ field: { onChange, value, ...rest } }) => (
                    <FormItem>
                        <FormLabel>Quotation File</FormLabel>
                        <FormControl>
                            <Input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={e => onChange(e.target.files?.[0])} {...rest} />
                        </FormControl>
                        <FormDescription>Attach your quotation file (e.g., PDF, Word, Excel, Image).</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}/>
            )}

            <FormField name="additionalDetails" control={form.control} render={({ field }) => (
                <FormItem>
                    <FormLabel>Additional Details / Message</FormLabel>
                    <FormControl><Textarea rows={4} placeholder="Include any other questions or comments here..." {...field}/></FormControl>
                    <FormMessage/>
                </FormItem>
            )}/>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Submit RFQ
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
     <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to submit this Request for Quotation?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setFormData(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmSubmit}>Confirm & Submit</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
