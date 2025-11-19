"use client"

import { useState } from "react"
import { DatePicker } from "./date-picker"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function Calendars() {
  const [date, setDate] = useState<Date>()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar</CardTitle>
        <CardDescription>Select a date for scheduling or filtering.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <DatePicker date={date} setDate={setDate} />
          {date && <p className="text-sm text-muted-foreground">You selected: {date.toLocaleDateString()}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
