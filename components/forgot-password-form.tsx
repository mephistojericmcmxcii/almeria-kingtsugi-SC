"use client"

import type React from "react"

import { useState } from "react"
import { auth } from "@/lib/firebase" // Using the existing firebase import
import { sendPasswordResetEmail } from "firebase/auth"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner" // Import toast for notifications

interface ForgotPasswordFormProps {
  onClose?: () => void // Optional prop to close the modal
}

export function ForgotPasswordForm({ onClose }: ForgotPasswordFormProps) {
  // Changed to named export
  const [email, setEmail] = useState("")
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)
    try {
      if (!auth) {
        throw new Error("Firebase Auth is not initialized.")
      }
      await sendPasswordResetEmail(auth, email)
      setSuccess("Password reset email sent! Check your inbox.")
      toast.success("Password Reset Email Sent", {
        description: "Please check your inbox for instructions to reset your password.",
      })
      // Optionally close the modal after a short delay
      if (onClose) {
        setTimeout(() => onClose(), 3000)
      }
    } catch (err: any) {
      console.error("Forgot password error:", err)
      let errorMessage = "Failed to send password reset email."
      if (err.code === "auth/user-not-found") {
        errorMessage = "No user found with that email address."
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address."
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many requests. Please try again later."
      }
      setError(errorMessage)
      toast.error("Password Reset Failed", {
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {success && <p className="text-green-600 text-center">{success}</p>}
      {error && <p className="text-red-600 text-center">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email address</Label>
          <Input
            type="email"
            id="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@example.com"
            disabled={isLoading}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Sending..." : "Send Reset Email"}
        </Button>
      </form>
    </div>
  )
}
