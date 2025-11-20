
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
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
let persistenceEnabled = false;

// This is the main initialization function.
export function initializeFirebase(): FirebaseServices {
  if (firebaseServices) {
    return firebaseServices;
  }

  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const firestore = getFirestore(app);

  // Enable persistence only once
  if (!persistenceEnabled) {
    try {
      enableIndexedDbPersistence(firestore);
      persistenceEnabled = true;
    } catch (error: any) {
      if (error.code == 'failed-precondition') {
        console.warn('Firestore persistence failed: Multiple tabs open. Persistence will only be enabled in one tab at a time.');
      } else if (error.code == 'unimplemented') {
        console.warn('Firestore persistence failed: The current browser does not support all of the features required to enable persistence.');
      }
    }
  }
  
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
