
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins } from "lucide-react";

export function FixedMiscCosts() {

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fixed Miscellaneous Costs</CardTitle>
        <CardDescription>
          Manage recurring and fixed miscellaneous business costs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            <Coins className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 font-semibold">Coming Soon</p>
            <p className="text-sm">This feature is currently under development.</p>
        </div>
      </CardContent>
    </Card>
  );
}
