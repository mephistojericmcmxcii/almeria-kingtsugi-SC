
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="space-y-8">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Home</h1>
        <Card>
            <CardHeader>
                <CardTitle>Welcome</CardTitle>
            </CardHeader>
            <CardContent>
                <p>This is the new home page.</p>
            </CardContent>
        </Card>
    </div>
  );
}
