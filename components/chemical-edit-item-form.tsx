"use client"

import type React from "react"

import { useState } from "react"
import { X, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface ChemicalGeneralInfo {
  name: string
  chemicalFormula?: string
  brand?: string
  category: string
  supplier?: string
  catalogNumber?: string
  msdsLink?: string
  hazardClass?: string[]
  storageRequirements?: string
  services?: string
  notes?: string
}

interface ChemicalUniqueItem {
  id: string
  tagId: string
  supplierName: string
  catalogNumber: string
  brand: string // Added brand field
  batchNo: string
  lotNo?: string
  deliveryDate: string
  variant?: string
  containerQuantity: number
  unit: string
  location: string
  expiryDate?: string
  status: string
  remarks?: string
  recordedBy: string
  lastUpdatedBy?: string
  createdAt?: { seconds: number; nanoseconds: number }
  updatedAt?: { seconds: number; nanoseconds: number }
  releasedTo?: string
  releasedDate?: string
  releaseReason?: string
  releaseQuantity?: number
  releaseAuthorizedBy?: string
  releaseNotes?: string
  releaseType?: "internal" | "external"
  recipientDepartment?: string
  recipientContact?: string
  expectedReturnDate?: string
}

interface ChemicalEditItemFormProps {
  onClose: () => void
  parentChemicalId: string
  parentChemicalInfo: ChemicalGeneralInfo
  existingItem: ChemicalUniqueItem
  onSuccess?: () => void // Added onSuccess callback prop
}

export default function ChemicalEditItemForm({
  onClose,
  parentChemicalId,
  parentChemicalInfo,
  existingItem,
  onSuccess, // Added onSuccess prop
}: ChemicalEditItemFormProps) {
  const [tagId] = useState(existingItem.tagId) // Tag ID should not be editable
  const [releaseType, setReleaseType] = useState<"internal" | "external">("internal")
  const [releasedTo, setReleasedTo] = useState(existingItem.releasedTo || "")
  const [releasedDate, setReleasedDate] = useState(existingItem.releasedDate || new Date().toISOString().split("T")[0])
  const [releaseReason, setReleaseReason] = useState(existingItem.releaseReason || "")
  const [releaseQuantity, setReleaseQuantity] = useState(
    existingItem.releaseQuantity || existingItem.containerQuantity || 1,
  )
  const [releaseAuthorizedBy, setReleaseAuthorizedBy] = useState(existingItem.releaseAuthorizedBy || "")
  const [releaseNotes, setReleaseNotes] = useState(existingItem.releaseNotes || "")
  const [recipientDepartment, setRecipientDepartment] = useState(existingItem.recipientDepartment || "")
  const [recipientContact, setRecipientContact] = useState(existingItem.recipientContact || "")
  const [expectedReturnDate, setExpectedReturnDate] = useState(existingItem.expectedReturnDate || "")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const updateData: any = {
        releasedDate,
        releaseQuantity,
        releaseAuthorizedBy,
        status: releaseType === "internal" ? "Released - Internal" : "Released - External",
        lastUpdatedBy: "Current User", // Replace with actual user
        updatedAt: serverTimestamp(),
        releaseType,
      }

      if (releaseType === "internal" && releasedTo.trim()) {
        updateData.releasedTo = releasedTo.trim()
      }

      if (releaseReason.trim()) updateData.releaseReason = releaseReason.trim()
      if (releaseNotes.trim()) updateData.releaseNotes = releaseNotes.trim()

      if (releaseType === "external") {
        if (recipientDepartment.trim()) updateData.recipientDepartment = recipientDepartment.trim()
        if (recipientContact.trim()) updateData.recipientContact = recipientContact.trim()
        if (expectedReturnDate) updateData.expectedReturnDate = expectedReturnDate
      }

      const itemDocRef = doc(db!, "chemicalInventory", parentChemicalId, "unique-items", existingItem.id)
      await updateDoc(itemDocRef, updateData)

      toast({
        title: "Chemical Released Successfully",
        description: `Chemical item ${tagId} has been released ${releaseType === "internal" ? "for internal use" : `to ${recipientDepartment}`}`,
      })

      if (onSuccess) {
        onSuccess()
      }

      // Don't call onClose() automatically - let user close manually after seeing the updated table
    } catch (error) {
      console.error("Error releasing chemical item:", error)
      toast({
        title: "Error",
        description: "Failed to release chemical item. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#F0EAD6] border border-[#DDD7B1] rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-[#4A7C74]">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#2F3E2E]">Release Chemical Item</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-[#8B8378] hover:text-[#2F3E2E]">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Chemical Info Display */}
          <div className="bg-[#E8E2C9] p-4 rounded-lg border border-[#4A7C74]">
            <h3 className="text-lg font-semibold text-[#2F3E2E] mb-2">Chemical Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[#8B8378]">Chemical Name:</span>
                <p className="text-[#2F3E2E] font-medium">{parentChemicalInfo.name}</p>
              </div>
              <div>
                <span className="text-[#8B8378]">Formula:</span>
                <p className="text-[#2F3E2E] font-medium">{parentChemicalInfo.chemicalFormula || "N/A"}</p>
              </div>
              <div>
                <span className="text-[#8B8378]">Category:</span>
                <p className="text-[#2F3E2E] font-medium">{parentChemicalInfo.category}</p>
              </div>
              <div>
                <span className="text-[#8B8378]">Tag ID:</span>
                <p className="text-[#2F3E2E] font-medium font-mono">{tagId}</p>
              </div>
              <div>
                <span className="text-[#8B8378]">Brand:</span>
                <p className="text-[#2F3E2E] font-medium">{existingItem.brand || "N/A"}</p>
              </div>
              <div>
                <span className="text-[#8B8378]">Current Quantity:</span>
                <p className="text-[#2F3E2E] font-medium">
                  {existingItem.containerQuantity} {existingItem.unit}
                </p>
              </div>
              <div>
                <span className="text-[#8B8378]">Current Status:</span>
                <p className="text-[#2F3E2E] font-medium">{existingItem.status}</p>
              </div>
            </div>
          </div>

          {/* Release Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="releaseType" className="text-[#2F3E2E]">
              Release Type *
            </Label>
            <Select value={releaseType} onValueChange={(value: "internal" | "external") => setReleaseType(value)}>
              <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] focus:ring-[#4A7C74] focus:border-[#4A7C74]">
                <SelectValue placeholder="Select release type" />
              </SelectTrigger>
              <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
                <SelectItem value="internal">Internal Use (Analysis, Research, etc.)</SelectItem>
                <SelectItem value="external">External Release (Other Departments, Students, etc.)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Released To / Used For - Only show for internal releases */}
            {releaseType === "internal" && (
              <div className="space-y-2">
                <Label htmlFor="releasedTo" className="text-[#2F3E2E]">
                  Used For *
                </Label>
                <Input
                  id="releasedTo"
                  value={releasedTo}
                  onChange={(e) => setReleasedTo(e.target.value)}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] focus:ring-[#4A7C74] focus:border-[#4A7C74]"
                  placeholder="e.g., Sample Analysis, Quality Testing, Research Project"
                  required
                />
              </div>
            )}

            {/* Released Date */}
            <div className="space-y-2">
              <Label htmlFor="releasedDate" className="text-[#2F3E2E]">
                Release Date *
              </Label>
              <Input
                id="releasedDate"
                type="date"
                value={releasedDate}
                onChange={(e) => setReleasedDate(e.target.value)}
                className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] focus:ring-[#4A7C74] focus:border-[#4A7C74]"
                required
              />
            </div>

            {/* Recipient Department - Only show for external releases */}
            {releaseType === "external" && (
              <div className="space-y-2">
                <Label htmlFor="recipientDepartment" className="text-[#2F3E2E]">
                  Department/Organization *
                </Label>
                <Input
                  id="recipientDepartment"
                  value={recipientDepartment}
                  onChange={(e) => setRecipientDepartment(e.target.value)}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] focus:ring-[#4A7C74] focus:border-[#4A7C74]"
                  placeholder="e.g., Chemistry Department, Biology Lab, External University"
                  required
                />
              </div>
            )}

            {/* Recipient Contact Info - Only show for external releases */}
            {releaseType === "external" && (
              <div className="space-y-2">
                <Label htmlFor="recipientContact" className="text-[#2F3E2E]">
                  Person Name (Optional)
                </Label>
                <Input
                  id="recipientContact"
                  value={recipientContact}
                  onChange={(e) => setRecipientContact(e.target.value)}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] focus:ring-[#4A7C74] focus:border-[#4A7C74]"
                  placeholder="e.g., Dr. John Smith, Maria Garcia, Lab Technician"
                />
              </div>
            )}

            {/* Release Reason */}
            <div className="space-y-2">
              <Label htmlFor="releaseReason" className="text-[#2F3E2E]">
                Release Purpose
              </Label>
              <Select value={releaseReason} onValueChange={setReleaseReason}>
                <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] focus:ring-[#4A7C74] focus:border-[#4A7C74] relative z-50">
                  <SelectValue placeholder="Select release purpose" />
                </SelectTrigger>
                <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E] relative z-50">
                  {releaseType === "internal" ? (
                    <>
                      <SelectItem value="Laboratory Analysis">Laboratory Analysis</SelectItem>
                      <SelectItem value="Quality Control">Quality Control</SelectItem>
                      <SelectItem value="Research & Development">Research & Development</SelectItem>
                      <SelectItem value="Method Development">Method Development</SelectItem>
                      <SelectItem value="Calibration Standards">Calibration Standards</SelectItem>
                      <SelectItem value="Sample Preparation">Sample Preparation</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Teaching/Education">Teaching/Education</SelectItem>
                      <SelectItem value="Collaborative Research">Collaborative Research</SelectItem>
                      <SelectItem value="External Testing">External Testing</SelectItem>
                      <SelectItem value="Student Project">Student Project</SelectItem>
                      <SelectItem value="Inter-department Transfer">Inter-department Transfer</SelectItem>
                      <SelectItem value="Loan/Temporary Use">Loan/Temporary Use</SelectItem>
                    </>
                  )}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Release Quantity */}
            <div className="space-y-2">
              <Label htmlFor="releaseQuantity" className="text-[#2F3E2E]">
                Release Quantity *
              </Label>
              <div className="flex gap-2">
                <Input
                  id="releaseQuantity"
                  type="number"
                  min="0.01"
                  max={existingItem.containerQuantity}
                  step="0.01"
                  value={releaseQuantity}
                  onChange={(e) => setReleaseQuantity(Number.parseFloat(e.target.value) || 0)}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] focus:ring-[#4A7C74] focus:border-[#4A7C74] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  required
                />
                <div className="flex items-center px-3 bg-[#E8E2C9] border border-[#C0B89F] rounded-md">
                  <span className="text-[#2F3E2E] text-sm">{existingItem.unit}</span>
                </div>
              </div>
            </div>

            {/* Expected Return Date */}
            {releaseType === "external" && (
              <div className="space-y-2">
                <Label htmlFor="expectedReturnDate" className="text-[#2F3E2E]">
                  Expected Return Date
                </Label>
                <Input
                  id="expectedReturnDate"
                  type="date"
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] focus:ring-[#4A7C74] focus:border-[#4A7C74]"
                />
              </div>
            )}

            {/* Authorized By */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="releaseAuthorizedBy" className="text-[#2F3E2E]">
                Authorized By *
              </Label>
              <Input
                id="releaseAuthorizedBy"
                value={releaseAuthorizedBy}
                onChange={(e) => setReleaseAuthorizedBy(e.target.value)}
                className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] focus:ring-[#4A7C74] focus:border-[#4A7C74]"
                placeholder="Name of person authorizing this release"
                required
              />
            </div>
          </div>

          {/* Release Notes */}
          <div className="space-y-2">
            <Label htmlFor="releaseNotes" className="text-[#2F3E2E]">
              Release Notes/Comments
            </Label>
            <Textarea
              id="releaseNotes"
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] focus:ring-[#4A7C74] focus:border-[#4A7C74] min-h-[100px]"
              placeholder={
                releaseType === "internal"
                  ? "Additional notes about the analysis or procedure, special handling instructions..."
                  : "Additional notes about this release, return conditions, special handling instructions..."
              }
            />
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-[#4A7C74]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-[#8B8378] hover:text-[#2F3E2E] bg-[#E0D9C0] hover:bg-[#C0B89F] border-[#4A7C74]"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[#4A7C74] hover:bg-[#2F3E2E] text-white">
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Releasing...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Release Chemical
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
