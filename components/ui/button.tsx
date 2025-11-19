"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Utility function for sorting sample codes naturally (can be used by forms)
export const sortSampleCodes = (codes: string[]) => {
  return codes.sort((a, b) => {
    const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, "")
    const aNorm = normalize(a)
    const bNorm = normalize(b)

    const aParts = aNorm.match(/(\d+|\D+)/g) || []
    const bParts = bNorm.match(/(\d+|\D+)/g) || []

    const maxLength = Math.max(aParts.length, bParts.length)

    for (let i = 0; i < maxLength; i++) {
      const aPart = aParts[i] || ""
      const bPart = bParts[i] || ""

      const aIsNum = /^\d+$/.test(aPart)
      const bIsNum = /^\d+$/.test(bPart)

      if (aIsNum && bIsNum) {
        const aNum = Number.parseInt(aPart, 10)
        const bNum = Number.parseInt(bPart, 10)
        if (aNum !== bNum) {
          return aNum - bNum
        }
        if (aPart.length !== bPart.length) {
          return bPart.length - aPart.length
        }
      } else if (aIsNum && !bIsNum) {
        return -1
      } else if (!aIsNum && bIsNum) {
        return 1
      } else {
        if (aPart !== bPart) {
          return aPart.localeCompare(bPart)
        }
      }
    }

    return 0
  })
}

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * If true, the button will render its child as a slot, merging its props onto the child.
   * This is useful when you want to compose the Button with another component that already renders a button or an interactive element,
   * to avoid invalid HTML nesting like <button><button>...</button></button>.
   * @example
   * <DropdownMenuTrigger asChild>
   *   <Button>Open Menu</Button>
   * </DropdownMenuTrigger>
   */
  asChild?: boolean
}

const Button = React.forwardRef<React.ElementRef<typeof Slot> | HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }), "pointer-events-auto")} ref={ref} {...props} />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
