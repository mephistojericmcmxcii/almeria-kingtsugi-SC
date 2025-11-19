"use client"

import { useEffect, useState } from "react"

/**
 * Global navigation loading overlay
 * Shows immediately when navigation starts to prevent blank-screen flashes
 * and hides after the custom “navigation-complete” event fires.
 *
 * NOTE: We no longer attempt to subscribe to `router.events` – that API
 *       is unavailable in the App Router.  All page transitions must
 *       call `triggerNavigationStart()` and `triggerNavigationComplete()`
 *       from `lib/navigation.ts`.
 */
export default function NavigationLoading() {
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const handleStart = () => setIsLoading(true)
    const handleDone = () => {
      // tiny delay for smoother fade-out
      setTimeout(() => setIsLoading(false), 100)
    }

    window.addEventListener("navigation-start", handleStart)
    window.addEventListener("navigation-complete", handleDone)

    return () => {
      window.removeEventListener("navigation-start", handleStart)
      window.removeEventListener("navigation-complete", handleDone)
    }
  }, [])

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-emerald-900 transition-opacity duration-200">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-emerald-400" />
        <p className="text-sm font-medium text-emerald-200">Loading…</p>
      </div>
    </div>
  )
}
