
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, errorEmitter } from '@/firebase';
import { signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { FirestorePermissionError } from '@/firebase/errors';

interface AuthContextType {
  user: User | null;
  login: (role: 'admin' | 'guest') => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user: firebaseUser, isUserLoading: isAuthLoading, auth, firestore } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthChange = async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        // If there's a firebase user, fetch their firestore document
        const userDocRef = doc(firestore, 'users', fbUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const appUser: User = {
              id: fbUser.uid,
              displayName: userData.displayName,
              email: userData.email,
              role: userData.role,
              profileImageUrl: userData.profileImageUrl || `https://picsum.photos/seed/${fbUser.uid}/40/40`,
            };
            setUser(appUser);
          } else {
             // This case can happen if the user record was deleted from firestore
             // but they are still authenticated.
             setUser(null);
          }
        } catch (error) {
          console.error("Error fetching user document:", error);
          setUser(null);
        }
      } else {
        // No firebase user, so no app user.
        setUser(null);
      }
       // Mark loading as false once we have processed the auth state.
      setIsLoading(false);
    };

    // We only set isLoading to true once, on initial load.
    // isAuthLoading from useFirebase handles the initial auth check.
    if (!isAuthLoading) {
      handleAuthChange(firebaseUser);
    }

  }, [firebaseUser, isAuthLoading, firestore, router]);


  const login = async (role: 'admin' | 'guest') => {
    setIsLoading(true);
    const adminEmail = "admin@kintsugi.com";
    const adminPassword = "kasinokeso";

    try {
      let userCredential;
      if (role === 'guest') {
        userCredential = await signInAnonymously(auth);
        const fbUser = userCredential.user;
        setUser({
            id: fbUser.uid,
            displayName: "Guest User",
            email: `guest_${fbUser.uid}@example.com`,
            role: "guest",
            profileImageUrl: `https://picsum.photos/seed/${fbUser.uid}/40/40`
        });
      } else if (role === 'admin') {
         try {
            userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
         } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
                const fbUser = userCredential.user;
                const userRef = doc(firestore, "users", fbUser.uid);
                const adminData = {
                    id: fbUser.uid,
                    displayName: "Admin User",
                    email: adminEmail,
                    role: "admin",
                    profileImageUrl: `https://picsum.photos/seed/${fbUser.uid}/40/40`
                };
                // We must await the creation of user docs before proceeding
                await setDoc(userRef, adminData);
                const adminRoleRef = doc(firestore, "roles_admin", fbUser.uid);
                await setDoc(adminRoleRef, { role: "admin" });

            } else if (error.code === 'auth/invalid-credential') {
                toast({
                  variant: "destructive",
                  title: "Invalid Credentials",
                  description: "Please check your email and password and try again.",
                });
                setIsLoading(false);
                return;
            } else {
                throw error;
            }
         }
      }

      if (userCredential?.user) {
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error("Firebase login failed", error);
       toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: error.message || "Could not sign in.",
      });
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    router.push('/');
  };
  
  const value = { user, login, logout, isLoading };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
