"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EyeIcon } from "lucide-react"
import SamplingDataViewModal from "@/components/sampling-data-view-modal"
import { toast } from "@/components/ui/use-toast"
import type { FarmerProfileDocument, SamplingDataDocument } from "@/lib/firestore"
import { Checkbox } from "@/components/ui/checkbox"

// Updated interface for selected farmer for modal, now explicitly includes organization, rsbsaNo, isRSBSA
interface SelectedFarmerForModal extends Omit<FarmerProfileDocument, "id" | "createdAt" | "updatedAt"> {
  organization: string // Explicitly required for modal's internal state
  rsbsaNo: string // Explicitly required for modal's internal state
  isRSBSA: boolean // Explicitly required for modal's internal state
  allAssociatedSamplingRecords: SamplingDataDocument[]
  isNewProfile?: boolean
}

interface FarmerProfileViewEditModalProps {
  isOpen: boolean
  onClose: () => void
  farmerData: SelectedFarmerForModal | null
  onSave: (
    farmerName: string,
    updatedData: Omit<FarmerProfileDocument, "id" | "createdAt" | "updatedAt">,
  ) => Promise<void>
}

export default function FarmerProfileViewEditModal({
  isOpen,
  onClose,
  farmerData,
  onSave,
}: FarmerProfileViewEditModalProps) {
  const [formData, setFormData] = useState<SelectedFarmerForModal | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showSamplingDetailsModal, setShowSamplingDetailsModal] = useState(false)
  const [selectedSamplingRecord, setSelectedSamplingRecord] = useState<SamplingDataDocument | null>(null)

  useEffect(() => {
    if (farmerData) {
      console.log("[FarmerProfileViewEditModal] farmerData prop received:", farmerData)
      setFormData({
        ...farmerData,
        organization: farmerData.organization || "", // Ensure string
        rsbsaNo: farmerData.rsbsaNo || "", // Ensure string
        isRSBSA: farmerData.isRSBSA ?? false, // Ensure boolean
      })
      setIsEditing(farmerData.isNewProfile || false) // Start in editing mode if it's a new profile
    } else {
      setFormData(null)
      setIsEditing(false)
    }
  }, [farmerData])

  useEffect(() => {
    if (formData) {
      console.log("[FarmerProfileViewEditModal] Current formData state:", formData)
      console.log("[FarmerProfileViewEditModal] Current formData.organization:", formData.organization)
      console.log("[FarmerProfileViewEditModal] Current formData.rsbsaNo:", formData.rsbsaNo)
      console.log("[FarmerProfileViewEditModal] Current formData.isRSBSA:", formData.isRSBSA)
    }
  }, [formData])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => {
      if (!prev) return null
      const newState = { ...prev, [id]: value }

      // Automatically set isRSBSA based on rsbsaNo
      if (id === "rsbsaNo") {
        newState.isRSBSA = value.trim() !== ""
      }
      return newState
    })
  }, [])

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target
    setFormData((prev) => {
      if (!prev) return null
      return { ...prev, birthday: value }
    })
  }, [])

  const handleCheckboxChange = useCallback((checked: boolean) => {
    setFormData((prev) => {
      if (!prev) return null
      return { ...prev, isRSBSA: checked }
    })
  }, [])

  const handleSave = async () => {
    if (!formData) return

    try {
      await onSave(formData.name, {
        name: formData.name,
        farmArea: formData.farmArea,
        crops: formData.crops,
        soilSampleType: formData.soilSampleType,
        homeAddress: formData.homeAddress,
        contactNo: formData.contactNo,
        emailAddress: formData.emailAddress,
        birthday: formData.birthday,
        organization: formData.organization,
        rsbsaNo: formData.rsbsaNo,
        isRSBSA: formData.isRSBSA,
      })
      setIsEditing(false)
      onClose()
    } catch (error) {
      console.error("Failed to save farmer profile:", error)
      toast({
        title: "Error",
        description: "Failed to save farmer profile.",
        variant: "destructive",
      })
    }
  }

  const handleViewSamplingDetails = (record: SamplingDataDocument) => {
    setSelectedSamplingRecord(record)
    setShowSamplingDetailsModal(true)
  }

  const handleCloseSamplingDetailsModal = () => {
    setShowSamplingDetailsModal(false)
    setSelectedSamplingRecord(null)
  }

  if (!formData) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-[#FAF8F2] text-[#2F3E2E]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#5B8C5A]">
              {isEditing ? "Edit Farmer Profile" : "View Farmer Profile"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-[#4C6529]">
                  Farmer Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  readOnly={!isEditing}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] focus-visible:ring-[#5B8C5A]"
                />
              </div>
              <div>
                <Label htmlFor="contactNo" className="text-[#4C6529]">
                  Contact No.
                </Label>
                <Input
                  id="contactNo"
                  value={formData.contactNo}
                  onChange={handleChange}
                  readOnly={!isEditing}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] focus-visible:ring-[#5B8C5A]"
                />
              </div>
              <div>
                <Label htmlFor="emailAddress" className="text-[#4C6529]">
                  Email Address
                </Label>
                <Input
                  id="emailAddress"
                  type="email"
                  value={formData.emailAddress}
                  onChange={handleChange}
                  readOnly={!isEditing}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] focus-visible:ring-[#5B8C5A]"
                />
              </div>
              <div>
                <Label htmlFor="birthday" className="text-[#4C6529]">
                  Birthday
                </Label>
                <Input
                  id="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={handleDateChange}
                  readOnly={!isEditing}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] focus-visible:ring-[#5B8C5A]"
                />
              </div>
              <div>
                <Label htmlFor="homeAddress" className="text-[#4C6529]">
                  Home Address
                </Label>
                <Textarea
                  id="homeAddress"
                  value={formData.homeAddress}
                  onChange={handleChange}
                  readOnly={!isEditing}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] focus-visible:ring-[#5B8C5A]"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="organization" className="text-[#4C6529]">
                  Organization
                </Label>
                <Input
                  id="organization"
                  value={formData.organization}
                  onChange={handleChange}
                  readOnly={!isEditing}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] focus-visible:ring-[#5B8C5A]"
                />
              </div>
              <div>
                <Label htmlFor="rsbsaNo" className="text-[#4C6529]">
                  RSBSA No.
                </Label>
                <Input
                  id="rsbsaNo"
                  value={formData.rsbsaNo}
                  onChange={handleChange}
                  readOnly={!isEditing}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] focus-visible:ring-[#5B8C5A]"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRSBSA"
                  checked={formData.isRSBSA}
                  onCheckedChange={handleCheckboxChange}
                  disabled={!isEditing}
                  className="border-[#C0B89F] data-[state=checked]:bg-[#5B8C5A] data-[state=checked]:text-white"
                />
                <Label htmlFor="isRSBSA" className="text-[#4C6529]">
                  Is RSBSA Registered?
                </Label>
              </div>
              <div>
                <Label htmlFor="farmArea" className="text-[#4C6529]">
                  Farm Area (ha)
                </Label>
                <Input
                  id="farmArea"
                  value={formData.farmArea}
                  onChange={handleChange}
                  readOnly={!isEditing}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] focus-visible:ring-[#5B8C5A]"
                />
              </div>
              <div>
                <Label htmlFor="crops" className="text-[#4C6529]">
                  Crops
                </Label>
                <Input
                  id="crops"
                  value={formData.crops}
                  onChange={handleChange}
                  readOnly={!isEditing}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] focus-visible:ring-[#5B8C5A]"
                />
              </div>
              <div>
                <Label htmlFor="soilSampleType" className="text-[#4C6529]">
                  Soil Sample Type
                </Label>
                <Input
                  id="soilSampleType"
                  value={formData.soilSampleType}
                  onChange={handleChange}
                  readOnly={!isEditing}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] focus-visible:ring-[#5B8C5A]"
                />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3 text-[#5B8C5A]">Associated Sampling Records</h3>
            <div className="rounded-md border border-[#DDD7B1] overflow-hidden">
              <div className="overflow-x-auto max-h-[200px]">
                <Table className="w-full border-collapse">
                  <TableHeader className="bg-[#DDD7B1] sticky top-0 z-10">
                    <TableRow className="hover:bg-[#E0D9C0] border-[#DDD7B1]">
                      <TableHead className="p-2 text-[#2F3E2E] text-[8pt] text-left whitespace-nowrap">
                        Sampling ID
                      </TableHead>
                      <TableHead className="p-2 text-[#2F3E2E] text-[8pt] text-left whitespace-nowrap">
                        Collection Date
                      </TableHead>
                      <TableHead className="p-2 text-[#2F3E2E] text-[8pt] text-left whitespace-nowrap">
                        Collected By
                      </TableHead>
                      <TableHead className="p-2 text-[#2F3E2E] text-[8pt] text-left whitespace-nowrap">
                        Type of Sample
                      </TableHead>
                      <TableHead className="p-2 text-[#2F3E2E] text-right text-[8pt] whitespace-nowrap">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.allAssociatedSamplingRecords.length > 0 ? (
                      formData.allAssociatedSamplingRecords.map((record) => (
                        <TableRow key={record.id} className="hover:bg-[#E0D9C0] border-[#DDD7B1]">
                          <TableCell className="p-2 align-middle text-[#2F3E2E] text-[8pt] font-medium whitespace-nowrap">
                            {record.sampleId}
                          </TableCell>
                          <TableCell className="p-2 align-middle text-[#2F3E2E] text-[8pt] whitespace-nowrap">
                            {record.dateCollected}
                          </TableCell>
                          <TableCell className="p-2 align-middle text-[#2F3E2E] text-[8pt] whitespace-nowrap">
                            {record.collectedBy}
                          </TableCell>
                          <TableCell className="p-2 align-middle text-[#2F3E2E] text-[8pt] whitespace-nowrap">
                            {record.typeOfSample}
                          </TableCell>
                          <TableCell className="p-2 align-middle text-right whitespace-nowrap">
                            <Button
                              type="button"
                              className="h-8 w-8 rounded-md p-0 text-[#8B8378] hover:text-[#2F3E2E] hover:bg-[#C0B89F]"
                              variant="ghost"
                              size="icon"
                              aria-label="View Sampling Details"
                              onClick={() => handleViewSamplingDetails(record)}
                            >
                              <EyeIcon className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-[#8B8378]">
                          No associated sampling records.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 flex justify-end gap-3">
            {isEditing ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (farmerData?.isNewProfile) {
                      // If it was a new profile, close the modal without saving
                      onClose()
                    } else {
                      // If it was an existing profile, revert changes and go back to view mode
                      setFormData(farmerData)
                      setIsEditing(false)
                    }
                  }}
                  className="border-[#C0B89F] text-[#2F3E2E] hover:bg-[#E0D9C0]"
                >
                  Cancel
                </Button>
                <Button type="submit" onClick={handleSave} className="bg-[#5B8C5A] hover:bg-[#4A7049] text-white">
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="border-[#C0B89F] text-[#2F3E2E] hover:bg-[#E0D9C0] bg-transparent"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="bg-[#5B8C5A] hover:bg-[#4A7049] text-white"
                >
                  Edit Profile
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SamplingDataViewModal
        isOpen={showSamplingDetailsModal}
        onClose={handleCloseSamplingDetailsModal}
        samplingRecord={selectedSamplingRecord}
      />
    </>
  )
}
