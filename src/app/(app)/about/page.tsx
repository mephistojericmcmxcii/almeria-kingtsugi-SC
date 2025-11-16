'use client';

import { useState } from 'react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { EditAboutDialog } from '@/components/about/edit-about-dialog';
import { Skeleton } from '@/components/ui/skeleton';

export type AboutPageContent = {
  title: string;
  heading: string;
  p1: string;
  p2: string;
  missionHeading: string;
  missionP: string;
  imageId: string;
};

const defaultContent: AboutPageContent = {
    title: 'About Kintsugi Variety Shop',
    heading: 'Embracing Imperfection',
    p1: 'Kintsugi (金継ぎ, "golden joinery") is the Japanese art of repairing broken pottery by mending the areas of breakage with lacquer dusted or mixed with powdered gold, silver, or platinum. As a philosophy, it treats breakage and repair as part of the history of an object, rather than something to disguise.',
    p2: 'At Kintsugi Variety Shop, we celebrate this philosophy. We believe in finding beauty in imperfection and giving new life to what was once broken. Our portal is an extension of this belief, designed to manage our craft with precision, care, and a touch of elegance.',
    missionHeading: 'Our Mission',
    missionP: 'Our mission is to provide unique, handcrafted items that tell a story. This management portal helps us streamline our operations, from inventory to customer relations, ensuring that we can focus on what truly matters: the art of kintsugi.',
    imageId: 'kintsugi-shop'
};

export default function AboutPage() {
    const { user, firestore } = useAuth();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const aboutContentRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'system_settings', 'about_page') : null),
        [firestore]
    );
    const { data: aboutContentData, isLoading } = useDoc<AboutPageContent>(aboutContentRef);
    
    const content = aboutContentData || defaultContent;
    const aboutImage = PlaceHolderImages.find(p => p.id === content.imageId) || PlaceHolderImages.find(p => p.id === 'kintsugi-shop');
    
    return (
        <>
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold tracking-tight font-headline">{content.title}</h1>
                    {user?.role === 'admin' && (
                        <Button variant="outline" size="icon" onClick={() => setIsEditDialogOpen(true)}>
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit Page</span>
                        </Button>
                    )}
                </div>
                <Card>
                    <CardContent className="p-6">
                        <div className="grid md:grid-cols-2 gap-8 items-center">
                            <div className="space-y-4">
                                <h2 className="text-2xl font-semibold font-headline text-primary">{content.heading}</h2>
                                {isLoading ? (
                                    <div className="space-y-4">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-5/6" />
                                        <Skeleton className="h-4 w-full mt-2" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-muted-foreground leading-relaxed">{content.p1}</p>
                                        <p className="text-muted-foreground leading-relaxed">{content.p2}</p>
                                        <h3 className="text-xl font-semibold font-headline text-accent pt-4">{content.missionHeading}</h3>
                                        <p className="text-muted-foreground leading-relaxed">{content.missionP}</p>
                                    </>
                                )}
                            </div>
                            <div>
                                {isLoading ? (
                                    <Skeleton className="w-full aspect-video rounded-lg" />
                                ) : (
                                     aboutImage && (
                                        <Image
                                            src={aboutImage.imageUrl}
                                            alt={aboutImage.description}
                                            width={1200}
                                            height={800}
                                            className="rounded-lg object-cover aspect-video"
                                            data-ai-hint={aboutImage.imageHint}
                                        />
                                    )
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            {user?.role === 'admin' && (
                <EditAboutDialog 
                    isOpen={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    content={content}
                />
            )}
        </>
    );
}
