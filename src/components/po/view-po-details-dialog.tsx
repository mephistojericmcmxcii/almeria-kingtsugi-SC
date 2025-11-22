

'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { PurchaseOrder } from '@/lib/types';
import type { DisplayPurchaseOrder } from '@/app/(app)/management/po/page';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Download } from 'lucide-react';

interface ViewPoDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (changed: boolean) => void;
  po: DisplayPurchaseOrder;
  totals: { allocated: number; utilized: number; itemCount: number; } | undefined;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
};


export function ViewPoDetailsDialog({ isOpen, onOpenChange, po, totals }: ViewPoDetailsDialogProps) {
  const { updatePoStatus } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [salesInvoice, setSalesInvoice] = useState(po.salesInvoice || '');
  const [deliveryReceipt, setDeliveryReceipt] = useState(po.deliveryReceipt || '');
  const [siFile, setSiFile] = useState<File | null>(null);
  const [drFile, setDrFile] = useState<File | null>(null);

  if (!po) return null;

  const handleUpdateStatus = async () => {
    setIsUpdating(true);
    const success = await updatePoStatus(po.id, 'Delivered', { salesInvoice, deliveryReceipt, salesInvoiceFile: siFile, deliveryReceiptFile: drFile });
    if (success) {
        onOpenChange(true); // Signal that a change was made
    }
    setIsUpdating(false);
  }
  
  const isMarkAsDeliveredDisabled = isUpdating || !salesInvoice || !deliveryReceipt;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => onOpenChange(false)}>
      <DialogContent className="sm:max-w-lg">
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
            
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                    <p className="text-sm font-semibold text-muted-foreground">Total Allocation</p>
                    <p className="font-bold text-lg">{formatCurrency(totals?.allocated || po.totalAllocation || 0)}</p>
                </div>
                <div>
                    <p className="text-sm font-semibold text-muted-foreground">Amount Utilized</p>
                    <p className="font-bold text-lg">{formatCurrency(totals?.utilized || 0)}</p>
                </div>
            </div>

            {(po.displayStatus === 'Completed' || po.displayStatus === 'Delivered') && (
                <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold text-foreground">Delivery Confirmation</h3>
                     <div className="grid grid-cols-1 gap-4">
                         <div className="space-y-2">
                             <Label htmlFor="salesInvoice">Sales Invoice #</Label>
                             <Input id="salesInvoice" value={salesInvoice} onChange={(e) => setSalesInvoice(e.target.value)} disabled={po.displayStatus === 'Delivered'} />
                         </div>
                         <div className="space-y-2">
                             <Label htmlFor="siFile">Attach Sales Invoice File</Label>
                             <Input id="siFile" type="file" onChange={(e) => setSiFile(e.target.files?.[0] ?? null)} disabled={po.displayStatus === 'Delivered'} />
                             {po.salesInvoiceUrl && <a href={po.salesInvoiceUrl} target="_blank" rel="noopener noreferrer"><Button variant="link" size="sm" className="p-0 h-auto"><Download className="mr-2 h-3 w-3"/>View Uploaded SI</Button></a>}
                         </div>
                         <div className="space-y-2">
                             <Label htmlFor="deliveryReceipt">Delivery Receipt #</Label>
                             <Input id="deliveryReceipt" value={deliveryReceipt} onChange={(e) => setDeliveryReceipt(e.target.value)} disabled={po.displayStatus === 'Delivered'} />
                         </div>
                          <div className="space-y-2">
                             <Label htmlFor="drFile">Attach Delivery Receipt File</Label>
                             <Input id="drFile" type="file" onChange={(e) => setDrFile(e.target.files?.[0] ?? null)} disabled={po.displayStatus === 'Delivered'} />
                             {po.deliveryReceiptUrl && <a href={po.deliveryReceiptUrl} target="_blank" rel="noopener noreferrer"><Button variant="link" size="sm" className="p-0 h-auto"><Download className="mr-2 h-3 w-3"/>View Uploaded DR</Button></a>}
                         </div>
                     </div>
                </div>
            )}
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>Close</Button>
          {po.displayStatus === 'Completed' && (
            <Button onClick={handleUpdateStatus} disabled={isMarkAsDeliveredDisabled}>
                {isUpdating ? 'Updating...' : 'Mark as Delivered'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
