"use client"

import type React from "react"
import { useState, useEffect } from "react" // Import useState and useEffect
import { Button } from "@/components/ui/button"
import { X, Save } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  getSamplingDataDocument,
  getFarmerProfile,
  type FarmerProfileDocument,
  type FarmerDetailInFirestore,
} from "@/lib/firestore" // Import Firestore functions and types

// Interface for Sample Preparation, defined here as it's specific to this modal
interface SamplePrep {
  id: string
  sampleID: string
  sampleType: string
  collectionDate: Date
  location: string // Now includes address and coordinates
  longitude?: string
  latitude?: string
  depth?: string
  collectedBy: string // Changed from preparedBy
  preparedBy: string // New field for preparation process
  prepMethod: string
  notes: string
  status: string
  createdAt: Date
  createdBy: string
  // Internal fields to link back to original source if needed for future updates
  _samplingDocId?: string
  _farmerDetailIndex?: number
  _sampleIndex?: number
}

interface SamplePrepViewEditModalProps {
  isOpen: boolean
  onClose: () => void
  viewingSamplePrep: SamplePrep | null
  editingSamplePrep: SamplePrep | null
  handleUpdateSamplePrep: (e: React.FormEvent) => Promise<void>
  handleEditPrepFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  handleEditPrepSelectChange: (name: string, value: string) => void
  formatDate: (date: Date | undefined) => string
}

