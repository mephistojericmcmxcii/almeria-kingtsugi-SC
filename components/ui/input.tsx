"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    // Special handling for date inputs
    if (type === "date") {
      return <DatePickerInput className={className} {...props} ref={ref} />
    }

    // Default input rendering for non-date types
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          type === "date" && "cursor-pointer",
          className,
        )}
        {...props}
        ref={ref}
      />
    )
  },
)
Input.displayName = "Input"

// Custom DatePickerInput component
const DatePickerInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, value, onChange, name, id, disabled, required, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="date"
        id={id}
        name={name}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm cursor-pointer",
          className,
        )}
        value={value as string}
        onChange={onChange}
        disabled={disabled}
        required={required}
        {...props}
      />
    )
  },
)
DatePickerInput.displayName = "DatePickerInput"

export { Input }
