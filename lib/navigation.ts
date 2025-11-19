"use client"

/**
 * Enhanced navigation utilities with loading states
 * Prevents blank screen flash during page transitions
 */

// Custom navigation events
export const triggerNavigationStart = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("navigation-start"))
  }
}

export const triggerNavigationComplete = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("navigation-complete"))
  }
}

/**
 * Enhanced router push with loading state
 */
export const navigateWithLoading = async (router: any, path: string, delay = 150) => {
  if (typeof window !== "undefined" && window.location.pathname === path) {
    // If already on the target path, just complete the navigation immediately
    triggerNavigationComplete()
    return
  }

  triggerNavigationStart()

  // Small delay to show loading state
  await new Promise((resolve) => setTimeout(resolve, delay))

  router.push(path)
}

/**
 * Preload routes for faster navigation
 */
export const preloadRoutes = (router: any, routes: string[]) => {
  routes.forEach((route) => {
    router.prefetch(route)
  })
}

/**
 * Hook to automatically trigger navigation complete on page load
 */
export const useNavigationComplete = () => {
  if (typeof window !== "undefined") {
    // Trigger on next tick to ensure component is mounted
    setTimeout(() => {
      triggerNavigationComplete()
    }, 0)
  }
}
