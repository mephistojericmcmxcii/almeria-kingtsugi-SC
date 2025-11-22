

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useFirebase, errorEmitter } from '@/firebase';
import { signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { User as FirebaseUser } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, setDoc, deleteDoc, collection, serverTimestamp, runTransaction, updateDoc, Firestore, writeBatch, increment, Transaction, Timestamp, query, where, collectionGroup, getDocs, onSnapshot } from 'firebase/firestore';
import type { User, InventoryVariant, CartItem, Order, OrderStatus, PurchaseOrder, PurchaseOrderStatus, StatusHistory, QuotationRequest } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { FirestorePermissionError } from '@/firebase/errors';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useBadgeManager } from '@/hooks/use-badge-manager';

interface ProfileUpdateData {
    displayName: string;
    address?: string;
    contactNumber?: string;
}

interface AuthContextType {
  user: User | null;
  cart: CartItem[] | null;
  orders: Order[] | null;
  products: InventoryVariant[] | null; // <-- Add products to context
  isProductsLoading: boolean; // <-- Add loading state for products
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
  addToCart: (variant: InventoryVariant) => Promise<void>;
  updateCartItemQuantity: (cartItem: CartItem, newQuantity: number) => Promise<void>;
  removeCartItem: (cartItemId: string) => Promise<void>;
  placeOrder: (cartItems: CartItem[], totalAmount: number, shippingAddress: string, shippingContactNumber: string, paymentMethod: string, notes?: string) => Promise<boolean>;
  respondToRfq: (rfq: QuotationRequest, responseData: any, fileUrl?: string) => Promise<boolean>;
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
  uploadFile: (file: File, path: string) => Promise<string | null>;
  showCartBadge: boolean;
  showQuoteReadyBadge: boolean;
  showNewPurchaseBadge: boolean;
  showNewHistoryBadge: boolean;
  dismissUserNotifications: () => void;
  showAdminOrderBadge: boolean;
  dismissAdminOrderBadge: () => void;
  showAdminRfqBadge: boolean;
  dismissAdminRfqBadge: () => void;
  fetchOrders: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user: firebaseUser, isUserLoading: isAuthLoading, auth, firestore, storage } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[] | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [products, setProducts] = useState<InventoryVariant[] | null>(null); // <-- Add state for products
  const [isProductsLoading, setIsProductsLoading] = useState(true); // <-- Add loading state

  const {
      showCartBadge,
      showQuoteReadyBadge,
      showNewPurchaseBadge,
      showNewHistoryBadge,
      showAdminOrderBadge,
      showAdminRfqBadge,
      dismissUserNotifications,
      dismissAdminOrderBadge,
      dismissAdminRfqBadge,
  } = useBadgeManager(user, cart, firestore);

  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const maintenanceRef = useMemo(() => doc(firestore, 'system_settings', 'maintenance_mode'), [firestore]);
  
  useEffect(() => {
    const unsub = onSnapshot(maintenanceRef, (snap) => {
        const maintenanceSetting = snap.data() as { enabled: boolean };
        if (maintenanceSetting?.enabled && user?.role !== 'admin') {
            logout();
            toast({
                variant: "destructive",
                title: "Under Maintenance",
                description: "The portal is currently under maintenance. You have been logged out.",
            });
        }
    });
    return () => unsub();
  }, [maintenanceRef, user]);


  useEffect(() => {
      if (!user || pathname === '/') {
          setCart(null);
          return;
      };

      const cartCollectionRef = collection(firestore, 'users', user.id, 'cart');
      const unsubscribe = onSnapshot(cartCollectionRef, (snapshot) => {
          const cartData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CartItem));
          setCart(cartData);
      }, (error) => {
          console.error("Cart listener error:", error);
      });

      return () => unsubscribe();
  }, [user, firestore, pathname]);
  
  // Fetch all product variants once and cache them
  useEffect(() => {
    if (!user || pathname === '/') {
      setProducts(null);
      setIsProductsLoading(false);
      return;
    }
    
    // Only fetch if products haven't been loaded yet
    if (products === null) {
      setIsProductsLoading(true);
      const variantsQuery = query(collectionGroup(firestore, 'variants'));
      getDocs(variantsQuery).then(variantsSnapshot => {
        const variants = variantsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          ref: doc.ref,
        } as InventoryVariant));
        setProducts(variants);
      }).catch(error => {
        console.error("Error fetching product data:", error);
        toast({
          variant: 'destructive',
          title: 'Error Fetching Products',
          description: 'Could not load the product catalog.'
        });
      }).finally(() => {
        setIsProductsLoading(false);
      });
    } else {
        // If products are already loaded, just ensure loading is false.
        setIsProductsLoading(false);
    }
  }, [user, firestore, pathname, products, toast]);

  const fetchOrders = async () => {
    if (!user || pathname === '/') {
      setOrders(null);
      return;
    }
    
    const ordersQuery = user.role === 'admin'
        ? collectionGroup(firestore, 'orders')
        : collection(firestore, 'users', user.id, 'orders');

    try {
        const snapshot = await getDocs(ordersQuery);
        const fetchedOrders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Order));
        
        const sortedOrders = fetchedOrders.sort((a, b) => b.orderDate.toMillis() - a.orderDate.toMillis());
        setOrders(sortedOrders);
    } catch (error) {
      console.error("Error fetching orders manually:", error);
    }
  };

  useEffect(() => {
    if (!user || pathname === '/') {
      setOrders(null);
      return;
    }

    const ordersQuery = user.role === 'admin'
        ? collectionGroup(firestore, 'orders')
        : collection(firestore, 'users', user.id, 'orders');
    
    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
        const fetchedOrders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Order));
        
        const sortedOrders = fetchedOrders.sort((a, b) => b.orderDate.toMillis() - a.orderDate.toMillis());
        setOrders(sortedOrders);
    }, (error) => {
        console.error("Orders listener error:", error);
    });

    return () => unsubscribe();
  }, [user, firestore, pathname]);

  useEffect(() => {
    if (isAuthLoading) {
        setIsLoading(true);
        return;
    }

    if (!firebaseUser) {
        setUser(null);
        setIsLoading(false);
        return;
    }

    const userDocRef = doc(firestore, 'users', firebaseUser.uid);
    const unsubscribe = onSnapshot(userDocRef, async (docSnap) => {
        try {
            if (docSnap.exists()) {
                const idTokenResult = await firebaseUser.getIdTokenResult(true);
                const userIsAdmin = idTokenResult.claims.admin === true;
                const userData = docSnap.data();

                const appUser: User = {
                    id: firebaseUser.uid,
                    displayName: userData.displayName,
                    email: userData.email,
                    role: userIsAdmin ? 'admin' : 'guest',
                    profileImageUrl: userData.profileImageUrl || firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/40/40`,
                    address: userData.address || '',
                    contactNumber: userData.contactNumber || '',
                    lastViewedOrdersAt: userData.lastViewedOrdersAt,
                    lastViewedAllOrdersAt: userData.lastViewedAllOrdersAt,
                    lastViewedAllRfqsAt: userData.lastViewedAllRfqsAt,
                };
                setUser(appUser);
            } else if (firebaseUser.displayName) { // New Google Sign-In user
                const newUser: User = {
                    id: firebaseUser.uid,
                    displayName: firebaseUser.displayName,
                    email: firebaseUser.email!,
                    role: 'guest',
                    profileImageUrl: firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/40/40`,
                    address: '',
                    contactNumber: firebaseUser.phoneNumber || '',
                };
                await setDoc(userDocRef, newUser, { merge: true });
                setUser(newUser); // This will be updated by the listener anyway, but sets initial state
            }
        } catch (error) {
            console.error("Error handling user snapshot:", error);
            setUser(null); // Clear user on error
        } finally {
            setIsLoading(false);
        }
    }, (error) => {
        console.error("User document listener error:", error);
        setUser(null);
        setIsLoading(false);
    });

    return () => unsubscribe(); // Cleanup the listener
}, [firebaseUser, isAuthLoading, firestore]);
  

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
        const maintenanceSnap = await getDoc(maintenanceRef);
        const maintenanceSetting = maintenanceSnap.data() as { enabled: boolean };
        
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
    const maintenanceSnap = await getDoc(maintenanceRef);
    const maintenanceSetting = maintenanceSnap.data() as { enabled: boolean };
    
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
        profileImageUrl: fbUser.photoURL || `https://picsum.photos/seed/${fbUser.uid}/40/40`,
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
        const maintenanceSnap = await getDoc(maintenanceRef);
        const maintenanceSetting = maintenanceSnap.data() as { enabled: boolean };
        
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
                profileImageUrl: fbUser.photoURL || `https://picsum.photos/seed/${fbUser.uid}/40/40`,
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
        
        const functions = getFunctions();
        const setAdminRole = httpsCallable(functions, 'setAdminRole');
        await setAdminRole({ uid: fbUser.uid });

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

        await fbUser.getIdToken(true);
        
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
            description: `The user's role has been changed to ${newRole}. The user must log out and log back in for this change to take effect.`,
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

    const getPlaceholderImage = (item: InventoryVariant) => {
        if (item.imageUrl) {
            return { imageUrl: item.imageUrl, imageHint: 'product' };
        }
        if (item.parentCategory) {
            const categoryId = item.parentCategory.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-category';
            const categoryImage = PlaceHolderImages.find(p => p.id === categoryId);
            if (categoryImage) {
                return { imageUrl: categoryImage.imageUrl, imageHint: categoryImage.imageHint };
            }
        }
        const itemImage = PlaceHolderImages.find(p => p.id === item.parentItemId);
        if (itemImage) {
            return { imageUrl: itemImage.imageUrl, imageHint: itemImage.imageHint };
        }
        const fallback = PlaceHolderImages.find(p => p.id === 'product-fallback')!;
        return { imageUrl: fallback.imageUrl, imageHint: fallback.imageHint };
    };

    const addToCart = async (variant: InventoryVariant) => {
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
                    toast({ variant: 'destructive', title: 'Stock Limit Reached', description: `You cannot add more of '${variant.parentName} - ${variant.brand}'.` });
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
                description: `${variant.parentName} - ${variant.brand} has been added to your quotation list.`,
            });
        } catch (error: any) {
            if (error.message.includes('Stock Limit Reached')) {
                console.warn(error.message);
                return;
            }
            console.error("Error adding to cart:", error);
            const permissionError = new FirestorePermissionError({
                path: `users/${user.id}/cart/${variant.id}`,
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
                description: `Only ${cartItem.stock} units available for ${cartItem.parentName}.`,
            });
            return;
        }


        try {
            const cartItemRef = doc(firestore, 'users', user.id, 'cart', cartItem.id);
            await updateDoc(cartItemRef, { quantity: newQuantity });
        } catch (error: any) {
             console.error("Error updating cart quantity:", error);
            const permissionError = new FirestorePermissionError({
                path: `users/${user.id}/cart/${cartItem.id}`,
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
                path: `users/${user.id}/cart/${cartItemId}`,
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

                for (const item of cartItems) {
                    const cartItemRef = doc(firestore, 'users', user.id, 'cart', item.id);
                    transaction.delete(cartItemRef);
                }
            });
            
            await fetchOrders(); // Refetch orders to show the new one
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
                    path: `users/${user.id}/orders`,
                    operation: 'write',
                    requestResourceData: { note: "Quotation request transaction" }
                });
                errorEmitter.emit('permission-error', permissionError);
            }
            return false;
        }
    };
    
    const respondToRfq = async (rfq: QuotationRequest, responseData: any, fileUrl?: string): Promise<boolean> => {
        if (!user || user.role !== 'admin') {
            toast({ variant: 'destructive', title: 'Permission Denied', description: 'You are not authorized to perform this action.' });
            return false;
        }

        const newOrderRef = doc(collection(firestore, 'users', rfq.userId, 'orders'));
        const originalRfqRef = doc(firestore, 'users', rfq.userId, 'rfq', rfq.id);

        try {
            await runTransaction(firestore, async (transaction) => {
                let items: CartItem[] = [];
                let totalAmount = 0;
                let totalDiscount = 0;

                if (responseData.responseType === 'priceList') {
                    items = responseData.items.map((item: any) => ({
                        id: doc(collection(firestore, 'dummy')).id, // Generate a random ID
                        variantId: 'custom-rfq',
                        parentItemId: 'custom-rfq',
                        quantity: item.quantity,
                        addedAt: serverTimestamp(),
                        parentName: item.name,
                        brand: item.specs || 'N/A',
                        price: item.price,
                        discount: item.discount,
                        stock: item.quantity, // Assume stock is available
                    }));

                    const subtotal = items.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);
                    totalDiscount = items.reduce((acc, item) => {
                        const itemTotal = (item.price || 0) * item.quantity;
                        const discountValue = itemTotal * ((item.discount || 0) / 100);
                        return acc + discountValue;
                    }, 0);
                    totalAmount = subtotal - totalDiscount + (responseData.deliveryFee || 0) + (responseData.packagingFee || 0);
                }

                const newOrder: Omit<Order, 'id'> = {
                    orderDate: serverTimestamp(),
                    userId: rfq.userId,
                    userDisplayName: rfq.customerName,
                    userEmail: rfq.emailAddress,
                    shippingContactNumber: rfq.contactNumber,
                    shippingAddress: '', // To be confirmed by user
                    items: items,
                    totalAmount: totalAmount,
                    discount: totalDiscount,
                    deliveryFee: responseData.deliveryFee || 0,
                    packagingFee: responseData.packagingFee || 0,
                    status: 'quote-ready',
                    paymentMethod: 'cod', // Default, to be confirmed by user
                    notes: responseData.notes,
                    updatedAt: serverTimestamp(),
                    statusHistory: [
                        { status: 'pending-quote', timestamp: rfq.createdAt },
                        { status: 'quote-ready', timestamp: Timestamp.now() }
                    ],
                    cancellationReason: fileUrl // Repurposing this field to store the quote file URL
                };

                transaction.set(newOrderRef, newOrder);
                transaction.delete(originalRfqRef);
            });

            toast({
                title: 'Response Sent!',
                description: 'A new "Quote Ready" order has been created for the customer.',
            });
            await fetchOrders();
            return true;

        } catch (error: any) {
            console.error("Error responding to RFQ:", error);
            toast({
                variant: 'destructive',
                title: 'Response Failed',
                description: error.message || "Could not create the quotation order.",
            });
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
                if (details?.shippingAddress !== undefined) dataToUpdate.shippingAddress = details.shippingContactNumber;
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

            await fetchOrders(); // Refetch orders to show the update
            toast({
                title: "Order Updated",
                description: `Order #${order.id.substring(0,8)}... has been updated to ${newStatus}.`,
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
                description: `The purchase order has been marked as ${newStatus}.`,
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
    
    const uploadFile = async (file: File, path: string): Promise<string | null> => {
        if (!storage) {
            toast({
                variant: 'destructive',
                title: 'Storage Error',
                description: 'Storage service is not available. Cannot upload file.'
            });
            console.error("[uploadFile] Firebase Storage service is not available.");
            return null;
        }
        console.log("[uploadFile] Firebase Storage service is available. Connection successful.");

        const storageRef = ref(storage, `${path}/${Date.now()}-${file.name}`);
        console.log(`[uploadFile] Starting upload for: ${file.name} to path: ${path}`);
        console.log(`[uploadFile] Created storage reference: ${storageRef.fullPath}`);

        try {
            console.log("[uploadFile] Attempting to upload bytes...");
            const snapshot = await uploadBytes(storageRef, file);
            console.log("[uploadFile] Upload successful:", snapshot);
            const downloadURL = await getDownloadURL(snapshot.ref);
            console.log("[uploadFile] Got download URL:", downloadURL);
            return downloadURL;
        } catch (error: any) {
            console.error("[uploadFile] Upload failed:", error);
            toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
            return null;
        }
    };


  const logout = async () => {
    await signOut(auth);
    setUser(null);
    router.push('/');
  };
  
  const value = { user, cart, orders, products, isProductsLoading, firestore, toast, login, register, loginWithGoogle, logout, isLoading, createAdminUser, updateUserRole, updateUserProfile, addToCart, updateCartItemQuantity, removeCartItem, placeOrder, respondToRfq, updateOrderStatus, updatePoStatus, uploadFile, showCartBadge, showQuoteReadyBadge, showNewPurchaseBadge, showNewHistoryBadge, dismissUserNotifications, showAdminOrderBadge, dismissAdminOrderBadge, showAdminRfqBadge, dismissAdminRfqBadge, fetchOrders };

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
