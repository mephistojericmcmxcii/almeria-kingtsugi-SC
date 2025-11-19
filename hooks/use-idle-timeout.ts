"use client"

import { useEffect, useRef, useCallback, useState } from "react"

interface UseIdleTimeoutOptions {
  timeout: number // in milliseconds
  onIdle: () => void
  onActive?: () => void
  events?: string[]
  element?: Element | Document
}

/**
 * Optimized idle timeout hook with better performance
 * Reduces unnecessary event listeners and memory usage
 */
export function useIdleTimeout({
  timeout,
  onIdle,
  onActive,
  events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"],
  element = typeof document !== "undefined" ? document : undefined,
}: UseIdleTimeoutOptions) {
  const [isIdle, setIsIdle] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const isIdleRef = useRef(false)

  // Memoized reset function to prevent unnecessary re-renders
  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Only update state if currently idle
    if (isIdleRef.current) {
      setIsIdle(false)
      isIdleRef.current = false
      onActive?.()
    }

    timeoutRef.current = setTimeout(() => {
      if (!isIdleRef.current) {
        setIsIdle(true)
        isIdleRef.current = true
        onIdle()
      }
    }, timeout)
  }, [timeout, onIdle, onActive])

  // Throttled event handler to improve performance
  const handleActivity = useCallback(() => {
    resetTimeout()
  }, [resetTimeout])

  useEffect(() => {
    if (!element) return

    // Start the timeout immediately
    resetTimeout()

    // Add event listeners with passive option for better performance
    const options = { passive: true, capture: false }
    events.forEach((event) => {
      element.addEventListener(event, handleActivity, options)
    })

    return () => {
      // Cleanup
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      events.forEach((event) => {
        element.removeEventListener(event, handleActivity)
      })
    }
  }, [element, events, handleActivity, resetTimeout])

  return {
    isIdle,
    resetTimeout: handleActivity,
  }
}
