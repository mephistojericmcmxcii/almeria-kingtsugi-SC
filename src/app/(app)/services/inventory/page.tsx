import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Boxes } from "lucide-react";

export default function InventoryPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Boxes className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight font-headline">Inventory</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Inventory Management</CardTitle>
          <CardDescription>
            Track and manage your product inventory.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Inventory page content goes here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
