"use client"

import { format } from "date-fns"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SimpleDatePickerProps {
  id: string
  name: string
  label: string
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  required?: boolean
  disabled?: boolean
  className?: string
  labelClassName?: string
}

export function SimpleDatePicker({
  id,
  name,
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  className = "bg-emerald-700 border-emerald-600 text-white",
  labelClassName = "text-white",
}: SimpleDatePickerProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={labelClassName}>
        {label} {required && "*"}
      </Label>
      <Input
        id={id}
        name={name}
        type="date"
        value={value ? format(value, "yyyy-MM-dd") : ""}
        onChange={(e) => {
          if (e.target.value) {
            onChange(new Date(e.target.value))
          } else {
            onChange(undefined)
          }
        }}
        className={className}
        required={required}
        disabled={disabled}
      />
    </div>
  )
}
