
'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import type { CustomerFeedback } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

const getInitials = (name?: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[1][0]}`;
    }
    return name.substring(0, 2);
};

const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
            <Star
                key={i}
                className={`h-5 w-5 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`}
            />
        ))}
    </div>
);

export default function CustomerReviewsPage() {
    const { firestore } = useFirebase();
    const [reviews, setReviews] = useState<CustomerFeedback[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchReviews = async () => {
            if (!firestore) return;
            setIsLoading(true);
            try {
                const reviewsQuery = query(collection(firestore, 'customer_feedback'), orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(reviewsQuery);
                const fetchedReviews = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as CustomerFeedback));
                setReviews(fetchedReviews);
            } catch (error) {
                console.error("Error fetching customer reviews:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReviews();
    }, [firestore]);

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight font-headline text-primary">
                    Customer Reviews & Testimonials
                </h1>
                <p className="mt-2 text-lg text-muted-foreground">
                    See what our valued customers are saying about their experience.
                </p>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center gap-4">
                                <Skeleton className="h-12 w-12 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : reviews.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reviews.map((review: any) => (
                        <Card key={review.id} className="flex flex-col">
                            <CardHeader className="flex flex-row items-center gap-4">
                                <Avatar className="h-12 w-12">
                                    <AvatarFallback>{getInitials(review.userName)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-lg">{review.userName}</CardTitle>
                                    {review.createdAt && (
                                        <p className="text-xs text-muted-foreground">
                                            {format(review.createdAt.toDate(), 'MMMM d, yyyy')}
                                        </p>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                                <StarRating rating={review.rating} />
                                {review.review && (
                                     <blockquote className="border-l-4 pl-4 italic text-muted-foreground">
                                        {review.review}
                                    </blockquote>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-24 border rounded-lg bg-muted/20">
                    <MessageSquare className="mx-auto h-16 w-16 text-muted-foreground" />
                    <h2 className="mt-6 text-2xl font-semibold">No Reviews Yet</h2>
                    <p className="mt-2 text-muted-foreground">Be the first to leave a review after a purchase!</p>
                </div>
            )}
        </div>
    );
}
