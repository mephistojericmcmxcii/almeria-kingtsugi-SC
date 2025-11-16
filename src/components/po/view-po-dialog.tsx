
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { PurchaseOrder, PurchaseOrderStatus } from '@/lib/types';
import { format } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ViewPoDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    po: PurchaseOrder;
}

const PO_STATUSES: PurchaseOrderStatus[] = ['Pending', 'Approved', 'Paid', 'Completed', 'Cancelled'];

export function ViewPoDialog({ isOpen, onOpenChange, po }: ViewPoDialogProps) {
    const { updatePoStatus } = useAuth();
    const [currentStatus, setCurrentStatus] = useState(po.status);
    const [isUpdating, setIsUpdating] = useState(false);

    const handleStatusChange = async (newStatus: PurchaseOrderStatus) => {
        setIsUpdating(true);
        const success = await updatePoStatus(po.id, newStatus);
        if (success) {
            setCurrentStatus(newStatus);
        }
        setIsUpdating(false);
    };

    const getStatusBadge = (status: PurchaseOrderStatus) => {
        switch (status) {
            case 'Pending': return <Badge variant="secondary" className="bg-yellow-500 text-yellow-50">Pending</Badge>;
            case 'Approved': return <Badge className="bg-blue-500 text-blue-50">Approved</Badge>;
            case 'Paid': return <Badge className="bg-purple-500 text-purple-50">Paid</Badge>;
            case 'Completed': return <Badge className="bg-green-600 text-green-50">Completed</Badge>;
            case 'Cancelled': return <Badge variant="destructive">Cancelled</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl">Purchase Order Details</DialogTitle>
                    <DialogDescription>
                        PO #: <span className="font-mono">{po.poNumber}</span>
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h3 className="font-semibold mb-1">Date</h3>
                            <p className="text-sm">{format(po.date.toDate(), 'MMMM d, yyyy')}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-1">Care Of</h3>
                            <p className="text-sm">{po.careOf}</p>
                        </div>
                    </div>
                    <div className="pt-4 border-t">
                        <h3 className="font-semibold mb-1">Total Amount</h3>
                        <p className="text-2xl font-bold">{formatCurrency(po.totalAmount)}</p>
                    </div>
                </div>
                <DialogFooter className="sm:justify-between items-center">
                    <div className="font-semibold flex items-center gap-2">
                        Status: {getStatusBadge(currentStatus)}
                    </div>
                    <div className="flex items-center gap-2">
                        <Select
                            value={currentStatus}
                            onValueChange={(newStatus) => handleStatusChange(newStatus as PurchaseOrderStatus)}
                            disabled={isUpdating || currentStatus === 'Completed' || currentStatus === 'Cancelled'}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Update status..." />
                            </SelectTrigger>
                            <SelectContent>
                                {PO_STATUSES.map(status => (
                                    <SelectItem key={status} value={status}>{status}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
