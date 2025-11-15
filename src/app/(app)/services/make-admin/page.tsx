
'use client';

import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCog } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function MakeAdminPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function makeSelfAdmin() {
    if (!user) {
      setError("You must be logged in to use this tool.");
      return;
    }

    setIsSubmitting(true);
    setStatus("Calling Cloud Function to grant admin privileges...");
    setError(null);

    const functions = getFunctions();
    const setAdminRole = httpsCallable(functions, "setAdminRole");

    try {
      const result = await setAdminRole({ uid: user.uid });
      setStatus(`Success! You are now an admin. Please refresh the page to see updated permissions.`);
    } catch (err: any) {
      setError(err.message || "An unknown error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-4">
            <UserCog className="w-8 h-8 text-primary" />
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline">Make Me Admin</h1>
                <p className="text-muted-foreground">Grant administrative privileges to your own account.</p>
            </div>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Become an Administrator</CardTitle>
                <CardDescription>
                    Click the button below to grant your currently logged-in account (`{user?.email}`) full admin rights. This tool is designed for initial setup and will only work if no other admins exist.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button onClick={makeSelfAdmin} disabled={isSubmitting || !!status}>
                    {isSubmitting ? "Processing..." : "Grant Admin To My Account"}
                </Button>

                {isSubmitting && <p className="text-sm text-muted-foreground">{status}</p>}

                {error && (
                    <Alert variant="destructive">
                        <AlertTitle>Operation Failed</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {status && !error && (
                    <Alert variant="default" className="bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700">
                        <AlertTitle className="text-green-800 dark:text-green-200">Success!</AlertTitle>
                        <AlertDescription className="text-green-700 dark:text-green-300">{status}</AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
