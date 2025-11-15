
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
import { UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ShieldAlert } from "lucide-react";


export default function MakeAdminPage() {
    const { user } = useAuth();
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
    
    if (user?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                 <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
                <h1 className="text-3xl font-bold font-headline text-destructive">Access Denied</h1>
                <p className="text-muted-foreground mt-2">
                    You do not have permission to view this page.
                </p>
            </div>
        )
    }

  return (
    <div className="space-y-8 max-w-xl mx-auto">
        <div className="flex items-center gap-4">
            <UserCog className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight font-headline">Make Admin</h1>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Grant Admin Privileges</CardTitle>
          <CardDescription>
            Enter a user's UID to grant them admin privileges. This is an advanced tool for initial setup. The user must sign out and sign back in for the new role to take effect.
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
          <Button onClick={makeAdmin} disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : "Set as Admin"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
