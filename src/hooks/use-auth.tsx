
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase, errorEmitter } from '@/firebase';
import { signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { User as FirebaseUser } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, setDoc, deleteDoc, collection, serverTimestamp, runTransaction, updateDoc, Firestore, writeBatch, increment, Transaction, Timestamp, query, where, collectionGroup } from 'firebase/firestore';
import type { User, InventoryVariant, CartItem, Order, OrderStatus, PurchaseOrder, PurchaseOrderStatus, StatusHistory } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { FirestorePermissionError } from '@/firebase/errors';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useDoc } from '@/firebase/firestore/use-doc';

interface ProfileUpdateData {
    displayName: string;
    address?: string;
    contactNumber?: string;
}

type CombinedVariant = InventoryVariant & {
    parentName: string;
    parentCategory: string;
    parentItemId: string;
};

interface AuthContextType {
  user: User | null;
  cart: CartItem[] | null;
  orders: Order[] | null;
  firestore: Firestore;
  toast: ({...props}: any) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  createAdminUser: (email: string, password: string, displayName: string) => Promise<boolean>;
  updateUserRole: (targetUserId: string, newRole: 'admin' | 'guest') => Promise<boolean>;
  updateUserProfile: (data: ProfileUpdateData) => Promise<boolean>;
  addToCart: (variant: CombinedVariant) => Promise<void>;
  updateCartItemQuantity: (cartItem: CartItem, newQuantity: number) => Promise<void>;
  removeCartItem: (cartItemId: string) => Promise<void>;
  placeOrder: (cartItems: CartItem[], totalAmount: number, shippingAddress: string, shippingContactNumber: string, paymentMethod: string, notes?: string) => Promise<boolean>;
  updateOrderStatus: (
    order: Order, 
    newStatus: OrderStatus, 
    details?: {
      reason?: string,
      items?: CartItem[], 
      totalAmount?: number, 
      discount?: number,
      deliveryFee?: number,
      packagingFee?: number
      shippingAddress?: string;
      shippingContactNumber?: string;
      paymentMethod?: string;
    }
) => Promise<boolean>;
  updatePoStatus: (poId: string, newStatus: PurchaseOrderStatus) => Promise<boolean>;
  uploadImage: (file: File, path: string) => Promise<string | null>;
  showCartBadge: boolean;
  showQuoteReadyBadge: boolean;
  showOrderHistoryBadge: boolean;
  dismissUserNotifications: () => void;
  showAdminOrderBadge: boolean;
  dismissAdminOrderBadge: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user: firebaseUser, isUserLoading: isAuthLoading, auth, firestore, storage } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCartBadge, setShowCartBadge] = useState(false);
  const [showQuoteReadyBadge, setShowQuoteReadyBadge] = useState(false);
  const [showOrderHistoryBadge, setShowOrderHistoryBadge] = useState(false);
  const [showAdminOrderBadge, setShowAdminOrderBadge] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const maintenanceRef = useMemoFirebase(() => doc(firestore, 'system_settings', 'maintenance_mode'), [firestore]);
  const { data: maintenanceSetting } = useDoc<{enabled: boolean}>(maintenanceRef);

  useEffect(() => {
    if (maintenanceSetting?.enabled && user?.role !== 'admin') {
        logout();
        toast({
            variant: "destructive",
            title: "Under Maintenance",
            description: "The portal is currently under maintenance. You have been logged out.",
        });
    }
  }, [maintenanceSetting, user]);


  const cartCollectionRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.id, 'cart');
  }, [firestore, user]);
  const { data: cart } = useCollection<CartItem>(cartCollectionRef);
  
  const ordersQueryRef = useMemoFirebase(() => {
    if (!firestore || !user?.id) return null;
    if (user.role === 'admin') {
      return collectionGroup(firestore, 'orders');
    }
    return collection(firestore, 'users', user.id, 'orders');
  }, [firestore, user]);
  const { data: orders } = useCollection<Order>(ordersQueryRef);


  useEffect(() => {
    const handleAuthChange = async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const userDocRef = doc(firestore, 'users', fbUser.uid);
        try {
          const idTokenResult = await fbUser.getIdTokenResult();
          const userIsAdmin = idTokenResult.claims.admin === true;

          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const appUser: User = {
              id: fbUser.uid,
              displayName: userData.displayName,
              email: userData.email,
              role: userIsAdmin ? 'admin' : 'guest',
              profileImageUrl: userData.profileImageUrl || fbUser.photoURL || `https://picsum.photos/seed/${'\'\'\''}{fbUser.uid}/40/40`,
              address: userData.address || '',
              contactNumber: userData.contactNumber || '',
              lastViewedOrdersAt: userData.lastViewedOrdersAt,
              lastViewedAllOrdersAt: userData.lastViewedAllOrdersAt,
            };
            setUser(appUser);
          } else {
            // This case handles newly registered users whose doc might not exist yet.
            // The register function will create it.
            if (fbUser.displayName) { // From Google Sign-In
                const newUser: User = {
                    id: fbUser.uid,
                    displayName: fbUser.displayName,
                    email: fbUser.email!,
                    role: userIsAdmin ? 'admin' : 'guest',
                    profileImageUrl: fbUser.photoURL || `https://picsum.photos/seed/${'\'\'\''}{fbUser.uid}/40/40`,
                    address: '',
                    contactNumber: fbUser.phoneNumber || '',
                };
                await setDoc(userDocRef, newUser, { merge: true });
                setUser(newUser);
            }
          }
        } catch (error) {
          console.error("Error fetching user document or token:", error);
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
  
    useEffect(() => {
    if (cart && cart.length > 0) {
      setShowCartBadge(true);
    } else {
      setShowCartBadge(false);
    }
  }, [cart]);
  
  useEffect(() => {
    if (user && orders) {
        const lastViewed = user.lastViewedOrdersAt?.toMillis() || 0;
        
        let hasNewQuoteReady = false;
        let hasNewPurchaseUpdates = false;

        orders.forEach(order => {
            if (order.userId !== user.id) return;
            const updatedAt = order.updatedAt?.toMillis() || order.orderDate.toMillis();
            if (updatedAt <= lastViewed) return;

            const isNew = order.orderDate.toMillis() > lastViewed;

            if (order.status === 'quote-ready') {
                hasNewQuoteReady = true;
            }
            if (order.status === 'confirmed' && isNew) {
                hasNewPurchaseUpdates = true;
            }
            if (order.status === 'delivering') {
                hasNewPurchaseUpdates = true;
            }
            if (['completed', 'cancelled', 'declined'].includes(order.status)) {
                 // Trigger for Order History tab
                 setShowOrderHistoryBadge(true);
            }
        });
        
        if (hasNewQuoteReady) {
            setShowQuoteReadyBadge(true);
        }
        if (hasNewPurchaseUpdates) {
             setShowOrderHistoryBadge(true); // My Purchases and Order History use the same badge
        }

        if (user.role === 'admin') {
            const lastViewedAll = user.lastViewedAllOrdersAt?.toMillis() || 0;
            const hasNewAdminUpdates = orders.some(order => 
                (order.updatedAt?.toMillis() || order.orderDate.toMillis()) > lastViewedAll
            );
            if (hasNewAdminUpdates) {
                setShowAdminOrderBadge(true);
            }
        }
    }
}, [user, orders]);


  const dismissUserNotifications = async () => {
    if (!user) return;
    setShowQuoteReadyBadge(false);
    setShowOrderHistoryBadge(false);
    try {
        const userRef = doc(firestore, "users", user.id);
        const newTimestamp = serverTimestamp();
        await updateDoc(userRef, { lastViewedOrdersAt: newTimestamp });
        setUser(prev => prev ? {...prev, lastViewedOrdersAt: Timestamp.now()} : null);
    } catch (error) {
        console.error("Error updating lastViewedOrdersAt:", error);
    }
  };

  const dismissAdminOrderBadge = async () => {
      if (!user || user.role !== 'admin') return;
      setShowAdminOrderBadge(false);
      try {
          const userRef = doc(firestore, 'users', user.id);
          const newTimestamp = serverTimestamp();
          await updateDoc(userRef, { lastViewedAllOrdersAt: newTimestamp });
           setUser(prev => prev ? {...prev, lastViewedAllOrdersAt: Timestamp.now()} : null);
      } catch (error) {
          console.error("Error updating lastViewedAllOrdersAt:", error);
      }
  };


  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;

        // Check for maintenance mode after successful login
        if (maintenanceSetting?.enabled) {
            const idTokenResult = await fbUser.getIdTokenResult(true); // Force refresh to get latest claims
            const isAdmin = idTokenResult.claims.admin === true;

            if (!isAdmin) {
                await signOut(auth); // Immediately sign out the non-admin user
                toast({
                    variant: "destructive",
                    title: "Under Maintenance",
                    description: "The portal is currently under maintenance. Please try again later.",
                });
                setIsLoading(false);
                return; // Stop execution
            }
        }
        
        // If we reach here, user is either an admin, or maintenance mode is off.
        router.push('/home');

    } catch (error: any) {
        console.error("Firebase login failed", error);
        
        if (error.code === 'auth/user-not-found' && email === "admin@kintsugi.com") {
             // This is a special case to auto-create the first admin user
             try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const fbUser = userCredential.user;
                const functions = getFunctions();
                const setAdminRole = httpsCallable(functions, 'setAdminRole');
                await setAdminRole({ uid: fbUser.uid });
                await fbUser.getIdToken(true); // Force token refresh
                
                const userRef = doc(firestore, "users", fbUser.uid);
                await setDoc(userRef, {
                    id: fbUser.uid,
                    displayName: "Admin User",
                    email,
                    role: "admin"
                });

                router.push('/home');
             } catch (creationError: any) {
                 toast({ variant: "destructive", title: "Admin Creation Failed", description: creationError.message });
             }
        } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            toast({
              variant: "destructive",
              title: "Invalid Credentials",
              description: "Please check your email and password and try again.",
            });
        } else {
            toast({
              variant: "destructive",
              title: "Uh oh! Something went wrong.",
              description: error.message || "Could not sign in.",
            });
        }
    } finally {
        setIsLoading(false);
    }
  };
  
    const register = async (email: string, password: string, displayName: string) => {
    if (maintenanceSetting?.enabled) {
        toast({
            variant: "destructive",
            title: "Under Maintenance",
            description: "New account registrations are temporarily disabled.",
        });
        return;
    }
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;

      const userRef = doc(firestore, 'users', fbUser.uid);
      const newUser: User = {
        id: fbUser.uid,
        displayName: displayName,
        email: fbUser.email!,
        role: 'guest',
        profileImageUrl: fbUser.photoURL || `https://picsum.photos/seed/${'\'\'\''}{fbUser.uid}/40/40`,
        address: '',
        contactNumber: '',
      };
      await setDoc(userRef, newUser);
      
      toast({
        title: "Account Created!",
        description: "You have been successfully registered.",
      });
      router.push('/home');

    } catch (error: any) {
       console.error("Firebase registration failed", error);
       if (error.code === 'auth/email-already-in-use') {
           toast({
            variant: "destructive",
            title: "Registration Failed",
            description: "An account with this email address already exists.",
          });
       } else {
           toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: error.message || "Could not create your account.",
          });
       }
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

        if (maintenanceSetting?.enabled) {
            const idTokenResult = await fbUser.getIdTokenResult(true);
            const isAdmin = idTokenResult.claims.admin === true;

            if (!isAdmin) {
                await signOut(auth);
                toast({
                    variant: "destructive",
                    title: "Under Maintenance",
                    description: "The portal is currently under maintenance. Please try again later.",
                });
                setIsLoading(false);
                return;
            }
        }
        
        if (additionalInfo?.isNewUser) {
            const userRef = doc(firestore, 'users', fbUser.uid);
            const newUser: User = {
                id: fbUser.uid,
                displayName: fbUser.displayName || 'New User',
                email: fbUser.email!,
                role: 'guest',
                profileImageUrl: fbUser.photoURL || `https://picsum.photos/seed/${'\'\'\''}{fbUser.uid}/40/40`,
                address: '',
                contactNumber: fbUser.phoneNumber || '',
            };
            await setDoc(userRef, newUser);
        }
        router.push('/home');

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
        
        // Call the callable function to set the admin custom claim
        const functions = getFunctions();
        const setAdminRole = httpsCallable(functions, 'setAdminRole');
        await setAdminRole({ uid: fbUser.uid });

        // Create the user document in Firestore
        const userRef = doc(firestore, "users", fbUser.uid);
        const adminData = {
            id: fbUser.uid,
            displayName: displayName,
            email: email,
            role: "admin",
            profileImageUrl: `https://picsum.photos/seed/${'\'\'\''}{fbUser.uid}/40/40`,
            address: "",
        };
        await setDoc(userRef, adminData);

        // Force a token refresh on the new user to apply the custom claim immediately
        await fbUser.getIdToken(true);
        
        toast({
            title: "Admin User Created",
            description: `${'\'\'\''}{displayName} has been added as an admin.`,
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
        const functions = getFunctions();
        
        if (newRole === 'admin') {
            const setAdminRole = httpsCallable(functions, 'setAdminRole');
            await setAdminRole({ uid: targetUserId });
        } else {
            const revokeAdminRole = httpsCallable(functions, 'revokeAdminRole');
            await revokeAdminRole({ uid: targetUserId });
        }

        toast({
            title: "User Role Updated",
            description: `The user's role has been changed to ${'\'\'\''}{newRole}. The user must log out and log back in for this change to take effect.`,
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
        const dataToUpdate: ProfileUpdateData & { lastViewedOrdersAt?: any } = {
            displayName: data.displayName,
            address: data.address || "",
            contactNumber: data.contactNumber || "",
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

    const getPlaceholderImage = (item: CombinedVariant) => {
        if (item.imageUrl) {
            return { imageUrl: item.imageUrl, imageHint: 'product' };
        }
        const categoryId = item.parentCategory.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-category';
        const categoryImage = PlaceHolderImages.find(p => p.id === categoryId);
        if (categoryImage) {
            return { imageUrl: categoryImage.imageUrl, imageHint: categoryImage.imageHint };
        }
        const itemImage = PlaceHolderImages.find(p => p.id === item.parentItemId);
        if (itemImage) {
            return { imageUrl: itemImage.imageUrl, imageHint: itemImage.imageHint };
        }
        const fallback = PlaceHolderImages.find(p => p.id === 'product-fallback')!;
        return { imageUrl: fallback.imageUrl, imageHint: fallback.imageHint };
    };

    const addToCart = async (variant: CombinedVariant) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Not Logged In', description: 'Please log in to add items to your quotation.' });
            return;
        }

        try {
            const cartItemRef = doc(firestore, 'users', user.id, 'cart', variant.id);

            await runTransaction(firestore, async (transaction) => {
                const cartItemDoc = await transaction.get(cartItemRef);
                const currentQuantityInCart = cartItemDoc.exists() ? cartItemDoc.data().quantity : 0;
                
                if (currentQuantityInCart >= variant.quantity) {
                    toast({ variant: 'destructive', title: 'Stock Limit Reached', description: `You cannot add more of ${'\'\'\''}{variant.parentName} - ${'\'\'\''}{variant.brand}.` });
                    return;
                }

                const placeholder = getPlaceholderImage(variant);

                if (cartItemDoc.exists()) {
                    const newQuantity = currentQuantityInCart + 1;
                    transaction.update(cartItemRef, { quantity: newQuantity });
                } else {
                    const newCartItem: CartItem = {
                        id: variant.id,
                        variantId: variant.id,
                        parentItemId: variant.parentItemId,
                        quantity: 1,
                        addedAt: serverTimestamp(),
                        parentName: variant.parentName,
                        brand: variant.brand,
                        price: variant.price,
                        imageUrl: placeholder.imageUrl,
                        imageHint: placeholder.imageHint,
                        stock: variant.quantity, // Store current stock for checks
                    };
                    transaction.set(cartItemRef, newCartItem);
                }
            });

            toast({
                title: "Item Added to Quotation",
                description: `${'\'\'\''}{variant.parentName} - ${'\'\'\''}{variant.brand} has been added to your quotation list.`,
            });
        } catch (error: any) {
            if (error.message.includes('Stock Limit Reached')) {
                console.warn(error.message);
                return;
            }
            console.error("Error adding to cart:", error);
            const permissionError = new FirestorePermissionError({
                path: `users/${'\'\'\''}{user.id}/cart/${'\'\'\''}{variant.id}`,
                operation: 'write',
                requestResourceData: { variantId: variant.id },
            });
            errorEmitter.emit('permission-error', permissionError);
        }
    };
    
    const updateCartItemQuantity = async (cartItem: CartItem, newQuantity: number) => {
        if (!user) return;
        if (newQuantity <= 0) {
            await removeCartItem(cartItem.id);
            return;
        }

        if (newQuantity > (cartItem.stock || 0)) {
            toast({
                variant: 'destructive',
                title: 'Stock Limit Reached',
                description: `Only ${'\'\'\''}{cartItem.stock} units available for ${'\'\'\''}{cartItem.parentName}.`,
            });
            return;
        }


        try {
            const cartItemRef = doc(firestore, 'users', user.id, 'cart', cartItem.id);
            await updateDoc(cartItemRef, { quantity: newQuantity });
        } catch (error: any) {
             console.error("Error updating cart quantity:", error);
            const permissionError = new FirestorePermissionError({
                path: `users/${'\'\'\''}{user.id}/cart/${'\'\'\''}{cartItem.id}`,
                operation: 'update',
                requestResourceData: { quantity: newQuantity },
            });
            errorEmitter.emit('permission-error', permissionError);
        }
    };

    const removeCartItem = async (cartItemId: string) => {
        if (!user) return;
        try {
            const cartItemRef = doc(firestore, 'users', user.id, 'cart', cartItemId);
            await deleteDoc(cartItemRef);
             toast({
                title: "Item Removed",
                description: "The item has been removed from your quotation list.",
            });
        } catch (error: any) {
            console.error("Error removing cart item:", error);
            const permissionError = new FirestorePermissionError({
                path: `users/${'\'\'\''}{user.id}/cart/${'\'\'\''}{cartItemId}`,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
    };

    const placeOrder = async (cartItems: CartItem[], totalAmount: number, shippingAddress: string, shippingContactNumber: string, paymentMethod: string, notes?: string): Promise<boolean> => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Not Logged In', description: 'You must be logged in to request a quotation.' });
            return false;
        }

        try {
            const newOrderRef = doc(collection(firestore, 'users', user.id, 'orders'));

            await runTransaction(firestore, async (transaction) => {
                
                const newOrder: Omit<Order, 'id'> = {
                    orderDate: serverTimestamp(),
                    userId: user.id,
                    userDisplayName: user.displayName,
                    userEmail: user.email,
                    items: cartItems,
                    totalAmount,
                    shippingAddress,
                    shippingContactNumber,
                    status: 'pending-quote',
                    paymentMethod,
                    notes,
                    updatedAt: serverTimestamp(),
                    discount: 0,
                    statusHistory: [{ status: 'pending-quote', timestamp: Timestamp.now() }],
                };
                transaction.set(newOrderRef, newOrder);

                // This logic is commented out as price is on request, but kept for future reference
                // for (const item of cartItems) {
                //     const variantRef = doc(firestore, 'inventory', item.parentItemId, 'variants', item.variantId);
                //     transaction.update(variantRef, {
                //         quantity: increment(-item.quantity)
                //     });
                // }

                for (const item of cartItems) {
                    const cartItemRef = doc(firestore, 'users', user.id, 'cart', item.id);
                    transaction.delete(cartItemRef);
                }
            });
            
            return true;
        } catch (error: any) {
            console.error("Quotation request failed:", error);
            toast({
                variant: 'destructive',
                title: 'Request Failed',
                description: error.message || "There was a problem submitting your request. Please try again."
            });
            if (error.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: `users/${'\'\'\''}{user.id}/orders`,
                    operation: 'write',
                    requestResourceData: { note: "Quotation request transaction" }
                });
                errorEmitter.emit('permission-error', permissionError);
            }
            return false;
        }
    };

    const updateOrderStatus = async (
        order: Order, 
        newStatus: OrderStatus, 
        details?: {
          reason?: string,
          items?: CartItem[], 
          totalAmount?: number, 
          discount?: number,
          deliveryFee?: number,
          packagingFee?: number,
          shippingAddress?: string;
          shippingContactNumber?: string;
          paymentMethod?: string;
        }
    ): Promise<boolean> => {
        const orderRef = doc(firestore, 'users', order.userId, 'orders', order.id);
        
        try {
            const dataToUpdate: any = {
                status: newStatus,
                updatedAt: serverTimestamp(),
                statusHistory: [
                    ...(order.statusHistory || []),
                    { status: newStatus, timestamp: Timestamp.now() }
                ]
            };

            if (details?.reason && (newStatus === 'cancelled' || newStatus === 'declined')) {
                dataToUpdate.cancellationReason = details.reason;
            }
            
            if (newStatus === 'quote-ready' || newStatus === 'confirmed') {
                if (details?.items !== undefined) dataToUpdate.items = details.items;
                if (details?.totalAmount !== undefined) dataToUpdate.totalAmount = details.totalAmount;
                if (details?.discount !== undefined) dataToUpdate.discount = details.discount;
                if (details?.deliveryFee !== undefined) dataToUpdate.deliveryFee = details.deliveryFee;
                if (details?.packagingFee !== undefined) dataToUpdate.packagingFee = details.packagingFee;
                if (details?.shippingAddress !== undefined) dataToUpdate.shippingAddress = details.shippingAddress;
                if (details?.shippingContactNumber !== undefined) dataToUpdate.shippingContactNumber = details.shippingContactNumber;
                if (details?.paymentMethod !== undefined) dataToUpdate.paymentMethod = details.paymentMethod;
            }

            if ((newStatus === 'cancelled' || newStatus === 'declined') && order.status !== 'cancelled' && order.status !== 'declined') {
                await runTransaction(firestore, async (transaction: Transaction) => {
                    transaction.update(orderRef, dataToUpdate);

                    // Only restock items if the order was confirmed or in delivery before cancellation
                    if (order.status === 'confirmed' || order.status === 'delivering') {
                        for (const item of order.items) {
                            const variantRef = doc(firestore, 'inventory', item.parentItemId, 'variants', item.variantId);
                            transaction.update(variantRef, {
                                quantity: increment(item.quantity)
                            });
                        }
                    }
                });
            } else if (newStatus === 'confirmed') {
                await runTransaction(firestore, async (transaction: Transaction) => {
                    transaction.update(orderRef, dataToUpdate);

                    // Deduct stock for confirmed items
                    if (details?.items) {
                        for (const item of details.items) {
                            const variantRef = doc(firestore, 'inventory', item.parentItemId, 'variants', item.variantId);
                            transaction.update(variantRef, {
                                quantity: increment(-item.quantity)
                            });
                        }
                    }
                });
            } else {
                await updateDoc(orderRef, dataToUpdate);
            }

            toast({
                title: "Order Updated",
                description: `Order #${'\'\'\''}{order.id.substring(0,8)}... has been updated to ${'\'\'\''}{newStatus}.`,
            });
            return true;
        } catch (error: any) {
            console.error("Error updating order status:", error);
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: "Could not update the order status. Please try again.",
            });
             if (error.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: orderRef.path,
                    operation: 'update',
                    requestResourceData: { status: newStatus },
                });
                errorEmitter.emit('permission-error', permissionError);
            }
            return false;
        }
    };

    const updatePoStatus = async (poId: string, newStatus: PurchaseOrderStatus): Promise<boolean> => {
        const poRef = doc(firestore, 'purchase_orders', poId);
        try {
            await updateDoc(poRef, {
                status: newStatus,
                updatedAt: serverTimestamp(),
            });
            toast({
                title: 'PO Status Updated',
                description: `The purchase order has been marked as ${'\'\'\''}{newStatus}.`,
            });
            return true;
        } catch (error: any) {
            console.error("Error updating PO status:", error);
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: 'Could not update the PO status. Please try again.',
            });
            if (error.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: poRef.path,
                    operation: 'update',
                    requestResourceData: { status: newStatus },
                });
                errorEmitter.emit('permission-error', permissionError);
            }
            return false;
        }
    };
    
    const uploadImage = async (file: File, path: string): Promise<string | null> => {
        if (!storage) {
            const err = 'Firebase Storage is not available. Check your Firebase provider setup.';
            console.error(err);
            toast({ variant: 'destructive', title: 'Storage Error', description: err });
            return Promise.reject(new Error(err));
        }
        
        const storageRef = ref(storage, `${path}/${Date.now()}-${file.name}`);

        try {
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return downloadURL;
        } catch (error: any) {
            console.error("Upload failed:", error);
            toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
            return Promise.reject(error);
        }
    };


  const logout = async () => {
    await signOut(auth);
    setUser(null);
    router.push('/');
  };
  
  const value = { user, cart, orders, firestore, toast, login, register, loginWithGoogle, logout, isLoading, createAdminUser, updateUserRole, updateUserProfile, addToCart, updateCartItemQuantity, removeCartItem, placeOrder, updateOrderStatus, updatePoStatus, uploadImage, showCartBadge, showQuoteReadyBadge, showOrderHistoryBadge, dismissUserNotifications, showAdminOrderBadge, dismissAdminOrderBadge };

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
