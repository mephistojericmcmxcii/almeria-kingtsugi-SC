"use client"

import { useState } from "react"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"

export function ExampleToastUsage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleSuccessToast = () => {
    toast.success("Operation completed successfully", {
      description: "Your changes have been saved",
    })
  }

  const handleErrorToast = () => {
    toast.error("Something went wrong", {
      description: "Please try again later",
    })
  }

  const handlePromiseToast = async () => {
    setIsLoading(true)

    toast.promise(
      new Promise((resolve, reject) => {
        setTimeout(() => {
          Math.random() > 0.5 ? resolve("Data") : reject(new Error("Failed"))
        }, 2000)
      }),
      {
        loading: "Loading...",
        success: (data) => {
          setIsLoading(false)
          return "Operation completed successfully"
        },
        error: (err) => {
          setIsLoading(false)
          return `Error: ${err.message}`
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleSuccessToast}>Show Success Toast</Button>
      <Button onClick={handleErrorToast} variant="destructive">
        Show Error Toast
      </Button>
      <Button onClick={handlePromiseToast} disabled={isLoading}>
        {isLoading ? "Loading..." : "Test Promise Toast"}
      </Button>
    </div>
  )
}
