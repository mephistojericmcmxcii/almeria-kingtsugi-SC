"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Gift, Cake, User, Briefcase, Utensils, X } from "lucide-react"
import { getMonthCelebrants, type CelebrantDocument } from "@/lib/firestore"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function MonthCelebrants() {
  const [celebrants, setCelebrants] = useState<CelebrantDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCelebrant, setSelectedCelebrant] = useState<CelebrantDocument | null>(null)

  useEffect(() => {
    const fetchCelebrants = async () => {
      try {
        setLoading(true)
        const fetchedCelebrants = await getMonthCelebrants()
        setCelebrants(fetchedCelebrants)
      } catch (err) {
        console.error("Failed to fetch month celebrants:", err)
        setError("Failed to load month celebrants.")
      } finally {
        setLoading(false)
      }
    }
    fetchCelebrants()
  }, [])

  const openModal = (celebrant: CelebrantDocument) => {
    setSelectedCelebrant(celebrant)
  }

  const closeModal = () => {
    setSelectedCelebrant(null)
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
      {celebrants.length === 0 ? (
        <p className="text-sm text-muted-foreground">No celebrants this month.</p>
      ) : (
        celebrants.map((celebrant) => (
          <div
            key={celebrant.id}
            className="flex items-center gap-3 cursor-pointer hover:bg-[#DDD7B1]/30 p-2 rounded-md transition-colors"
            onClick={() => openModal(celebrant)}
          >
            <Avatar className="h-10 w-10 border-2 border-amber-300">
              <AvatarImage
                src={celebrant.avatar || celebrant.profileImage || "/placeholder-user.jpg"}
                alt={celebrant.name}
              />
              <AvatarFallback>{celebrant.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-[#2F3E2E] truncate">{celebrant.name}</h4>
              <p className="text-xs text-muted-foreground truncate">
                Birthday: {format(new Date(celebrant.birthdate), "MMMM dd")}
              </p>
            </div>
          </div>
        ))
      )}

      {selectedCelebrant && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div
            className="bg-emerald-800 rounded-lg shadow-xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-gradient-to-r from-emerald-700 to-emerald-900 p-4 flex justify-between items-center border-b border-emerald-700">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Gift className="h-5 w-5 text-amber-300 mr-2" />
                Celebrant Details
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
              <div className="flex flex-col items-center mb-4">
                <Avatar className="h-24 w-24 border-4 border-amber-300 mb-3">
                  <AvatarImage
                    src={selectedCelebrant.avatar || selectedCelebrant.profileImage || "/placeholder-user.jpg"}
                    alt={selectedCelebrant.name}
                  />
                  <AvatarFallback className="text-3xl">{selectedCelebrant.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-bold text-white">{selectedCelebrant.name}</h3>
                <p className="text-amber-300 font-medium mt-1">
                  <Cake className="inline-block h-4 w-4 mr-1" />
                  {format(new Date(selectedCelebrant.birthdate), "MMMM dd")}
                </p>
              </div>

              {selectedCelebrant.department && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-amber-300" />
                  <span>Department: {selectedCelebrant.department}</span>
                </div>
              )}
              {selectedCelebrant.position && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-amber-300" />
                  <span>Position: {selectedCelebrant.position}</span>
                </div>
              )}
              {selectedCelebrant.message && (
                <div>
                  <h4 className="text-amber-300 font-medium mb-1">Message</h4>
                  <p>{selectedCelebrant.message}</p>
                </div>
              )}
              {selectedCelebrant.hobbies && (
                <div>
                  <h4 className="text-amber-300 font-medium mb-1">Hobbies</h4>
                  <p>{selectedCelebrant.hobbies}</p>
                </div>
              )}
              {selectedCelebrant.favoriteFood && (
                <div>
                  <h4 className="text-amber-300 font-medium mb-1">Favorite Food</h4>
                  <p className="flex items-center gap-1">
                    <Utensils className="h-4 w-4 text-amber-300" />
                    {selectedCelebrant.favoriteFood}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
