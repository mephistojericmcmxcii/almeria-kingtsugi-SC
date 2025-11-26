

'use client';

import { useState, useEffect, useCallback } from 'react';
import { onSnapshot, collection, collectionGroup, doc, updateDoc, serverTimestamp, query, Timestamp, Firestore } from 'firebase/firestore';
import type { User, CartItem, Order, QuotationRequest } from '@/lib/types';

export const useBadgeManager = (user: User | null, cart: CartItem[] | null, firestore: Firestore) => {
    // This hook is simplified and currently does not manage any active badges.
    // All notifications are handled through the notification bell system.
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
        
        // All listener logic for sidebar badges has been removed to centralize
        // notifications in the notification bell.

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

    