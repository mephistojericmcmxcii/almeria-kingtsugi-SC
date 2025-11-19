"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  FlaskRoundIcon as Flask,
  Package,
  ShieldAlert,
  UserCircle2,
  User,
  Key,
  LogOut,
  Menu,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { navigateWithLoading } from "@/lib/navigation"
import { useEffect, useState, useRef } from "react"
import { ChangePasswordForm } from "@/components/change-password-form" // Corrected import
import { toast } from "sonner"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getDownloadURL, ref } from "firebase/storage"
import { storage } from "@/lib/firebase"
import { auth } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

// Cache expiration times (in milliseconds)
const CACHE_EXPIRY = {
  USER_DATA: 24 * 60 * 60 * 1000, // 24 hours
  LOGO: 24 * 60 * 60 * 1000, // 24 hours
}

// Dashboard navbar component that can be reused across dashboard pages
export default function DashboardNavbar() {
  const router = useRouter()
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const { user: authUser, signOut, hasPermission, userPermissions, isAdmin, isGuest } = useAuth()
  const [currentPath, setCurrentPath] = useState("")
  const [employeeName, setEmployeeName] = useState("")
  const [logoUrl, setLogoUrl] = useState(() => {
    // Try to get cached logo URL from localStorage first
    const cachedLogo = typeof window !== "undefined" ? localStorage.getItem("cachedLogoUrl") : null
    return cachedLogo || "/logo.png" // Default fallback
  })
  const [userData, setUserData] = useState<any>(null)
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const [showProfileIconFallback, setShowProfileIconFallback] = useState(false) // New state for profile image fallback
  const dropdownRef = useRef(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Check current path for active state
  useEffect(() => {
    setCurrentPath(window.location.pathname)
  }, [])

  // Fetch logo from Firebase Storage or use cached version
  useEffect(() => {
    const fetchLogo = async () => {
      // Check if we already have the logo in localStorage
      const cachedLogo = localStorage.getItem("cachedLogoUrl")
      const cachedTimestamp = localStorage.getItem("cachedLogoTimestamp")
      const now = Date.now()

      // Use cached logo if it exists and is not expired
      if (cachedLogo && cachedTimestamp && now - Number.parseInt(cachedTimestamp) < CACHE_EXPIRY.LOGO) {
        setLogoUrl(cachedLogo)
        return
      }

      try {
        // Get logo from Firebase Storage
        if (storage) {
          const logoRef = ref(storage, "settings/login-logo-1742671431335")
          const url = await getDownloadURL(logoRef)

          // Cache the URL in localStorage for future use
          localStorage.setItem("cachedLogoUrl", url)
          localStorage.setItem("cachedLogoTimestamp", now.toString())
          setLogoUrl(url)
        } else {
          throw new Error("Firebase storage is not initialized.")
        }
      } catch (error) {
        console.error("Error fetching logo:", error)
        setLogoUrl("/placeholder.svg?height=40&width=40")
      }
    }

    fetchLogo()
  }, [])

  // Fetch user data with optimized caching to reduce Firestore reads
  useEffect(() => {
    const fetchUserData = async () => {
      // Skip if guest user
      if (isGuest) {
        setUserData({
          name: "Guest User",
          email: "guest@example.com",
        })
        setEmployeeName("Guest User")
        return
      }

      try {
        // Get current user from Firebase Auth
        const currentUser = auth.currentUser
        if (!currentUser) return

        const now = Date.now()
        const userId = currentUser.uid
        const userEmail = currentUser.email

        // Check if we have cached user data
        const cachedUserDataStr = localStorage.getItem(`userData_${userId}`)
        const cachedTimestamp = localStorage.getItem(`userDataTimestamp_${userId}`)

        // Use cached data if it exists and is not expired
        if (cachedUserDataStr && cachedTimestamp && now - Number.parseInt(cachedTimestamp) < CACHE_EXPIRY.USER_DATA) {
          try {
            const cachedUserData = JSON.parse(cachedUserDataStr)
            setUserData(cachedUserData)
            setEmployeeName(cachedUserData.name || "")
            setProfileImageUrl(cachedUserData.profileImage || null)
            console.log("Using cached user data", cachedUserData)
            return
          } catch (e) {
            console.error("Error parsing cached user data:", e)
            // Continue to fetch fresh data if parsing fails
          }
        }

        // If no valid cache, fetch from Firestore
        console.log("Fetching fresh user data from Firestore")

        // First try to fetch from employees collection
        const userDocRef = doc(db, "employees", userId)
        const userDocSnap = await getDoc(userDocRef)

        let userData: any = null

        if (userDocSnap.exists()) {
          userData = {
            ...userDocSnap.data(),
            email: userEmail || userDocSnap.data().email,
            uid: userId,
          }
        } else {
          // Try to fetch from users collection as fallback
          const userDoc2Ref = doc(db, "users", userId)
          const userDoc2Snap = await getDoc(userDoc2Ref)

          if (userDoc2Snap.exists()) {
            userData = {
              ...userDoc2Snap.data(),
              email: userEmail || userDoc2Snap.data().email,
              uid: userId,
            }
          } else if (userEmail) {
            // If no document found by ID, try to find by email
            const employeesRef = collection(db, "employees")
            const q = query(employeesRef, where("email", "==", userEmail))
            const querySnapshot = await getDocs(q)

            if (!querySnapshot.empty) {
              userData = {
                ...querySnapshot.docs[0].data(),
                email: userEmail,
                uid: userId,
              }
            } else {
              // Last resort: create minimal user data from auth
              userData = {
                email: userEmail,
                uid: userId,
              }
            }
          }
        }

        if (userData) {
          // Cache the user data in localStorage
          localStorage.setItem(`userData_${userId}`, JSON.stringify(userData))
          localStorage.setItem(`userDataTimestamp_${userId}`, now.toString())

          // Update state
          setUserData(userData)
          setEmployeeName(userData.name || "")
          setProfileImageUrl(userData.profileImage || null)
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      }
    }

    fetchUserData()
  }, [isGuest])

  // Effect to control body scroll based on modal visibility
  useEffect(() => {
    if (showPasswordForm || isMobileMenuOpen) {
      // Also consider mobile menu as a full-screen overlay
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }

    // Cleanup function to reset overflow when component unmounts or modal state changes
    return () => {
      document.body.style.overflow = ""
    }
  }, [showPasswordForm, isMobileMenuOpen])

  const handleLogout = async () => {
    try {
      // Clear user data cache on logout
      if (auth.currentUser?.uid) {
        localStorage.removeItem(`userData_${auth.currentUser.uid}`)
        localStorage.removeItem(`userDataTimestamp_${auth.currentUser.uid}`)
      }

      await signOut()
      await navigateWithLoading(router, "/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const handleNavigation = async (path: string, permission?: string) => {
    if (permission && !hasPermission(permission) && !isAdmin) {
      toast.error(`You don't have access to this section. Please contact your administrator.`)
      return
    }
    await navigateWithLoading(router, path)
  }

  const navButtons = (
    <>
      {!isGuest ? (
        // Default layout for authenticated users
        <>
          <Button
            variant="ghost"
            className={`text-white flex items-center gap-2 ${currentPath === "/" ? "bg-emerald-600" : "hover:bg-emerald-700"}`}
            onClick={() => handleNavigation("/")}
          >
            <LayoutDashboard size={18} />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>

          <Button
            variant="ghost"
            className={`text-white flex items-center gap-2 ${!hasPermission("laboratory") ? "opacity-60 cursor-not-allowed" : ""} ${currentPath.startsWith("/laboratory") ? "bg-emerald-600" : "hover:bg-emerald-700"}`}
            onClick={() => handleNavigation("/laboratory", "laboratory")}
          >
            <Flask size={18} />
            <span className="hidden sm:inline">Laboratory Unit</span>
          </Button>

          <Button
            variant="ghost"
            className={`text-white flex items-center gap-2 ${!hasPermission("operation") ? "opacity-60 cursor-not-allowed" : ""} ${currentPath.startsWith("/operation") ? "bg-emerald-600" : "hover:bg-emerald-700"}`}
            onClick={() => handleNavigation("/operation", "operation")}
          >
            <Package size={18} />
            <span className="hidden sm:inline">Operations</span>
          </Button>

          <Button
            variant="ghost"
            className={`text-white flex items-center gap-2 ${currentPath === "/about" ? "bg-emerald-600" : "hover:bg-emerald-700"}`}
            onClick={() => handleNavigation("/about")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-info"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <span className="hidden sm:inline">About</span>
          </Button>
        </>
      ) : (
        // Simplified layout for guest users - only Dashboard and About
        <>
          <Button
            variant="ghost"
            className={`text-white flex items-center gap-2 ${currentPath === "/" ? "bg-emerald-600" : "hover:bg-emerald-700"}`}
            onClick={() => handleNavigation("/")}
          >
            <LayoutDashboard size={18} />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>

          <Button
            variant="ghost"
            className={`text-white flex items-center gap-2 ${currentPath === "/about" ? "bg-emerald-600" : "hover:bg-emerald-700"}`}
            onClick={() => handleNavigation("/about")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-info"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <span className="hidden sm:inline">About</span>
          </Button>
        </>
      )}
    </>
  )

  // Mobile menu content
  const mobileMenuContent = (
    <div className="flex flex-col space-y-4 p-4">
      {isAdmin && (
        <div className="flex items-center text-yellow-300 text-sm mb-2">
          <ShieldAlert size={16} className="mr-2" />
          Admin Mode
        </div>
      )}
      {isGuest && (
        <div className="flex items-center text-yellow-300 text-sm mb-2">
          <UserCircle2 size={16} className="mr-2" />
          Guest Mode
        </div>
      )}
      <div className="flex items-center space-x-3 mb-6">
        <div className="rounded-full bg-emerald-700 p-1 w-12 h-12 overflow-hidden flex-shrink-0">
          {profileImageUrl && !isGuest && !showProfileIconFallback ? (
            <img
              src={profileImageUrl || "/placeholder.svg"}
              alt={`${employeeName || userData?.name || "User"}'s profile`}
              className="h-full w-full object-cover rounded-full"
              onError={() => setShowProfileIconFallback(true)}
            />
          ) : (
            <User className="h-10 w-10 text-white" />
          )}
        </div>
        <div className="flex flex-col">
          <p className="text-sm font-medium">
            {isGuest
              ? "Guest User"
              : employeeName || userData?.name || (userData?.email ? userData.email.split("@")[0] : "User")}
          </p>
          <p className="text-xs text-gray-300">{isGuest ? "Guest Access" : userData?.email || "No email"}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        className={`w-full justify-start text-white ${currentPath === "/" ? "bg-emerald-600" : "hover:bg-emerald-700"}`}
        onClick={() => {
          handleNavigation("/")
          setIsMobileMenuOpen(false)
        }}
      >
        <LayoutDashboard className="mr-2 h-4 w-4" />
        Dashboard
      </Button>
      {!isGuest && (
        <>
          <Button
            variant="ghost"
            className={`w-full justify-start text-white ${!hasPermission("laboratory") ? "opacity-60 cursor-not-allowed" : ""} ${currentPath.startsWith("/laboratory") ? "bg-emerald-600" : "hover:bg-emerald-700"}`}
            onClick={() => {
              handleNavigation("/laboratory", "laboratory")
              setIsMobileMenuOpen(false)
            }}
          >
            <Flask className="mr-2 h-4 w-4" />
            Laboratory Unit
          </Button>

          <Button
            variant="ghost"
            className={`w-full justify-start text-white ${!hasPermission("logistics") ? "opacity-60 cursor-not-allowed" : ""} ${currentPath.startsWith("/operation") ? "bg-emerald-600" : "hover:bg-emerald-700"}`}
            onClick={() => {
              handleNavigation("/operation", "operation")
              setIsMobileMenuOpen(false)
            }}
          >
            <Package className="mr-2 h-4 w-4" />
            Operations
          </Button>
        </>
      )}
      <Button
        variant="ghost"
        className={`w-full justify-start text-white ${currentPath === "/about" ? "bg-emerald-600" : "hover:bg-emerald-700"}`}
        onClick={() => {
          handleNavigation("/about")
          setIsMobileMenuOpen(false)
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-2 h-4 w-4"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        About
      </Button>
      <div className="border-t border-emerald-700 my-4"></div>
      {!isGuest ? (
        <>
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:bg-emerald-700"
            onClick={() => {
              handleNavigation("/myaccount")
              setIsMobileMenuOpen(false)
            }}
          >
            <User className="mr-2 h-4 w-4" />
            My Account
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:bg-emerald-700"
            onClick={() => {
              setShowPasswordForm(true)
              setIsMobileMenuOpen(false)
            }}
          >
            <Key className="mr-2 h-4 w-4" />
            Change Password
          </Button>
        </>
      ) : (
        <Button
          variant="ghost"
          className="w-full justify-start text-white hover:bg-emerald-700"
          onClick={() => {
            handleNavigation("/login")
            setIsMobileMenuOpen(false)
          }}
        >
          <Key size={16} className="mr-2 h-4 w-4" />
          Sign In
        </Button>
      )}
      <Button
        variant="destructive"
        className="w-full justify-start"
        onClick={() => {
          handleLogout()
          setIsMobileMenuOpen(false)
        }}
      >
        <LogOut className="mr-2 h-4 w-4" />
        {isGuest ? "Exit Guest Mode" : "Logout"}
      </Button>
    </div>
  )

  return (
    <header className="fixed top-0 z-50 w-full">
      <div className="w-full bg-emerald-800 text-white">
        <div className="flex items-center justify-between w-full px-2 sm:px-4 h-16 bg-[rgba(91,140,90,1)] flex-shrink-0">
          {/* Logo and title at the left edge */}
          <div className="flex items-center">
            <Image
              src={logoUrl || "/placeholder.svg?height=40&width=40"}
              alt="Department of Agriculture Logo"
              width={40}
              height={40}
              className="mr-2 sm:mr-3 object-contain"
              priority
              onError={() => {
                console.error("Failed to load logo image, using placeholder")
                setLogoUrl("/placeholder.svg?height=40&width=40")
              }}
            />
            <h1 className="text-base sm:text-xl font-bold">
              <span className="hidden md:inline">Laboratory Management System</span>
              <span className="md:hidden">LMS</span>
            </h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {navButtons}
            <DropdownMenu modal={false} onOpenChange={(open) => console.log("Dropdown open state:", open)}>
              <DropdownMenuTrigger>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full bg-emerald-600 hover:bg-emerald-500 p-0 overflow-hidden"
                >
                  {profileImageUrl && !isGuest && !showProfileIconFallback ? (
                    <div className="absolute inset-0 w-full h-full">
                      <img
                        src={profileImageUrl || "/placeholder.svg"}
                        alt="Profile"
                        className="h-full w-full object-cover"
                        onError={() => {
                          console.error("Failed to load profile image, showing fallback icon.")
                          setShowProfileIconFallback(true)
                        }}
                      />
                    </div>
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-emerald-800 text-white border-emerald-700">
                {!isGuest && (
                  <DropdownMenuItem
                    className="cursor-pointer hover:bg-emerald-700 flex items-center gap-3 p-3"
                    onClick={() => handleNavigation("/myaccount")}
                  >
                    <div className="rounded-full bg-emerald-700 p-1 w-12 h-12 overflow-hidden flex-shrink-0">
                      {profileImageUrl && !isGuest && !showProfileIconFallback ? (
                        <img
                          src={profileImageUrl || "/placeholder.svg"}
                          alt={`${employeeName || userData?.name || "User"}'s profile`}
                          className="h-full w-full object-cover rounded-full"
                          onError={() => setShowProfileIconFallback(true)}
                        />
                      ) : (
                        <User className="h-10 w-10 text-white" />
                      )}
                    </div>
                    <div className="flex flex-col space-y-1 overflow-hidden">
                      <p className="text-sm font-medium truncate">
                        {employeeName || userData?.name || (userData?.email ? userData.email.split("@")[0] : "User")}
                      </p>
                      <p className="text-xs text-gray-300 truncate">{userData?.email || "No email"}</p>
                    </div>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-emerald-700" />

                {!isGuest ? (
                  <DropdownMenuItem
                    className="cursor-pointer hover:bg-emerald-700 flex items-center gap-2"
                    onClick={() => setShowPasswordForm(true)}
                  >
                    <Key size={16} />
                    <span>Change Password</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    className="cursor-pointer hover:bg-emerald-700 flex items-center gap-2"
                    onClick={() => handleNavigation("/login")}
                  >
                    <Key size={16} />
                    <span>Sign In</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator className="bg-emerald-700" />
                <DropdownMenuItem
                  className="cursor-pointer hover:bg-emerald-700 text-red-300 flex items-center gap-2"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  <span>{isGuest ? "Exit Guest Mode" : "Logout"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center gap-2">
            {/* Mobile menu button */}
            <Sheet
              open={isMobileMenuOpen}
              onOpenChange={(open) => {
                console.log("Mobile Sheet open state:", open)
                setIsMobileMenuOpen(open)
              }}
            >
              <SheetTrigger>
                <Button variant="ghost" size="icon" className="text-white">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] max-w-sm bg-emerald-800 text-white">
                {mobileMenuContent}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
      {showPasswordForm && <ChangePasswordForm onClose={() => setShowPasswordForm(false)} />}
    </header>
  )
}
