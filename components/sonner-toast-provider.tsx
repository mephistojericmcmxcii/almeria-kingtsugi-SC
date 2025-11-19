"use client"

import { Toaster } from "sonner"
import { useTheme } from "next-themes"

export function SonnerToastProvider() {
  const { theme } = useTheme()

  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: theme === "dark" ? "#1f2937" : "#ffffff",
          color: theme === "dark" ? "#ffffff" : "#000000",
          border: "1px solid",
          borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
        },
      }}
      closeButton
      richColors
    />
  )
}
