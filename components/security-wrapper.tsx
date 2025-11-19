"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

interface SecurityWrapperProps {
  requiredPermission: string
  fallbackPath: string
  children: React.ReactNode
}

export default function SecurityWrapper({ requiredPermission, fallbackPath, children }: SecurityWrapperProps) {
  const { hasPermission, loading, isGuest } = useAuth()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  // Set isClient to true on mount
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    // If guest user, redirect to home
    if (isClient && !loading && isGuest) {
      router.push("/")
      return
    }

    // Only run this effect on the client side
    if (isClient && !loading && !hasPermission(requiredPermission)) {
      console.log(`Access denied: missing permission "${requiredPermission}"`)
      router.push(fallbackPath)
    }
  }, [hasPermission, loading, requiredPermission, fallbackPath, router, isClient, isGuest])

  // Show nothing while checking permissions or if not on client
  if (!isClient || loading || !hasPermission(requiredPermission) || isGuest) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-700 to-emerald-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    )
  }

  return <>{children}</>
}
