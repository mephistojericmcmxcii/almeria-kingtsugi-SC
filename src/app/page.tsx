import { LoginForm } from "@/components/auth/login-form";
import { Gem } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col justify-center items-center mb-8 text-center">
          <Gem className="h-10 w-10 mb-4 text-primary" />
          <h1 className="text-4xl font-bold font-headline">Kintsugi Portal</h1>
           <p className="text-muted-foreground mt-2">
            Business management for the modern artisan.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
