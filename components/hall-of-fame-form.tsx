"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  X,
  Plus,
  Trash2,
  Edit,
  Trophy,
  Award,
  Star,
  Heart,
  Cog,
  Users,
  Sprout,
  Wheat,
  GrapeIcon as Grain,
  Leaf,
  BadgeCheck,
  GraduationCap,
  Cpu,
  Mountain,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Separator } from "@/components/ui/separator"

interface HallOfFameEntry {
  id: string
  name: string
  achievement: string
  date: string
  avatar: string
  badge: string
  about?: string
  createdAt: any
}

interface HallOfFameFormProps {
  onClose: () => void
}

export default function HallOfFameForm({ onClose }: HallOfFameFormProps) {
  const [currentEntry, setCurrentEntry] = useState<HallOfFameEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [achievement, setAchievement] = useState("")
  const [date, setDate] = useState("")
  const [avatar, setAvatar] = useState("")
  const [badge, setBadge] = useState("research")
  const [about, setAbout] = useState("")

  useEffect(() => {
    fetchCurrentEntry()
  }, [])

  const fetchCurrentEntry = async () => {
    try {
      setLoading(true)
      const hallOfFameRef = collection(db!, "hallOfFame")
      // Get only the most recent entry
      const q = query(hallOfFameRef, orderBy("createdAt", "desc"), limit(1))
      const snapshot = await getDocs(q)

      if (!snapshot.empty) {
        const doc = snapshot.docs[0]
        setCurrentEntry({
          id: doc.id,
          ...(doc.data() as Omit<HallOfFameEntry, "id">),
        })
      } else {
        setCurrentEntry(null)
      }
    } catch (error) {
      console.error("Error fetching hall of fame entry:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const hallOfFameRef = collection(db!, "hallOfFame")

      if (isEditing && currentEntry) {
        // Update existing entry
        await updateDoc(doc(db!, "hallOfFame", currentEntry.id), {
          name,
          achievement,
          date,
          avatar,
          badge,
          about,
          updatedAt: serverTimestamp(),
        })
      } else {
        // Add new entry
        await addDoc(hallOfFameRef, {
          name,
          achievement,
          date,
          avatar,
          badge,
          about,
          createdAt: serverTimestamp(),
        })
      }

      // Reset form and refresh entry
      resetForm()
      fetchCurrentEntry()
    } catch (error) {
      console.error("Error saving hall of fame entry:", error)
    }
  }

  const handleDeleteEntry = async () => {
    if (!currentEntry) return

    if (confirm("Are you sure you want to remove this person from the Hall of Fame?")) {
      try {
        await deleteDoc(doc(db!, "hallOfFame", currentEntry.id))
        setCurrentEntry(null)
      } catch (error) {
        console.error("Error deleting entry:", error)
      }
    }
  }

  const handleEditEntry = () => {
    if (!currentEntry) return

    setIsEditing(true)
    setName(currentEntry.name)
    setAchievement(currentEntry.achievement)
    setDate(currentEntry.date)
    setAvatar(currentEntry.avatar)
    setBadge(currentEntry.badge)
    setAbout(currentEntry.about || "")
    setShowForm(true)
  }

  const resetForm = () => {
    setName("")
    setAchievement("")
    setDate("")
    setAvatar("")
    setBadge("research")
    setAbout("")
    setIsEditing(false)
    setShowForm(false)
  }

  // Function to get badge icon and color
  const getBadgeDetails = (badgeType: string) => {
    switch (badgeType) {
      case "research":
        return { icon: <Star className="h-5 w-5" />, color: "bg-blue-500", label: "Research Excellence" }
      case "management":
        return { icon: <Award className="h-5 w-5" />, color: "bg-purple-500", label: "Management Excellence" }
      case "innovation":
        return { icon: <Star className="h-5 w-5" />, color: "bg-amber-500", label: "Innovation Excellence" }
      case "leadership":
        return { icon: <Trophy className="h-5 w-5" />, color: "bg-red-500", label: "Leadership Excellence" }
      case "service":
        return { icon: <Heart className="h-5 w-5" />, color: "bg-pink-500", label: "Service Excellence" }
      case "technical":
        return { icon: <Cog className="h-5 w-5" />, color: "bg-cyan-500", label: "Technical Excellence" }
      case "teamwork":
        return { icon: <Users className="h-5 w-5" />, color: "bg-green-500", label: "Teamwork Excellence" }
      case "production":
        return { icon: <Sprout className="h-5 w-5" />, color: "bg-green-600", label: "Production Excellence" }
      case "agriculture":
        return { icon: <Wheat className="h-5 w-5" />, color: "bg-yellow-600", label: "Agricultural Excellence" }
      case "rice":
        return { icon: <Grain className="h-5 w-5" />, color: "bg-amber-700", label: "Rice Production Excellence" }
      case "sustainability":
        return { icon: <Leaf className="h-5 w-5" />, color: "bg-emerald-600", label: "Sustainability Excellence" }
      case "quality":
        return {
          icon: <BadgeCheck className="h-5 w-5" />,
          color: "bg-indigo-600",
          label: "Quality Assurance Excellence",
        }
      case "education":
        return { icon: <GraduationCap className="h-5 w-5" />, color: "bg-blue-600", label: "Educational Excellence" }
      case "community":
        return { icon: <Users className="h-5 w-5" />, color: "bg-orange-600", label: "Community Service Excellence" }
      case "innovation-tech":
        return { icon: <Cpu className="h-5 w-5" />, color: "bg-violet-600", label: "Technological Innovation" }
      case "field-work":
        return { icon: <Mountain className="h-5 w-5" />, color: "bg-stone-600", label: "Field Work Excellence" }
      default:
        return { icon: <Award className="h-5 w-5" />, color: "bg-emerald-500", label: "Excellence" }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center overflow-y-auto">
      <div className="bg-gradient-to-b from-emerald-800 to-emerald-900 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-emerald-800 z-10 flex items-center justify-between p-4 border-b border-emerald-700">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Trophy className="mr-2 h-5 w-5 text-amber-300" />
            Hall of Fame Management
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-300 hover:text-white">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Description */}
          <div className="text-center text-gray-300 mb-6">
            <p>
              The Hall of Fame showcases one outstanding employee at a time. This employee will be featured on the
              dashboard.
            </p>
          </div>

          {/* Add/Edit Form */}
          {showForm ? (
            <Card className="bg-emerald-800/50 border border-emerald-700 text-white shadow-lg">
              <CardHeader className="border-b border-emerald-700/50">
                <CardTitle className="text-amber-300">
                  {isEditing ? "Update Hall of Fame Entry" : "Create New Hall of Fame Entry"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSaveEntry} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-gray-200">
                        Employee Name
                      </Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-emerald-700/50 border-emerald-600 focus:border-amber-400 focus:ring-amber-400/20"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date" className="text-gray-200">
                        Date/Period
                      </Label>
                      <Input
                        id="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        placeholder="e.g., March 2023"
                        className="bg-emerald-700/50 border-emerald-600 focus:border-amber-400 focus:ring-amber-400/20"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="achievement" className="text-gray-200">
                      Achievement
                    </Label>
                    <Input
                      id="achievement"
                      value={achievement}
                      onChange={(e) => setAchievement(e.target.value)}
                      className="bg-emerald-700/50 border-emerald-600 focus:border-amber-400 focus:ring-amber-400/20"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="about" className="text-gray-200">
                      About the Awardee
                    </Label>
                    <textarea
                      id="about"
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      rows={4}
                      className="w-full rounded-md bg-emerald-700/50 border-emerald-600 focus:border-amber-400 focus:ring-amber-400/20 text-white"
                      placeholder="Provide a brief description about the awardee..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avatar" className="text-gray-200">
                      Avatar URL
                    </Label>
                    <Input
                      id="avatar"
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      className="bg-emerald-700/50 border-emerald-600 focus:border-amber-400 focus:ring-amber-400/20"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="badge" className="text-gray-200">
                      Badge Type
                    </Label>
                    <Select value={badge} onValueChange={setBadge}>
                      <SelectTrigger className="bg-emerald-700/50 border-emerald-600 focus:border-amber-400 focus:ring-amber-400/20">
                        <SelectValue placeholder="Select badge type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="research">Research Excellence</SelectItem>
                        <SelectItem value="management">Management Excellence</SelectItem>
                        <SelectItem value="innovation">Innovation Excellence</SelectItem>
                        <SelectItem value="leadership">Leadership Excellence</SelectItem>
                        <SelectItem value="service">Service Excellence</SelectItem>
                        <SelectItem value="technical">Technical Excellence</SelectItem>
                        <SelectItem value="teamwork">Teamwork Excellence</SelectItem>
                        <SelectItem value="production">Production Excellence</SelectItem>
                        <SelectItem value="agriculture">Agricultural Excellence</SelectItem>
                        <SelectItem value="rice">Rice Production Excellence</SelectItem>
                        <SelectItem value="sustainability">Sustainability Excellence</SelectItem>
                        <SelectItem value="quality">Quality Assurance Excellence</SelectItem>
                        <SelectItem value="education">Educational Excellence</SelectItem>
                        <SelectItem value="community">Community Service Excellence</SelectItem>
                        <SelectItem value="innovation-tech">Technological Innovation</SelectItem>
                        <SelectItem value="field-work">Field Work Excellence</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="default"
                      onClick={resetForm}
                      className="bg-gray-600 hover:bg-gray-700 text-white"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-black font-medium">
                      {isEditing ? "Update Entry" : "Save Entry"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Current Hall of Fame Entry */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-white">Current Hall of Fame</h2>
                  {!currentEntry && (
                    <Button
                      onClick={() => setShowForm(true)}
                      className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Entry
                    </Button>
                  )}
                </div>

                <Separator className="bg-emerald-700/50" />

                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-300"></div>
                  </div>
                ) : currentEntry ? (
                  <div className="bg-emerald-800/30 border border-emerald-700/50 rounded-lg p-6 shadow-lg">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="relative">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-amber-300 shadow-lg">
                          <img
                            src={currentEntry.avatar || "/placeholder.svg?height=128&width=128"}
                            alt={currentEntry.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {currentEntry.badge && (
                          <div
                            className={`absolute bottom-0 right-0 w-10 h-10 rounded-full ${getBadgeDetails(currentEntry.badge).color} flex items-center justify-center border-2 border-emerald-800 shadow-md`}
                          >
                            {getBadgeDetails(currentEntry.badge).icon}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 text-center md:text-left">
                        <h3 className="text-2xl font-bold text-white mb-2">{currentEntry.name}</h3>
                        <p className="text-amber-300 font-medium text-lg mb-1">{currentEntry.achievement}</p>
                        <p className="text-gray-300 mb-3">{currentEntry.date}</p>
                        {currentEntry.about && (
                          <div className="bg-emerald-800/50 p-3 rounded-md mb-3 text-gray-200 text-sm">
                            <p>{currentEntry.about}</p>
                          </div>
                        )}
                        <p className="text-sm text-gray-400">Badge: {getBadgeDetails(currentEntry.badge).label}</p>
                      </div>
                    </div>

                    <div className="flex justify-center md:justify-end gap-3 mt-6">
                      <Button onClick={handleEditEntry} className="bg-emerald-600 hover:bg-emerald-500">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button onClick={handleDeleteEntry} variant="destructive" className="bg-red-600 hover:bg-red-500">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-800/30 border border-emerald-700/50 rounded-lg p-10 flex flex-col items-center justify-center text-center">
                    <Trophy className="h-16 w-16 text-amber-300/50 mb-4" />
                    <h3 className="text-xl font-medium text-white mb-2">No Hall of Fame Entry</h3>
                    <p className="text-gray-300 max-w-md mb-6">
                      The Hall of Fame is currently empty. Add an outstanding employee to be featured on the dashboard.
                    </p>
                    <Button
                      onClick={() => setShowForm(true)}
                      className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Entry
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
