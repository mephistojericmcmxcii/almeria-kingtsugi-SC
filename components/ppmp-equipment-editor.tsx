"use client"

import { useState, useEffect } from "react"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { X, CalendarIcon } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

interface PPMPEquipment {
  id: string
  equipmentId: string
  name: string
  model: string
  serialNumber: string
  location: string
  category: string
  status: string
  lastMaintenance: string | null
  nextMaintenance: string | null
  lastCalibration: string | null
  nextCalibration: string | null
  maintenanceFrequency: string
  calibrationFrequency: string
  notes: string
}

interface PPMPEquipmentEditorProps {
  equipmentId: string
  onClose: () => void
  onSave: () => void
}

export default function PPMPEquipmentEditor({ equipmentId, onClose, onSave }: PPMPEquipmentEditorProps) {
  const [equipment, setEquipment] = useState<PPMPEquipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Date states
  const [lastMaintenance, setLastMaintenance] = useState<Date | undefined>(undefined)
  const [nextMaintenance, setNextMaintenance] = useState<Date | undefined>(undefined)
  const [lastCalibration, setLastCalibration] = useState<Date | undefined>(undefined)
  const [nextCalibration, setNextCalibration] = useState<Date | undefined>(undefined)

  // Fetch equipment details
  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        setLoading(true)

        const docRef = doc(db!, "ppmp", equipmentId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          setEquipment({
            id: docSnap.id,
            equipmentId: data.equipmentId || "",
            name: data.name || "",
            model: data.model || "",
            serialNumber: data.serialNumber || "",
            location: data.location || "",
            category: data.category || "",
            status: data.status || "Active",
            lastMaintenance: data.lastMaintenance,
            nextMaintenance: data.nextMaintenance,
            lastCalibration: data.lastCalibration,
            nextCalibration: data.nextCalibration,
            maintenanceFrequency: data.maintenanceFrequency || "Quarterly",
            calibrationFrequency: data.calibrationFrequency || "Semi-Annual",
            notes: data.notes || "",
          })

          // Set date states
          if (data.lastMaintenance) setLastMaintenance(new Date(data.lastMaintenance))
          if (data.nextMaintenance) setNextMaintenance(new Date(data.nextMaintenance))
          if (data.lastCalibration) setLastCalibration(new Date(data.lastCalibration))
          if (data.nextCalibration) setNextCalibration(new Date(data.nextCalibration))
        } else {
          toast({
            title: "Error",
            description: "Equipment not found",
            variant: "destructive",
          })
          onClose()
        }

        setLoading(false)
      } catch (error) {
        console.error("Error fetching equipment:", error)
        toast({
          title: "Error",
          description: "Failed to load equipment details",
          variant: "destructive",
        })
        setLoading(false)
        onClose()
      }
    }

    fetchEquipment()
  }, [equipmentId, onClose])

  // Handle input changes
  const handleChange = (field: string, value: string) => {
    if (equipment) {
      setEquipment({
        ...equipment,
        [field]: value,
      })
    }
  }

  // Handle save
  const handleSave = async () => {
    if (!equipment) return

    try {
      setSaving(true)

      // Prepare data with dates
      const updatedData = {
        ...equipment,
        lastMaintenance: lastMaintenance ? lastMaintenance.toISOString() : null,
        nextMaintenance: nextMaintenance ? nextMaintenance.toISOString() : null,
        lastCalibration: lastCalibration ? lastCalibration.toISOString() : null,
        nextCalibration: nextCalibration ? nextCalibration.toISOString() : null,
      }

      // Update in Firestore
      const docRef = doc(db!, "ppmp", equipment.id)
      await updateDoc(docRef, updatedData)

      toast({
        title: "Success",
        description: "Equipment details updated successfully",
      })

      onSave()
      onClose()
    } catch (error) {
      console.error("Error updating equipment:", error)
      toast({
        title: "Error",
        description: "Failed to update equipment details",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-emerald-800 border border-emerald-700 rounded-lg shadow-lg p-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!equipment) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-emerald-800 border border-emerald-700 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-emerald-700">
          <h2 className="text-xl font-bold text-white">Edit PPMP Details</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-300 hover:text-white">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Equipment details - read only */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="equipmentId" className="text-white">
                Equipment ID
              </Label>
              <Input
                id="equipmentId"
                value={equipment.equipmentId}
                readOnly
                className="bg-emerald-700/50 border-emerald-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">
                Name
              </Label>
              <Input
                id="name"
                value={equipment.name}
                readOnly
                className="bg-emerald-700/50 border-emerald-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model" className="text-white">
                Model
              </Label>
              <Input
                id="model"
                value={equipment.model}
                readOnly
                className="bg-emerald-700/50 border-emerald-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serialNumber" className="text-white">
                Serial Number
              </Label>
              <Input
                id="serialNumber"
                value={equipment.serialNumber}
                readOnly
                className="bg-emerald-700/50 border-emerald-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-white">
                Location
              </Label>
              <Input
                id="location"
                value={equipment.location}
                readOnly
                className="bg-emerald-700/50 border-emerald-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-white">
                Category
              </Label>
              <Input
                id="category"
                value={equipment.category}
                readOnly
                className="bg-emerald-700/50 border-emerald-600 text-white"
              />
            </div>
          </div>

          <div className="border-t border-emerald-700 my-4 pt-4">
            <h3 className="text-lg font-medium text-white mb-4">Maintenance & Calibration Schedule</h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Maintenance Frequency */}
              <div className="space-y-2">
                <Label htmlFor="maintenanceFrequency" className="text-white">
                  Maintenance Frequency
                </Label>
                <Select
                  value={equipment.maintenanceFrequency}
                  onValueChange={(value) => handleChange("maintenanceFrequency", value)}
                >
                  <SelectTrigger className="bg-emerald-700 border-emerald-600 text-white">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent className="bg-emerald-700 border-emerald-600 text-white">
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                    <SelectItem value="Semi-Annual">Semi-Annual</SelectItem>
                    <SelectItem value="Annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Calibration Frequency */}
              <div className="space-y-2">
                <Label htmlFor="calibrationFrequency" className="text-white">
                  Calibration Frequency
                </Label>
                <Select
                  value={equipment.calibrationFrequency}
                  onValueChange={(value) => handleChange("calibrationFrequency", value)}
                >
                  <SelectTrigger className="bg-emerald-700 border-emerald-600 text-white">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent className="bg-emerald-700 border-emerald-600 text-white">
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                    <SelectItem value="Semi-Annual">Semi-Annual</SelectItem>
                    <SelectItem value="Annual">Annual</SelectItem>
                    <SelectItem value="Biennial">Biennial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Last Maintenance Date */}
              <div className="space-y-2">
                <Label htmlFor="lastMaintenance" className="text-white">
                  Last Maintenance
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal bg-emerald-700 border-emerald-600 text-white",
                        !lastMaintenance && "text-gray-400",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {lastMaintenance ? format(lastMaintenance, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-emerald-700 border-emerald-600">
                    <Calendar
                      mode="single"
                      selected={lastMaintenance}
                      onSelect={setLastMaintenance}
                      initialFocus
                      className="bg-emerald-700 text-white"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Next Maintenance Date */}
              <div className="space-y-2">
                <Label htmlFor="nextMaintenance" className="text-white">
                  Next Maintenance
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal bg-emerald-700 border-emerald-600 text-white",
                        !nextMaintenance && "text-gray-400",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {nextMaintenance ? format(nextMaintenance, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-emerald-700 border-emerald-600">
                    <Calendar
                      mode="single"
                      selected={nextMaintenance}
                      onSelect={setNextMaintenance}
                      initialFocus
                      className="bg-emerald-700 text-white"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Last Calibration Date */}
              <div className="space-y-2">
                <Label htmlFor="lastCalibration" className="text-white">
                  Last Calibration
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal bg-emerald-700 border-emerald-600 text-white",
                        !lastCalibration && "text-gray-400",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {lastCalibration ? format(lastCalibration, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-emerald-700 border-emerald-600">
                    <Calendar
                      mode="single"
                      selected={lastCalibration}
                      onSelect={setLastCalibration}
                      initialFocus
                      className="bg-emerald-700 text-white"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Next Calibration Date */}
              <div className="space-y-2">
                <Label htmlFor="nextCalibration" className="text-white">
                  Next Calibration
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal bg-emerald-700 border-emerald-600 text-white",
                        !nextCalibration && "text-gray-400",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {nextCalibration ? format(nextCalibration, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-emerald-700 border-emerald-600">
                    <Calendar
                      mode="single"
                      selected={nextCalibration}
                      onSelect={setNextCalibration}
                      initialFocus
                      className="bg-emerald-700 text-white"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-white">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={equipment.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              className="bg-emerald-700 border-emerald-600 text-white min-h-[100px]"
              placeholder="Enter notes about maintenance, calibration, or special requirements"
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 mt-4 border-t border-emerald-700 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="bg-transparent border-emerald-600 text-white hover:bg-emerald-700"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 text-white" disabled={saving}>
              {saving ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
