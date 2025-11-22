
'use client';

import { useState, useEffect, useCallback } from 'react';
import { onSnapshot, collection, collectionGroup, doc, updateDoc, serverTimestamp, query, Timestamp, Firestore } from 'firebase/firestore';
import type { User, CartItem, Order, QuotationRequest } from '@/lib/types';

export const useBadgeManager = (user: User | null, cart: CartItem[] | null, firestore: Firestore) => {
    const [showCartBadge, setShowCartBadge] = useState(false);
    const [showQuoteReadyBadge, setShowQuoteReadyBadge] = useState(false);
    const [showNewPurchaseBadge, setShowNewPurchaseBadge] = useState(false);
    const [showNewHistoryBadge, setShowNewHistoryBadge] = useState(false);
    const [showAdminOrderBadge, setShowAdminOrderBadge] = useState(false);
    const [showAdminRfqBadge, setShowAdminRfqBadge] = useState(false);

    // Track if admin badges have been dismissed in the current session
    const [hasSeenAdminNotifications, setHasSeenAdminNotifications] = useState(false);

    // Cart badge logic
    useEffect(() => {
        setShowCartBadge(cart !== null && cart.length > 0);
    }, [cart]);

    // User-specific order notification logic
    useEffect(() => {
        if (!user || user.role === 'admin') {
            setShowQuoteReadyBadge(false);
            setShowNewPurchaseBadge(false);
            setShowNewHistoryBadge(false);
            return;
        }

        const userOrdersQuery = query(collection(firestore, 'users', user.id, 'orders'));
        const unsubscribe = onSnapshot(userOrdersQuery, (snapshot) => {
            let hasNewQuoteReady = false;
            let hasNewPurchase = false;
            let hasNewHistory = false;
            const lastViewedUser = user.lastViewedOrdersAt?.toMillis() || 0;

            snapshot.forEach(doc => {
                const order = doc.data() as Order;
                const updatedAt = order.updatedAt?.toMillis() || order.orderDate.toMillis();
                
                if (updatedAt > lastViewedUser) {
                    if (order.status === 'quote-ready') hasNewQuoteReady = true;
                    if (['confirmed', 'delivering'].includes(order.status)) hasNewPurchase = true;
                    if (['completed', 'cancelled', 'declined'].includes(order.status)) hasNewHistory = true;
                }
            });

            setShowQuoteReadyBadge(hasNewQuoteReady);
            setShowNewPurchaseBadge(hasNewPurchase);
            setShowNewHistoryBadge(hasNewHistory);
        });

        return () => unsubscribe();
    }, [user, firestore]);

    // Admin-specific notification logic
    useEffect(() => {
        if (!user || user.role !== 'admin') {
            setShowAdminOrderBadge(false);
            setShowAdminRfqBadge(false);
            return;
        }

        // --- Admin Orders Listener ---
        const ordersUnsub = onSnapshot(collectionGroup(firestore, 'orders'), (snapshot) => {
            const lastViewedAdminOrders = user.lastViewedAllOrdersAt?.toMillis() || 0;
            const hasNew = snapshot.docs.some(doc => {
                const order = doc.data() as Order;
                // Consider new if 'pending-quote' or if updated after last view
                if (order.status === 'pending-quote') return true;
                const updatedAt = order.updatedAt?.toMillis() || order.orderDate.toMillis();
                return updatedAt > lastViewedAdminOrders;
            });
            setShowAdminOrderBadge(hasNew);
        }, (error) => {
            console.error("Admin order listener error:", error);
            setShowAdminOrderBadge(false); // Clear badge on error
        });

        // --- Admin RFQs Listener ---
        const rfqsUnsub = onSnapshot(collectionGroup(firestore, 'rfq'), (snapshot) => {
            const lastViewedAdminRfqs = user.lastViewedAllRfqsAt?.toMillis() || 0;
            const hasNew = snapshot.docs.some(doc => {
                const rfq = doc.data() as QuotationRequest;
                return rfq.createdAt && rfq.createdAt.toMillis() > lastViewedAdminRfqs;
            });
            setShowAdminRfqBadge(hasNew);
        }, (error) => {
            console.error("Admin RFQ listener error:", error);
            setShowAdminRfqBadge(false); // Clear badge on error
        });

        return () => {
            ordersUnsub();
            rfqsUnsub();
        };
    }, [user, firestore]);

    const dismissUserNotifications = useCallback(async () => {
        if (!user) return;
        setShowQuoteReadyBadge(false);
        setShowNewPurchaseBadge(false);
        setShowNewHistoryBadge(false);

        try {
            const userRef = doc(firestore, "users", user.id);
            await updateDoc(userRef, { lastViewedOrdersAt: serverTimestamp() });
        } catch (error) {
            console.error("Error updating lastViewedOrdersAt:", error);
        }
    }, [user, firestore]);

    const dismissAdminOrderBadge = useCallback(async () => {
        if (!user || user.role !== 'admin' || hasSeenAdminNotifications) return;
        
        setShowAdminOrderBadge(false);
        setHasSeenAdminNotifications(true); // Set session flag
        
        try {
            const userRef = doc(firestore, 'users', user.id);
            await updateDoc(userRef, { lastViewedAllOrdersAt: serverTimestamp() });
        } catch (error) {
            console.error("Error updating lastViewedAllOrdersAt:", error);
        }
    }, [user, firestore, hasSeenAdminNotifications]);

    const dismissAdminRfqBadge = useCallback(async () => {
        if (!user || user.role !== 'admin' || hasSeenAdminNotifications) return;
        
        setShowAdminRfqBadge(false);
        setHasSeenAdminNotifications(true); // Set session flag
        
        try {
            const userRef = doc(firestore, 'users', user.id);
            await updateDoc(userRef, { lastViewedAllRfqsAt: serverTimestamp() });
        } catch (error) {
            console.error("Error updating lastViewedAllRfqsAt:", error);
        }
    }, [user, firestore, hasSeenAdminNotifications]);

    return {
        showCartBadge,
        showQuoteReadyBadge,
        showNewPurchaseBadge,
        showNewHistoryBadge,
        showAdminOrderBadge,
        showAdminRfqBadge,
        dismissUserNotifications,
        dismissAdminOrderBadge,
        dismissAdminRfqBadge,
    };
};
