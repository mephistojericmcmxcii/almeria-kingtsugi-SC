
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useFirebase, errorEmitter } from '@/firebase';
import { signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { User as FirebaseUser } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, getDoc, setDoc, deleteDoc, collection, serverTimestamp, runTransaction, updateDoc, Firestore, writeBatch, increment, Transaction, Timestamp, query, where, collectionGroup, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import type { User, InventoryVariant, CartItem, Order, OrderStatus, PurchaseOrder, PurchaseOrderStatus, StatusHistory, QuotationRequest, CustomerFeedback, Notification } from '@/lib/types';
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
  notifications: Notification[];
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
      packagingFee?: number,
      shippingAddress?: string;
      shippingContactNumber?: string;
      paymentMethod?: string;
      customerRevisionUrl?: string;
      review?: string;
      rating?: number;
    }
) => Promise<boolean>;
  updatePoStatus: (po: PurchaseOrder, newStatus: PurchaseOrderStatus, details?: { salesInvoice?: string, deliveryReceipt?: string, salesInvoiceFile?: File | null, deliveryReceiptFile?: File | null, receivedBy?: string, receivedDate?: Date }) => Promise<boolean>;
  uploadFile: (file: File, path: string, fileName?: string) => Promise<string | null>;
  deleteFileByUrl: (url: string) => Promise<void>;
  showAdminOrderBadge: boolean;
  dismissAdminOrderBadge: () => void;
  showAdminRfqBadge: boolean;
  dismissAdminRfqBadge: () => void;
  fetchOrders: () => Promise<void>;
  deleteNotificationOnClick: (notification: Notification) => Promise<void>;
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
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const {
      showAdminOrderBadge,
      showAdminRfqBadge,
      dismissAdminOrderBadge,
      dismissAdminRfqBadge,
  } = useBadgeManager(user, cart, firestore);

  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const maintenanceRef = useMemo(() => doc(firestore, 'system_settings', 'maintenance_mode'), [firestore]);
  
  useEffect(() => {
    const unsub = onSnapshot(maintenanceRef, 
        (snap) => {
            const maintenanceSetting = snap.data() as { enabled: boolean };
            if (maintenanceSetting?.enabled && user?.role !== 'admin') {
                logout();
                toast({
                    variant: "destructive",
                    title: "Under Maintenance",
                    description: "The portal is currently under maintenance. You have been logged out.",
                });
            }
        },
        (error) => {
            if (error.code === 'permission-denied') {
                const contextualError = new FirestorePermissionError({
                    path: maintenanceRef.path,
                    operation: 'get',
                });
                errorEmitter.emit('permission-error', contextualError);
            } else {
                console.error("Maintenance listener error:", error);
            }
        }
    );
    return () => unsub();
  }, [maintenanceRef, user]);


  useEffect(() => {
      if (!user || pathname === '/login') {
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

   useEffect(() => {
    if (!user) {
        setNotifications([]);
        return;
    }

    const sortNotifications = (a: Notification, b: Notification) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
    };

    const personalNotificationsQuery = query(
        collection(firestore, 'users', user.id, 'notifications')
    );

    const unsubscribers = [
        onSnapshot(personalNotificationsQuery, (snapshot) => {
            const personalNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isGlobal: false } as Notification & { isGlobal: boolean }));
            setNotifications(prev => {
                const otherNotifs = prev.filter(n => n.isGlobal);
                const combined = [...otherNotifs, ...personalNotifs];
                return combined.sort(sortNotifications);
            });
        }, (error) => console.error("Personal notifications listener error:", error))
    ];

    if (user.role === 'admin') {
        const adminNotificationsQuery = query(
            collection(firestore, 'admin_notifications')
        );
        
        unsubscribers.push(
            onSnapshot(adminNotificationsQuery, (snapshot) => {
                const adminNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isGlobal: true } as Notification & { isGlobal: boolean }));
                setNotifications(prev => {
                    const personalNotifs = prev.filter(n => !n.isGlobal);
                    const combined = [...personalNotifs, ...adminNotifs];
                    return combined.sort((a, b) => {
                        const timeA = a.createdAt?.toMillis() ?? 0;
                        const timeB = b.createdAt?.toMillis() ?? 0;
                        return timeB - timeA;
                    });
                });
            }, (error) => console.error("Admin notifications listener error:", error))
        );
    }
    
    return () => unsubscribers.forEach(unsub => unsub());
  }, [user, firestore]);
  
  // Logic for checking low stock and sending notifications
  const checkLowStock = useCallback(async (variants: InventoryVariant[]) => {
    if (!firestore || user?.role !== 'admin') return;

    const batchOp = writeBatch(firestore);

    for (const variant of variants) {
        if (variant.quantity <= variant.warningLimit) {
            const notificationRef = doc(firestore, 'admin_notifications', `lowstock_${variant.id}`);
            batchOp.set(notificationRef, {
                title: 'Low Stock Alert',
                description: `${variant.parentName} (${variant.brand}) is running low. Only ${variant.quantity} left.`,
                href: `/management/inventory/${variant.parentItemId}`,
                read: false,
                createdAt: serverTimestamp(),
            });
        }
    }

    try {
        await batchOp.commit();
    } catch (error) {
        console.error("Error in low stock notification batch write:", error);
    }
  }, [firestore, user?.role]);
  
  // Fetch all product variants once and cache them
  useEffect(() => {
    const shouldFetch = pathname === '/' || pathname.startsWith('/products');
    
    if (!shouldFetch || products !== null) {
        if(products) setIsProductsLoading(false);
        return;
    };
    
    setIsProductsLoading(true);
    const variantsQuery = query(collectionGroup(firestore, 'variants'));
    const unsubscribe = onSnapshot(variantsQuery, (variantsSnapshot) => {
        const variants = variantsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          ref: doc.ref,
        } as InventoryVariant));
        setProducts(variants);
        setIsProductsLoading(false);

        if(user?.role === 'admin') {
            checkLowStock(variants);
        }

    }, (error) => {
        if (error.code === 'permission-denied') {
            const contextualError = new FirestorePermissionError({
                path: 'variants',
                operation: 'list',
            });
            errorEmitter.emit('permission-error', contextualError);
        } else {
             console.error("Error fetching product data:", error);
            toast({
              variant: 'destructive',
              title: 'Error Fetching Products',
              description: 'Could not load the product catalog.'
            });
        }
        setIsProductsLoading(false);
    });
    
    return () => unsubscribe();

  }, [firestore, pathname, checkLowStock, user?.role, products]);

  const fetchOrders = useCallback(async () => {
    if (!user || pathname === '/login') {
      setOrders(null);
      return;
    }
    
    // Admins see all orders on admin pages, but ONLY their own on their profile.
    const isAdminOnAdminPage = user.role === 'admin' && pathname.startsWith('/management');
    const ordersQuery = isAdminOnAdminPage
        ? collectionGroup(firestore, 'orders')
        : collection(firestore, 'users', user.id, 'orders');

    try {
        const snapshot = await getDocs(ordersQuery);
        const fetchedOrders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Order));
        
        const sortedOrders = fetchedOrders.sort((a, b) => {
            const timeA = a.orderDate?.toMillis() || 0;
            const timeB = b.orderDate?.toMillis() || 0;
            return timeB - timeA;
        });
        setOrders(sortedOrders);
    } catch (error) {
      console.error("Error fetching orders manually:", error);
    }
  }, [user, pathname, firestore]);

  // Real-time order fetching
  useEffect(() => {
    if (!user || pathname === '/login') {
      setOrders(null);
      return;
    }

    // This is the critical fix. The profile page should ONLY ever query the user's own subcollection.
    // The admin page for all orders (/management/orders) will fetch its own data separately.
    const ordersQuery = collection(firestore, 'users', user.id, 'orders');
    
    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
        const fetchedOrders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Order));
        
        const sortedOrders = fetchedOrders.sort((a, b) => {
            const timeA = a.orderDate?.toMillis() ?? 0;
            const timeB = b.orderDate?.toMillis() ?? 0;
            return timeB - timeA;
        });
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
        if (pathname !== "/" && pathname !== "/login" && pathname !== "/products" && pathname !== "/about" && pathname !== "/reviews" && !pathname.startsWith('/products/')) {
            router.push('/');
        }
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
}, [firebaseUser, isAuthLoading, firestore, pathname, router]);
  

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
        
        router.push('/');

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

                router.push('/');
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
      router.push('/');

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
        router.push('/');

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
            const notificationRef = doc(collection(firestore, 'users', user.id, 'notifications'));

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

                const newNotification: Omit<Notification, 'id'> = {
                    title: 'Item Added to Quotation',
                    description: `${variant.parentName} was added to your list.`,
                    href: '/profile?tab=quotation',
                    read: false,
                    createdAt: serverTimestamp() as Timestamp,
                };
                transaction.set(notificationRef, newNotification);

            });

            toast({
                title: "Item Added to Quotation",
                description: `${variant.parentName} - ${variant.brand} has been added.`,
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
    
        const batch = writeBatch(firestore);
    
        try {
            // Create a new order document for the user
            const newOrderRef = doc(collection(firestore, 'users', user.id, 'orders'));
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
            batch.set(newOrderRef, newOrder);
    
            // Delete items from the user's cart
            for (const item of cartItems) {
                const cartItemRef = doc(firestore, 'users', user.id, 'cart', item.id);
                batch.delete(cartItemRef);
            }
    
            // Create a single notification for all admins in the root collection
            const adminNotificationRef = doc(collection(firestore, 'admin_notifications'));
            const adminNotification: Omit<Notification, 'id'> = {
                title: 'New Quotation Request',
                description: `A new request has been submitted by ${user.displayName}.`,
                href: '/management/orders',
                read: false,
                createdAt: serverTimestamp() as Timestamp,
            };
            batch.set(adminNotificationRef, adminNotification);
    
            await batch.commit();
            
            await fetchOrders(); // Refetch user's orders
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
        const notificationRef = doc(collection(firestore, 'users', rfq.userId, 'notifications'));


        try {
            await runTransaction(firestore, async (transaction) => {
                let items: CartItem[] = [];
                let finalTotalAmount = 0;
                let totalDiscount = 0;

                if (responseData.responseType === 'priceList') {
                    items = responseData.items.map((item: any) => ({
                        id: doc(collection(firestore, 'dummy')).id, // Generate a random ID
                        variantId: 'custom-rfq',
                        parentItemId: 'custom-rfq',
                        quantity: item.quantity,
                        addedAt: Timestamp.now(), // Use client-side timestamp
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
                    finalTotalAmount = subtotal - totalDiscount + (responseData.deliveryFee || 0) + (responseData.packagingFee || 0);
                } else { // 'uploadFile'
                    const grossAmount = responseData.totalAmount || 0;
                    const discountPercent = responseData.discount || 0;
                    totalDiscount = grossAmount * (discountPercent / 100);
                    finalTotalAmount = grossAmount - totalDiscount + (responseData.deliveryFee || 0) + (responseData.packagingFee || 0);
                }

                const newOrder: Omit<Order, 'id'> = {
                    orderDate: serverTimestamp(),
                    userId: rfq.userId,
                    userDisplayName: rfq.customerName,
                    userEmail: rfq.emailAddress,
                    shippingContactNumber: rfq.contactNumber,
                    shippingAddress: '', // To be confirmed by user
                    items: items,
                    totalAmount: finalTotalAmount,
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
                    quotationFileUrl: fileUrl,
                };

                transaction.set(newOrderRef, newOrder);
                transaction.delete(originalRfqRef);

                // Create notification for the user
                const newNotification: Omit<Notification, 'id'> = {
                    title: 'Quotation Ready',
                    description: `Your quotation for request #${rfq.id.substring(0, 6)}... is ready for review.`,
                    href: '/profile?tab=quotation',
                    read: false,
                    createdAt: Timestamp.now(),
                };
                transaction.set(notificationRef, newNotification);

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
          customerRevisionUrl?: string;
          review?: string;
          rating?: number;
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

            if (details?.reason && (newStatus === 'cancelled' || newStatus === 'declined' || newStatus === 'rescheduled')) {
                dataToUpdate.cancellationReason = details.reason;
            }
            
            if (details?.customerRevisionUrl) {
                dataToUpdate.customerRevisionUrl = details.customerRevisionUrl;
            }

            // This block handles updates from the admin's quote-ready response or user's confirmation
            if ((newStatus === 'quote-ready' || newStatus === 'confirmed')) {
                if (details?.items !== undefined) dataToUpdate.items = details.items;
                if (details?.totalAmount !== undefined) dataToUpdate.totalAmount = details.totalAmount;
                if (details?.discount !== undefined) dataToUpdate.discount = details.discount;
                if (details?.deliveryFee !== undefined) dataToUpdate.deliveryFee = details.deliveryFee;
                if (details?.packagingFee !== undefined) dataToUpdate.packagingFee = details.packagingFee;
                if (details?.shippingAddress !== undefined) dataToUpdate.shippingAddress = details.shippingAddress;
                if (details?.shippingContactNumber !== undefined) dataToUpdate.shippingContactNumber = details.shippingContactNumber;
                if (details?.paymentMethod !== undefined) dataToUpdate.paymentMethod = details.paymentMethod;
            }

            // Transaction for stock updates and feedback
            await runTransaction(firestore, async (transaction: Transaction) => {
                // Always update the order document
                transaction.update(orderRef, dataToUpdate);

                // --- Notification Logic ---
                // Notify user on specific status changes
                const isUserFacingUpdate = ['quote-ready', 'completed', 'cancelled', 'declined', 'delivering'].includes(newStatus);
                if (isUserFacingUpdate) {
                    const userNotificationRef = doc(collection(firestore, 'users', order.userId, 'notifications'));
                    let href = '/profile?tab=purchases';
                    if (newStatus === 'quote-ready') {
                        href = '/profile?tab=quotation';
                    } else if (newStatus === 'completed' || newStatus === 'cancelled' || newStatus === 'declined') {
                        href = '/profile?tab=orders';
                    }

                    const newNotification: Omit<Notification, 'id'> = {
                        title: `Order #${order.id.substring(0, 6)}... Updated`,
                        description: `Your order status is now: ${newStatus.replace('-', ' ')}`,
                        href: href,
                        read: false,
                        createdAt: Timestamp.now(),
                    };
                    transaction.set(userNotificationRef, newNotification);
                }
                
                // Notify admin when an order is confirmed or completed
                if (newStatus === 'confirmed' || newStatus === 'completed') {
                    const adminNotificationRef = doc(collection(firestore, 'admin_notifications'));
                    const title = newStatus === 'confirmed' ? 'Order Confirmed' : 'Order Completed';
                    const description = newStatus === 'confirmed' 
                        ? `${order.userDisplayName} has confirmed their order #${order.id.substring(0, 6)}...`
                        : `${order.userDisplayName} has marked order #${order.id.substring(0, 6)}... as received.`;
                    
                    const adminNotification: Omit<Notification, 'id'> = {
                        title: title,
                        description: description,
                        href: '/management/orders',
                        read: false,
                        createdAt: serverTimestamp() as Timestamp,
                    };
                    transaction.set(adminNotificationRef, adminNotification);
                }


                // If review and rating are provided, create a new feedback document
                if (newStatus === 'completed' && details?.rating && user) {
                    const feedbackRef = doc(firestore, 'customer_feedback', order.id);
                    const newFeedback: Omit<CustomerFeedback, 'id'> = {
                        userName: user.displayName,
                        rating: details.rating,
                        review: details.review || '',
                        createdAt: serverTimestamp(),
                    };
                    transaction.set(feedbackRef, newFeedback);
                }

                // --- STOCK LOGIC ---
                const stockShouldBeDeducted = newStatus === 'confirmed' && order.status !== 'confirmed';
                const stockShouldBeRestored = (newStatus === 'cancelled' || newStatus === 'declined') && (order.status === 'confirmed' || order.status === 'delivering');

                let itemsForStockUpdate: CartItem[] = [];

                if (stockShouldBeDeducted) {
                    itemsForStockUpdate = details?.items || order.items;
                } else if (stockShouldBeRestored) {
                    itemsForStockUpdate = order.items;
                }

                if (itemsForStockUpdate.length > 0) {
                    for (const item of itemsForStockUpdate) {
                        if (item.parentItemId === 'custom-rfq') {
                            continue; // Skip stock updates for custom RFQ items
                        }
                        const variantRef = doc(firestore, 'inventory', item.parentItemId, 'variants', item.variantId);
                         try {
                            transaction.update(variantRef, {
                                quantity: increment(stockShouldBeDeducted ? -item.quantity : item.quantity)
                            });
                         } catch (e: any) {
                             if (e.code === 'not-found') {
                                console.warn(`Tried to update stock for a non-existent item: ${variantRef.path}. This might be a custom RFQ item.`);
                                // This is okay, we just skip it.
                             } else {
                                throw e; // Re-throw other errors
                             }
                         }
                    }
                }
            });


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
    
    const deleteNotificationOnClick = async (notification: Notification): Promise<void> => {
        if (!user) return;
        
        let notificationRef;
        if ((notification as any).isGlobal) {
            notificationRef = doc(firestore, 'admin_notifications', notification.id);
        } else {
            notificationRef = doc(firestore, 'users', user.id, 'notifications', notification.id);
        }
        
        try {
            await deleteDoc(notificationRef);
        } catch (error) {
            console.error("Failed to delete notification:", error);
        }
    };

    const updatePoStatus = async (po: PurchaseOrder, newStatus: PurchaseOrderStatus, details?: { salesInvoice?: string, deliveryReceipt?: string, salesInvoiceFile?: File | null, deliveryReceiptFile?: File | null, receivedBy?: string, receivedDate?: Date }): Promise<boolean> => {
        const poRef = doc(firestore, 'purchase_orders', po.id);
        try {
            const dataToUpdate: any = {
                status: newStatus,
                updatedAt: serverTimestamp(),
            };

            if (newStatus === 'Delivered') {
                if (details?.salesInvoice) dataToUpdate.salesInvoice = details.salesInvoice;
                if (details?.deliveryReceipt) dataToUpdate.deliveryReceipt = details.deliveryReceipt;
                if (details?.receivedBy) dataToUpdate.receivedBy = details.receivedBy;
                if (details?.receivedDate) dataToUpdate.receivedDate = Timestamp.fromDate(details.receivedDate);

                if (details?.salesInvoiceFile) {
                    const url = await uploadFile(details.salesInvoiceFile, `po_documents/${po.poNumber}`, details.salesInvoice);
                    if (url) dataToUpdate.salesInvoiceUrl = url;
                }
                if (details?.deliveryReceiptFile) {
                    const url = await uploadFile(details.deliveryReceiptFile, `po_documents/${po.poNumber}`, details.deliveryReceipt);
                    if (url) dataToUpdate.deliveryReceiptUrl = url;
                }
            }

            await updateDoc(poRef, dataToUpdate);
            
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
                    requestResourceData: { status: newStatus, ...details },
                });
                errorEmitter.emit('permission-error', permissionError);
            }
            return false;
        }
    };
    
    const uploadFile = async (file: File, path: string, fileName?: string): Promise<string | null> => {
        if (!storage) {
            toast({
                variant: 'destructive',
                title: 'Storage Error',
                description: 'Storage service is not available. Cannot upload file.'
            });
            return null;
        }
    
        const finalFileName = fileName ? `${fileName}.${file.name.split('.').pop()}` : file.name;
        const storageRef = ref(storage, `${path}/${finalFileName}`);

        try {
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return downloadURL;
        } catch (error: any) {
            console.error("[uploadFile] Upload failed:", error);
            toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
            return null;
        }
    };
    
    const deleteFileByUrl = async (url: string): Promise<void> => {
        if (!storage) {
            console.error("Storage service is not available. Cannot delete file.");
            return;
        }
        try {
            const fileRef = ref(storage, url);
            await deleteObject(fileRef);
        } catch (error: any) {
             // It's okay if the file doesn't exist (e.g., already deleted), so we only log other errors.
            if (error.code !== 'storage/object-not-found') {
                console.error("Error deleting file from storage:", error);
                toast({
                    variant: "destructive",
                    title: "File Deletion Failed",
                    description: "Could not delete an associated file from storage. It may need to be removed manually."
                });
            }
        }
    };


  const logout = async () => {
    await signOut(auth);
    setUser(null);
    router.push('/');
  };
  
  const value = { user, cart, orders, products, notifications, isProductsLoading, firestore, toast, login, register, loginWithGoogle, logout, isLoading, createAdminUser, updateUserRole, updateUserProfile, addToCart, updateCartItemQuantity, removeCartItem, placeOrder, respondToRfq, updateOrderStatus, updatePoStatus, uploadFile, deleteFileByUrl, showAdminOrderBadge, dismissAdminOrderBadge, showAdminRfqBadge, dismissAdminRfqBadge, fetchOrders, deleteNotificationOnClick };

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

    