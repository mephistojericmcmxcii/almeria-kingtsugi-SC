"use client";

import { getFunctions, httpsCallable } from "firebase/functions";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
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
import { ShieldAlert, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MakeAdminPage() {
  const { user: currentUser } = useAuth();
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
        description: `User ${uid} has been granted admin privileges.`,
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

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold font-headline text-destructive">
          Access Denied
        </h1>
        <p className="text-muted-foreground mt-2">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
       <div className="flex items-center gap-4">
        <UserCog className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight font-headline">Set Admin Role</h1>
      </div>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Grant Admin Privileges</CardTitle>
          <CardDescription>
            Enter a user's UID to grant them admin privileges. This action is irreversible through the UI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="uid">User ID (UID)</Label>
            <Input
              id="uid"
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              placeholder="Enter the user's UID"
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
