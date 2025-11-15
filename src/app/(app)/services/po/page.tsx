import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function PoPage() {
  return (
    <div className="space-y-8">
       <div className="flex items-center gap-4">
        <FileText className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight font-headline">Purchase Orders</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Purchase Order Management</CardTitle>
          <CardDescription>
            Create, view, and manage purchase orders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Purchase Orders page content goes here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
