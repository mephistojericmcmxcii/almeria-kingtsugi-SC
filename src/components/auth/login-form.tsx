"use client";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, User } from "lucide-react";
import * as React from "react";

export function LoginForm() {
  const { login, isLoading } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  const handleLogin = (role: 'admin' | 'guest') => {
    setIsLoggingIn(true);
    // Simulate network delay
    setTimeout(() => {
      login(role);
    }, 500);
  };

  const disabled = isLoading || isLoggingIn;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Welcome</CardTitle>
        <CardDescription>Select a role to sign in to the portal.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="user@example.com" defaultValue="demo@kintsugi.com" disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" defaultValue="thisisnotreal" disabled />
        </div>
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
