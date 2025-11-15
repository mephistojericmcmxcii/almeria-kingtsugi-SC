"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { User, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const GoogleIcon = () => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
        <title>Google</title>
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.08-2.58 2.03-4.68 2.03-3.88 0-7.03-3.23-7.03-7.23s3.15-7.23 7.03-7.23c2.2 0 3.68.88 4.54 1.72l2.4-2.3c-1.5-1.4-3.5-2.3-6.94-2.3-5.73 0-10.45 4.6-10.45 10.3s4.72 10.3 10.45 10.3c3.1 0 5.4-1 7.02-2.65 1.7-1.7 2.35-4.05 2.35-6.52 0-.6-.05-1.15-.15-1.68H12.48z" fill="currentColor"/>
    </svg>
);


export function LoginForm() {
  const { login, loginWithGoogle, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    await login(values.email, values.password);
    setIsSubmitting(false);
  };
  
  const handleGuestLogin = async () => {
    setIsSubmitting(true);
    await login(); // No args means guest login
    setIsSubmitting(false);
  }

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    await loginWithGoogle();
    setIsSubmitting(false);
  };

  const disabled = isLoading || isSubmitting;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Welcome Back</CardTitle>
        <CardDescription>Enter your credentials to access the portal.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="admin@kintsugi.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={disabled}>
              <ShieldCheck className="mr-2" /> Sign In as Admin
            </Button>
            <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={disabled}>
              <GoogleIcon /> Sign in with Google
            </Button>
          </CardFooter>
        </form>
      </Form>
      <div className="relative px-6 mb-4">
        <Separator />
        <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-card px-2 text-xs text-muted-foreground">OR</span>
      </div>
      <CardFooter>
         <Button variant="secondary" className="w-full" onClick={handleGuestLogin} disabled={disabled}>
          <User className="mr-2" /> Continue as Guest
        </Button>
      </CardFooter>
    </Card>
  );
}
