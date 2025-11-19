"use client"

// This is just an example file showing migration patterns

// BEFORE (react-hot-toast):
import toast from "react-hot-toast"
toast.success("Success message")
toast.error("Error message")
toast("Default message")

const promise = new Promise((resolve) => {
  setTimeout(() => {
    resolve("Resolved!")
  }, 1000)
})

toast.promise(promise, {
  loading: "Loading...",
  success: "Success!",
  error: "Error!",
})

// AFTER (Sonner):
import { toast as sonnerToast } from "@/lib/toast"
sonnerToast.success("Success message")
sonnerToast.error("Error message")
sonnerToast.info("Default message")
sonnerToast.promise(promise, {
  loading: "Loading...",
  success: "Success!",
  error: "Error!",
})

// BEFORE (react-toastify):
import { toast as reactToastifyToast } from "react-toastify"
reactToastifyToast.success("Success message")
reactToastifyToast.error("Error message")
reactToastifyToast.info("Info message")
reactToastifyToast.warning("Warning message")

// AFTER (Sonner):
import { toast as sonnerToast2 } from "@/lib/toast"
sonnerToast2.success("Success message")
sonnerToast2.error("Error message")
sonnerToast2.info("Info message")
sonnerToast2.warning("Warning message")

// BEFORE (shadcn/ui toast):
import { useToast } from "@/hooks/use-toast"
const { toast: shadcnToast } = useToast()
shadcnToast({
  title: "Success",
  description: "Your action was successful",
  variant: "default",
})

// AFTER (Sonner):
import { toast as sonnerToast3 } from "@/lib/toast"
sonnerToast3.success("Your action was successful", {
  description: "Success",
})
