
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, errorEmitter } from '@/firebase';
import { signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { useToast } from "@/hooks/use-toast";
import { FirestorePermissionError } from '@/firebase/errors';

interface AuthContextType {
  user: User | null;
  login: (role: 'admin' | 'guest', email?: string, password?: string) => Promise<void>;
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

  const userDocRef = useMemo(() => {
    if (!firebaseUser || !firestore) return undefined;
    return doc(firestore, 'users', firebaseUser.uid);
  }, [firebaseUser, firestore]);

  const [userData, isUserDocLoading, userDocError] = useDocumentData(userDocRef);

  useEffect(() => {
    const totalLoading = isAuthLoading || (!!firebaseUser && isUserDocLoading);
    setIsLoading(totalLoading);

    if (!isAuthLoading && !firebaseUser) {
      setUser(null);
      return;
    }

    if (firebaseUser && userData) {
       const appUser: User = {
         id: firebaseUser.uid,
         displayName: userData.displayName,
         email: userData.email,
         role: userData.role,
         profileImageUrl: userData.profileImageUrl || `https://picsum.photos/seed/${firebaseUser.uid}/40/40`,
       };
       setUser(appUser);
    }
    
    if (userDocError) {
      console.error("Error fetching user document:", userDocError);
      setUser(null);
    }

  }, [firebaseUser, isAuthLoading, userData, isUserDocLoading, userDocError, router]);

  const login = async (role: 'admin' | 'guest', email?: string, password?: string) => {
    let userCredential;
    try {
      if (role === 'guest') {
        userCredential = await signInAnonymously(auth);
        const firebaseUser = userCredential.user;
        const userRef = doc(firestore, "users", firebaseUser.uid);
        const guestData = {
            id: firebaseUser.uid,
            displayName: "Guest User",
            email: `guest_${firebaseUser.uid}@example.com`,
            role: "guest",
            profileImageUrl: `https://picsum.photos/seed/${firebaseUser.uid}/40/40`
        };
        setDoc(userRef, guestData).catch(error => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userRef.path,
            operation: 'create',
            requestResourceData: guestData,
          }))
        });
      } else if (role === 'admin' && email && password) {
         try {
            userCredential = await signInWithEmailAndPassword(auth, email, password);
         } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const firebaseUser = userCredential.user;
                const userRef = doc(firestore, "users", firebaseUser.uid);
                const adminData = {
                    id: firebaseUser.uid,
                    displayName: "Admin User",
                    email: email,
                    role: "admin",
                    profileImageUrl: `https://picsum.photos/seed/${firebaseUser.uid}/40/40`
                };
                await setDoc(userRef, adminData);
                const adminRoleRef = doc(firestore, "roles_admin", firebaseUser.uid);
                await setDoc(adminRoleRef, { role: "admin" });
            } else if (error.code === 'auth/invalid-credential') {
                toast({
                  variant: "destructive",
                  title: "Invalid Credentials",
                  description: "Please check your email and password and try again.",
                });
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
