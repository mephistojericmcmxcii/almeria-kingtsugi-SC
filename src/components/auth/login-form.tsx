"use client";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, User } from "lucide-react";
import * as React from "react";
import { useToast } from "@/hooks/use-toast";

export function LoginForm() {
  const { login, isLoading } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  const handleLogin = async (role: 'admin' | 'guest') => {
    setIsLoggingIn(true);
    await login(role);
    setIsLoggingIn(false);
  };

  const disabled = isLoading || isLoggingIn;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Welcome</CardTitle>
        <CardDescription>Sign in to access the portal.</CardDescription>
      </CardHeader>
      <CardContent>
          <p className="text-sm text-muted-foreground">
            Sign in as an administrator to manage the portal or as a guest for read-only access.
          </p>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Button className="w-full" onClick={() => handleLogin('admin')} disabled={disabled}>
          <ShieldCheck className="mr-2 h-4 w-4" /> Sign In as Admin
        </Button>
        <Button variant="secondary" className="w-full" onClick={() => handleLogin('guest')} disabled={disabled}>
          <User className="mr-2 h-4 w-4" /> Sign In as Guest
        </Button>
      </CardFooter>
    </Card>
  );
}
