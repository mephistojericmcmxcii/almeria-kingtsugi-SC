"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { doc, setDoc, serverTimestamp, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"

// Interface for the unique item document in the subcollection
interface ChemicalUniqueItem {
  id?: string
  tagId: string // Added auto-generated tag ID
  supplierName: string // Added supplier name field
  catalogNumber: string // Added catalog number field
  brand: string // Added brand field
  batchNo: string
  lotNo?: string
  deliveryDate: string
  variant?: string
  containerQuantity: number
  unit: string
  location: string
  expiryDate?: string
  remarks?: string // Added remarks field
  recordedBy: string
  lastUpdatedBy?: string
}

// Interface for the general chemical information
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

interface ChemicalAddItemFormProps {
  onClose: () => void
  parentChemicalId: string
  parentChemicalInfo: ChemicalGeneralInfo
  onSuccess?: () => void // Add optional success callback
}

const generateTagId = async (parentChemicalInfo: ChemicalGeneralInfo, parentChemicalId: string): Promise<string> => {
  const currentYear = new Date().getFullYear().toString().slice(-2) // Get last 2 digits of year

  // Query existing items for this year to get the next number
  const uniqueItemsRef = collection(db!, "chemicalInventory", parentChemicalId, "unique-items")
  const yearQuery = query(
    uniqueItemsRef,
    where("tagId", ">=", `${parentChemicalId}-${currentYear}.`),
    where("tagId", "<", `${parentChemicalId}-${currentYear}.ZZZ`),
  )
  const querySnapshot = await getDocs(yearQuery)

  const existingNumbers = querySnapshot.docs
    .map((doc) => {
      const tagId = doc.data().tagId as string
      const parts = tagId.split(`${parentChemicalId}-${currentYear}.`)
      if (parts.length === 2) {
        const numberPart = parts[1]
        return Number.parseInt(numberPart, 10)
      }
      return 0
    })
    .filter((num) => !isNaN(num))

  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1

  return `${parentChemicalId}-${currentYear}.${nextNumber}`
}

// Helper function to generate the unique item document ID
const generateUniqueItemDocId = (tagId: string, batchNo?: string, deliveryDate?: string) => {
  const uniqueIdParts: string[] = [tagId]

  if (batchNo && batchNo.trim()) {
    uniqueIdParts.push("BATCH-" + batchNo.trim().toUpperCase().replace(/\s+/g, "-"))
  }
  if (deliveryDate) {
    uniqueIdParts.push(deliveryDate)
  }

  return uniqueIdParts.join("-")
}

