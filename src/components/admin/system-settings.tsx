
"use client"

import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "../ui/skeleton";
import { useState } from "react";

type MaintenanceSetting = {
    enabled: boolean;
};

export function SystemSettings() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const maintenanceRef = useMemoFirebase(() => {
      if (!firestore) return null;
      return doc(firestore, 'system_settings', 'maintenance_mode');
  }, [firestore]);

  const { data: maintenanceSetting, isLoading } = useDoc<MaintenanceSetting>(maintenanceRef);

  const handleMaintenanceToggle = async (enabled: boolean) => {
    if (!maintenanceRef) return;
    try {
        await setDoc(maintenanceRef, { enabled });
    } catch (error) {
        console.error("Failed to toggle maintenance mode", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not update maintenance mode setting.",
        });
    }
  };

  const handleSaveChanges = async () => {
    // This is a placeholder for saving other settings.
    // The maintenance mode switch saves instantly.
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    toast({
        title: "Settings Saved",
        description: "Your system settings have been updated.",
    });
    setIsSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">System Settings</CardTitle>
        <CardDescription>Configure global settings for the application.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="maintenance-mode" className="text-base">Maintenance Mode</Label>
            <p className="text-sm text-muted-foreground">
                Temporarily disable access to the portal for all non-admin users.
            </p>
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-11 rounded-full" />
          ) : (
            <Switch 
                id="maintenance-mode"
                checked={maintenanceSetting?.enabled || false}
                onCheckedChange={handleMaintenanceToggle}
            />
          )}
        </div>

        <div className="flex items-center justify-between space-x-2 rounded-lg border p-4 opacity-50">
          <div className="space-y-0.5">
            <Label htmlFor="new-registrations" className="text-base">Enable New Registrations</Label>
            <p className="text-sm text-muted-foreground">
                Allow new users to sign up for guest accounts. (Coming soon)
            </p>
          </div>
          <Switch id="new-registrations" defaultChecked disabled />
        </div>
        
        <div className="space-y-2 opacity-50">
            <Label htmlFor="api-key">Third-Party API Key</Label>
            <Input id="api-key" placeholder="Enter your API key" disabled />
            <p className="text-sm text-muted-foreground">
                API key for external service integrations. (Coming soon)
            </p>
        </div>

      </CardContent>
      <CardFooter>
        <Button onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </CardFooter>
    </Card>
  )
}
