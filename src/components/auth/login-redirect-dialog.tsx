
'use client';

import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '../ui/button';

interface LoginRedirectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginRedirectDialog({ isOpen, onOpenChange }: LoginRedirectDialogProps) {
  const router = useRouter();

  const handleProceed = () => {
    router.push('/login');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader className="text-center">
          <AlertDialogTitle className="font-headline text-xl font-normal sm:text-center">
            Create an account with
          </AlertDialogTitle>
          <div className="font-headline text-3xl text-primary py-1 sm:text-center">
            KINTSUGI Variety Shop
          </div>
          <AlertDialogDescription className="pt-2 sm:text-left">
            Register now to enjoy smoother transactions, quick quotations, and easier order tracking.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={handleProceed}>Proceed</Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
