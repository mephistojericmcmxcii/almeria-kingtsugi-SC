
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { FirebaseStorage } from 'firebase/storage';

// This structure holds all initialized Firebase services.
interface FirebaseServices {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage | null; // Can be null on the server
}

// A singleton to hold the initialized services.
let firebaseServices: FirebaseServices | null = null;

// This is the main initialization function.
export function initializeFirebase(): FirebaseServices {
  if (firebaseServices) {
    return firebaseServices;
  }

  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  
  // Use initializeFirestore to configure persistence
  const firestore = initializeFirestore(app, {
    localCache: memoryLocalCache({})
  });
  
  firebaseServices = {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: firestore,
    storage: null, // Set to null initially. It will be initialized on the client.
  };

  return firebaseServices;
}

export * from './provider';
export * from './client-provider';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
