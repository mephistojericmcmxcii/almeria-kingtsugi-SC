"use client"

import { useEffect, useState } from "react"
import {
  Star,
  Award,
  Trophy,
  Heart,
  Cog,
  Users,
  X,
  Sprout,
  Wheat,
  GrapeIcon as Grain,
  Leaf,
  BadgeCheck,
  GraduationCap,
  Cpu,
  Mountain,
} from "lucide-react"
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firestore" // Corrected import
import { Button } from "@/components/ui/button"

interface HallOfFameEntry {
  id: string
  name: string
  achievement: string
  date: string
  avatar: string
  badge: string
  about?: string
}

export default function HallOfFame() {
  const [featuredEmployee, setFeaturedEmployee] = useState<HallOfFameEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    const fetchHallOfFame = async () => {
      try {
        // Create a reference to the hallOfFame collection
        const hallOfFameRef = collection(db, "hallOfFame") // Use db from firestore.ts

        // Get the most recent entry
        const q = query(hallOfFameRef, orderBy("createdAt", "desc"), limit(1))
        const snapshot = await getDocs(q)

        if (!snapshot.empty) {
          const doc = snapshot.docs[0]
          setFeaturedEmployee({
            id: doc.id,
            ...(doc.data() as Omit<HallOfFameEntry, "id">),
          })
        }
      } catch (error) {
        console.error("Error fetching hall of fame:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchHallOfFame()
  }, [])

  // Function to get badge icon and color
  const getBadgeDetails = (badge: string) => {
    switch (badge) {
      case "research":
        return { icon: <Star className="h-4 w-4" />, color: "bg-blue-500", label: "Research Excellence" }
      case "management":
        return { icon: <Award className="h-4 w-4" />, color: "bg-purple-500", label: "Management Excellence" }
      case "innovation":
        return { icon: <Star className="h-4 w-4" />, color: "bg-amber-500", label: "Innovation Excellence" }
      case "leadership":
        return { icon: <Trophy className="h-4 w-4" />, color: "bg-red-500", label: "Leadership Excellence" }
      case "service":
        return { icon: <Heart className="h-4 w-4" />, color: "bg-pink-500", label: "Service Excellence" }
      case "technical":
        return { icon: <Cog className="h-4 w-4" />, color: "bg-cyan-500", label: "Technical Excellence" }
      case "teamwork":
        return { icon: <Users className="h-4 w-4" />, color: "bg-green-500", label: "Teamwork Excellence" }
      case "production":
        return { icon: <Sprout className="h-4 w-4" />, color: "bg-green-600", label: "Production Excellence" }
      case "agriculture":
        return { icon: <Wheat className="h-4 w-4" />, color: "bg-yellow-600", label: "Agricultural Excellence" }
      case "rice":
        return { icon: <Grain className="h-4 w-4" />, color: "bg-amber-700", label: "Rice Production Excellence" }
      case "sustainability":
        return { icon: <Leaf className="h-4 w-4" />, color: "bg-emerald-600", label: "Sustainability Excellence" }
      case "quality":
        return {
          icon: <BadgeCheck className="h-4 w-4" />,
          color: "bg-indigo-600",
          label: "Quality Assurance Excellence",
        }
      case "education":
        return { icon: <GraduationCap className="h-4 w-4" />, color: "bg-blue-600", label: "Educational Excellence" }
      case "community":
        return { icon: <Users className="h-4 w-4" />, color: "bg-orange-600", label: "Community Service Excellence" }
      case "innovation-tech":
        return { icon: <Cpu className="h-4 w-4" />, color: "bg-violet-600", label: "Technological Innovation" }
      case "field-work":
        return { icon: <Mountain className="h-4 w-4" />, color: "bg-stone-600", label: "Field Work Excellence" }
      default:
        return { icon: <Award className="h-4 w-4" />, color: "bg-emerald-500", label: "Excellence" }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
      </div>
    )
  }

  if (!featuredEmployee) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Trophy className="h-10 w-10 text-emerald-500/50 mb-3" />
        <h3 className="text-base font-medium text-black mb-1">No hall of fame entries</h3>
        <p className="text-sm text-gray-400">Outstanding employees will be featured here.</p>
      </div>
    )
  }

  const badge = getBadgeDetails(featuredEmployee.badge)

  return (
    <div className="flex flex-col items-center text-center relative">
      {/* Improved Hall of Fame display */}
      <div
        className="mb-4 relative cursor-pointer transform transition-transform hover:scale-105"
        onClick={() => setShowDetails(true)}
      >
        <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-amber-300 shadow-lg sm:w-20 sm:h-20">
          <img
            src={featuredEmployee.avatar || "/placeholder.svg?height=112&width=112"}
            alt={featuredEmployee.name}
            className="w-full h-full object-cover"
          />
        </div>
        {featuredEmployee.badge && (
          <div
            className={`absolute bottom-0 right-0 w-9 h-9 rounded-full ${badge.color} flex items-center justify-center border-2 border-emerald-800 shadow-md sm:w-7 sm:h-7`}
          >
            {badge.icon}
          </div>
        )}

        {/* Click indicator */}
        <div className="absolute inset-0 rounded-full bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <span className="text-xs text-white bg-black/60 px-2 py-1 rounded-full">Click for details</span>
        </div>
      </div>

      <h3 className="text-base font-medium mb-1 text-black sm:text-sm">{featuredEmployee.name}</h3>
      <p className="text-base font-medium mb-1 text-[rgba(170,194,54,1)] hidden sm:block">
        {featuredEmployee.achievement}
      </p>
      <p className="text-sm text-gray-400 mt-1 hidden sm:block">{featuredEmployee.date}</p>

      {/* Details Modal */}
      {showDetails && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDetails(false)}
        >
          <div
            className="bg-emerald-800 rounded-lg shadow-xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-gradient-to-r from-emerald-700 to-emerald-900 p-4 flex justify-between items-center border-b border-emerald-700">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Trophy className="h-5 w-5 text-amber-300 mr-2" />
                Hall of Fame
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDetails(false)}
                className="h-8 w-8 rounded-full text-gray-300 hover:text-white hover:bg-emerald-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-5">
              <div className="flex flex-col items-center mb-4">
                <div className="relative mb-3">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-amber-300 shadow-lg">
                    <img
                      src={featuredEmployee.avatar || "/placeholder.svg?height=96&width=96"}
                      alt={featuredEmployee.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div
                    className={`absolute bottom-0 right-0 w-8 h-8 rounded-full ${badge.color} flex items-center justify-center border-2 border-emerald-800`}
                  >
                    {badge.icon}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white">{featuredEmployee.name}</h3>
                <p className="text-amber-300 font-medium mt-1">{featuredEmployee.achievement}</p>
                <div className="flex items-center mt-1 mb-3">
                  <span className="text-sm text-gray-300">{featuredEmployee.date}</span>
                  <span className="mx-2 text-gray-500">•</span>
                  <span className="text-sm text-gray-300">{badge.label}</span>
                </div>
              </div>

              {featuredEmployee.about ? (
                <div className="bg-emerald-900/50 rounded-md p-4 text-gray-200 text-sm border border-emerald-700/50">
                  <h4 className="text-amber-300 font-medium mb-2">About</h4>
                  <p>{featuredEmployee.about}</p>
                </div>
              ) : (
                <div className="text-center text-gray-400 italic text-sm">No additional information available.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
