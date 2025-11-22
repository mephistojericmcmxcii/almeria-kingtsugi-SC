
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { doc, getDoc } from 'firebase/firestore';
import type { QuotationRequest } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChevronLeft, FileText, Send, User, Mail, Phone, Building } from 'lucide-react';
import { RfqResponseForm } from '@/components/orders/rfq-response-form';
import { useToast } from '@/hooks/use-toast';

export default function RfqResponsePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    
    const rfqId = params.rfqId as string;
    const userId = searchParams.get('userId');

    const [rfq, setRfq] = useState<QuotationRequest | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        if (!firestore || !userId || !rfqId) {
            if (!userId) toast({ variant: 'destructive', title: 'Error', description: 'User ID is missing from the request.' });
            return;
        }

        const fetchRfq = async () => {
            setIsLoading(true);
            try {
                const rfqRef = doc(firestore, 'users', userId, 'rfq', rfqId);
                const docSnap = await getDoc(rfqRef);
                if (docSnap.exists()) {
                    setRfq({ id: docSnap.id, ...docSnap.data() } as QuotationRequest);
                } else {
                    toast({ variant: 'destructive', title: 'Not Found', description: 'The requested quotation could not be found.' });
                }
            } catch (error) {
                console.error("Error fetching RFQ:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load the quotation request.' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchRfq();
    }, [firestore, userId, rfqId, toast]);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!rfq) {
        return (
            <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h2 className="mt-4 text-xl font-semibold">Request Not Found</h2>
                <p className="mt-2 text-muted-foreground">The quotation request may have been deleted or the link is incorrect.</p>
                <Button asChild className="mt-6">
                    <Link href="/management/orders">Back to Order Management</Link>
                </Button>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
             <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/management/orders">
                        <ChevronLeft className="h-4 w-4" />
                        <span className="sr-only">Back to Order Management</span>
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline">Respond to Quotation Request</h1>
                    <p className="text-muted-foreground">Create and send a quotation for RFQ #{rfq.id.substring(0, 8)}...</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><User className="w-5 h-5"/>Customer Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="font-semibold text-muted-foreground">Name</span>
                                <span>{rfq.customerName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-semibold text-muted-foreground flex items-center gap-2"><Mail className="w-4 h-4"/>Email</span>
                                <span>{rfq.emailAddress}</span>
                            </div>
                             <div className="flex justify-between">
                                <span className="font-semibold text-muted-foreground flex items-center gap-2"><Phone className="w-4 h-4"/>Contact</span>
                                <span>{rfq.contactNumber}</span>
                            </div>
                             <div className="flex justify-between">
                                <span className="font-semibold text-muted-foreground flex items-center gap-2"><Building className="w-4 h-4"/>Company</span>
                                <span>{rfq.companyName || 'N/A'}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Alert>
                        <Send className="h-4 w-4" />
                        <AlertTitle>Next Step</AlertTitle>
                        <AlertDescription>
                            After submitting your response, a new "Quote Ready" order will be created for the customer. They will be notified and can then confirm the purchase.
                        </AlertDescription>
                    </Alert>
                </div>
                <div className="lg:col-span-2">
                    <RfqResponseForm rfq={rfq} />
                </div>
            </div>
        </div>
    );
}
