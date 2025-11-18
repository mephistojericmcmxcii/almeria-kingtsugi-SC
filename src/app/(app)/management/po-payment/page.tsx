
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";

export default function PoPaymentPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <CreditCard className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight font-headline">PO Payment</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Purchase Order Payments</CardTitle>
          <CardDescription>
            Process and track payments for purchase orders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>PO Payment page content goes here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
