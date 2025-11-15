
"use client";

import { getFunctions, httpsCallable } from "firebase/functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCog, Gem } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MakeAdminPage() {
  const { toast } = useToast();
  const [uid, setUid] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function makeAdmin() {
    if (!uid) {
      toast({
        variant: "destructive",
        title: "UID Required",
        description: "Please enter a user ID.",
      });
      return;
    }
    setIsSubmitting(true);
    const functions = getFunctions();
    const setAdminRole = httpsCallable(functions, "setAdminRole");

    try {
      const result = await setAdminRole({ uid });
      console.log(result.data);
      toast({
        title: "Success!",
        description: `User ${uid} has been granted admin privileges. They must log out and log back in for the change to take effect.`,
      });
      setUid("");
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err.message || "An unknown error occurred while setting the admin role.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
         <div className="flex flex-col justify-center items-center mb-8 text-center">
          <Gem className="h-10 w-10 mb-4 text-primary" />
          <h1 className="text-4xl font-bold font-headline">Kintsugi Portal</h1>
           <p className="text-muted-foreground mt-2">
            Admin Creation Tool
          </p>
        </div>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserCog /> Grant Admin Privileges</CardTitle>
                <CardDescription>
                Enter a user's UID to grant them admin privileges. The user must sign out and sign back in for the new role to take effect.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <Label htmlFor="uid">User ID (UID)</Label>
                    <Input
                    id="uid"
                    value={uid}
                    onChange={(e) => setUid(e.target.value)}
                    placeholder="Enter the user's Firebase UID"
                    />
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={makeAdmin} disabled={isSubmitting} className="w-full">
                    {isSubmitting ? "Processing..." : "Set as Admin"}
                </Button>
            </CardFooter>
        </Card>
      </div>
    </main>
  );
}
