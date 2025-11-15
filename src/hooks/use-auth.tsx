
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
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
  const { user: firebaseUser, isUserLoading: isAuthLoading, auth, firestore } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const userDocRef = useMemo(() => {
    if (!firebaseUser || !firestore) return undefined;
    return doc(firestore, 'users', firebaseUser.uid);
  }, [firebaseUser, firestore]);

  const [userData, isUserDocLoading, userDocError] = useDocumentData(userDocRef);

  useEffect(() => {
    // Overall loading is true if auth is loading, or if we have a user but their doc is still loading.
    const totalLoading = isAuthLoading || (!!firebaseUser && isUserDocLoading);
    setIsLoading(totalLoading);

    // If auth has finished and there's no firebase user, they are logged out.
    if (!isAuthLoading && !firebaseUser) {
      setUser(null);
      return;
    }

    // If we have a firebase user and their document has loaded, create the app user object.
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
    
    // If there's an error loading the user document, treat as not logged in.
    if (userDocError) {
      console.error("Error fetching user document:", userDocError);
      setUser(null);
    }

  }, [firebaseUser, isAuthLoading, userData, isUserDocLoading, userDocError, router]);

  const login = async (role: 'admin' | 'guest', email?: string, password?: string) => {
    try {
      let firebaseUser: FirebaseUser | undefined;

      if (role === 'guest') {
        const userCredential = await signInAnonymously(auth);
        firebaseUser = userCredential.user;
        const userRef = doc(firestore, "users", firebaseUser.uid);
        const guestData = {
            id: firebaseUser.uid,
            displayName: "Guest User",
            email: `guest_${firebaseUser.uid}@example.com`,
            role: "guest",
            profileImageUrl: `https://picsum.photos/seed/${firebaseUser.uid}/40/40`
        };
        await setDoc(userRef, guestData);
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
        // After successful login/signup, the useEffect will handle setting the user state.
        // We just need to navigate.
        router.push('/dashboard');
      }
    } catch (error) {
      console.error("Firebase login failed", error);
      // Re-throw the error to be caught by the calling component
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null); // Immediately clear local user state
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

