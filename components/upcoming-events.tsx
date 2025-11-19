"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { CalendarDays, MapPin, Users, Info, Clock, X } from "lucide-react"
import { getUpcomingEvents, type EventDocument } from "@/lib/firestore"
import { Button } from "@/components/ui/button"

export default function UpcomingEvents() {
  const [events, setEvents] = useState<EventDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventDocument | null>(null)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        const fetchedEvents = await getUpcomingEvents()
        setEvents(fetchedEvents)
      } catch (err) {
        console.error("Failed to fetch events:", err)
        setError("Failed to load upcoming events.")
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [])

  const openModal = (event: EventDocument) => {
    setSelectedEvent(event)
  }

  const closeModal = () => {
    setSelectedEvent(null)
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-500">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming events.</p>
      ) : (
        events.map((event) => (
          <div
            key={event.id}
            className="flex items-center gap-3 cursor-pointer hover:bg-[#DDD7B1]/30 p-2 rounded-md transition-colors"
            onClick={() => openModal(event)}
          >
            <div className="flex-shrink-0 text-[#5B8C5A]">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-[#2F3E2E] truncate">{event.title}</h4>
              <p className="text-xs text-muted-foreground truncate">
                {format(event.date, "MMM dd, yyyy")} at {event.location}
              </p>
            </div>
          </div>
        ))
      )}

      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div
            className="bg-emerald-800 rounded-lg shadow-xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-gradient-to-r from-emerald-700 to-emerald-900 p-4 flex justify-between items-center border-b border-emerald-700">
              <h3 className="text-lg font-bold text-white flex items-center">
                <CalendarDays className="h-5 w-5 text-amber-300 mr-2" />
                Event Details
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeModal}
                className="h-8 w-8 rounded-full text-gray-300 hover:text-white hover:bg-emerald-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-5 space-y-4 text-gray-200">
              <div>
                <h4 className="text-amber-300 font-medium mb-1">Title</h4>
                <p>{selectedEvent.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-amber-300" />
                <span>{format(selectedEvent.date, "EEEE, MMMM dd, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-300" />
                <span>{format(selectedEvent.date, "hh:mm a")}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-300" />
                <span>{selectedEvent.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-amber-300" />
                <span>Type: {selectedEvent.type}</span>
              </div>

              {selectedEvent.description && (
                <div>
                  <h4 className="text-amber-300 font-medium mb-1">Description</h4>
                  <p>{selectedEvent.description}</p>
                </div>
              )}
              {selectedEvent.preparation && (
                <div>
                  <h4 className="text-amber-300 font-medium mb-1">Preparation</h4>
                  <p>{selectedEvent.preparation}</p>
                </div>
              )}
              {selectedEvent.targetAudience && (
                <div>
                  <h4 className="text-amber-300 font-medium mb-1">Target Audience</h4>
                  <p>{selectedEvent.targetAudience}</p>
                </div>
              )}
              {selectedEvent.organizer && selectedEvent.organizer.name && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-300" />
                  <span>Organizer: {selectedEvent.organizer.name}</span>
                </div>
              )}
              {selectedEvent.priority && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-amber-300">Priority:</span>
                  <span>{selectedEvent.priority}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
