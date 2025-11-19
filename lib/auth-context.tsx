"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { type User, signInWithEmailAndPassword, signOut as firebaseSignOut } from "firebase/auth"
import { auth, db } from "./firebase"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { useIdleTimeout } from "@/hooks/use-idle-timeout"
import { useRouter, usePathname } from "next/navigation"

interface AuthContextType {
  user: User | null
  loading: boolean
  userAccessPoints: string[]
  userPermissions: string[]
  isAdmin: boolean
  isGuest: boolean
  employeeName: string | null
  userData: any | null
  employeeData: any | null // Added employeeData to interface
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  signInAsGuest: () => void
  signOut: (isIdleSignOut?: boolean) => Promise<void>
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  userAccessPoints: [],
  userPermissions: [],
  isAdmin: false,
  isGuest: false,
  employeeName: null,
  userData: null,
  employeeData: null, // Added employeeData to default context
  signIn: async () => {},
  signInAsGuest: () => {},
  signOut: async () => {},
  hasPermission: () => false,
})

const IDLE_TIMEOUT = 5 * 60 * 1000 // 5 minutes in milliseconds

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userAccessPoints, setUserAccessPoints] = useState<string[]>([])
  const [userPermissions, setUserPermissions] = useState<string[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const [employeeName, setEmployeeName] = useState<string | null>(null)
  const [userData, setUserData] = useState<any | null>(null)
  const [employeeData, setEmployeeData] = useState<any | null>(null) // Added employeeData state
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cookies = document.cookie.split(";").map((cookie) => cookie.trim())
      const guestCookie = cookies.find((cookie) => cookie.startsWith("auth-session=guest"))

      if (guestCookie) {
        console.log("Found guest cookie, restoring guest session")
        setIsGuest(true)
        setUserAccessPoints(["guest"])
        setUserPermissions(["dashboard", "about"])
        setEmployeeName("Guest User")
        setUserData({ name: "Guest User", email: "guest@example.com" })
        setEmployeeData({ name: "Guest User", email: "guest@example.com" }) // Set employeeData for guest

        if (pathname !== "/" && pathname !== "/about" && pathname !== "/login") {
          console.log("Guest trying to access restricted page, redirecting to home")
          router.push("/")
        }
      }
    }
  }, [pathname, router])

  const signInAsGuest = useCallback(() => {
    console.log("Signing in as guest")
    setUser(null)
    setIsGuest(true)
    setUserAccessPoints(["guest"])
    setUserPermissions(["dashboard", "about"])
    setIsAdmin(false)
    setEmployeeName("Guest User")
    setUserData({ name: "Guest User", email: "guest@example.com" })
    setEmployeeData({ name: "Guest User", email: "guest@example.com" }) // Set employeeData for guest

    document.cookie = "auth-session=guest; path=/; max-age=86400" // 24 hours

    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        `user_access_guest`,
        JSON.stringify({
          accessPoints: ["guest"],
          permissions: ["dashboard", "about"],
          isAdmin: false,
          employeeName: "Guest User",
          userData: { name: "Guest User", email: "guest@example.com" },
          employeeData: { name: "Guest User", email: "guest@example.com" }, // Cache employeeData for guest
          timestamp: new Date().getTime(),
        }),
      )
    }
  }, [])

  const signOut = useCallback(
    async (isIdleSignOut = false) => {
      if (isGuest) {
        console.log("Signing out guest user")
        setIsGuest(false)
        setUserAccessPoints([])
        setUserPermissions([])
        setEmployeeName(null)
        setUserData(null)
        setEmployeeData(null) // Clear employeeData on signout
        document.cookie = "auth-session=; path=/; max-age=0"
        sessionStorage.removeItem(`user_access_guest`)
        return
      }

      if (!auth) {
        throw new Error("Firebase auth is not initialized")
      }

      try {
        if (user?.email && typeof window !== "undefined") {
          sessionStorage.removeItem(`user_access_${user.email}`)
        }
        await firebaseSignOut(auth)
      } catch (error) {
        console.error("Error signing out:", error)
        throw error
      } finally {
        setEmployeeName(null)
        setUserData(null)
        setEmployeeData(null) // Clear employeeData on signout
      }
    },
    [user?.email, isGuest],
  )

  useIdleTimeout({
    timeout: IDLE_TIMEOUT,
    onIdle: () => {
      if (user || isGuest) {
        console.log("User inactive for 5 minutes, signing out...")
        signOut(true)
      }
    },
    events: user || isGuest ? ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"] : [],
  })

  const fetchUserAccess = async (email: string, uid: string) => {
    try {
      console.log("AuthContext: Fetching access for email:", email, "and UID:", uid)

      if (!db) {
        console.error("AuthContext: Firestore is not initialized")
        return
      }

      setUserAccessPoints([])
      setUserPermissions([])
      setIsAdmin(false)
      setEmployeeName(null)
      setUserData(null)
      setEmployeeData(null) // Clear employeeData when fetching

      let employeeDataResult = null

      try {
        console.log("[v0] AuthContext: Looking up employee by UID:", uid)
        const userDocRef = doc(db, "employees", uid)
        const userDocSnap = await getDoc(userDocRef)
        if (userDocSnap.exists()) {
          employeeDataResult = userDocSnap.data()
          console.log("[v0] AuthContext: Employee data found by UID:", employeeDataResult)
          console.log("[v0] AuthContext: Employee status:", employeeDataResult.status)

          if (employeeDataResult.status !== "Active") {
            console.log("[v0] AuthContext: User status is not Active, signing out user...")
            console.log("[v0] AuthContext: Current status:", employeeDataResult.status)
            await signOut()
            throw new Error(`Account is ${employeeDataResult.status}. Please contact administrator.`)
          } else {
            console.log("[v0] AuthContext: User status is Active, proceeding...")
          }
        } else {
          console.log("[v0] AuthContext: No employee document found for UID:", uid)
        }
      } catch (uidError) {
        console.warn("AuthContext: Could not fetch employee by UID:", uidError)
        if (uidError instanceof Error && uidError.message.includes("Account is")) {
          throw uidError
        }
      }

      if (!employeeDataResult && email) {
        const employeesRef = collection(db, "employees")
        const q = query(employeesRef, where("email", "==", email))
        const querySnapshot = await getDocs(q)

        if (querySnapshot.empty) {
          console.log("AuthContext: No employee record found for email:", email)
          return
        }
        employeeDataResult = querySnapshot.docs[0].data()
        console.log("AuthContext: Employee data found by email:", employeeDataResult)

        if (employeeDataResult.status !== "Active") {
          console.log("AuthContext: User status is not Active:", employeeDataResult.status)
          await signOut()
          throw new Error(`Account is ${employeeDataResult.status}. Please contact administrator.`)
        }
      }

      if (employeeDataResult) {
        setEmployeeData(employeeDataResult) // Set employeeData state
        const accessPointIds = employeeDataResult?.accessPoints || []
        setUserAccessPoints(accessPointIds)
        console.log("AuthContext: Employee access point IDs:", accessPointIds)

        const resolvedEmployeeName = employeeDataResult.name || employeeDataResult.fullName || null
        setEmployeeName(resolvedEmployeeName)
        setUserData(employeeDataResult)
        console.log("AuthContext: Set employeeName:", resolvedEmployeeName, "and userData:", employeeDataResult)

        let userIsAdmin = false
        const permissions: string[] = []

        if (accessPointIds.length > 0) {
          const accessPointPromises = accessPointIds.map((id) => getDoc(doc(db, "accessPoints", id)))
          const accessPointDocs = await Promise.all(accessPointPromises)

          accessPointDocs.forEach((docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data()
              console.log(`AuthContext: Processing access point: ${data.name} (ID: ${docSnap.id})`)
              if (data.permissions) {
                permissions.push(...data.permissions)
              }
              if (data.name === "Admin") {
                userIsAdmin = true
                console.log("AuthContext: Found 'Admin' access point!")
              }
            } else {
              console.warn(`AuthContext: Access point document with ID ${docSnap.id} not found.`)
            }
          })

          const uniquePermissions = [...new Set(permissions)]
          setUserPermissions(uniquePermissions)
          setIsAdmin(userIsAdmin)
          console.log(`AuthContext: User ${email} isAdmin status: ${userIsAdmin}`)

          if (typeof window !== "undefined") {
            sessionStorage.setItem(
              `user_access_${email}`,
              JSON.stringify({
                accessPoints: accessPointIds,
                permissions: uniquePermissions,
                isAdmin: userIsAdmin,
                employeeName: resolvedEmployeeName,
                userData: employeeDataResult,
                employeeData: employeeDataResult, // Cache employeeData
                timestamp: new Date().getTime(),
              }),
            )
            console.log("AuthContext: Cached user access data for:", email)
          }
        } else {
          console.log("AuthContext: No access points assigned to this employee.")
        }
      } else {
        console.log("AuthContext: No employee data found for user.")
      }
    } catch (error) {
      console.error("AuthContext: Error fetching user access:", error)
    }
  }

  const hasPermission = (permission: string) => {
    if (isAdmin) return true
    return userPermissions.includes(permission)
  }

  useEffect(() => {
    let unsubscribe = () => {}

    if (typeof window !== "undefined") {
      const setupAuthListener = async () => {
        try {
          const { auth } = await import("@/lib/firebase")

          if (!auth) {
            console.error("AuthContext: Firebase auth is not initialized")
            setLoading(false)
            return
          }

          const { onAuthStateChanged } = await import("firebase/auth")

          unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser && isGuest) {
              console.log("AuthContext: User logged in, exiting guest mode.")
              setIsGuest(false)
              document.cookie = "auth-session=; path=/; max-age=0"
              sessionStorage.removeItem(`user_access_guest`)
            }

            setUser(currentUser)

            if (currentUser) {
              document.cookie = "auth-session=true; path=/; max-age=86400" // 24 hours

              const email = currentUser.email || ""
              const cachedData = sessionStorage.getItem(`user_access_${email}`)

              if (cachedData) {
                try {
                  const {
                    accessPoints,
                    permissions,
                    isAdmin: cachedIsAdmin,
                    employeeName: cachedEmployeeName,
                    userData: cachedUserData,
                    employeeData: cachedEmployeeData, // Get cached employeeData
                    timestamp,
                  } = JSON.parse(cachedData)

                  const now = new Date().getTime()
                  if (now - timestamp < 1800000) {
                    console.log("AuthContext: Using cached permissions for:", email)
                    setUserAccessPoints(accessPoints)
                    setIsAdmin(cachedIsAdmin)
                    setUserPermissions(permissions)
                    setEmployeeName(cachedEmployeeName)
                    setUserData(cachedUserData)
                    setEmployeeData(cachedEmployeeData || cachedUserData) // Set cached employeeData
                    setLoading(false)
                    return
                  } else {
                    console.log("AuthContext: Cached data expired, fetching fresh data.")
                  }
                } catch (e) {
                  console.error("AuthContext: Error parsing cached data:", e)
                }
              }

              try {
                await fetchUserAccess(email, currentUser.uid)
              } catch (error) {
                console.error("AuthContext: Error fetching user access:", error)
                if (error instanceof Error && error.message.includes("Account is")) {
                  setLoading(false)
                  return
                }
              }
            } else if (!isGuest) {
              document.cookie = "auth-session=; path=/; max-age=0"
              setUserAccessPoints([])
              setUserPermissions([])
              setIsAdmin(false)
              setEmployeeName(null)
              setUserData(null)
              setEmployeeData(null) // Clear employeeData when no user
            }

            setLoading(false)
          })
        } catch (error) {
          console.error("AuthContext: Error setting up auth listener:", error)
          setLoading(false)
        }
      }

      setupAuthListener()
    } else {
      setLoading(false)
    }

    return () => {
      unsubscribe()
    }
  }, [user?.email, isGuest])

  const signIn = async (email: string, password: string, rememberMe?: boolean) => {
    if (!auth) {
      throw new Error("Firebase auth is not initialized")
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      console.log("[v0] SignIn: Checking user status before completing login...")
      console.log("[v0] SignIn: User UID:", user.uid)

      if (!db) {
        await firebaseSignOut(auth)
        throw new Error("Firestore is not initialized")
      }

      let employeeDataResult = null

      // Try to get employee data by UID first
      try {
        console.log("[v0] SignIn: Looking up employee by UID:", user.uid)
        const userDocRef = doc(db, "employees", user.uid)
        const userDocSnap = await getDoc(userDocRef)
        if (userDocSnap.exists()) {
          employeeDataResult = userDocSnap.data()
          console.log("[v0] SignIn: Employee data found by UID:", employeeDataResult)
        } else {
          console.log("[v0] SignIn: No employee document found for UID:", user.uid)
        }
      } catch (uidError) {
        console.warn("[v0] SignIn: Could not fetch employee by UID:", uidError)
      }

      // Fallback to email lookup if UID lookup failed
      if (!employeeDataResult && email) {
        console.log("[v0] SignIn: Falling back to email lookup:", email)
        const employeesRef = collection(db, "employees")
        const q = query(employeesRef, where("email", "==", email))
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
          employeeDataResult = querySnapshot.docs[0].data()
          console.log("[v0] SignIn: Employee data found by email:", employeeDataResult)
        }
      }

      // Check if employee exists and has active status
      if (!employeeDataResult) {
        console.log("[v0] SignIn: No employee record found, signing out...")
        await firebaseSignOut(auth)
        throw new Error("Account is undefined. Please contact administrator.")
      }

      console.log("[v0] SignIn: Employee status:", employeeDataResult.status)

      if (employeeDataResult.status !== "Active") {
        console.log("[v0] SignIn: User status is not Active, preventing login...")
        console.log("[v0] SignIn: Current status:", employeeDataResult.status)
        await firebaseSignOut(auth)
        throw new Error(`Account is ${employeeDataResult.status}. Please contact administrator.`)
      }

      console.log("[v0] SignIn: User status is Active, login successful!")
    } catch (error) {
      console.error("[v0] SignIn: Error during sign in:", error)
      try {
        await firebaseSignOut(auth)
      } catch (signOutError) {
        console.error("[v0] SignIn: Error signing out after failed login:", signOutError)
      }
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        userAccessPoints,
        userPermissions,
        isAdmin,
        isGuest,
        employeeName,
        userData,
        employeeData, // Added employeeData to provider value
        signIn,
        signInAsGuest,
        signOut,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
