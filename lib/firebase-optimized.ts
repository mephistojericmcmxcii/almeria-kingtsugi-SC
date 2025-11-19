import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getAuth, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"

// Check if we're in the browser environment
const isBrowser = typeof window !== "undefined"

// Firebase Configuration - optimized for performance
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

// Validate Firebase config with better error handling
const isValidConfig = Boolean(
  firebaseConfig.apiKey?.length && firebaseConfig.projectId?.length && firebaseConfig.appId?.length,
)

if (!isValidConfig && isBrowser) {
  console.warn("Firebase configuration is incomplete. Some features may not work.")
}

// Singleton instances with lazy initialization
let app: FirebaseApp | undefined
let auth: Auth | undefined
let db: Firestore | undefined
let storage: FirebaseStorage | undefined

/**
 * Get Firebase app instance with lazy initialization
 * @returns Firebase app instance or undefined
 */
export const getFirebaseApp = (): FirebaseApp | undefined => {
  if (!app && isValidConfig && isBrowser) {
    try {
      if (!getApps().length) {
        app = initializeApp(firebaseConfig)
      } else {
        app = getApps()[0]
      }
    } catch (error) {
      console.error("Failed to initialize Firebase app:", error)
    }
  }
  return app
}

/**
 * Get Firebase Auth instance with optimized persistence
 * @returns Firebase Auth instance or undefined
 */
export const getFirebaseAuth = (): Auth | undefined => {
  if (!auth && isBrowser) {
    const firebaseApp = getFirebaseApp()
    if (firebaseApp) {
      try {
        auth = getAuth(firebaseApp)
        // Set persistence asynchronously to avoid blocking
        setPersistence(auth, browserLocalPersistence).catch(console.error)
      } catch (error) {
        console.error("Failed to initialize Firebase auth:", error)
      }
    }
  }
  return auth
}

/**
 * Get Firestore instance with lazy initialization
 * @returns Firestore instance or undefined
 */
export const getFirebaseDb = (): Firestore | undefined => {
  if (!db && isBrowser) {
    const firebaseApp = getFirebaseApp()
    if (firebaseApp) {
      try {
        db = getFirestore(firebaseApp)
      } catch (error) {
        console.error("Failed to initialize Firestore:", error)
      }
    }
  }
  return db
}

/**
 * Get Firebase Storage instance with lazy initialization
 * @returns Firebase Storage instance or undefined
 */
export const getFirebaseStorage = (): FirebaseStorage | undefined => {
  if (!storage && isBrowser) {
    const firebaseApp = getFirebaseApp()
    if (firebaseApp) {
      try {
        storage = getStorage(firebaseApp)
      } catch (error) {
        console.error("Failed to initialize Firebase storage:", error)
      }
    }
  }
  return storage
}

/**
 * Lazy load Firebase Analytics with feature detection
 * @returns Firebase Analytics instance or null
 */
export const getFirebaseAnalytics = async () => {
  if (!isBrowser) return null

  try {
    const [{ getAnalytics }, { isSupported }] = await Promise.all([
      import("firebase/analytics"),
      import("firebase/analytics"),
    ])

    const supported = await isSupported.isSupported()
    if (supported) {
      const firebaseApp = getFirebaseApp()
      if (firebaseApp) {
        return getAnalytics(firebaseApp)
      }
    }
  } catch (error) {
    console.warn("Analytics not supported or failed to load:", error)
  }
  return null
}

/**
 * Optimized login function with better error handling
 * @param email - User email
 * @param password - User password
 * @returns Promise<User>
 */
export async function login(email: string, password: string) {
  const authInstance = getFirebaseAuth()
  if (!authInstance) {
    throw new Error("Firebase auth is not initialized")
  }

  try {
    const userCredential = await signInWithEmailAndPassword(authInstance, email, password)
    const token = await userCredential.user.getIdToken()

    // Dynamic import for js-cookie to reduce initial bundle size
    const { default: Cookies } = await import("js-cookie")
    Cookies.set("auth-session", token, {
      expires: 1,
      secure: true,
      sameSite: "strict",
    })

    return userCredential.user
  } catch (error) {
    console.error("Login failed:", error)
    throw error
  }
}

// Export instances for backward compatibility
export { app, auth, db, storage }

// Export the main Firebase instance getter
export const firebase = {
  app: getFirebaseApp,
  auth: getFirebaseAuth,
  db: getFirebaseDb,
  storage: getFirebaseStorage,
  analytics: getFirebaseAnalytics,
}
