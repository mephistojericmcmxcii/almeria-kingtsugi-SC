import { toast as sonnerToast, type ToastT, type ToastOptions } from "sonner"

type ToastType = "success" | "error" | "info" | "warning"

interface ToastProps {
  message: string
  type?: ToastType
  description?: string
  duration?: number
}

export function toast({ message, type = "info", description, duration = 5000 }: ToastProps): ToastT {
  const options: ToastOptions = {
    description,
    duration,
  }

  switch (type) {
    case "success":
      return sonnerToast.success(message, options)
    case "error":
      return sonnerToast.error(message, options)
    case "warning":
      return sonnerToast.warning(message, options)
    case "info":
    default:
      return sonnerToast.info(message, options)
  }
}

// Convenience methods
toast.success = (message: string, options?: Omit<ToastProps, "message" | "type">) =>
  toast({ message, type: "success", ...options })

toast.error = (message: string, options?: Omit<ToastProps, "message" | "type">) =>
  toast({ message, type: "error", ...options })

toast.info = (message: string, options?: Omit<ToastProps, "message" | "type">) =>
  toast({ message, type: "info", ...options })

toast.warning = (message: string, options?: Omit<ToastProps, "message" | "type">) =>
  toast({ message, type: "warning", ...options })

// For promise handling
toast.promise = sonnerToast.promise

// For dismissing toasts
toast.dismiss = sonnerToast.dismiss

// For custom toasts
toast.custom = sonnerToast.custom
