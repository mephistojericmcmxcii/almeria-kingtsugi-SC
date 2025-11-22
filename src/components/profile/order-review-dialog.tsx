
'use client';

import { useState } from 'react';
import type { Order } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface OrderReviewDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    order: Order;
    onSubmit: (review?: string) => Promise<void>;
}

export function OrderReviewDialog({ isOpen, onOpenChange, order, onSubmit }: OrderReviewDialogProps) {
    const [review, setReview] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        await onSubmit(review);
        setIsSubmitting(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl">Order Received!</DialogTitle>
                    <DialogDescription>
                        Thank you for confirming your order. Would you like to leave a review? (Optional)
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="review">Your Review</Label>
                    <Textarea
                        id="review"
                        placeholder="Tell us what you think about the products or your experience..."
                        value={review}
                        onChange={(e) => setReview(e.target.value)}
                        rows={4}
                    />
                </div>
                <DialogFooter>
                    <Button 
                        type="button" 
                        onClick={handleSubmit} 
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
