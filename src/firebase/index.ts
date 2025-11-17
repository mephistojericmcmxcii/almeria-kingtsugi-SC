
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

// This structure holds all initialized Firebase services.
interface FirebaseServices {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
}

// A singleton to hold the initialized services.
let firebaseServices: FirebaseServices | null = null;

// This is the main initialization function.
export function initializeFirebase(): FirebaseServices {
  if (firebaseServices) {
    return firebaseServices;
  }

  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  
  firebaseServices = {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: getFirestore(app),
    storage: getStorage(app),
  };

  return firebaseServices;
}

export * from './provider';
export * from './client-provider';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';

    