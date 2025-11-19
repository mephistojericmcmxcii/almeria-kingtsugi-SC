"use client"

import type React from "react"
import { forwardRef, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface MemoizedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: React.ElementType
  containerClassName?: string
}

const MemoizedInput = forwardRef<HTMLInputElement, MemoizedInputProps>(
  ({ label, icon: Icon, className, containerClassName, id, ...props }, ref) => {
    const inputElement = useMemo(() => {
      return (
        <div className={cn("relative", containerClassName)}>
          {label && id && (
            <Label htmlFor={id} className="text-[#2F3E2E]">
              {label}
            </Label>
          )}
          <Input id={id} ref={ref} className={cn("pr-10", className)} {...props} />
          {Icon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Icon className="h-5 w-5 text-[#8B8378]" aria-hidden="true" />
            </div>
          )}
        </div>
      )
    }, [label, Icon, className, containerClassName, id, ref])

    return inputElement
  },
)

MemoizedInput.displayName = "MemoizedInput"

export default MemoizedInput
