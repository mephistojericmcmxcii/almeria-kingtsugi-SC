
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { useFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, FileText, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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

const rfqItemSchema = z.object({
  name: z.string().min(1, 'Item name is required.'),
  quantity: z.preprocess(
    (a) => (a === '' ? 0 : parseInt(z.string().parse(a), 10)),
    z.number().positive('Quantity must be a positive number.')
  ),
  specs: z.string().optional(),
});

const formSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required.'),
  contactNumber: z.string().min(1, 'Contact number is required.'),
  emailAddress: z.string().email('Please enter a valid email.'),
  companyName: z.string().optional(),
  submissionType: z.enum(['list', 'attachment']),
  attachment: z.any().optional(),
  items: z.array(rfqItemSchema).optional(),
  additionalDetails: z.string().optional(),
}).refine(data => {
    if (data.submissionType === 'list' && (!data.items || data.items.length === 0)) {
        return false;
    }
    return true;
}, {
    message: "Please add at least one item to the list.",
    path: ["items"],
}).refine(data => {
    if (data.submissionType === 'attachment' && !data.attachment) {
        return false;
    }
    return true;
}, {
    message: "Please attach a file.",
    path: ["attachment"],
});

type FormValues = z.infer<typeof formSchema>;

export default function RequestForQuotationPage() {
    const { user } = useAuth();
    const { firestore, storage } = useFirebase();
    const { uploadImage } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [formData, setFormData] = useState<FormValues | null>(null);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            submissionType: 'list',
            items: [{ name: '', quantity: 1, specs: '' }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'items',
    });

    const submissionType = form.watch('submissionType');

    useEffect(() => {
        if (user) {
            form.setValue('customerName', user.displayName);
            form.setValue('contactNumber', user.contactNumber || '');
            form.setValue('emailAddress', user.email);
        }
    }, [user, form]);
    
    const onFormSubmit = (data: FormValues) => {
        setFormData(data);
        setIsConfirmOpen(true);
    };

    const handleConfirmSubmit = async () => {
        if (!formData) return;
        setIsSubmitting(true);
        
        try {
            let fileUrl = '';
            if (formData.submissionType === 'attachment' && formData.attachment) {
                const uploadedUrl = await uploadImage(formData.attachment, 'rfq-attachments');
                if (uploadedUrl) {
                    fileUrl = uploadedUrl;
                } else {
                    throw new Error('File upload failed.');
                }
            }

            const newRfqRef = doc(collection(firestore, 'rfq-records'));
            const dataToSave = {
                ...formData,
                attachment: fileUrl,
                createdAt: serverTimestamp(),
                userId: user?.id || null,
            };

            await setDoc(newRfqRef, dataToSave);

            setShowSuccessMessage(true);
            form.reset();
             form.setValue('items', [{ name: '', quantity: 1, specs: '' }]);
            setTimeout(() => setShowSuccessMessage(false), 5000);

        } catch (error: any) {
            console.error('Submission failed', error);
        } finally {
            setIsSubmitting(false);
            setIsConfirmOpen(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <FileText className="w-8 h-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline">Request for Quotation</h1>
                    <p className="text-muted-foreground">Have a specific list of items? Submit your request here.</p>
                </div>
            </div>

             {showSuccessMessage && (
                <Alert variant="default" className="bg-green-100 border-green-400 text-green-800 dark:bg-green-900/50 dark:border-green-700 dark:text-green-300">
                    <CheckCircle className="h-4 w-4 !text-green-600 dark:!text-green-400" />
                    <AlertTitle className="font-semibold">Request Sent!</AlertTitle>
                    <AlertDescription>
                        Your quotation request has been successfully submitted. We will get back to you shortly.
                    </AlertDescription>
                </Alert>
            )}

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Your Information</CardTitle>
                            <CardDescription>Please provide your contact details.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="customerName" render={({ field }) => (
                                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="contactNumber" render={({ field }) => (
                                <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="emailAddress" render={({ field }) => (
                                <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="companyName" render={({ field }) => (
                                <FormItem><FormLabel>Company Name (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Quotation Details</CardTitle>
                            <CardDescription>Choose how to provide your item list.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <FormField
                                control={form.control}
                                name="submissionType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                                                <FormItem className="flex-1"><Label htmlFor="list" className="flex items-center gap-2 border p-4 rounded-md has-[:checked]:bg-primary/10 has-[:checked]:border-primary transition-all cursor-pointer"><RadioGroupItem value="list" id="list" />Type Item List</Label></FormItem>
                                                <FormItem className="flex-1"><Label htmlFor="attachment" className="flex items-center gap-2 border p-4 rounded-md has-[:checked]:bg-primary/10 has-[:checked]:border-primary transition-all cursor-pointer"><RadioGroupItem value="attachment" id="attachment" />Attach File</Label></FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <div className="mt-6">
                                {submissionType === 'list' ? (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            {fields.map((field, index) => (
                                                <div key={field.id} className="grid grid-cols-[2fr,1fr,2fr,auto] items-start gap-2 p-2 border rounded-lg">
                                                    <FormField control={form.control} name={`items.${index}.name`} render={({ field }) => (
                                                        <FormItem>{index === 0 && <FormLabel>Item Name</FormLabel>}<FormControl><Input placeholder="e.g., Bond Paper" {...field} /></FormControl><FormMessage /></FormItem>
                                                    )} />
                                                    <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (
                                                        <FormItem>{index === 0 && <FormLabel>Quantity</FormLabel>}<FormControl><Input type="number" placeholder="1" {...field} /></FormControl><FormMessage /></FormItem>
                                                    )} />
                                                    <FormField control={form.control} name={`items.${index}.specs`} render={({ field }) => (
                                                        <FormItem>{index === 0 && <FormLabel>Specs (Optional)</FormLabel>}<FormControl><Input placeholder="e.g., A4, 80gsm" {...field} /></FormControl><FormMessage /></FormItem>
                                                    )} />
                                                    <div className={index === 0 ? 'pt-8' : ''}>
                                                    <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => remove(index)} disabled={fields.length <= 1}><Trash2 className="h-4 w-4" /></Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', quantity: 1, specs: '' })}><Plus className="mr-2 h-4 w-4" />Add Row</Button>
                                         {form.formState.errors.items && <p className="text-sm font-medium text-destructive">{form.formState.errors.items.root?.message}</p>}
                                    </div>
                                ) : (
                                    <FormField control={form.control} name="attachment" render={({ field: { onChange, value, ...rest } }) => (
                                        <FormItem>
                                            <FormLabel>Upload File (PDF or DOCX)</FormLabel>
                                            <FormControl><Input type="file" accept=".pdf,.doc,.docx" onChange={(e) => onChange(e.target.files ? e.target.files[0] : null)} {...rest} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Additional Details</CardTitle>
                            <CardDescription>Include any other comments, questions, or messages for the seller.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <FormField control={form.control} name="additionalDetails" render={({ field }) => (
                                <FormItem><FormControl><Textarea rows={5} placeholder="Type your message here..." {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </CardContent>
                    </Card>

                    <CardFooter className="flex justify-end">
                        <Button type="submit" size="lg" disabled={isSubmitting}>
                           {isSubmitting ? 'Submitting...' : 'Submit RFQ'}
                        </Button>
                    </CardFooter>
                </form>
            </Form>
            
            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Please review your details before submitting. This will send your request directly to the seller for quotation.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmSubmit} disabled={isSubmitting}>
                            {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
