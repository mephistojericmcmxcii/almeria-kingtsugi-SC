"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, AlertCircle, Check } from "lucide-react"
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import { useAuth } from "@/lib/auth-context"

interface ChangePasswordFormProps {
  onClose: () => void
}

// Changed to named export
export function ChangePasswordForm({ onClose }: ChangePasswordFormProps) {
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Reset states
    setError("")
    setSuccess(false)

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match")
      return
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long")
      return
    }

    if (!user || !user.email) {
      setError("User not authenticated")
      return
    }

    try {
      setLoading(true)

      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)

      // Update password
      await updatePassword(user, newPassword)

      // Show success message
      setSuccess(true)

      // Reset form
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")

      // Close form after 2 seconds
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err: any) {
      console.error("Error changing password:", err)

      if (err.code === "auth/wrong-password") {
        setError("Current password is incorrect")
      } else {
        setError(`Failed to change password: ${err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-emerald-800 border border-emerald-700 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-emerald-700">
          <h2 className="text-xl font-bold text-white">Change Password</h2>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-300 hover:text-white hover:bg-emerald-700"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-white p-3 rounded-md flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 border border-green-500 text-white p-3 rounded-md flex items-center gap-2">
              <Check className="h-5 w-5 text-green-400" />
              Password changed successfully!
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-white">
              Current Password
            </Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="bg-emerald-700 border-emerald-600 text-white placeholder:text-[hsl(var(--placeholder-color))]"
              placeholder="Enter your current password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-white">
              New Password
            </Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-emerald-700 border-emerald-600 text-white placeholder:text-[hsl(var(--placeholder-color))]"
              placeholder="Enter new password (min. 6 characters)"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-white">
              Confirm New Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-emerald-700 border-emerald-600 text-white placeholder:text-[hsl(var(--placeholder-color))]"
              placeholder="Confirm new password"
              required
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Updating...
                </span>
              ) : (
                "Change Password"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