export default function ChemicalAddItemForm({
  onClose,
  parentChemicalId,
  parentChemicalInfo,
  onSuccess, // Add onSuccess prop
}: ChemicalAddItemFormProps) {
  const { employeeName } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [generatedTagId, setGeneratedTagId] = useState("") // State for generated tag ID
  const [quantity, setQuantity] = useState(1) // Added quantity state for multiple items

  // Form state for unique item fields only
  const [formData, setFormData] = useState({
    supplierName: "", // Moved supplier name to top
    catalogNumber: "", // Added catalog number field
    brand: "", // Added brand field to form state
    batchNo: "",
    lotNo: "",
    deliveryDate: "",
    variant: "",
    containerQuantity: 0,
    unit: "g",
    location: "",
    expiryDate: "",
    remarks: "", // Added remarks field
  })

  useEffect(() => {
    const generateTag = async () => {
      try {
        const tagId = await generateTagId(parentChemicalInfo, parentChemicalId)
        setGeneratedTagId(tagId)
      } catch (error) {
        console.error("Error generating tag ID:", error)
        setGeneratedTagId("ERROR-GENERATING-TAG")
      }
    }
    generateTag()
  }, [parentChemicalInfo, parentChemicalId])

  // Handle input changes
  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      supplierName: "", // Reset supplier name
      catalogNumber: "", // Reset catalog number
      brand: "", // Reset brand field
      batchNo: "",
      lotNo: "",
      deliveryDate: "",
      variant: "",
      containerQuantity: 0,
      unit: "g",
      location: "",
      expiryDate: "",
      remarks: "", // Reset remarks
    })
    setQuantity(1) // Reset quantity to 1
  }

  const generateSequentialTagIds = async (startingTagId: string, count: number): Promise<string[]> => {
    const currentYear = new Date().getFullYear().toString().slice(-2)
    const baseParts = startingTagId.split(`-${currentYear}.`)
    if (baseParts.length !== 2) return [startingTagId]

    const baseId = baseParts[0]
    const startNumber = Number.parseInt(baseParts[1], 10)

    const tagIds: string[] = []
    for (let i = 0; i < count; i++) {
      tagIds.push(`${baseId}-${currentYear}.${startNumber + i}`)
    }

    return tagIds
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (quantity < 1 || quantity > 100) {
      toast({
        title: "Error",
        description: "Quantity must be between 1 and 100.",
        variant: "destructive",
      })
      return
    }

    // Validation
    if (!formData.supplierName.trim()) {
      // Added supplier name validation
      toast({
        title: "Error",
        description: "Supplier Name is required.",
        variant: "destructive",
      })
      return
    }

    if (!formData.catalogNumber.trim()) {
      toast({
        title: "Error",
        description: "Catalog Number is required.",
        variant: "destructive",
      })
      return
    }

    if (!formData.brand.trim()) {
      toast({
        title: "Error",
        description: "Brand is required.",
        variant: "destructive",
      })
      return
    }

    if (!formData.batchNo.trim()) {
      toast({
        title: "Error",
        description: "Batch Number is required.",
        variant: "destructive",
      })
      return
    }

    if (formData.containerQuantity <= 0) {
      toast({
        title: "Error",
        description: "Container Quantity must be greater than 0.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      const tagIds = await generateSequentialTagIds(generatedTagId, quantity)

      const promises = tagIds.map(async (tagId) => {
        const uniqueItemRef = doc(db!, "chemicalInventory", parentChemicalId, "unique-items", tagId)

        // Check for duplicate unique item ID
        const docSnap = await getDoc(uniqueItemRef)
        if (docSnap.exists()) {
          throw new Error(`A unique item with Tag ID "${tagId}" already exists`)
        }

        const uniqueItemData: any = {
          tagId: tagId,
          supplierName: formData.supplierName.trim(),
          catalogNumber: formData.catalogNumber.trim(),
          brand: formData.brand.trim(), // Added brand to unique item data
          batchNo: formData.batchNo.trim(),
          deliveryDate: new Date(formData.deliveryDate).toISOString(),
          containerQuantity: formData.containerQuantity,
          unit: formData.unit,
          location: formData.location.trim(),
          expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : undefined,
          recordedBy: employeeName || "Unknown",
          lastUpdatedBy: employeeName || "Unknown",
        }

        // Only add optional fields if they have values (not empty strings)
        if (formData.lotNo.trim()) {
          uniqueItemData.lotNo = formData.lotNo.trim()
        }
        if (formData.variant.trim()) {
          uniqueItemData.variant = formData.variant.trim()
        }
        if (formData.remarks.trim()) {
          uniqueItemData.remarks = formData.remarks.trim()
        }

        // Add the new unique item to the subcollection
        return setDoc(uniqueItemRef, {
          ...uniqueItemData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      })

      await Promise.all(promises)

      const successMessage =
        quantity === 1
          ? `Chemical item "${tagIds[0]}" added successfully.`
          : `${quantity} chemical items added successfully (${tagIds[0]} to ${tagIds[tagIds.length - 1]}).`

      toast({
        title: "Success",
        description: successMessage,
      })

      resetForm()
      setIsSubmitting(false)

      if (onSuccess) {
        onSuccess()
      }

      // Generate new tag ID for next item
      const newTagId = await generateTagId(parentChemicalInfo, parentChemicalId)
      setGeneratedTagId(newTagId)

      // Don't call onClose() automatically - let user close manually after seeing the updated table
    } catch (error) {
      console.error("Error adding chemical item:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add chemical item. Please try again.",
        variant: "destructive",
      })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4">
      {" "}
      {/* Increased z-index to appear above chemical-view */}
      <div className="bg-[#F0EAD6] border border-[#DDD7B1] rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[#4A7C74]">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-[#4A7C74]" />
            <h2 className="text-xl font-bold text-[#2F3E2E]">Add New Chemical Item</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-[#8B8378] hover:text-[#2F3E2E]">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Chemical Type Info Display */}
        <div className="p-4 bg-[#E8E2C9] border-b border-[#4A7C74]">
          <h3 className="text-lg font-semibold text-[#2F3E2E] mb-2">Adding item to:</h3>
          <div className="text-[#8B8378]">
            <p>
              <strong>Chemical:</strong> {parentChemicalInfo.name}
            </p>
            {parentChemicalInfo.chemicalFormula && (
              <p>
                <strong>Formula:</strong> {parentChemicalInfo.chemicalFormula}
              </p>
            )}
            <p>
              <strong>Category:</strong> {parentChemicalInfo.category}
            </p>
            <p>
              <strong>Generated Tag ID:</strong> <span className="font-mono text-[#4A7C74]">{generatedTagId}</span>
              {quantity > 1 && (
                <span className="text-sm text-[#8B8378] ml-2">(will create {quantity} items with sequential IDs)</span>
              )}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-1">
              <Label htmlFor="quantity" className="text-[#2F3E2E] font-medium">
                Quantity *
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max="100"
                value={quantity}
                onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
                className="bg-[#E0D9C0] border-[#4A7C74] text-[#2F3E2E] focus:ring-[#4A7C74] focus:border-[#4A7C74] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="1"
                required
              />
            </div>
            <div className="col-span-3 flex items-end">
              <p className="text-sm text-[#8B8378] pb-2">Number of identical items to create with sequential tag IDs</p>
            </div>
          </div>

          {/* Supplier information first */}
          <div>
            <Label htmlFor="supplierName" className="text-[#2F3E2E] font-medium">
              Supplier Name *
            </Label>
            <Input
              id="supplierName"
              type="text"
              value={formData.supplierName}
              onChange={(e) => handleInputChange("supplierName", e.target.value)}
              className="bg-[#E0D9C0] border-[#4A7C74] text-[#2F3E2E] focus:ring-[#4A7C74] focus:border-[#4A7C74]"
              placeholder="Enter supplier name"
              required
            />
          </div>

          <div>
            <Label htmlFor="catalogNumber" className="text-[#2F3E2E] font-medium">
              Catalog Number *
            </Label>
            <Input
              id="catalogNumber"
              type="text"
              value={formData.catalogNumber}
              onChange={(e) => handleInputChange("catalogNumber", e.target.value)}
              className="bg-[#E0D9C0] border-[#4A7C74] text-[#2F3E2E] focus:ring-[#4A7C74] focus:border-[#4A7C74]"
              placeholder="Enter catalog number"
              required
            />
          </div>

          <div>
            <Label htmlFor="brand" className="text-[#2F3E2E] font-medium">
              Brand *
            </Label>
            <Input
              id="brand"
              type="text"
              value={formData.brand}
              onChange={(e) => handleInputChange("brand", e.target.value)}
              className="bg-[#E0D9C0] border-[#4A7C74] text-[#2F3E2E] focus:ring-[#4A7C74] focus:border-[#4A7C74]"
              placeholder="Enter brand name"
              required
            />
          </div>

          {/* Batch and Lot Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="batchNo" className="text-[#2F3E2E] font-medium">
                Batch Number *
              </Label>
              <Input
                id="batchNo"
                type="text"
                value={formData.batchNo}
                onChange={(e) => handleInputChange("batchNo", e.target.value)}
                className="bg-[#E0D9C0] border-[#4A7C74] text-[#2F3E2E] focus:ring-[#4A7C74] focus:border-[#4A7C74]"
                placeholder="Enter batch number"
                required
              />
            </div>
            <div>
              <Label htmlFor="lotNo" className="text-[#2F3E2E] font-medium">
                Lot Number
              </Label>
              <Input
                id="lotNo"
                type="text"
                value={formData.lotNo}
                onChange={(e) => handleInputChange("lotNo", e.target.value)}
                className="bg-[#E0D9C0] border-[#4A7C74] text-[#2F3E2E] focus:ring-[#4A7C74] focus:border-[#4A7C74]"
                placeholder="Enter lot number (optional)"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="deliveryDate" className="text-[#2F3E2E] font-medium">
                Delivery Date *
              </Label>
              <Input
                id="deliveryDate"
                type="date"
                value={formData.deliveryDate}
                onChange={(e) => handleInputChange("deliveryDate", e.target.value)}
                className="bg-[#E0D9C0] border-[#4A7C74] text-[#2F3E2E] focus:ring-[#4A7C74] focus:border-[#4A7C74]"
                required
              />
            </div>
            <div>
              <Label htmlFor="expiryDate" className="text-[#2F3E2E] font-medium">
                Expiry Date
              </Label>
              <Input
                id="expiryDate"
                type="date"
                value={formData.expiryDate}
                onChange={(e) => handleInputChange("expiryDate", e.target.value)}
                className="bg-[#E0D9C0] border-[#4A7C74] text-[#2F3E2E] focus:ring-[#4A7C74] focus:border-[#4A7C74]"
              />
            </div>
          </div>

          {/* Variant */}
          <div>
            <Label htmlFor="variant" className="text-[#2F3E2E] font-medium">
              Variant
            </Label>
            <Input
              id="variant"
              type="text"
              value={formData.variant}
              onChange={(e) => handleInputChange("variant", e.target.value)}
              className="bg-[#E0D9C0] border border-[#4A7C74] text-[#2F3E2E] focus:ring-[#4A7C74] focus:border-[#4A7C74]"
              placeholder="e.g., Lab Grade, Technical Grade"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="containerQuantity" className="text-[#2F3E2E] font-medium">
                Container Quantity *
              </Label>
              <Input
                id="containerQuantity"
                type="number"
                min="0.01"
                step="0.01"
                value={formData.containerQuantity}
                onChange={(e) => handleInputChange("containerQuantity", Number.parseFloat(e.target.value) || 0)}
                className="bg-[#E0D9C0] border border-[#4A7C74] text-[#2F3E2E] focus:ring-[#4A7C74] focus:border-[#4A7C74] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="e.g., 500"
                required
              />
            </div>
            <div>
              <Label htmlFor="unit" className="text-[#2F3E2E] font-medium">
                Unit *
              </Label>
              <Select value={formData.unit} onValueChange={(value) => handleInputChange("unit", value)}>
                <SelectTrigger className="bg-[#E0D9C0] border-[#4A7C74] text-[#2F3E2E] focus:ring-[#4A7C74] focus:border-[#4A7C74]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#F0EAD6] border-[#4A7C74] z-[10000]">
                  <SelectItem value="g">g (grams)</SelectItem>
                  <SelectItem value="kg">kg (kilograms)</SelectItem>
                  <SelectItem value="mg">mg (milligrams)</SelectItem>
                  <SelectItem value="mL">mL (milliliters)</SelectItem>
                  <SelectItem value="L">L (liters)</SelectItem>
                  <SelectItem value="pieces">pieces</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location" className="text-[#2F3E2E] font-medium">
              Storage Location *
            </Label>
            <Input
              id="location"
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
              className="bg-[#E0D9C0] border border-[#4A7C74] text-[#2F3E2E] focus:ring-[#4A7C74] focus:border-[#4A7C74]"
              placeholder="e.g., Cabinet A, Shelf 2"
              required
            />
          </div>

          <div>
            <Label htmlFor="remarks" className="text-[#2F3E2E] font-medium">
              Remarks/Comments
            </Label>
            <textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => handleInputChange("remarks", e.target.value)}
              className="w-full min-h-[80px] bg-[#E0D9C0] border border-[#4A7C74] text-[#2F3E2E] focus:ring-[#4A7C74] focus:border-[#4A7C74] rounded-md px-3 py-2 resize-vertical"
              placeholder="Enter any additional remarks or comments about this chemical item"
            />
          </div>

          {/* Form Actions */}
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
                  <span className="animate-spin mr-2">⏳</span>Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add {quantity > 1 ? `${quantity} ` : ""}Chemical Item{quantity > 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
