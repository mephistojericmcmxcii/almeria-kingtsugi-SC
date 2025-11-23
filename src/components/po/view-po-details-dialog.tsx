

'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { PurchaseOrder, PurchaseOrderStatus } from '@/lib/types';
import type { DisplayPurchaseOrder } from '@/app/(app)/management/po/page';
import { format, parse } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Download, Calendar as CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';

interface ViewPoDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (changed: boolean) => void;
  po: DisplayPurchaseOrder;
  totals: { allocated: number; utilized: number; itemCount: number; } | undefined;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
};


export default function ViewPoDetailsDialog({ isOpen, onOpenChange, po, totals }: ViewPoDetailsDialogProps) {
  const { updatePoStatus } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<PurchaseOrderStatus | ''>('');
  const [salesInvoice, setSalesInvoice] = useState(po.salesInvoice || '');
  const [deliveryReceipt, setDeliveryReceipt] = useState(po.deliveryReceipt || '');
  const [siFile, setSiFile] = useState<File | null>(null);
  const [drFile, setDrFile] = useState<File | null>(null);
  const [receivedBy, setReceivedBy] = useState(po.receivedBy || '');
  const [receivedDate, setReceivedDate] = useState<Date | undefined>(po.receivedDate?.toDate());


  if (!po) return null;

  const handleUpdateStatus = async () => {
    if (!selectedStatus) return;
    setIsUpdating(true);
    const success = await updatePoStatus(po, selectedStatus, { 
        salesInvoice, 
        deliveryReceipt, 
        salesInvoiceFile: siFile, 
        deliveryReceiptFile: drFile,
        receivedBy,
        receivedDate
    });
    if (success) {
        onOpenChange(true); // Signal that a change was made
    }
    setIsUpdating(false);
  }
  
  const isDeliveredDisabled = !salesInvoice || !deliveryReceipt || !receivedBy || !receivedDate;
  const isSaveDisabled = isUpdating || !selectedStatus;
  const balance = (totals?.allocated || po.totalAllocation || 0) - (totals?.utilized || 0);
  const isDelivered = po.status === 'Delivered';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => onOpenChange(false)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">PO Details: #{po.poNumber}</DialogTitle>
          <DialogDescription>A read-only summary of the purchase order.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-sm font-semibold text-muted-foreground">PO Number</p>
                    <p>{po.poNumber}</p>
                </div>
                 <div>
                    <p className="text-sm font-semibold text-muted-foreground">Date</p>
                    <p>{format(po.date.toDate(), 'PPP')}</p>
                </div>
            </div>
             <div>
                <p className="text-sm font-semibold text-muted-foreground">Care Of</p>
                <p>{po.careOf}</p>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-sm font-semibold text-muted-foreground">Number of Items</p>
                    <p>{totals?.itemCount ?? 0}</p>
                </div>
                <div>
                    <p className="text-sm font-semibold text-muted-foreground">Status</p>
                    <p>{po.displayStatus}</p>
                </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 border-t pt-4">
                <div>
                    <p className="text-sm font-semibold text-muted-foreground">Total Allocation</p>
                    <p className="font-bold text-lg">{formatCurrency(totals?.allocated || po.totalAllocation || 0)}</p>
                </div>
                <div>
                    <p className="text-sm font-semibold text-muted-foreground">Amount Utilized</p>
                    <p className="font-bold text-lg">{formatCurrency(totals?.utilized || 0)}</p>
                </div>
                 <div>
                    <p className="text-sm font-semibold text-muted-foreground">Balance</p>
                    <p className="font-bold text-lg">{formatCurrency(balance)}</p>
                </div>
            </div>

            {(po.displayStatus === 'Completed' || po.displayStatus === 'Delivered' || po.displayStatus === 'For Delivery') && (
                <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold text-foreground">Delivery Confirmation</h3>
                     <div className="space-y-4">
                         <div className="space-y-2">
                             <Label htmlFor="salesInvoice">Sales Invoice #</Label>
                             <div className="flex gap-2">
                                <Input id="salesInvoice" value={salesInvoice} onChange={(e) => setSalesInvoice(e.target.value)} disabled={isDelivered} className="flex-grow"/>
                                <Input id="siFile" type="file" onChange={(e) => setSiFile(e.target.files?.[0] ?? null)} disabled={isDelivered} className="flex-grow"/>
                             </div>
                             {po.salesInvoiceUrl && <a href={po.salesInvoiceUrl} target="_blank" rel="noopener noreferrer"><Button variant="link" size="sm" className="p-0 h-auto"><Download className="mr-2 h-3 w-3"/>View Uploaded SI</Button></a>}
                         </div>
                         <div className="space-y-2">
                             <Label htmlFor="deliveryReceipt">Delivery Receipt #</Label>
                             <div className="flex gap-2">
                                <Input id="deliveryReceipt" value={deliveryReceipt} onChange={(e) => setDeliveryReceipt(e.target.value)} disabled={isDelivered} className="flex-grow"/>
                                <Input id="drFile" type="file" onChange={(e) => setDrFile(e.target.files?.[0] ?? null)} disabled={isDelivered} className="flex-grow"/>
                             </div>
                             {po.deliveryReceiptUrl && <a href={po.deliveryReceiptUrl} target="_blank" rel="noopener noreferrer"><Button variant="link" size="sm" className="p-0 h-auto"><Download className="mr-2 h-3 w-3"/>View Uploaded DR</Button></a>}
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                 <Label htmlFor="receivedBy">Received by</Label>
                                 <Input id="receivedBy" value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} disabled={isDelivered}/>
                             </div>
                             <div className="space-y-2">
                                 <Label>Date Received</Label>
                                 <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                    <div className="relative">
                                        <Input
                                          value={receivedDate ? format(receivedDate, 'PPP') : ''}
                                          readOnly
                                          onFocus={() => setIsCalendarOpen(true)}
                                          placeholder="Select a date"
                                          className="pl-3 pr-10 text-left font-normal"
                                          disabled={isDelivered}
                                        />
                                      <PopoverTrigger asChild>
                                         <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground" disabled={isDelivered}>
                                            <CalendarIcon className="h-4 w-4" />
                                         </Button>
                                      </PopoverTrigger>
                                    </div>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar
                                        mode="single"
                                        selected={receivedDate}
                                        onSelect={(date) => {
                                          if (date) setReceivedDate(date);
                                          setIsCalendarOpen(false);
                                        }}
                                        initialFocus
                                        disabled={isDelivered}
                                      />
                                    </PopoverContent>
                                  </Popover>
                             </div>
                         </div>
                     </div>
                </div>
            )}
        </div>
        <DialogFooter className="sm:justify-between items-center">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>Close</Button>
          {(po.displayStatus === 'Completed' || po.displayStatus === 'For Delivery') && (
            <div className="flex items-center gap-2">
                 <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as PurchaseOrderStatus)} disabled={isUpdating || isDelivered}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Update Status..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="For Delivery">For Delivery</SelectItem>
                        <SelectItem value="Delivered" disabled={isDeliveredDisabled}>Delivered</SelectItem>
                    </SelectContent>
                </Select>
                <Button onClick={handleUpdateStatus} disabled={isSaveDisabled}>
                    {isUpdating ? 'Saving...' : 'Save'}
                </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
