"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { X, Plus, Trash2, ShieldCheck, ChevronDown, ChevronRight } from "lucide-react"
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Checkbox } from "@/components/ui/checkbox"

interface AccessPointFormProps {
  onClose: () => void
}

interface AccessPoint {
  id?: string
  name: string
  description: string
  permissions: string[]
  createdAt?: Date
  updatedAt?: Date
}

// Available permissions in the system
const availablePermissions = [
  // Main sections
  //{ id: "dashboard", label: "Dashboard Access" },
  { id: "laboratory", label: "Laboratory Access" },
  { id: "operation", label: "Operation Access" },

  // Laboratory subsections
  { id: "lab_chemistry", label: "Chemistry Lab Access" },
  { id: "lab_production", label: "Production Lab Unit" },
  { id: "lab_maps", label: "Laboratory - Maps" },
  { id: "lab_stats", label: "Laboratory - Statistics" },
  { id: "lab_soil", label: "Soil Spatial Unit Access" }, // Added lab_soil permission
  { id: "lab_sample_prep", label: "Sample Preparation Access" }, // Added lab_sample_prep permission

  // Inventory subsections
  { id: "sro", label: "Sample Receiving Access" },
  { id: "dco", label: "Document Control Access" },
  { id: "inventory", label: "Inventory Management Access" }, // General inventory access (includes reports)
  { id: "supply", label: "Supplier Management" },

  // Procurement
  { id: "procurement", label: "Project Procurement" },
  { id: "procurement_ppmp", label: "Procurement - PPMP" },
  { id: "procurement_purchase", label: "Procurement - Purchase Requests" },

  // Management
  { id: "management", label: "Management Access" },
  { id: "hr", label: "Human Resources Management" },
  { id: "parameters", label: "Parameter Management" },
  { id: "discounts", label: "Client Discount Management" },
  { id: "accessPoints", label: "Access Point Management" },
  { id: "events", label: "Events Management" },
  { id: "hall_of_fame", label: "Hall of Fame Management" },

  // Production subsections
  { id: "production_stk", label: "Production - STK" },
  { id: "production_mushroom", label: "Production - Mushroom" },
  //{ id: "production_others", label: "Production - Others" },

  // New permissions for Inventory sub-sections
  { id: "maintenance", label: "Maintenance Management" },

  //special permission for buttons like submit, update, or accepts.
  { id: "JOLA-verifier", label: "JOLA Result Verifier"},
]

