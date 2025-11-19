"use client"

import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { forwardRef, useState } from "react"

export interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

const DatePicker = forwardRef<HTMLDivElement, DatePickerProps>(
  ({ date, onDateChange, className, placeholder = "Select date", disabled = false }, ref) => {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(date)

    const handleDateSelect = (date: Date | undefined) => {
      setSelectedDate(date)
      if (onDateChange) {
        onDateChange(date)
      }
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedDate && "text-muted-foreground",
              className,
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, "PPP") : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={selectedDate} onSelect={handleDateSelect} initialFocus />
        </PopoverContent>
      </Popover>
    )
  },
)

DatePicker.displayName = "DatePicker"

export { DatePicker }
