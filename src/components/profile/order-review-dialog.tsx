
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
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderReviewDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    order: Order;
    onSubmit: (details: { review?: string, rating?: number }) => Promise<void>;
}

export function OrderReviewDialog({ isOpen, onOpenChange, order, onSubmit }: OrderReviewDialogProps) {
    const [review, setReview] = useState('');
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        // Only submit review and rating if a rating has been given.
        const reviewDetails = rating > 0 ? { review: review || undefined, rating } : {};
        await onSubmit(reviewDetails);
        setIsSubmitting(false);
        setRating(0);
        setReview('');
        onOpenChange(false);
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl">Order Received!</DialogTitle>
                    <DialogDescription>
                        Thank you for your purchase. Please leave a rating and an optional review.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>Rating (required to submit a review)</Label>
                         <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={cn(
                                        "h-8 w-8 cursor-pointer transition-colors",
                                        (hoverRating || rating) >= star 
                                            ? "text-yellow-400 fill-yellow-400"
                                            : "text-muted-foreground"
                                    )}
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="review">Your Review (Optional)</Label>
                        <Textarea
                            id="review"
                            placeholder="Tell us what you think about the products or your experience..."
                            value={review}
                            onChange={(e) => setReview(e.target.value)}
                            rows={4}
                            disabled={rating === 0}
                        />
                    </div>
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