export default function AccessPointForm({ onClose }: AccessPointFormProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [accessPoints, setAccessPoints] = useState<AccessPoint[]>([])
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newPermissions, setNewPermissions] = useState<string[]>([])
  const [expandedAccessPoint, setExpandedAccessPoint] = useState<string | null>(null)

  // Fetch existing access points on component mount
  useEffect(() => {
    const fetchAccessPoints = async () => {
      try {
        setLoading(true)
        const accessPointsRef = collection(db!, "accessPoints")
        const querySnapshot = await getDocs(accessPointsRef)

        const points: AccessPoint[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data() as AccessPoint
          points.push({
            id: doc.id,
            name: data.name,
            description: data.description,
            permissions: data.permissions || [],
          })
        })

        setAccessPoints(points)
      } catch (err) {
        console.error("Error fetching access points:", err)
        setError("Failed to load access points. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchAccessPoints()
  }, [])

  // Add new access point
  const handleAddAccessPoint = async () => {
    try {
      // Validate inputs
      if (!newName.trim()) {
        setError("Access point name is required.")
        return
      }

      setSaving(true)
      setError("")

      // Check if access point already exists
      const existingAccessPoint = accessPoints.find((point) => point.name.toLowerCase() === newName.toLowerCase())

      if (existingAccessPoint) {
        setError("This access point already exists. Please use a different name.")
        setSaving(false)
        return
      }

      // Add new access point to Firestore
      const newAccessPoint: AccessPoint = {
        name: newName,
        description: newDescription,
        permissions: newPermissions,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const docRef = await addDoc(collection(db!, "accessPoints"), newAccessPoint)

      // Update local state
      setAccessPoints([
        ...accessPoints,
        {
          id: docRef.id,
          name: newName,
          description: newDescription,
          permissions: newPermissions,
        },
      ])

      // Reset form
      setNewName("")
      setNewDescription("")
      setNewPermissions([])

      setSuccess("Access point added successfully!")

      // Reset success message after 3 seconds
      setTimeout(() => {
        setSuccess("")
      }, 3000)
    } catch (err) {
      console.error("Error adding access point:", err)
      setError("Failed to add access point. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  // Update access point
  const handleUpdateAccessPoint = async (id: string, field: keyof AccessPoint, value: string | string[]) => {
    try {
      const index = accessPoints.findIndex((point) => point.id === id)
      if (index === -1) return

      // Create updated access point object
      const updatedAccessPoint = { ...accessPoints[index], [field]: value, updatedAt: new Date() }

      // Update in Firestore
      await updateDoc(doc(db!, "accessPoints", id), {
        [field]: value,
        updatedAt: new Date(),
      })

      // Update local state
      const updatedAccessPoints = [...accessPoints]
      updatedAccessPoints[index] = updatedAccessPoint
      setAccessPoints(updatedAccessPoints)

      setSuccess("Access point updated successfully!")

      // Reset success message after 3 seconds
      setTimeout(() => {
        setSuccess("")
      }, 3000)
    } catch (err) {
      console.error("Error updating access point:", err)
      setError("Failed to update access point. Please try again.")
    }
  }

  // Delete access point
  const handleDeleteAccessPoint = async (id: string) => {
    try {
      if (confirm("Are you sure you want to delete this access point?")) {
        // Delete from Firestore
        await deleteDoc(doc(db!, "accessPoints", id))

        // Update local state
        setAccessPoints(accessPoints.filter((point) => point.id !== id))

        setSuccess("Access point deleted successfully!")

        // Reset success message after 3 seconds
        setTimeout(() => {
          setSuccess("")
        }, 3000)
      }
    } catch (err) {
      console.error("Error deleting access point:", err)
      setError("Failed to delete access point. Please try again.")
    }
  }

  // Toggle permission for new access point
  const toggleNewPermission = (permissionId: string) => {
    setNewPermissions((prev) => {
      if (prev.includes(permissionId)) {
        return prev.filter((id) => id !== permissionId)
      } else {
        return [...prev, permissionId]
      }
    })
  }

  // Toggle permission for existing access point
  const toggleExistingPermission = (accessPointId: string, permissionId: string) => {
    const accessPoint = accessPoints.find((point) => point.id === accessPointId)
    if (!accessPoint) return

    const updatedPermissions = accessPoint.permissions.includes(permissionId)
      ? accessPoint.permissions.filter((id) => id !== permissionId)
      : [...accessPoint.permissions, permissionId]

    handleUpdateAccessPoint(accessPointId, "permissions", updatedPermissions)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-emerald-800 border border-emerald-700 rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-emerald-700">
          <h2 className="text-xl font-bold text-white">Access Point Management</h2>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-300 hover:text-white hover:bg-emerald-700"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {error && <div className="bg-red-500/20 border border-red-500 text-white p-3 rounded-md">{error}</div>}
          {success && (
            <div className="bg-green-500/20 border border-green-500 text-white p-3 rounded-md">{success}</div>
          )}

          {/* Add New Access Point Form */}
          <div className="bg-emerald-700/20 p-6 rounded-md">
            <h3 className="text-lg font-medium text-white mb-4">Add New Access Point</h3>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label htmlFor="newName" className="text-white">
                  Access Point Name *
                </Label>
                <Input
                  id="newName"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-emerald-700 border-emerald-600 text-white placeholder:text-emerald-300/70"
                  placeholder="e.g., Administrator"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newDescription" className="text-white">
                  Description
                </Label>
                <Textarea
                  id="newDescription"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="bg-emerald-700 border-emerald-600 text-white min-h-[80px] placeholder:text-emerald-300/70"
                  placeholder="Describe the access point and its responsibilities"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Permissions</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2 bg-emerald-700/30 p-4 rounded-md">
                  {availablePermissions.map((permission) => (
                    <div key={permission.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`new-permission-${permission.id}`}
                        checked={newPermissions.includes(permission.id)}
                        onCheckedChange={() => toggleNewPermission(permission.id)}
                        className="border-emerald-500 data-[state=checked]:bg-emerald-500"
                      />
                      <Label htmlFor={`new-permission-${permission.id}`} className="text-white text-sm cursor-pointer">
                        {permission.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Button
                  onClick={handleAddAccessPoint}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add Access Point
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Access Points List */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white border-b border-emerald-700 pb-2">Access Points</h3>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
              </div>
            ) : accessPoints.length === 0 ? (
              <div className="bg-emerald-700/20 p-4 rounded-md text-center text-gray-300">
                No access points added yet. Use the form above to add access points.
              </div>
            ) : (
              <div className="space-y-2">
                {accessPoints.map((point) => (
                  <div key={point.id} className="bg-emerald-700/20 rounded-md overflow-hidden">
                    {/* Header - always visible */}
                    <div
                      className="flex justify-between items-center p-4 cursor-pointer hover:bg-emerald-700/40"
                      onClick={() => {
                        if (expandedAccessPoint === point.id) {
                          setExpandedAccessPoint(null)
                        } else {
                          setExpandedAccessPoint(point.id!) // Use non-null assertion since we know point.id exists
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {expandedAccessPoint === point.id ? (
                          <ChevronDown className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-emerald-400" />
                        )}
                        <span className="font-medium text-white">{point.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteAccessPoint(point.id!)
                        }}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>

                    {/* Expanded content - only visible when expanded */}
                    {expandedAccessPoint === point.id && (
                      <div className="grid grid-cols-1 gap-4 p-6 pt-2 border-t border-emerald-700/50">
                        <div className="space-y-2 flex-1">
                          <Label htmlFor={`name-${point.id}`} className="text-white">
                            Access Point Name
                          </Label>
                          <Input
                            id={`name-${point.id}`}
                            value={point.name}
                            onChange={(e) => handleUpdateAccessPoint(point.id!, "name", e.target.value)}
                            className="bg-emerald-700 border-emerald-600 text-white mt-1 placeholder:text-emerald-300/70"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`description-${point.id}`} className="text-white">
                            Description
                          </Label>
                          <Textarea
                            id={`description-${point.id}`}
                            value={point.description}
                            onChange={(e) => handleUpdateAccessPoint(point.id!, "description", e.target.value)}
                            className="bg-emerald-700 border-emerald-600 text-white mt-1 min-h-[80px] placeholder:text-emerald-300/70"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-white flex items-center gap-1">
                            <ShieldCheck className="h-4 w-4 text-emerald-400" />
                            Permissions
                          </Label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2 bg-emerald-700/30 p-4 rounded-md">
                            {availablePermissions.map((permission) => (
                              <div key={permission.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`permission-${point.id}-${permission.id}`}
                                  checked={point.permissions?.includes(permission.id) || false}
                                  onCheckedChange={() => toggleExistingPermission(point.id!, permission.id)}
                                  className="border-emerald-500 data-[state=checked]:bg-emerald-500"
                                />
                                <Label
                                  htmlFor={`permission-${point.id}-${permission.id}`}
                                  className="text-white text-sm cursor-pointer"
                                >
                                  {permission.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end p-4 border-t border-emerald-700">
          <Button className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
