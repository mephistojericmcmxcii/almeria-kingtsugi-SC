"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Edit, Save } from "lucide-react"
import { doc, updateDoc, collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"

interface Employee {
  id?: string
  name: string
  email: string
  phone?: string
  birthday?: string
  idNumber?: string
  address?: string
  location?: string
  position: string
  department: string
  contractType: string
  status?: string
  accessPoints: string[]
  profileImage?: string
  createdAt?: Date
  updatedAt?: Date
}

interface EmployeeEditModalProps {
  employee: Employee | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

interface AccessPoint {
  id: string
  name: string
}

const departments = ["administration", "laboratory", "quality_control", "production", "maintenance", "security", "hr"]

export default function EmployeeEditModal({ employee, isOpen, onClose, onSave }: EmployeeEditModalProps) {
  const [formData, setFormData] = useState<Employee>({
    name: "",
    email: "",
    phone: "",
    birthday: "",
    idNumber: "",
    address: "",
    location: "",
    position: "",
    department: "",
    contractType: "",
    status: "Active",
    accessPoints: [],
    profileImage: "",
  })
  const [loading, setLoading] = useState(false)
  const [accessPointOptions, setAccessPointOptions] = useState<AccessPoint[]>([])
  const [loadingAccessPoints, setLoadingAccessPoints] = useState(true)

  useEffect(() => {
    const fetchAccessPoints = async () => {
      try {
        const accessPointsRef = collection(db!, "accessPoints")
        const snapshot = await getDocs(accessPointsRef)
        const accessPoints = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || doc.id,
        }))
        setAccessPointOptions(accessPoints)
      } catch (error) {
        console.error("Error fetching access points:", error)
        toast.error("Failed to load access points")
        setAccessPointOptions([
          { id: "main-lab", name: "Main Laboratory" },
          { id: "qc-lab", name: "Quality Control Lab" },
          { id: "production", name: "Production Floor" },
          { id: "admin", name: "Administrative Office" },
        ])
      } finally {
        setLoadingAccessPoints(false)
      }
    }

    if (isOpen) {
      fetchAccessPoints()
    }
  }, [isOpen])

  useEffect(() => {
    if (employee) {
      console.log("[v0] Setting form data for employee:", employee.name)
      console.log("[v0] Employee access points:", employee.accessPoints)

      setFormData({
        ...employee,
        phone: employee.phone || "",
        birthday: employee.birthday || "",
        idNumber: employee.idNumber || "",
        address: employee.address || "",
        location: employee.location || "",
        contractType: employee.contractType || "",
        status: employee.status || "Active",
        profileImage: employee.profileImage || "",
        accessPoints: employee.accessPoints || [], // Ensure accessPoints is always an array
      })
    }
  }, [employee])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee?.id) return

    setLoading(true)
    try {
      const employeeRef = doc(db!, "employees", employee.id)
      await updateDoc(employeeRef, {
        ...formData,
        updatedAt: new Date(),
      })

      toast.success("Employee updated successfully")
      onSave()
      onClose()
    } catch (error) {
      console.error("Error updating employee:", error)
      toast.error("Failed to update employee")
    } finally {
      setLoading(false)
    }
  }

  const handleAccessPointChange = (accessPointId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      accessPoints: checked
        ? [...prev.accessPoints, accessPointId]
        : prev.accessPoints.filter((point) => point !== accessPointId),
    }))
  }

  if (!employee) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#FAF8F2] border-[#DDD7B1]">
        <DialogHeader>
          <DialogTitle className="text-[#2F3E2E] flex items-center gap-2">
            <Edit className="h-5 w-5 text-[#5B8C5A]" />
            Edit Employee
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="idNumber" className="text-[#2F3E2E]">
                ID Number
              </Label>
              <Input
                id="idNumber"
                value={formData.idNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, idNumber: e.target.value }))}
                className="border-[#DDD7B1] focus:border-[#5B8C5A]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-[#2F3E2E]">
                Full Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="border-[#DDD7B1] focus:border-[#5B8C5A]"
                required
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="address" className="text-[#2F3E2E]">
                Address
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                className="border-[#DDD7B1] focus:border-[#5B8C5A]"
                placeholder="e.g., 123 Main Street, City, State, ZIP"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[#2F3E2E]">
                Phone Number
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                className="border-[#DDD7B1] focus:border-[#5B8C5A]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#2F3E2E]">
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                className="border-[#DDD7B1] focus:border-[#5B8C5A]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthday" className="text-[#2F3E2E]">
                Birthday
              </Label>
              <Input
                id="birthday"
                type="date"
                value={formData.birthday}
                onChange={(e) => setFormData((prev) => ({ ...prev, birthday: e.target.value }))}
                className="border-[#DDD7B1] focus:border-[#5B8C5A]"
              />
            </div>
          </div>

          {/* Work Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location" className="text-[#2F3E2E]">
                Location (Responsibility Area)
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                className="border-[#DDD7B1] focus:border-[#5B8C5A]"
                placeholder="MSL, BSWM, or RSL"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position" className="text-[#2F3E2E]">
                Position *
              </Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData((prev) => ({ ...prev, position: e.target.value }))}
                className="border-[#DDD7B1] focus:border-[#5B8C5A]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department" className="text-[#2F3E2E]">
                Department *
              </Label>
              <Select
                value={formData.department}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, department: value }))}
              >
                <SelectTrigger className="border-[#DDD7B1] focus:border-[#5B8C5A]">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept.charAt(0).toUpperCase() + dept.slice(1).replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractType" className="text-[#2F3E2E]">
                Contract Type *
              </Label>
              <Select
                value={formData.contractType}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, contractType: value }))}
              >
                <SelectTrigger className="border-[#DDD7B1] focus:border-[#5B8C5A]">
                  <SelectValue placeholder="Select contract type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Regular/Plantilla">Regular/Plantilla</SelectItem>
                  <SelectItem value="Contract of Service">Contract of Service</SelectItem>
                  <SelectItem value="Job Order">Job Order</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-[#2F3E2E]">
                Status *
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="border-[#DDD7B1] focus:border-[#5B8C5A]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Access Points */}
          <div className="space-y-3">
            <Label className="text-[#2F3E2E]">System Access Points</Label>
            {loadingAccessPoints ? (
              <div className="p-4 border border-[#DDD7B1] rounded-md bg-white text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#5B8C5A] mx-auto"></div>
                <p className="text-sm text-[#2F3E2E] mt-2">Loading access points...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border border-[#DDD7B1] rounded-md bg-white">
                {accessPointOptions.map((accessPoint) => {
                  const isChecked = formData.accessPoints.includes(accessPoint.id)
                  console.log(`[v0] Access point ${accessPoint.name} (${accessPoint.id}): checked=${isChecked}`)
                  console.log(`[v0] Form data access points:`, formData.accessPoints)

                  return (
                    <div key={accessPoint.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={accessPoint.id}
                        checked={isChecked}
                        onCheckedChange={(checked) => handleAccessPointChange(accessPoint.id, checked as boolean)}
                      />
                      <Label htmlFor={accessPoint.id} className="text-sm text-[#2F3E2E] cursor-pointer">
                        {accessPoint.name}
                      </Label>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-[#DDD7B1]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-[#DDD7B1] text-[#5B8C5A] hover:bg-[#F0EAD6] bg-transparent"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-[#5B8C5A] hover:bg-[#4A7A49] text-white" disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  Saving...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </div>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
