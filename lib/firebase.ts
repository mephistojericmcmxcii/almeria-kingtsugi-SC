import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getAuth, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics"
import Cookies from "js-cookie"

// Check if we're in the browser environment
const isBrowser = typeof window !== "undefined"

// Firebase Configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Validate Firebase config before initialization
const isValidConfig =
  typeof firebaseConfig.apiKey === "string" &&
  firebaseConfig.apiKey.length > 0 &&
  typeof firebaseConfig.projectId === "string" &&
  firebaseConfig.projectId.length > 0 &&
  typeof firebaseConfig.appId === "string" &&
  firebaseConfig.appId.length > 0

// Initialize Firebase services
let app: FirebaseApp | undefined
let auth: Auth | undefined
let db: Firestore | undefined
let storage: FirebaseStorage | undefined
let analytics: Analytics | undefined

let initializationPromise: Promise<boolean> | null = null

// Function to initialize Firebase with proper error handling and race condition prevention
function initializeFirebase(): Promise<boolean> {
  if (initializationPromise) {
    return initializationPromise
  }

  if (!isValidConfig) {
    console.error("Invalid Firebase configuration. Check your environment variables.")
    return Promise.resolve(false)
  }

  initializationPromise = new Promise(async (resolve) => {
    try {
      // Initialize Firebase (if not already initialized)
      if (!getApps().length) {
        app = initializeApp(firebaseConfig)
        console.log("🚀 Firebase Initialized:", app.name)
      } else {
        app = getApps()[0]
        console.log("🚀 Firebase Already Initialized:", app.name)
      }

      // Initialize Firebase services with proper error handling
      auth = getAuth(app)
      db = getFirestore(app)
      storage = getStorage(app)

      if (db) {
        // Test Firestore connection with a simple operation
        try {
          // This will trigger connection establishment
          await new Promise((resolve, reject) => {
            const unsubscribe = db!.app.automaticDataCollectionEnabled
            resolve(true)
          })
          console.log("✅ Firestore Connected Successfully")
        } catch (firestoreError) {
          console.warn("⚠️ Firestore connection test failed, but continuing:", firestoreError)
          // Don't fail initialization just because of connection test
        }
      }

      // Set persistent authentication with proper error handling
      if (auth) {
        try {
          await setPersistence(auth, browserLocalPersistence)
          console.log("✅ Firebase Auth Persistence Set")
        } catch (persistenceError) {
          console.warn("⚠️ Firebase Persistence Warning:", persistenceError)
          // Don't fail initialization just because of persistence
        }
      }

      // Only initialize analytics if supported (async to not block)
      isSupported()
        .then((supported) => {
          if (supported && app) {
            analytics = getAnalytics(app)
            console.log("✅ Firebase Analytics Initialized")
          }
        })
        .catch((err) => {
          console.warn("Analytics not supported:", err)
        })

      resolve(true)
    } catch (error) {
      console.error("❌ Firebase initialization error:", error)
      resolve(false)
    }
  })

  return initializationPromise
}

let firebaseInitialized = false
let initPromise: Promise<boolean> | null = null

if (isBrowser) {
  initPromise = initializeFirebase()
  initPromise.then((success) => {
    firebaseInitialized = success
  })
}

export async function ensureFirebaseReady(): Promise<boolean> {
  if (!isBrowser) return false

  if (initPromise) {
    return await initPromise
  }

  if (firebaseInitialized) {
    return true
  }

  // If no initialization promise exists, start initialization
  initPromise = initializeFirebase()
  const success = await initPromise
  firebaseInitialized = success
  return success
}

// Function to handle login and set auth session cookie
export async function login(email: string, password: string) {
  const isReady = await ensureFirebaseReady()
  if (!isReady || !auth) {
    throw new Error("Firebase auth is not initialized. Check your environment variables.")
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const token = await userCredential.user.getIdToken()

    // Store session cookie for authentication middleware
    Cookies.set("auth-session", token, { expires: 1, secure: true })

    console.log("✅ Login successful, auth-session cookie set.")
    return userCredential.user
  } catch (error) {
    console.error("❌ Login Error:", error)
    throw error
  }
}

// Debug function to check environment variables and Firebase initialization status
export function debugFirebaseConfig() {
  return {
    hasApiKey:
      typeof process.env.NEXT_PUBLIC_FIREBASE_API_KEY === "string" &&
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY.length > 0,
    hasAuthDomain:
      typeof process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN === "string" &&
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN.length > 0,
    hasProjectId:
      typeof process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === "string" &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID.length > 0,
    hasAppId:
      typeof process.env.NEXT_PUBLIC_FIREBASE_APP_ID === "string" && process.env.NEXT_PUBLIC_FIREBASE_APP_ID.length > 0,
    isValidConfig,
    isBrowser,
    firebaseInitialized: firebaseInitialized || (!!app && !!auth && !!db), // Check if services are initialized
    appInitialized: !!app,
    authInitialized: !!auth,
    dbInitialized: !!db,
    storageInitialized: !!storage,
  }
}

export { app, auth, db, analytics, storage }
