"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, doc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"

// Equipment interface
interface Equipment {
  id: string
  equipmentId: string
  name: string
  category: string
  serialNumber: string
  location: string
  manufacturer?: string
  model?: string
  status: string
  condition?: string
  lastMaintenance?: string
  nextMaintenance?: string
  lastCalibration?: string
  nextCalibration?: string
}

// PPMP Equipment interface (extends Equipment with PPMP-specific fields)
interface PPMPEquipment extends Equipment {
  maintenanceFrequency: string
  calibrationFrequency: string
  inPPMP: boolean
}

interface PPMPEquipmentSelectorProps {
  onClose: () => void
  onEquipmentAdded: () => void
}

export default function PPMPEquipmentSelector({ onClose, onEquipmentAdded }: PPMPEquipmentSelectorProps) {
  const [equipment, setEquipment] = useState<PPMPEquipment[]>([])
  const [filteredEquipment, setFilteredEquipment] = useState<PPMPEquipment[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Fetch equipment from Firestore
  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        setLoading(true)

        // Get all equipment from equipment collection
        const equipmentRef = collection(db!, "equipment")
        const equipmentSnapshot = await getDocs(equipmentRef)

        // Get all equipment already in PPMP
        const ppmpRef = collection(db!, "ppmp")
        const ppmpSnapshot = await getDocs(ppmpRef)

        // Create a map of equipment IDs that are already in PPMP
        const ppmpEquipmentIds = new Map()
        ppmpSnapshot.forEach((doc) => {
          ppmpEquipmentIds.set(doc.data().equipmentId, true)
        })

        // Process equipment data
        const equipmentData: PPMPEquipment[] = []

        equipmentSnapshot.forEach((doc) => {
          const data = doc.data()

          // Only include operational equipment
          if (data.status === "Operational" || data.status === "Calibration Due" || data.status === "Maintenance Due") {
            equipmentData.push({
              id: doc.id,
              equipmentId: data.equipmentId || "",
              name: data.name || "",
              category: data.category || "",
              serialNumber: data.serialNumber || "",
              location: data.location || "",
              manufacturer: data.manufacturer,
              model: data.model,
              status: data.status,
              condition: data.condition,
              lastMaintenance: data.lastMaintenance,
              nextMaintenance: data.nextMaintenance,
              lastCalibration: data.lastCalibration,
              nextCalibration: data.nextCalibration,
              maintenanceFrequency: "Quarterly", // Default value
              calibrationFrequency: "Semi-Annual", // Default value
              inPPMP: ppmpEquipmentIds.has(data.equipmentId),
            })
          }
        })

        setEquipment(equipmentData)
        setFilteredEquipment(equipmentData)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching equipment:", error)
        toast({
          title: "Error",
          description: "Failed to load equipment data",
          variant: "destructive",
        })
        setLoading(false)
      }
    }

    fetchEquipment()
  }, [])

  // Filter equipment based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredEquipment(equipment)
    } else {
      const filtered = equipment.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.equipmentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.location.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredEquipment(filtered)
    }
  }, [searchTerm, equipment])

  // Handle equipment selection
  const toggleEquipmentSelection = (id: string) => {
    setSelectedEquipment((prev) => {
      if (prev.includes(id)) {
        return prev.filter((itemId) => itemId !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  // Handle adding equipment to PPMP
  const handleAddToPPMP = async () => {
    if (selectedEquipment.length === 0) {
      toast({
        title: "No equipment selected",
        description: "Please select at least one equipment to add to PPMP",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)

      // Get selected equipment data
      const selectedItems = equipment.filter((item) => selectedEquipment.includes(item.id))

      // Add each selected equipment to PPMP collection
      for (const item of selectedItems) {
        // Create a document ID based on equipment ID to avoid duplicates
        const docId = `ppmp_${item.equipmentId}`

        // Calculate next maintenance and calibration dates if not set
        let nextMaintenance = item.nextMaintenance
        let nextCalibration = item.nextCalibration

        if (!nextMaintenance) {
          const date = new Date()
          date.setMonth(date.getMonth() + 3) // Default to 3 months from now
          nextMaintenance = date.toISOString()
        }

        if (!nextCalibration) {
          const date = new Date()
          date.setMonth(date.getMonth() + 6) // Default to 6 months from now
          nextCalibration = date.toISOString()
        }

        // Prepare PPMP data
        const ppmpData = {
          equipmentId: item.equipmentId,
          name: item.name,
          model: item.model || "",
          serialNumber: item.serialNumber,
          location: item.location,
          category: item.category,
          status: item.status,
          lastMaintenance: item.lastMaintenance || null,
          nextMaintenance: nextMaintenance,
          lastCalibration: item.lastCalibration || null,
          nextCalibration: nextCalibration,
          maintenanceFrequency: item.maintenanceFrequency,
          calibrationFrequency: item.calibrationFrequency,
          addedAt: new Date().toISOString(),
          notes: "",
        }

        // Add to PPMP collection
        await setDoc(doc(db!, "ppmp", docId), ppmpData)
      }

      toast({
        title: "Success",
        description: `${selectedItems.length} equipment added to PPMP`,
      })

      // Notify parent component
      onEquipmentAdded()

      // Close the selector
      onClose()
    } catch (error) {
      console.error("Error adding equipment to PPMP:", error)
      toast({
        title: "Error",
        description: "Failed to add equipment to PPMP",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-emerald-800 border border-emerald-700 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-emerald-700">
          <h2 className="text-xl font-bold text-white">Add Equipment to PPMP</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-300 hover:text-white">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4">
          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-emerald-400" />
            <Input
              placeholder="Search equipment..."
              className="pl-8 bg-emerald-700 border-emerald-600 text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="available" className="mb-4">
            <TabsList className="bg-emerald-900/50 border border-emerald-700">
              <TabsTrigger value="available" className="data-[state=active]:bg-emerald-700 text-white">
                Available Equipment
              </TabsTrigger>
              <TabsTrigger value="inppmp" className="data-[state=active]:bg-emerald-700 text-white">
                Already in PPMP
              </TabsTrigger>
            </TabsList>

            <TabsContent value="available">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                </div>
              ) : filteredEquipment.filter((item) => !item.inPPMP).length === 0 ? (
                <div className="text-center py-8 text-white">
                  No available equipment found. All equipment is already in PPMP or not in operational condition.
                </div>
              ) : (
                <div className="rounded-md border border-emerald-700 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-emerald-900/70">
                      <TableRow className="hover:bg-emerald-900/90 border-emerald-700">
                        <TableHead className="text-emerald-300 w-[50px]"></TableHead>
                        <TableHead className="text-emerald-300">ID</TableHead>
                        <TableHead className="text-emerald-300">Name</TableHead>
                        <TableHead className="text-emerald-300">Location</TableHead>
                        <TableHead className="text-emerald-300">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEquipment
                        .filter((item) => !item.inPPMP)
                        .map((item) => (
                          <TableRow key={item.id} className="hover:bg-emerald-900/50 border-emerald-700">
                            <TableCell>
                              <Checkbox
                                checked={selectedEquipment.includes(item.id)}
                                onCheckedChange={() => toggleEquipmentSelection(item.id)}
                                className="border-emerald-500 data-[state=checked]:bg-emerald-500"
                              />
                            </TableCell>
                            <TableCell className="text-white">{item.equipmentId}</TableCell>
                            <TableCell className="text-white font-medium">{item.name}</TableCell>
                            <TableCell className="text-white">{item.location}</TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  item.status === "Operational"
                                    ? "bg-green-600 hover:bg-green-700"
                                    : item.status === "Calibration Due"
                                      ? "bg-blue-600 hover:bg-blue-700"
                                      : "bg-amber-600 hover:bg-amber-700"
                                }
                              >
                                {item.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="inppmp">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                </div>
              ) : filteredEquipment.filter((item) => item.inPPMP).length === 0 ? (
                <div className="text-center py-8 text-white">No equipment in PPMP yet.</div>
              ) : (
                <div className="rounded-md border border-emerald-700 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-emerald-900/70">
                      <TableRow className="hover:bg-emerald-900/90 border-emerald-700">
                        <TableHead className="text-emerald-300">ID</TableHead>
                        <TableHead className="text-emerald-300">Name</TableHead>
                        <TableHead className="text-emerald-300">Location</TableHead>
                        <TableHead className="text-emerald-300">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEquipment
                        .filter((item) => item.inPPMP)
                        .map((item) => (
                          <TableRow key={item.id} className="hover:bg-emerald-900/50 border-emerald-700">
                            <TableCell className="text-white">{item.equipmentId}</TableCell>
                            <TableCell className="text-white font-medium">{item.name}</TableCell>
                            <TableCell className="text-white">{item.location}</TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  item.status === "Operational"
                                    ? "bg-green-600 hover:bg-green-700"
                                    : item.status === "Calibration Due"
                                      ? "bg-blue-600 hover:bg-blue-700"
                                      : "bg-amber-600 hover:bg-amber-700"
                                }
                              >
                                {item.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 mt-4 border-t border-emerald-700 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="bg-transparent border-emerald-600 text-white hover:bg-emerald-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddToPPMP}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
              disabled={selectedEquipment.length === 0 || saving}
            >
              {saving ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Adding...
                </>
              ) : (
                `Add ${selectedEquipment.length} Equipment to PPMP`
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