export function SamplePrepViewEditModal({
  isOpen,
  onClose,
  viewingSamplePrep,
  editingSamplePrep,
  handleUpdateSamplePrep,
  handleEditPrepFormChange,
  handleEditPrepSelectChange,
  formatDate,
}: SamplePrepViewEditModalProps) {
  const [farmerDetails, setFarmerDetails] = useState<FarmerDetailInFirestore | null>(null)
  const [farmerProfile, setFarmerProfile] = useState<FarmerProfileDocument | null>(null)
  const [isLoadingFarmerData, setIsLoadingFarmerData] = useState(true)

  useEffect(() => {
    const fetchFarmerData = async () => {
      if (
        !viewingSamplePrep ||
        !viewingSamplePrep._samplingDocId ||
        viewingSamplePrep._farmerDetailIndex === undefined
      ) {
        setFarmerDetails(null)
        setFarmerProfile(null)
        setIsLoadingFarmerData(false)
        return
      }

      setIsLoadingFarmerData(true)
      try {
        const samplingDoc = await getSamplingDataDocument(viewingSamplePrep._samplingDocId)
        if (
          samplingDoc &&
          samplingDoc.farmerDetails &&
          samplingDoc.farmerDetails[viewingSamplePrep._farmerDetailIndex]
        ) {
          const currentFarmerDetails = samplingDoc.farmerDetails[viewingSamplePrep._farmerDetailIndex]
          setFarmerDetails(currentFarmerDetails)

          // Fetch farmer profile using the farmer's name
          if (currentFarmerDetails.name) {
            const profile = await getFarmerProfile(currentFarmerDetails.name)
            setFarmerProfile(profile)
          } else {
            setFarmerProfile(null)
          }
        } else {
          setFarmerDetails(null)
          setFarmerProfile(null)
        }
      } catch (error) {
        console.error("Failed to fetch farmer data:", error)
        setFarmerDetails(null)
        setFarmerProfile(null)
      } finally {
        setIsLoadingFarmerData(false)
      }
    }

    if (isOpen) {
      fetchFarmerData()
    }
  }, [isOpen, viewingSamplePrep])

  if (!isOpen || !viewingSamplePrep || !editingSamplePrep) return null

  // Determine if the status field should be completely locked (unclickable)
  const isStatusLocked = viewingSamplePrep?.status === "ready" || viewingSamplePrep?.status === "completed"

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#F0EAD6] border-[#DDD7B1] rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#DDD7B1]">
          <h2 className="text-xl font-bold text-[#2F3E2E]">View/Edit Sample Preparation</h2>
          <Button
            variant="ghost"
            size="icon"
            className="text-[#8B8378] hover:text-[#2F3E2E] hover:bg-[#C0B89F]"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleUpdateSamplePrep} className="p-6 space-y-6">
          {/* Farmer Details Section */}
          <div className="space-y-4 pb-4 border-b border-[#DDD7B1]">
            <h3 className="text-lg font-bold text-[#2F3E2E]">Sample Owner Details</h3>
            {isLoadingFarmerData ? (
              <div className="text-[#8B8378]">Loading farmer details...</div>
            ) : farmerDetails ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#2F3E2E]">Farmer Name</Label>
                  <Input
                    value={farmerDetails.name || "N/A"}
                    className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#2F3E2E]">Crops</Label>
                  <Input
                    value={farmerDetails.crops || "N/A"}
                    className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#2F3E2E]">Soil Sample Type</Label>
                  <Input
                    value={farmerDetails.soilSampleType || "N/A"}
                    className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#2F3E2E]">Sample Depth</Label>
                  <Input
                    value={farmerDetails.depth || "N/A"}
                    className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                    readOnly
                  />
                </div>
                {farmerProfile && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-[#2F3E2E]">Contact No.</Label>
                      <Input
                        value={farmerProfile.contactNo || "N/A"}
                        className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                        readOnly
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#2F3E2E]">Email Address</Label>
                      <Input
                        value={farmerProfile.emailAddress || "N/A"}
                        className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                        readOnly
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#2F3E2E]">Birthday</Label>
                      <Input
                        value={farmerProfile.birthday || "N/A"}
                        className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                        readOnly
                      />
                    </div>
                  </>
                )}
                {!farmerProfile && (
                  <div className="md:col-span-2 text-[#8B8378]">Farmer profile details not available.</div>
                )}
              </div>
            ) : (
              <div className="text-[#8B8378]">Farmer details not found for this sample.</div>
            )}
          </div>

          {/* Sample Preparation Details Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-sampleID" className="text-[#2F3E2E]">
                Sample ID *
              </Label>
              <Input
                id="edit-sampleID"
                name="sampleID"
                value={editingSamplePrep.sampleID}
                className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-sampleType" className="text-[#2F3E2E]">
                Sample Type *
              </Label>
              <Input
                id="edit-sampleType"
                name="sampleType"
                value={editingSamplePrep.sampleType}
                className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed capitalize"
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-collectionDate" className="text-[#2F3E2E]">
                Collection Date *
              </Label>
              <Input
                id="edit-collectionDate"
                name="collectionDate"
                type="date"
                value={
                  editingSamplePrep.collectionDate instanceof Date
                    ? editingSamplePrep.collectionDate.toISOString().split("T")[0]
                    : editingSamplePrep.collectionDate.toString() // Ensure it's a string for input value
                }
                className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-location" className="text-[#2F3E2E]">
                Collection Location *
              </Label>
              <Input
                id="edit-location"
                name="location"
                value={editingSamplePrep.location}
                className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-longitude" className="text-[#2F3E2E]">
                Longitude (Optional)
              </Label>
              <Input
                id="edit-longitude"
                name="longitude"
                value={editingSamplePrep.longitude || ""}
                className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-latitude" className="text-[#2F3E2E]">
                Latitude (Optional)
              </Label>
              <Input
                id="edit-latitude"
                name="latitude"
                value={editingSamplePrep.latitude || ""}
                className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-depth" className="text-[#2F3E2E]">
                Sample Depth (Optional)
              </Label>
              <Input
                id="edit-depth"
                name="depth"
                value={editingSamplePrep.depth || ""}
                className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-collectedBy" className="text-[#2F3E2E]">
                Collected By *
              </Label>
              <Input
                id="edit-collectedBy"
                name="collectedBy"
                value={editingSamplePrep.collectedBy}
                className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-preparedBy" className="text-[#2F3E2E]">
                Prepared By *
              </Label>
              <Input
                id="edit-preparedBy"
                name="preparedBy"
                value={editingSamplePrep.preparedBy}
                onChange={handleEditPrepFormChange}
                className={`bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] ${isStatusLocked ? "cursor-not-allowed opacity-70" : ""}`}
                required
                readOnly={isStatusLocked} // Make read-only if status is locked
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-prepMethod" className="text-[#2F3E2E]">
                Preparation Method *
              </Label>
              <Select
                value={editingSamplePrep.prepMethod}
                onValueChange={(value) => handleEditPrepSelectChange("prepMethod", value)}
                disabled={isStatusLocked} // Disable if status is locked
              >
                <SelectTrigger
                  className={`bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] ${isStatusLocked ? "cursor-not-allowed opacity-70" : ""}`}
                >
                  <SelectValue placeholder="Select a method" />
                </SelectTrigger>
                <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
                  <SelectItem value="drying">Air Drying</SelectItem>
                  <SelectItem value="grinding">Grinding</SelectItem>
                  <SelectItem value="sieving">Sieving</SelectItem>
                  <SelectItem value="extraction">Extraction</SelectItem>
                  <SelectItem value="digestion">Digestion</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status" className="text-[#2F3E2E]">
                Status *
              </Label>
              <Select
                value={editingSamplePrep.status}
                onValueChange={(value) => handleEditPrepSelectChange("status", value)}
                disabled={isStatusLocked} // Disable if status is ready or completed
              >
                <SelectTrigger
                  className={`bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] ${isStatusLocked ? "cursor-not-allowed opacity-70" : ""}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
                  {/* Always show the current status as a disabled option if it's not locked */}
                  {viewingSamplePrep.status === "pending" && (
                    <SelectItem value="pending" disabled>
                      Pending
                    </SelectItem>
                  )}
                  {viewingSamplePrep.status === "processing" && (
                    <SelectItem value="processing" disabled>
                      In Preparation
                    </SelectItem>
                  )}
                  {viewingSamplePrep.status === "ready" && (
                    <SelectItem value="ready" disabled>
                      Ready for Analysis
                    </SelectItem>
                  )}
                  {viewingSamplePrep.status === "completed" && (
                    <SelectItem value="completed" disabled>
                      Completed
                    </SelectItem>
                  )}

                  {/* Show forward options based on current viewing status */}
                  {viewingSamplePrep.status === "pending" && (
                    <>
                      <SelectItem value="processing">In Preparation</SelectItem>
                      <SelectItem value="ready">Ready for Analysis</SelectItem>
                    </>
                  )}
                  {viewingSamplePrep.status === "processing" && (
                    <SelectItem value="ready">Ready for Analysis</SelectItem>
                  )}
                  {/* If viewingSamplePrep.status is "ready" or "completed", the entire <Select> is disabled,
                      so no further SelectItems are needed here as the dropdown won't open.
                  */}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-notes" className="text-[#2F3E2E]">
                Notes
              </Label>
              <Textarea
                id="edit-notes"
                name="notes"
                value={editingSamplePrep.notes}
                onChange={handleEditPrepFormChange}
                className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] min-h-[100px] placeholder:text-[#8B8378]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-[#DDD7B1]">
            <Button type="button" className="bg-[#5B8C5A] hover:bg-[#4A7049] text-white" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#5B8C5A] hover:bg-[#4A7049] text-white">
              <Save className="h-4 w-4 mr-2" />
              Update Sample
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
