
'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from '@/lib/types';
import type { DisplayPurchaseOrder } from '@/app/(app)/management/po/page';
import { format, parse } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect, useMemo } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Download, Calendar as CalendarIcon, PackageCheck, Truck } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Checkbox } from '../ui/checkbox';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useFirebase } from '@/firebase';

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
  const { firestore } = useFirebase();
  const { updatePoStatus, toast } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const [salesInvoice, setSalesInvoice] = useState('');
  const [deliveryReceipt, setDeliveryReceipt] = useState('');
  const [siFile, setSiFile] = useState<File | null>(null);
  const [drFile, setDrFile] = useState<File | null>(null);
  const [receivedBy, setReceivedBy] = useState('');
  const [receivedDateString, setReceivedDateString] = useState('');
  const [receivedDate, setReceivedDate] = useState<Date | undefined>();

  const [deliveryType, setDeliveryType] = useState<'complete' | 'partial'>('complete');
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen && po) {
      setSalesInvoice(po.salesInvoice || '');
      setDeliveryReceipt(po.deliveryReceipt || '');
      setReceivedBy(po.receivedBy || '');
      const rDate = po.receivedDate?.toDate();
      setReceivedDate(rDate);
      setReceivedDateString(rDate ? format(rDate, 'dd-MMM-yyyy') : '');
      setSiFile(null);
      setDrFile(null);
      setDeliveryType('complete');
      
      const fetchItems = async () => {
          const itemsCollectionRef = collection(firestore, 'purchase_orders', po.id, 'items');
          const q = query(itemsCollectionRef, orderBy('createdAt', 'asc'));
          const itemsSnap = await getDocs(q);
          const itemsData = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrderItem))
          setPoItems(itemsData);
          
          const initialSelection: Record<string, boolean> = {};
          itemsData.forEach(item => {
              if (item.itemType !== 'misc') {
                 initialSelection[item.id] = item.isDelivered || false;
              }
          });
          setSelectedItems(initialSelection);
      }
      
      fetchItems();
    }
  }, [isOpen, po, firestore]);

  const undeliveredItems = useMemo(() => {
      return poItems.filter(item => item.itemType !== 'misc' && !item.isDelivered);
  }, [poItems]);


  if (!po) return null;

  const handleDelivery = async () => {
    setIsUpdating(true);
    let newStatus: PurchaseOrderStatus = 'Delivered';
    let itemsToUpdate: PurchaseOrderItem[] = [];
    
    if (deliveryType === 'partial') {
        const selectedIds = Object.keys(selectedItems).filter(id => selectedItems[id]);
        if (selectedIds.length === 0) {
            toast({ variant: 'destructive', title: 'No Items Selected', description: 'Please select items for partial delivery.' });
            setIsUpdating(false);
            return;
        }
        
        itemsToUpdate = poItems.map(item => ({
            ...item,
            isDelivered: selectedItems[item.id] || item.isDelivered || false,
        }));
        
        const allItemsDelivered = itemsToUpdate.filter(item => item.itemType !== 'misc').every(item => item.isDelivered);
        newStatus = allItemsDelivered ? 'Delivered' : 'Partially Delivered';

    } else { // Complete delivery
         itemsToUpdate = poItems.map(item => ({
            ...item,
            isDelivered: true
        }));
    }

    const success = await updatePoStatus(po, newStatus, { 
        salesInvoice, 
        deliveryReceipt, 
        salesInvoiceFile: siFile, 
        deliveryReceiptFile: drFile,
        receivedBy,
        receivedDate,
        items: itemsToUpdate,
    });
    if (success) {
        onOpenChange(true);
    }
    setIsUpdating(false);
  }
  
  const isDelivered = po.status === 'Delivered';
  const showDeliveryForm = ['Completed', 'For Delivery', 'Partially Delivered', 'Delivered'].includes(po.displayStatus);
  const isDeliveryActionDisabled = isUpdating || !receivedBy || !receivedDate || (deliveryType === 'partial' && Object.values(selectedItems).every(v => v === false)) || isDelivered;

  const handleSelectItem = (itemId: string, checked: boolean) => {
    setSelectedItems(prev => ({ ...prev, [itemId]: checked }));
  };

  const handleSelectAll = (checked: boolean) => {
      const newSelection: Record<string, boolean> = {};
      undeliveredItems.forEach(item => {
          newSelection[item.id] = checked;
      });
      setSelectedItems(prev => ({...prev, ...newSelection}));
  };

  const isAllSelected = undeliveredItems.length > 0 && undeliveredItems.every(item => selectedItems[item.id]);

  
  const balance = (totals?.allocated || po.totalAllocation || 0) - (totals?.utilized || 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onOpenChange(false)}>
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
                    <p>{format(po.date.toDate(), 'dd-MMM-yyyy')}</p>
                </div>
                 <div>
                    <p className="text-sm font-semibold text-muted-foreground">Care Of</p>
                    <p>{po.careOf}</p>
                </div>
                 <div>
                    <p className="text-sm font-semibold text-muted-foreground">Agency / Company</p>
                    <p>{po.source}</p>
                </div>
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

            {showDeliveryForm && (
                <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold text-foreground">Delivery Confirmation</h3>
                     
                     {!isDelivered && (
                        <div className="space-y-3">
                            <Label>Delivery Type</Label>
                             <RadioGroup value={deliveryType} onValueChange={(v) => setDeliveryType(v as any)} className="flex space-x-4">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="complete" id="complete" /><Label htmlFor="complete">Complete Delivery</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="partial" id="partial" /><Label htmlFor="partial">Partial Delivery</Label></div>
                             </RadioGroup>
                        </div>
                     )}

                     {deliveryType === 'partial' && !isDelivered && undeliveredItems.length > 0 && (
                        <div className="border rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-2">
                               <Checkbox id="select-all" checked={isAllSelected} onCheckedChange={handleSelectAll} />
                               <Label htmlFor="select-all" className="font-semibold">Select All Undelivered Items</Label>
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                                {undeliveredItems.map(item => (
                                    <div key={item.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`item-${item.id}`}
                                            checked={selectedItems[item.id] || false}
                                            onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                                        />
                                        <Label htmlFor={`item-${item.id}`} className="flex-grow">{item.name}</Label>
                                        <span className="text-sm text-muted-foreground">Qty: {item.quantity}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                     )}

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
                                <div className="relative flex items-center">
                                    <Input
                                        value={receivedDateString}
                                        onChange={(e) => setReceivedDateString(e.target.value)}
                                        onBlur={(e) => {
                                            try {
                                                const parsedDate = parse(e.target.value, 'dd-MMM-yyyy', new Date());
                                                if (!isNaN(parsedDate.getTime())) {
                                                    setReceivedDate(parsedDate);
                                                } else {
                                                    setReceivedDateString(receivedDate ? format(receivedDate, 'dd-MMM-yyyy') : '');
                                                }
                                            } catch {
                                                setReceivedDateString(receivedDate ? format(receivedDate, 'dd-MMM-yyyy') : '');
                                            }
                                        }}
                                        placeholder="dd-MMM-yyyy"
                                        disabled={isDelivered}
                                    />
                                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="icon" className="absolute right-1 h-8 w-8" disabled={isDelivered}>
                                                <CalendarIcon className="h-4 w-4" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={receivedDate}
                                                onSelect={(date) => {
                                                    if (date) {
                                                        setReceivedDate(date);
                                                        setReceivedDateString(format(date, 'dd-MMM-yyyy'));
                                                    }
                                                    setIsCalendarOpen(false);
                                                }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                             </div>
                         </div>
                     </div>
                </div>
            )}
        </div>
        <DialogFooter className="sm:justify-between items-center">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>Close</Button>
          {showDeliveryForm && (
            <Button onClick={handleDelivery} disabled={isDeliveryActionDisabled}>
                {isUpdating ? 'Saving...' : (isDelivered ? 'Already Delivered' : (deliveryType === 'partial' ? 'Save Partial Delivery' : 'Mark as Delivered'))}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
