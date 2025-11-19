
'use client';

import { format } from 'date-fns';
import type { QuotationRequest } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Download, Info, Mail, Phone, Building } from 'lucide-react';
import { Badge } from '../ui/badge';

interface ViewRfqDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  rfq: QuotationRequest | null;
}

export function ViewRfqDetailsDialog({ isOpen, onOpenChange, rfq }: ViewRfqDetailsDialogProps) {
  if (!rfq) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Quotation Request Details</DialogTitle>
          <DialogDescription>
            Request ID: <span className="font-mono">{rfq.id}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                    <p className="font-semibold">Customer Name</p>
                    <p className="text-muted-foreground">{rfq.customerName}</p>
                </div>
                <div className="space-y-1">
                    <p className="font-semibold">Company Name</p>
                    <p className="text-muted-foreground">{rfq.companyName || 'N/A'}</p>
                </div>
                 <div className="space-y-1">
                    <p className="font-semibold flex items-center gap-2"><Mail className="w-4 h-4"/>Email</p>
                    <p className="text-muted-foreground">{rfq.emailAddress}</p>
                </div>
                 <div className="space-y-1">
                    <p className="font-semibold flex items-center gap-2"><Phone className="w-4 h-4"/>Contact Number</p>
                    <p className="text-muted-foreground">{rfq.contactNumber}</p>
                </div>
            </div>

            <div className="space-y-2">
                <p className="font-semibold">Request Type</p>
                <Badge variant={rfq.requestType === 'list' ? 'secondary' : 'default'}>
                    {rfq.requestType === 'list' ? 'Listed Items' : 'File Attachment'}
                </Badge>
            </div>

            {rfq.requestType === 'list' && rfq.items && rfq.items.length > 0 && (
                <div>
                    <h3 className="font-semibold mb-2">Requested Items</h3>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Item Name</TableHead>
                            <TableHead className="text-center">Quantity</TableHead>
                            <TableHead>Specifications</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {rfq.items.map((item, index) => (
                            <TableRow key={index}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell>{item.specs || 'N/A'}</TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {rfq.requestType === 'attachment' && rfq.fileAttachment && (
                <div>
                    <h3 className="font-semibold mb-2">Attached File</h3>
                    <a href={rfq.fileAttachment} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline">
                            <Download className="mr-2 h-4 w-4" /> View/Download Attachment
                        </Button>
                    </a>
                </div>
            )}

             {rfq.additionalDetails && (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Additional Message from Customer</AlertTitle>
                    <AlertDescription className="whitespace-pre-wrap">{rfq.additionalDetails}</AlertDescription>
                </Alert>
            )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    