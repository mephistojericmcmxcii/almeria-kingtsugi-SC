"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirebase } from '@/firebase';
import { signOut, signInWithEmailAndPassword, signInAnonymously, createUserWithEmailAndPassword } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { useDocumentData } from 'react-firebase-hooks/firestore';


interface AuthContextType {
  user: User | null;
  login: (role: 'admin' | 'guest', email?: string, password?: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user: firebaseUser, isLoading: isAuthLoading, auth, firestore } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const userDocRef = useMemo(() => {
    if (!firebaseUser || !firestore) return undefined;
    return doc(firestore, 'users', firebaseUser.uid);
  }, [firebaseUser, firestore]);
  
  const [userData, isUserDocLoading] = useDocumentData(userDocRef);

  useEffect(() => {
    setIsLoading(isAuthLoading || isUserDocLoading);

    if (!isAuthLoading && !firebaseUser) {
      setUser(null);
    }
    
    if (firebaseUser && userData) {
       const appUser: User = {
         id: firebaseUser.uid,
         name: userData.displayName,
         email: userData.email,
         role: userData.role,
         avatar: userData.profileImageUrl || `https://picsum.photos/seed/${firebaseUser.uid}/40/40`,
       };
       setUser(appUser);
    }

  }, [firebaseUser, isAuthLoading, userData, isUserDocLoading, router]);

  const login = async (role: 'admin' | 'guest', email?: string, password?: string) => {
    setIsLoading(true);
    try {
      let firebaseUser: FirebaseUser | undefined;

      if (role === 'guest') {
        const userCredential = await signInAnonymously(auth);
        firebaseUser = userCredential.user;
        const userRef = doc(firestore, "users", firebaseUser.uid);
        await setDoc(userRef, {
            id: firebaseUser.uid,
            displayName: "Guest User",
            email: `guest_${firebaseUser.uid}@kintsugi.com`,
            role: "guest",
            profileImageUrl: `https://picsum.photos/seed/${firebaseUser.uid}/40/40`
        });

      } else if (role === 'admin' && email && password) {
         try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            firebaseUser = userCredential.user;
         } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                firebaseUser = userCredential.user;
                const userRef = doc(firestore, "users", firebaseUser.uid);
                await setDoc(userRef, {
                    id: firebaseUser.uid,
                    displayName: "Admin User",
                    email: email,
                    role: "admin",
                    profileImageUrl: `https://picsum.photos/seed/${firebaseUser.uid}/40/40`
                });
                const adminRoleRef = doc(firestore, "roles_admin", firebaseUser.uid);
                await setDoc(adminRoleRef, { role: "admin" });
            } else {
                throw error;
            }
         }
      }

      if (firebaseUser) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error("Firebase login failed", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    await signOut(auth);
    setUser(null);
    router.push('/');
    setIsLoading(false);
  };
  
  const value = { user, login, logout, isLoading: isLoading };

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
