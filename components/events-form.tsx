"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X, Plus, Trash2, Edit, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface Event {
  id: string
  title: string
  date: any
  location: string
  type: string
  organizer: {
    name: string
    avatar: string
  }
  description?: string
  preparation?: string
  targetAudience?: string
  priority?: string
  createdAt: any
}

interface EventsFormProps {
  onClose: () => void
}

export default function EventsForm({ onClose }: EventsFormProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [eventDate, setEventDate] = useState("")
  const [eventTime, setEventTime] = useState("")
  const [location, setLocation] = useState("")
  const [type, setType] = useState("meeting")
  const [organizerName, setOrganizerName] = useState("")
  const [organizerAvatar, setOrganizerAvatar] = useState("")
  // New state variables for additional fields
  const [description, setDescription] = useState("")
  const [preparation, setPreparation] = useState("")
  const [targetAudience, setTargetAudience] = useState("")
  const [priority, setPriority] = useState("medium")

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const eventsRef = collection(db!, "events")
      const snapshot = await getDocs(eventsRef)

      const fetchedEvents: Event[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        fetchedEvents.push({
          id: doc.id,
          ...data,
          date: data.date?.toDate?.() || new Date(data.date),
        } as Event)
      })

      // Sort by date (upcoming first)
      fetchedEvents.sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date(a.date)
        const dateB = b.date instanceof Date ? b.date : new Date(b.date)
        return dateA.getTime() - dateB.getTime()
      })

      setEvents(fetchedEvents)
    } catch (error) {
      console.error("Error fetching events:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Combine date and time
      const dateTimeStr = `${eventDate}T${eventTime || "00:00"}`
      const dateObj = new Date(dateTimeStr)

      const eventsRef = collection(db!, "events")

      const eventData = {
        title,
        date: dateObj,
        location,
        type,
        organizer: {
          name: organizerName,
          avatar: organizerAvatar || "/placeholder.svg?height=40&width=40",
        },
        // Add new fields to event data
        description,
        preparation,
        targetAudience,
        priority,
      }

      if (editingEvent) {
        // Update existing event
        await updateDoc(doc(db!, "events", editingEvent.id), {
          ...eventData,
          updatedAt: serverTimestamp(),
        })
      } else {
        // Add new event
        await addDoc(eventsRef, {
          ...eventData,
          createdAt: serverTimestamp(),
        })
      }

      // Reset form and refresh events
      resetForm()
      fetchEvents()
    } catch (error) {
      console.error("Error saving event:", error)
    }
  }

  const handleDeleteEvent = async (id: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      try {
        await deleteDoc(doc(db!, "events", id))
        fetchEvents()
      } catch (error) {
        console.error("Error deleting event:", error)
      }
    }
  }

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event)

    // Format date and time for input fields
    const date = event.date instanceof Date ? event.date : new Date(event.date)
    const formattedDate = date.toISOString().split("T")[0]
    const formattedTime = date.toTimeString().slice(0, 5)

    setTitle(event.title)
    setEventDate(formattedDate)
    setEventTime(formattedTime)
    setLocation(event.location)
    setType(event.type)
    setOrganizerName(event.organizer.name)
    setOrganizerAvatar(event.organizer.avatar)
    // Set new fields if they exist in the event data
    setDescription(event.description || "")
    setPreparation(event.preparation || "")
    setTargetAudience(event.targetAudience || "")
    setPriority(event.priority || "medium")
    setShowForm(true)
  }

  const resetForm = () => {
    setTitle("")
    setEventDate("")
    setEventTime("")
    setLocation("")
    setType("meeting")
    setOrganizerName("")
    setOrganizerAvatar("")
    // Reset new fields
    setDescription("")
    setPreparation("")
    setTargetAudience("")
    setPriority("medium")
    setEditingEvent(null)
    setShowForm(false)
  }

  // Function to format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Function to get event type label
  const getEventTypeLabel = (eventType: string) => {
    switch (eventType) {
      case "training":
        return "Training"
      case "maintenance":
        return "Maintenance"
      case "meeting":
        return "Meeting"
      default:
        return eventType.charAt(0).toUpperCase() + eventType.slice(1)
    }
  }

  // Function to get event type color
  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case "training":
        return "bg-blue-500"
      case "maintenance":
        return "bg-amber-500"
      case "meeting":
        return "bg-purple-500"
      default:
        return "bg-emerald-500"
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center overflow-y-auto">
      <div className="bg-emerald-800 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-emerald-800 z-10 flex items-center justify-between p-4 border-b border-emerald-700">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Event Management
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-300 hover:text-white">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 space-y-6">
          {/* Add/Edit Button */}
          <div className="flex justify-end"></div>

          {/* Add/Edit Form */}
          {showForm && (
            <Card className="bg-emerald-800 border-emerald-700 text-white">
              <CardHeader>
                <CardTitle>{editingEvent ? "Edit Event" : "Add New Event"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddEvent} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Event Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="bg-emerald-700 border-emerald-600"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="eventDate">Date</Label>
                      <Input
                        id="eventDate"
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="bg-emerald-700 border-emerald-600"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="eventTime">Time</Label>
                      <Input
                        id="eventTime"
                        type="time"
                        value={eventTime}
                        onChange={(e) => setEventTime(e.target.value)}
                        className="bg-emerald-700 border-emerald-600"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="bg-emerald-700 border-emerald-600"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Event Type</Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger className="bg-emerald-700 border-emerald-600">
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* New field: Description/About */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description/About</Label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full min-h-[100px] rounded-md bg-emerald-700 border-emerald-600 text-white p-2"
                      placeholder="Provide a detailed description of the event..."
                    />
                  </div>

                  {/* New field: Preparation */}
                  <div className="space-y-2">
                    <Label htmlFor="preparation">Preparation/Requirements</Label>
                    <textarea
                      id="preparation"
                      value={preparation}
                      onChange={(e) => setPreparation(e.target.value)}
                      className="w-full min-h-[80px] rounded-md bg-emerald-700 border-emerald-600 text-white p-2"
                      placeholder="List any preparations or requirements for the team..."
                    />
                  </div>

                  {/* New field: Target Audience */}
                  <div className="space-y-2">
                    <Label htmlFor="targetAudience">Target Audience</Label>
                    <Input
                      id="targetAudience"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      className="bg-emerald-700 border-emerald-600"
                      placeholder="Who should attend this event?"
                    />
                  </div>

                  {/* New field: Priority */}
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority Level</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className="bg-emerald-700 border-emerald-600">
                        <SelectValue placeholder="Select priority level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="organizerName">Organizer Name</Label>
                      <Input
                        id="organizerName"
                        value={organizerName}
                        onChange={(e) => setOrganizerName(e.target.value)}
                        className="bg-emerald-700 border-emerald-600"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="organizerAvatar">Organizer Avatar URL (optional)</Label>
                      <Input
                        id="organizerAvatar"
                        value={organizerAvatar}
                        onChange={(e) => setOrganizerAvatar(e.target.value)}
                        placeholder="https://example.com/avatar.jpg"
                        className="bg-emerald-700 border-emerald-600"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="default"
                      onClick={resetForm}
                      className="bg-emerald-600 hover:bg-emerald-500"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500">
                      {editingEvent ? "Update Event" : "Add Event"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Events List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Upcoming Events</h2>
              <Button onClick={() => setShowForm(!showForm)} className="bg-emerald-600 hover:bg-emerald-500">
                <Plus className="mr-2 h-4 w-4" />
                Add Event
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
              </div>
            ) : events.length > 0 ? (
              <div className="space-y-4">
                {events.map((event) => {
                  const eventDate = event.date instanceof Date ? event.date : new Date(event.date)
                  const isPast = eventDate < new Date()

                  return (
                    <Card
                      key={event.id}
                      className={`bg-emerald-800 border-emerald-700 text-white ${isPast ? "opacity-60" : ""}`}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className={`w-3 h-3 mt-2 rounded-full ${getEventTypeColor(event.type)}`}></div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <h3 className="font-bold text-white">{event.title}</h3>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditEvent(event)}
                                  className="h-8 px-2 text-gray-300 hover:text-white hover:bg-emerald-700"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteEvent(event.id)}
                                  className="h-8 px-2 text-gray-300 hover:text-white hover:bg-emerald-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-300 flex items-center gap-1 mt-1">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>{formatDate(eventDate)}</span>
                            </p>
                            <p className="text-sm text-gray-300 mt-1">Location: {event.location}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span
                                className={`px-2 py-0.5 text-xs rounded-full ${getEventTypeColor(event.type)} bg-opacity-20 text-white`}
                              >
                                {getEventTypeLabel(event.type)}
                              </span>
                              <span className="text-xs text-gray-400">Organized by: {event.organizer.name}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card className="bg-emerald-800 border-emerald-700 text-white">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Calendar className="h-12 w-12 text-emerald-500/50 mb-3" />
                  <p className="text-gray-300">No events found. Add your first event!</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
