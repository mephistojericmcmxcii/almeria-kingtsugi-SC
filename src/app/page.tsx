
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const KintsugiLogo = () => (
    <svg width="250" height="70" viewBox="0 0 458 128" fill="none" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
      <image href="data:image/png;base64,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" alt="Kintsugi Variety Shop" className="h-10"/>
    </svg>
  );

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/home");
    }
  }, [user, isLoading, router]);

  if (isLoading || (!isLoading && user)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="p-8 space-y-4 flex flex-col items-center">
            <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-muted-foreground">Restoring your session...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col justify-center items-center mb-8 text-center">
          <KintsugiLogo />
          <p className="text-muted-foreground mt-2">
            Business Management Suite
          </p>
        </div>
        <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">Welcome Back</CardTitle>
                        <CardDescription>Enter your credentials to access the portal.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <LoginForm />
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="register">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">Create an Account</CardTitle>
                        <CardDescription>Sign up to start browsing our collection.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RegisterForm />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
