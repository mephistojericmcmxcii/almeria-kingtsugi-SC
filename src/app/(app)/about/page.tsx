
'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  body: string;
  missionHeading: string;
  missionP: string;
  imageUrl: string;
};

const defaultContent: AboutPageContent = {
    title: 'About Kintsugi Variety Shop',
    heading: 'Embracing Imperfection',
    body: 'Kintsugi (金継ぎ, "golden joinery") is the Japanese art of repairing broken pottery by mending the areas of breakage with lacquer dusted or mixed with powdered gold, silver, or platinum. As a philosophy, it treats breakage and repair as part of the history of an object, rather than something to disguise.\n\nAt Kintsugi Variety Shop, we celebrate this philosophy. We believe in finding beauty in imperfection and giving new life to what was once broken. Our portal is an extension of this belief, designed to manage our craft with precision, care, and a touch of elegance.',
    missionHeading: 'Our Mission',
    missionP: 'Our mission is to provide unique, handcrafted items that tell a story. This management portal helps us streamline our operations, from inventory to customer relations, ensuring that we can focus on what truly matters: the art of kintsugi.',
    imageUrl: 'https://images.unsplash.com/photo-1641816482139-cfa2066a298e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw2fHxzaG9wJTIwaW50ZXJpb3J8ZW58MHx8fHwxNzYzMDg2Mzk3fDA&ixlib=rb-4.1.0&q=80&w=1080'
};

export default function AboutPage() {
    const { user, firestore } = useAuth();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const aboutContentRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'system_settings', 'about_page') : null),
        [firestore]
    );
    const { data: content, isLoading } = useDoc<AboutPageContent>(aboutContentRef);
    
    const displayContent = content || defaultContent;
    
    return (
        <>
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold tracking-tight font-headline">{displayContent.title}</h1>
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
                                <h2 className="text-2xl font-semibold font-headline text-primary">{displayContent.heading}</h2>
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
                                        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{displayContent.body}</p>
                                        <h3 className="text-xl font-semibold font-headline text-accent pt-4">{displayContent.missionHeading}</h3>
                                        <p className="text-muted-foreground leading-relaxed">{displayContent.missionP}</p>
                                    </>
                                )}
                            </div>
                            <div>
                                {isLoading ? (
                                    <Skeleton className="w-full aspect-video rounded-lg" />
                                ) : (
                                     displayContent.imageUrl && (
                                        <img
                                            src={displayContent.imageUrl}
                                            alt="About the Kintsugi Shop"
                                            className="rounded-lg object-cover aspect-video w-full h-full"
                                            data-ai-hint="shop interior"
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
                    content={displayContent}
                />
            )}
        </>
    );
}
