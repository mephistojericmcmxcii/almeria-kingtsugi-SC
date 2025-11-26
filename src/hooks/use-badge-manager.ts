

'use client';

import { useState, useEffect, useCallback } from 'react';
import { onSnapshot, collection, collectionGroup, doc, updateDoc, serverTimestamp, query, Timestamp, Firestore } from 'firebase/firestore';
import type { User, CartItem, Order, QuotationRequest } from '@/lib/types';

export const useBadgeManager = (user: User | null, cart: CartItem[] | null, firestore: Firestore) => {
    // This hook no longer manages user-facing badges, as they are handled by the new notifications system.
    // It only manages admin-facing badges now.
    const [showAdminOrderBadge, setShowAdminOrderBadge] = useState(false);
    const [showAdminRfqBadge, setShowAdminRfqBadge] = useState(false);

    // Track if admin badges have been dismissed in the current session
    const [hasSeenAdminNotifications, setHasSeenAdminNotifications] = useState(false);

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
        showAdminOrderBadge,
        showAdminRfqBadge,
        dismissAdminOrderBadge,
        dismissAdminRfqBadge,
    };
};

    