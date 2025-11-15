
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, errorEmitter } from '@/firebase';
import { signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, collection, serverTimestamp, runTransaction } from 'firebase/firestore';
import type { User, InventoryVariant, CartItem } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { FirestorePermissionError } from '@/firebase/errors';
import { PlaceHolderImages } from '@/lib/placeholder-images';

interface ProfileUpdateData {
    displayName: string;
    address?: string;
}

type CombinedVariant = InventoryVariant & {
    parentName: string;
    parentCategory: string;
    parentItemId: string;
};

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  createAdminUser: (email: string, password: string, displayName: string) => Promise<boolean>;
  updateUserRole: (targetUserId: string, newRole: 'admin' | 'guest') => Promise<boolean>;
  updateUserProfile: (data: ProfileUpdateData) => Promise<boolean>;
  addToCart: (variant: CombinedVariant) => Promise<void>;
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
              profileImageUrl: userData.profileImageUrl || fbUser.photoURL || `https://picsum.photos/seed/${fbUser.uid}/40/40`,
              address: userData.address || '',
            };
            setUser(appUser);
          } else {
             // This can happen if a user is created in Auth but their Firestore doc fails to be created
             console.warn("User document not found for authenticated user:", fbUser.uid);
             setUser(null);
          }
        } catch (error) {
          console.error("Error fetching user document:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    if (!isAuthLoading) {
      handleAuthChange(firebaseUser);
    } else {
      setIsLoading(true);
    }

  }, [firebaseUser, isAuthLoading, firestore]);


  const login = async (email: string, password: string) => {
    setIsLoading(true);

    try {
        let userCredential;
      
        try {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
              // If it's the default admin email, create the user
              if (email === "admin@kintsugi.com") {
                  userCredential = await createUserWithEmailAndPassword(auth, email, password);
                  const fbUser = userCredential.user;
                  const userRef = doc(firestore, "users", fbUser.uid);
                  const adminData = {
                      id: fbUser.uid,
                      displayName: "Admin User",
                      email: email,
                      role: "admin",
                      profileImageUrl: `https://picsum.photos/seed/${fbUser.uid}/40/40`,
                      address: ""
                  };
                  await setDoc(userRef, adminData);
                  const adminRoleRef = doc(firestore, "roles_admin", fbUser.uid);
                  await setDoc(adminRoleRef, { role: "admin" });
              } else {
                  toast({
                      variant: "destructive",
                      title: "User Not Found",
                      description: "No account exists with this email address.",
                  });
                  setIsLoading(false);
                  return;
              }
          } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
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
    } finally {
        setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const additionalInfo = getAdditionalUserInfo(userCredential);
      const fbUser = userCredential.user;

      // If it's a new user, create their document in Firestore
      if (additionalInfo?.isNewUser) {
        const userRef = doc(firestore, 'users', fbUser.uid);
        const newUser: Omit<User, 'id'> = {
          displayName: fbUser.displayName || 'New User',
          email: fbUser.email!,
          role: 'guest', // Default role for new Google sign-ups
          profileImageUrl: fbUser.photoURL || `https://picsum.photos/seed/${fbUser.uid}/40/40`,
          address: '',
        };
        await setDoc(userRef, newUser);
      }
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Google Sign-In failed", error);
      toast({
        variant: "destructive",
        title: "Google Sign-In Failed",
        description: error.message || "Could not sign in with Google.",
      });
    } finally {
        setIsLoading(false);
    }
  };


  const createAdminUser = async (email: string, password: string, displayName: string): Promise<boolean> => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;

        // Create user profile in 'users' collection
        const userRef = doc(firestore, "users", fbUser.uid);
        const adminData = {
            id: fbUser.uid,
            displayName: displayName,
            email: email,
            role: "admin",
            profileImageUrl: `https://picsum.photos/seed/${fbUser.uid}/40/40`,
            address: "",
        };
        await setDoc(userRef, adminData);

        // Add user to 'roles_admin' collection to grant admin privileges
        const adminRoleRef = doc(firestore, "roles_admin", fbUser.uid);
        await setDoc(adminRoleRef, { role: "admin" });
        
        toast({
            title: "Admin User Created",
            description: `${displayName} has been added as an admin.`,
        });
        return true;
    } catch (error: any) {
        console.error("Error creating admin user:", error);
        toast({
            variant: "destructive",
            title: "Creation Failed",
            description: error.message || "Could not create the admin user.",
        });
        return false;
    }
  };

  const updateUserRole = async (targetUserId: string, newRole: 'admin' | 'guest'): Promise<boolean> => {
    try {
        const userRef = doc(firestore, "users", targetUserId);
        const adminRoleRef = doc(firestore, "roles_admin", targetUserId);

        await setDoc(userRef, { role: newRole }, { merge: true });

        if (newRole === 'admin') {
            await setDoc(adminRoleRef, { role: "admin" });
        } else {
            await deleteDoc(adminRoleRef);
        }

        toast({
            title: "User Role Updated",
            description: `The user's role has been changed to ${newRole}.`,
        });
        return true;
    } catch (error: any) {
        console.error("Error updating user role:", error);
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: error.message || "Could not update the user's role.",
        });
        return false;
    }
  };

  const updateUserProfile = async (data: ProfileUpdateData): Promise<boolean> => {
    if (!firebaseUser) {
        toast({ variant: "destructive", title: "Not Authenticated", description: "You must be logged in to update your profile." });
        return false;
    }

    try {
        const userRef = doc(firestore, "users", firebaseUser.uid);
        const dataToUpdate: ProfileUpdateData = {
            displayName: data.displayName,
            address: data.address || "",
        };
        await setDoc(userRef, dataToUpdate, { merge: true });

        setUser(prevUser => prevUser ? { ...prevUser, ...dataToUpdate } : null);

        toast({
            title: "Profile Updated",
            description: "Your profile information has been successfully updated.",
        });
        return true;
    } catch (error: any) {
        console.error("Error updating user profile:", error);
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: error.message || "Could not update your profile.",
        });
        return false;
    }
  };

    const addToCart = async (variant: CombinedVariant) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Not Logged In', description: 'Please log in to add items to your cart.' });
            return;
        }

        try {
            const cartRef = collection(firestore, 'users', user.id, 'cart');
            const cartItemRef = doc(cartRef, variant.id); // Use variant ID as cart item ID

            const getPlaceholderImage = (itemId: string) => {
                const itemImage = PlaceHolderImages.find(p => p.id === itemId);
                const fallbackImage = PlaceHolderImages.find(p => p.id === 'product-fallback');
                return itemImage || fallbackImage!;
            }
            const placeholder = getPlaceholderImage(variant.parentItemId);


            await runTransaction(firestore, async (transaction) => {
                const cartItemDoc = await transaction.get(cartItemRef);

                if (cartItemDoc.exists()) {
                    // If item is already in cart, increment quantity
                    const newQuantity = (cartItemDoc.data().quantity || 0) + 1;
                    transaction.update(cartItemRef, { quantity: newQuantity });
                } else {
                    // If item is not in cart, add it
                    const newCartItem: Omit<CartItem, 'id'> = {
                        variantId: variant.id,
                        parentItemId: variant.parentItemId,
                        quantity: 1,
                        addedAt: serverTimestamp(),
                        parentName: variant.parentName,
                        brand: variant.brand,
                        price: variant.price,
                        imageUrl: placeholder.imageUrl,
                        imageHint: placeholder.imageHint,
                    };
                    transaction.set(cartItemRef, newCartItem);
                }
            });

            toast({
                title: "Item Added to Cart",
                description: `${variant.parentName} - ${variant.brand} has been added to your cart.`,
            });
        } catch (error: any) {
            console.error("Error adding to cart:", error);
            const permissionError = new FirestorePermissionError({
                path: `users/${user.id}/cart`,
                operation: 'write',
                requestResourceData: { variantId: variant.id },
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not add item to cart. Please try again.",
            });
        }
    };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    router.push('/');
  };
  
  const value = { user, login, loginWithGoogle, logout, isLoading, createAdminUser, updateUserRole, updateUserProfile, addToCart };

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
