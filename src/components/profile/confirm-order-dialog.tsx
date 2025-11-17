
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { Order, CartItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

interface ConfirmOrderDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    order: Order;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
};


export function ConfirmOrderDialog({ isOpen, onOpenChange, order }: ConfirmOrderDialogProps) {
    const { user, updateOrderStatus } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Local state for editable fields
    const [items, setItems] = useState<CartItem[]>([]);
    const [shippingAddress, setShippingAddress] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cod' | 'gcash' | 'bank'>('cod');

    useEffect(() => {
        if (order) {
            setItems(order.items);
            setShippingAddress(user?.address || order.shippingAddress);
            setContactNumber(user?.contactNumber || order.shippingContactNumber);
            setPaymentMethod(order.paymentMethod as any || 'cod');
        }
    }, [order, user]);

    const handleQuantityChange = (itemId: string, newQuantity: number) => {
        const itemToUpdate = items.find(item => item.id === itemId);
        if (!itemToUpdate) return;
        
        if (newQuantity < 1) {
            setItems(items.filter(item => item.id !== itemId));
        } else if (itemToUpdate.stock && newQuantity > itemToUpdate.stock) {
            toast({
                variant: 'destructive',
                title: 'Stock Limit Exceeded',
                description: `Only ${itemToUpdate.stock} units of ${itemToUpdate.parentName} are available.`,
            });
        } else {
            setItems(items.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item));
        }
    };
    
    const { subtotal, totalDiscount, finalTotal } = useMemo(() => {
        const currentSubtotal = items.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);
        
        const currentTotalDiscount = items.reduce((acc, item) => {
            const itemTotal = (item.price || 0) * item.quantity;
            const discountValue = itemTotal * ((item.discount || 0) / 100);
            return acc + discountValue;
        }, 0);
        
        const currentFinalTotal = currentSubtotal - currentTotalDiscount + (order.deliveryFee || 0) + (order.packagingFee || 0);
        
        return { subtotal: currentSubtotal, totalDiscount: currentTotalDiscount, finalTotal: currentFinalTotal };

    }, [items, order.deliveryFee, order.packagingFee]);
    

    const handleConfirm = async () => {
        if (!contactNumber.trim() || !shippingAddress.trim()) {
            toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please provide a contact number and shipping address.',
            });
            return;
        }
        
        if (items.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No Items',
                description: 'You cannot confirm an order with no items.',
            });
             await updateOrderStatus(order, 'cancelled', { reason: 'All items removed by customer before confirmation.' });
             onOpenChange(false);
            return;
        }

        setIsSubmitting(true);
        
        const success = await updateOrderStatus(order, 'confirmed', {
            items,
            totalAmount: finalTotal,
            discount: totalDiscount,
            shippingAddress,
            shippingContactNumber: contactNumber,
            paymentMethod,
        });
        
        if (success) {
            toast({
                title: 'Order Confirmed!',
                description: 'Your order has been sent to the seller for processing.',
            });
            onOpenChange(false);
        }
        setIsSubmitting(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl">Confirm Your Purchase</DialogTitle>
                    <DialogDescription>
                        Review your items and confirm your delivery and payment details. You can adjust quantities or remove items before finalizing.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4 py-4">
                    {/* Items List */}
                    <div className="space-y-4">
                        <h3 className="font-semibold">Items</h3>
                        {items.map(item => (
                            <div key={item.id} className="flex items-center gap-4 border-b pb-4 last:border-b-0">
                                <img src={item.imageUrl} alt={item.parentName || 'item'} className="w-16 h-16 rounded-md object-cover" />
                                <div className="flex-grow">
                                    <p className="font-medium">{item.parentName} ({item.brand})</p>
                                    <p className="text-sm text-muted-foreground">{formatCurrency(item.price || 0)} each</p>
                                    {(item.discount || 0) > 0 && <p className="text-xs text-green-600">({item.discount}% off)</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                     <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => handleQuantityChange(item.id, item.quantity - 1)}><Minus className="h-4 w-4" /></Button>
                                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                                    <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => handleQuantityChange(item.id, item.quantity + 1)}><Plus className="h-4 w-4" /></Button>
                                </div>
                                <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => handleQuantityChange(item.id, 0)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                         {items.length === 0 && (
                            <p className="text-center text-muted-foreground py-4">No items in this order.</p>
                        )}
                    </div>
                    
                    {/* Billing Information */}
                    <div className="space-y-4 border-t pt-6">
                         <h3 className="font-semibold">Billing & Delivery</h3>
                         <div className="space-y-2">
                            <Label htmlFor="contactNumber">Contact Number</Label>
                            <Input id="contactNumber" value={contactNumber} onChange={e => setContactNumber(e.target.value)} />
                         </div>
                         <div className="space-y-2">
                             <Label htmlFor="shippingAddress">Shipping Address</Label>
                             <Textarea id="shippingAddress" value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} />
                         </div>
                    </div>

                    <div className="space-y-4 border-t pt-6">
                        <h3 className="font-semibold">Payment Method</h3>
                        <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)} className="flex gap-4">
                            <Label htmlFor="cod" className="flex items-center gap-2 border p-3 rounded-md has-[:checked]:bg-primary/10 has-[:checked]:border-primary transition-all">
                                <RadioGroupItem value="cod" id="cod" />
                                Cash on Delivery (COD)
                            </Label>
                             <Label htmlFor="gcash" className="flex items-center gap-2 border p-3 rounded-md has-[:checked]:bg-primary/10 has-[:checked]:border-primary transition-all text-muted-foreground cursor-not-allowed">
                                <RadioGroupItem value="gcash" id="gcash" disabled />
                                Gcash (Unavailable)
                            </Label>
                             <Label htmlFor="bank" className="flex items-center gap-2 border p-3 rounded-md has-[:checked]:bg-primary/10 has-[:checked]:border-primary transition-all text-muted-foreground cursor-not-allowed">
                                <RadioGroupItem value="bank" id="bank" disabled />
                                Bank Transfer (Unavailable)
                            </Label>
                        </RadioGroup>
                    </div>

                    {/* Order Summary */}
                     <div className="space-y-2 pt-6 border-t">
                        <h3 className="font-semibold">Order Summary</h3>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                         {totalDiscount > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                                <span className="text-muted-foreground">Total Item Discounts</span>
                                <span>- {formatCurrency(totalDiscount)}</span>
                            </div>
                        )}
                        {(order.deliveryFee || 0) > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Delivery Fee</span>
                                <span>{formatCurrency(order.deliveryFee!)}</span>
                            </div>
                        )}
                        {(order.packagingFee || 0) > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Packaging Fee</span>
                                <span>{formatCurrency(order.packagingFee!)}</span>
                            </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>{formatCurrency(finalTotal)}</span>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={isSubmitting || items.length === 0}>
                        {isSubmitting ? 'Confirming...' : 'Confirm & Finalize Purchase'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
