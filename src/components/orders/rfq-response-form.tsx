
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { QuotationRequest } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Download, Info, Trash2, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';

const itemPricingSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  specs: z.string().optional(),
  price: z.preprocess(
    (val) => {
        if (val === "" || val === undefined || val === null) return 0;
        const processed = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(processed) ? 0 : processed;
    },
    z.coerce.number().min(0, 'Price must be a positive number.')
  ),
  discount: z.preprocess(
    (val) => {
        if (val === "" || val === undefined || val === null) return 0;
        const processed = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(processed) ? 0 : processed;
    },
    z.coerce.number().min(0).max(100).optional().default(0)
  ),
});


const baseSchema = z.object({
  deliveryFee: z.coerce.number().min(0).default(0),
  packagingFee: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

const priceListSchema = baseSchema.extend({
  responseType: z.literal('priceList'),
  items: z.array(itemPricingSchema).min(1, 'At least one item must have a price.'),
  quotationFile: z.any().optional(),
  totalAmount: z.coerce.number().optional(),
  discount: z.coerce.number().optional(),
});

const uploadFileSchema = baseSchema.extend({
  responseType: z.literal('uploadFile'),
  quotationFile: z.any().refine(fileList => fileList instanceof FileList && fileList.length > 0, { message: 'A file is required for this response type.' }),
  items: z.array(itemPricingSchema).optional(),
  totalAmount: z.coerce.number({invalid_type_error: "Total amount is required."}).min(0.01, "Total amount must be greater than zero."),
  discount: z.coerce.number().min(0).optional().default(0),
});

const formSchema = z.discriminatedUnion('responseType', [priceListSchema, uploadFileSchema]);

type FormValues = z.infer<typeof formSchema>;

export function RfqResponseForm({ rfq }: { rfq: QuotationRequest }) {
  const { respondToRfq, uploadFile } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOriginalRequestAFileList = rfq.requestType === 'list' && rfq.items && rfq.items.length > 0;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      responseType: isOriginalRequestAFileList ? 'priceList' : 'uploadFile',
      items: isOriginalRequestAFileList ? rfq.items?.map(item => ({ ...item, price: 0, discount: 0 })) : [],
      deliveryFee: 0,
      packagingFee: 0,
      notes: '',
      quotationFile: undefined,
      totalAmount: 0,
      discount: 0,
    },
  });

  const { fields, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const responseType = form.watch('responseType');
  const quotationFileRegistration = form.register("quotationFile");


  useEffect(() => {
    form.clearErrors();
  }, [responseType, form]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    
    let fileUrl = '';
    if (data.responseType === 'uploadFile' && data.quotationFile) {
        const file = (data.quotationFile as FileList)[0];
        const fileName = `${rfq.id}_admin_response`;
        const url = await uploadFile(file, `quotation_responses/${rfq.id}`, fileName);
        if (!url) {
            setIsSubmitting(false);
            return; // uploadFile will show a toast on error
        }
        fileUrl = url;
    }
    
    const success = await respondToRfq(rfq, data, fileUrl);
    
    if (success) {
      router.push('/management/orders');
    }
    
    setIsSubmitting(false);
  };
  
  const handleNumberInputOnWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
    }
  };


  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Your Response</CardTitle>
            <CardDescription>Price the items below or upload a quotation file.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Original Request Info */}
            <Card className="bg-muted/50">
                <CardHeader>
                    <CardTitle className="text-base">Original Customer Request</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {rfq.requestType === 'list' && rfq.items && (
                       <div className="space-y-2">
                           {rfq.items.map((item, i) => (
                                <p key={i} className="text-sm border-b pb-1">
                                    <span className="font-semibold">{item.quantity}x {item.name}</span>
                                    {item.specs && <span className="text-muted-foreground"> - {item.specs}</span>}
                                </p>
                           ))}
                       </div>
                    )}
                     {rfq.requestType === 'attachment' && rfq.fileAttachment && (
                        <a href={rfq.fileAttachment} target="_blank" rel="noopener noreferrer">
                            <Button type="button" variant="secondary" size="sm"><Download className="mr-2 h-4 w-4"/>View Customer Attachment</Button>
                        </a>
                    )}
                    {rfq.additionalDetails && (
                        <Alert>
                           <Info className="h-4 w-4" />
                           <AlertTitle>Customer's Message</AlertTitle>
                           <AlertDescription className="whitespace-pre-wrap">{rfq.additionalDetails}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
            
            {isOriginalRequestAFileList && (
                 <FormField
                    control={form.control}
                    name="responseType"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>Response Method</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                                    <FormItem className="flex items-center space-x-2"><RadioGroupItem value="priceList" /><Label>Price Item List</Label></FormItem>
                                    <FormItem className="flex items-center space-x-2"><RadioGroupItem value="uploadFile" /><Label>Upload Quotation File</Label></FormItem>
                                </RadioGroup>
                            </FormControl>
                        </FormItem>
                    )}
                />
            )}

            {responseType === 'priceList' ? (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Item</TableHead>
                      <TableHead className="w-[10%]">Qty</TableHead>
                      <TableHead className="w-[20%] text-right">Price (ea.)</TableHead>
                      <TableHead className="w-[20%] text-right">Discount (%)</TableHead>
                      <TableHead className="w-[10%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <p className="font-medium">{field.name}</p>
                          <p className="text-xs text-muted-foreground">{field.specs || 'No specs'}</p>
                        </TableCell>
                        <TableCell>{field.quantity}</TableCell>
                        <TableCell>
                           <FormField
                              control={form.control}
                              name={`items.${index}.price`}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  className="text-right"
                                  placeholder="0.00"
                                  step="0.01"
                                  onWheel={handleNumberInputOnWheel}
                                  onKeyDown={handleKeyDown}
                                  {...field}
                                  value={field.value === 0 ? '' : field.value}
                                  onChange={e => field.onChange(e.target.value === '' ? '' : e.target.value)}
                                />
                              )}
                            />
                        </TableCell>
                        <TableCell>
                          <FormField
                              control={form.control}
                              name={`items.${index}.discount`}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  className="text-right"
                                  placeholder="0"
                                  onWheel={handleNumberInputOnWheel}
                                  onKeyDown={handleKeyDown}
                                  {...field}
                                   value={field.value === 0 ? '' : field.value}
                                   onChange={e => field.onChange(e.target.value === '' ? '' : e.target.value)}
                                />
                              )}
                            />
                        </TableCell>
                         <TableCell>
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {form.formState.errors.items?.root && <p className="text-sm font-medium text-destructive">{form.formState.errors.items.root.message}</p>}
                 {form.formState.errors.items && typeof form.formState.errors.items === 'object' && !Array.isArray(form.formState.errors.items) && <p className="text-sm font-medium text-destructive">{form.formState.errors.items.message}</p>}
              </div>
            ) : (
                <div className="space-y-4">
                    <FormField
                    control={form.control}
                    name="quotationFile"
                    render={() => (
                        <FormItem>
                        <FormLabel>Quotation File</FormLabel>
                        <FormControl>
                            <Input type="file" accept=".pdf" {...quotationFileRegistration} />
                        </FormControl>
                        <FormDescription>Upload your official quotation document (PDF only).</FormDescription>
                        <FormMessage>{form.formState.errors.quotationFile?.message?.toString()}</FormMessage>
                        </FormItem>
                    )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="totalAmount" render={({ field }) => (
                            <FormItem><FormLabel>Total Amount (from file)</FormLabel><FormControl><Input type="number" step="0.01" onWheel={handleNumberInputOnWheel} onKeyDown={handleKeyDown} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="discount" render={({ field }) => (
                            <FormItem><FormLabel>Total Discount (from file, optional)</FormLabel><FormControl><Input type="number" step="0.01" onWheel={handleNumberInputOnWheel} onKeyDown={handleKeyDown} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="deliveryFee" render={({ field }) => (
                    <FormItem><FormLabel>Delivery Fee</FormLabel><FormControl><Input type="number" onWheel={handleNumberInputOnWheel} onKeyDown={handleKeyDown} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="packagingFee" render={({ field }) => (
                    <FormItem><FormLabel>Packaging Fee</FormLabel><FormControl><Input type="number" onWheel={handleNumberInputOnWheel} onKeyDown={handleKeyDown} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>

             <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes for Customer (Optional)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
             )} />

          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={isSubmitting} size="lg">
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Sending...' : 'Send Quotation'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
