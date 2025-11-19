"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { AlertCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

// 4 minutes 30 seconds in milliseconds (30 seconds before actual logout)
const WARNING_TIMEOUT = 4.5 * 60 * 1000

export function IdleTimeoutWarning() {
  const { user, signOut } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)
  const [lastActivity, setLastActivity] = useState(Date.now())

  const updateActivity = useCallback(() => {
    setLastActivity(Date.now())
    setShowWarning(false)
  }, [])

  // Track user activity
  useEffect(() => {
    if (!user) return

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"]

    events.forEach((event) => {
      window.addEventListener(event, updateActivity)
    })

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity)
      })
    }
  }, [user, updateActivity]) // Added updateActivity to dependencies

  // Reset warning state when user logs in (user object changes)
  useEffect(() => {
    if (user) {
      setLastActivity(Date.now())
      setShowWarning(false)
      setTimeLeft(30)
    }
  }, [user])

  // Check for inactivity and show warning
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      const now = Date.now()
      const timeSinceLastActivity = now - lastActivity

      if (timeSinceLastActivity >= WARNING_TIMEOUT) {
        setShowWarning(true)

        // Calculate seconds left before logout
        const secondsLeft = Math.max(0, Math.floor((5 * 60 * 1000 - timeSinceLastActivity) / 1000))
        setTimeLeft(secondsLeft)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [lastActivity, user])

  // Countdown timer for warning
  useEffect(() => {
    if (!showWarning) return

    const countdown = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdown)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(countdown)
  }, [showWarning])

  if (!showWarning || !user) return null

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="bg-amber-50 border-b">
          <CardTitle className="flex items-center text-amber-700">
            <AlertCircle className="mr-2 h-5 w-5" />
            Session Timeout Warning
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 pb-4">
          <div className="flex flex-col items-center space-y-4">
            <Clock className="h-12 w-12 text-amber-500" />
            <p className="text-center">
              Your session will expire in <span className="font-bold">{timeLeft}</span> seconds due to inactivity.
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Click "Continue Session" to stay logged in or "Logout" to end your session now.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setShowWarning(false)}>
            Continue Session
          </Button>
          <Button variant="destructive" onClick={signOut}>
            Logout
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
