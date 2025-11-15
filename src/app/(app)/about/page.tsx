import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

export default function AboutPage() {
    const aboutImage = PlaceHolderImages.find(p => p.id === 'kintsugi-shop');

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold tracking-tight font-headline">About Kintsugi Variety Shop</h1>
            <Card>
                <CardContent className="p-6">
                    <div className="grid md:grid-cols-2 gap-8 items-center">
                        <div className="space-y-4">
                            <h2 className="text-2xl font-semibold font-headline text-primary">Embracing Imperfection</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Kintsugi (金継ぎ, "golden joinery") is the Japanese art of repairing broken pottery by mending the areas of breakage with lacquer dusted or mixed with powdered gold, silver, or platinum. As a philosophy, it treats breakage and repair as part of the history of an object, rather than something to disguise.
                            </p>
                            <p className="text-muted-foreground leading-relaxed">
                                At Kintsugi Variety Shop, we celebrate this philosophy. We believe in finding beauty in imperfection and giving new life to what was once broken. Our portal is an extension of this belief, designed to manage our craft with precision, care, and a touch of elegance.
                            </p>
                             <h3 className="text-xl font-semibold font-headline text-accent pt-4">Our Mission</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Our mission is to provide unique, handcrafted items that tell a story. This management portal helps us streamline our operations, from inventory to customer relations, ensuring that we can focus on what truly matters: the art of kintsugi.
                            </p>
                        </div>
                        <div>
                            {aboutImage && (
                                <Image
                                    src={aboutImage.imageUrl}
                                    alt={aboutImage.description}
                                    width={1200}
                                    height={800}
                                    className="rounded-lg object-cover aspect-video"
                                    data-ai-hint={aboutImage.imageHint}
                                />
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
