
'use client';

import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCog } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function MakeAdminPage() {
  const { user } = useAuth();
  const [uid, setUid] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function makeUserAdmin() {
    if (!uid.trim()) {
      setError("Please enter a User ID (UID).");
      return;
    }

    setIsSubmitting(true);
    setStatus(`Calling Cloud Function to grant admin to UID: ${uid}...`);
    setError(null);

    const functions = getFunctions();
    const setAdminRole = httpsCallable(functions, "setAdminRole");

    try {
      const result = await setAdminRole({ uid });
      setStatus(`Success! User ${uid} is now an admin. They may need to refresh or log in again to see changes.`);
    } catch (err: any) {
      setError(err.message || "An unknown error occurred.");
      setStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-4">
            <UserCog className="w-8 h-8 text-primary" />
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline">Make User Admin</h1>
                <p className="text-muted-foreground">Grant administrative privileges to an existing user by their UID.</p>
            </div>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Grant Admin Privileges</CardTitle>
                <CardDescription>
                    Enter the Firebase UID of the user you wish to promote to an administrator.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="uid">User ID (UID)</Label>
                    <Input 
                        id="uid" 
                        placeholder="Enter user's Firebase UID" 
                        value={uid}
                        onChange={(e) => setUid(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>

                {isSubmitting && <p className="text-sm text-muted-foreground">{status}</p>}

                {error && (
                    <Alert variant="destructive">
                        <AlertTitle>Operation Failed</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {status && !error && !isSubmitting && (
                    <Alert variant="default" className="bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700">
                        <AlertTitle className="text-green-800 dark:text-green-200">Success!</AlertTitle>
                        <AlertDescription className="text-green-700 dark:text-green-300">{status}</AlertDescription>
                    </Alert>
                )}
            </CardContent>
            <CardFooter>
                 <Button onClick={makeUserAdmin} disabled={isSubmitting || !uid}>
                    {isSubmitting ? "Processing..." : "Make Admin"}
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
