"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ChemicalUniqueItem {
  id?: string
  batchNo: string
  lotNo?: string
  deliveryDate: string
  variant?: string
  containerQuantity: number
  unit: string
  numberOfContainers: number
  location: string
  expiryDate?: string
  status: string
  recordedBy: string
  lastUpdatedBy?: string
  createdAt?: { seconds: number; nanoseconds: number } | Date
  updatedAt?: { seconds: number; nanoseconds: number } | Date
}

// Interface for the general chemical information document
interface ChemicalGeneralInfo {
  name: string
  chemicalFormula?: string
  casNumber?: string // Added CAS Number
  brand?: string
  category?: string
  msdsLink?: string
  hazardClass?: string[] // Changed to array of strings
  signalWord?: string // Added Signal Word field
  storageRequirements?: string
  services?: string
  notes?: string
  id?: string // Document ID (for backward compatibility)
  chemicalId?: string // The RSL-CH-XXX format ID
}

interface ChemicalFormData extends ChemicalGeneralInfo {
  id?: string
  createdAt?: { seconds: number; nanoseconds: number } | Date
  updatedAt?: { seconds: number; nanoseconds: number } | Date
}

interface ChemicalFormProps {
  onClose: (dataSaved?: boolean) => void // Modified to accept optional parameter indicating if data was saved
  initialData?: ChemicalFormData // For editing an existing unique item
  initialGeneralInfo?: ChemicalGeneralInfo // For adding a new unique item to an existing chemical type OR editing general info
  mode: "add-new-chemical-type" | "add-new-unique-item" | "edit-unique-item" | "edit-chemical-type" // Explicit mode
  existingChemicalId?: string // The document ID when editing chemical type
}

// Helper function to generate the main chemical inventory document ID (e.g., "SODIUM-HYDROXIDE")
const generateChemicalInventoryId = (name: string) => {
  return name.trim().toUpperCase().replace(/\s+/g, "-")
}

// Helper function to generate the unique item document ID (e.g., "LAB-GRADE-BATCH-XYZ-2023-10-26")
const generateUniqueItemDocId = (variant?: string, batchNo?: string, deliveryDate?: string) => {
  const uniqueIdParts: string[] = []

  if (variant && variant.trim()) {
    uniqueIdParts.push(variant.trim().toUpperCase().replace(/\s+/g, "-"))
  }
  if (batchNo && batchNo.trim()) {
    uniqueIdParts.push("BATCH-" + batchNo.trim().toUpperCase().replace(/\s+/g, "-"))
  }
  if (deliveryDate) {
    // Ensure deliveryDate is in YYYY-MM-DD format for ID generation
    uniqueIdParts.push(deliveryDate)
  }

  if (uniqueIdParts.length === 0) {
    // Fallback if no unique identifying parts are provided
    return `ITEM-${Date.now()}`
  }
  return uniqueIdParts.join("-")
}

const generateChemicalId = async (): Promise<string> => {
  try {
    // Query all chemical documents ordered by ID to find the highest number
    const chemicalInventoryRef = collection(db!, "chemicalInventory")
    const q = query(chemicalInventoryRef, orderBy("__name__"))
    const snapshot = await getDocs(q)

    let highestNumber = 0

    snapshot.forEach((doc) => {
      const docId = doc.id
      // Check if the document ID matches the RSL-CH-XXX pattern
      const match = docId.match(/^RSL-CH-(\d+)$/)
      if (match) {
        const number = Number.parseInt(match[1], 10)
        if (number > highestNumber) {
          highestNumber = number
        }
      }
    })

    // Generate the next Chemical ID
    const nextNumber = highestNumber + 1
    return `RSL-CH-${nextNumber.toString().padStart(3, "0")}`
  } catch (error) {
    console.error("Error generating Chemical ID:", error)
    // Fallback to timestamp-based ID if there's an error
    return `RSL-CH-${Date.now().toString().slice(-3)}`
  }
}

const checkForDuplicateChemical = async (
  name: string,
  chemicalFormula?: string,
): Promise<{ isDuplicate: boolean; existingChemical?: any; duplicateType?: "name" | "formula" }> => {
  try {
    const chemicalInventoryRef = collection(db!, "chemicalInventory")
    const snapshot = await getDocs(chemicalInventoryRef)

    let existingChemical = null
    let duplicateType: "name" | "formula" | undefined = undefined

    snapshot.forEach((doc) => {
      const data = doc.data()

      // Check for duplicate name (case-insensitive)
      if (data.name && data.name.toLowerCase().trim() === name.toLowerCase().trim()) {
        existingChemical = { id: doc.id, ...data }
        duplicateType = "name"
        return
      }

      // Check for duplicate chemical formula (case-insensitive, if both exist)
      if (
        chemicalFormula &&
        data.chemicalFormula &&
        data.chemicalFormula.toLowerCase().trim() === chemicalFormula.toLowerCase().trim()
      ) {
        existingChemical = { id: doc.id, ...data }
        duplicateType = "formula"
        return
      }
    })

    return {
      isDuplicate: existingChemical !== null,
      existingChemical,
      duplicateType,
    }
  } catch (error) {
    console.error("Error checking for duplicate chemicals:", error)
    return { isDuplicate: false }
  }
}

const HAZARD_CLASSES = [
  "Flammable",
  "Corrosive",
  "Toxic",
  "Oxidizer",
  "Explosive",
  "Health Hazard",
  "Irritant",
  "Environmental Hazard",
  "Gas Cylinder",
  "No Hazard",
]

const SIGNAL_WORDS = ["Danger", "Warning", "Non-Hazardous"]

export default function ChemicalForm({
  onClose,
  initialData,
  initialGeneralInfo,
  mode,
  existingChemicalId,
}: ChemicalFormProps) {
  const { employeeName } = useAuth()

  const isEditingUniqueItem = mode === "edit-unique-item"
  const isAddingNewUniqueItemToExistingChemical = mode === "add-new-unique-item"
  const isEditingChemicalType = mode === "edit-chemical-type"
  const isAddingNewChemicalType = mode === "add-new-chemical-type"

  const [formData, setFormData] = useState<ChemicalFormData>({
    chemicalFormula: "",
    casNumber: "",
    name: "",
    brand: "",
    category: "",
    hazardClass: [],
    signalWord: "", // Added Signal Word to form data
    services: "",
    notes: "",
  })

  const [generatedChemicalId, setGeneratedChemicalId] = useState<string>("")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deliveryDate, setDeliveryDate] = useState("")
  const [expiryDate, setExpiryDate] = useState("")

  useEffect(() => {
    // Lock body scroll when modal is open
    document.body.style.overflow = "hidden"

    // Cleanup function to restore scroll when modal unmounts
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  useEffect(() => {
    if (isEditingUniqueItem && initialData) {
      // Editing an existing unique item
      setFormData({
        id: initialData.id,
        chemicalFormula: initialData.chemicalFormula || "",
        casNumber: initialData.casNumber || "",
        name: initialData.name || "",
        brand: initialData.brand || "",
        category: initialData.category || "",
        msdsLink: initialData.msdsLink || "",
        hazardClass: Array.isArray(initialData.hazardClass)
          ? initialData.hazardClass
          : initialData.hazardClass
            ? [initialData.hazardClass]
            : [],
        signalWord: initialData.signalWord || "", // Added Signal Word initialization
        storageRequirements: initialData.storageRequirements || "",
        notes: initialData.notes || "",
        services: initialData.services || "",
        createdAt: initialData.createdAt,
        updatedAt: initialData.updatedAt,
      })
      setDeliveryDate(initialData.deliveryDate || "")
      setExpiryDate(initialData.expiryDate || "")
    } else if ((isAddingNewUniqueItemToExistingChemical || isEditingChemicalType) && initialGeneralInfo) {
      // Adding a new unique item to an existing chemical type OR editing chemical type general info
      setFormData((prev) => ({
        ...prev,
        name: initialGeneralInfo.name || "",
        chemicalFormula: initialGeneralInfo.chemicalFormula || "",
        casNumber: initialGeneralInfo.casNumber || "",
        brand: initialGeneralInfo.brand || "",
        category: initialGeneralInfo.category || "",
        msdsLink: initialGeneralInfo.msdsLink || "",
        hazardClass: Array.isArray(initialGeneralInfo.hazardClass)
          ? initialGeneralInfo.hazardClass
          : initialGeneralInfo.hazardClass
            ? [initialGeneralInfo.hazardClass]
            : [],
        signalWord: initialGeneralInfo.signalWord || "", // Added Signal Word initialization
        storageRequirements: initialGeneralInfo.storageRequirements || "",
        services: initialGeneralInfo.services || "",
        notes: initialGeneralInfo.notes || "",
        id: initialGeneralInfo.id,
        chemicalId: initialGeneralInfo.chemicalId,
      }))
    } else {
      // Default: add-new-chemical-type
      setFormData({
        chemicalFormula: "",
        casNumber: "",
        name: "",
        brand: "",
        category: "",
        hazardClass: [],
        signalWord: "", // Added Signal Word to default form data
        services: "",
        notes: "",
      })
    }
  }, [initialData, initialGeneralInfo, mode])

  useEffect(() => {
    if (isAddingNewChemicalType) {
      const generateId = async () => {
        const newId = await generateChemicalId()
        setGeneratedChemicalId(newId)
      }
      generateId()
    }
  }, [isAddingNewChemicalType])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name === "containerQuantity" || name === "numberOfContainers") {
      setFormData((prev) => ({ ...prev, [name]: Number.parseFloat(value) || 0 }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleHazardClassChange = (hazard: string, checked: boolean) => {
    setFormData((prev) => {
      const currentHazards = prev.hazardClass || []
      if (checked) {
        // Add if not already present and limit to 4
        if (currentHazards.length < 4 && !currentHazards.includes(hazard)) {
          // If "No Hazard" is selected, it should be the only one
          if (hazard === "No Hazard") {
            return { ...prev, hazardClass: ["No Hazard"] }
          }
          // If other hazards are selected, remove "No Hazard"
          const newHazards = currentHazards.filter((h) => h !== "No Hazard")
          return { ...prev, hazardClass: [...newHazards, hazard] }
        } else if (currentHazards.length >= 4) {
          toast.error("Limit Reached", {
            description: "You can select a maximum of 4 hazard classes.",
          })
        }
        return prev // Do not change if limit reached or already included
      } else {
        // Remove if unchecked
        const newHazards = currentHazards.filter((h) => h !== hazard)
        // If all hazards are removed, default to "No Hazard"
        if (newHazards.length === 0) {
          return { ...prev, hazardClass: ["No Hazard"] }
        }
        return { ...prev, hazardClass: newHazards }
      }
    })
  }

  // Function to prevent mouse wheel from changing input value
  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur() // Remove focus to prevent value change
    e.preventDefault() // Prevent default scroll behavior
  }

  const resetForm = () => {
    setFormData({
      chemicalFormula: "",
      casNumber: "",
      name: "",
      brand: "",
      category: "",
      hazardClass: [],
      signalWord: "", // Added Signal Word to reset form
      services: "",
      notes: "",
    })
    setDeliveryDate("")
    setExpiryDate("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name) {
      toast.error("Error", {
        description: "Chemical Name is required.",
      })
      return
    }

    if (isAddingNewChemicalType) {
      console.log("[v0] Checking for duplicate chemical:", { name: formData.name, formula: formData.chemicalFormula })

      const duplicateCheck = await checkForDuplicateChemical(formData.name, formData.chemicalFormula)

      console.log("[v0] Duplicate check result:", duplicateCheck)

      if (duplicateCheck.isDuplicate && duplicateCheck.existingChemical) {
        const existingChemical = duplicateCheck.existingChemical
        const duplicateField = duplicateCheck.duplicateType === "name" ? "name" : "chemical formula"
        const chemicalId = existingChemical.chemicalId || existingChemical.id

        console.log("[v0] Showing duplicate toast notification")

        toast.error("Chemical Already Exists", {
          description: `A chemical with the same ${duplicateField} "${duplicateCheck.duplicateType === "name" ? formData.name : formData.chemicalFormula}" already exists with Chemical ID: ${chemicalId}. Instead of creating a duplicate, consider adding it as a unique item/container to the existing "${existingChemical.name}" chemical.`,
          duration: 8000, // Show longer to give user time to read
        })
        return
      }

      console.log("[v0] No duplicate found, proceeding with chemical creation")
    }

    // Only validate numberOfContainers if not editing chemical type and not adding new chemical type (as it's a unique item field)
    if (
      !isEditingChemicalType &&
      !isAddingNewChemicalType &&
      (formData.numberOfContainers === undefined || formData.numberOfContainers <= 0)
    ) {
      toast.error("Error", {
        description: "Number of Containers must be greater than 0.",
      })
      return
    }

    try {
      setIsSubmitting(true)

      let chemicalInventoryId: string

      if (isAddingNewChemicalType) {
        chemicalInventoryId = generatedChemicalId
      } else if (isEditingChemicalType) {
        chemicalInventoryId =
          existingChemicalId ||
          initialGeneralInfo?.chemicalId ||
          initialGeneralInfo?.id ||
          generateChemicalInventoryId(formData.name)
      } else {
        // Fallback to old naming convention for backward compatibility
        chemicalInventoryId = generateChemicalInventoryId(formData.name)
      }

      const chemicalInventoryRef = doc(db!, "chemicalInventory", chemicalInventoryId)

      // Prepare general chemical information
      const generalInfoData: ChemicalGeneralInfo = {
        name: formData.name,
        chemicalFormula: formData.chemicalFormula || "",
        casNumber: formData.casNumber || "", // Added CAS Number
        brand: formData.brand || "",
        category: formData.category || "",
        msdsLink: formData.msdsLink || "",
        hazardClass: formData.hazardClass || [], // Ensure it's an array
        signalWord: formData.signalWord || "", // Added Signal Word to general info data
        storageRequirements: formData.storageRequirements || "",
        services: formData.services || "",
        notes: formData.notes || "",
        id: formData.id,
        chemicalId: formData.chemicalId,
      }

      const cleanGeneralInfoData = Object.fromEntries(
        Object.entries(generalInfoData).filter(([_, value]) => value !== undefined),
      ) as ChemicalGeneralInfo

      if (isEditingChemicalType) {
        await setDoc(
          chemicalInventoryRef,
          {
            ...cleanGeneralInfoData,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        )
        toast.success("Chemical Type Updated", {
          description: `Chemical type "${formData.name}" updated successfully.`,
        })
      } else if (isEditingUniqueItem) {
        // Scenario: Editing an existing unique item
        const uniqueItemRef = doc(db!, "chemicalInventory", chemicalInventoryId, "unique-items", initialData!.id!)
        const uniqueItemData: Omit<ChemicalUniqueItem, "id" | "createdAt" | "updatedAt"> = {
          batchNo: formData.batchNo || "",
          lotNo: formData.lotNo || "",
          deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : null,
          variant: formData.variant || "",
          containerQuantity: formData.containerQuantity ?? null,
          unit: formData.unit || "g",
          numberOfContainers: formData.numberOfContainers ?? 0,
          location: formData.location || "",
          expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
          status: formData.status || "Available",
          recordedBy: initialData?.recordedBy ? initialData.recordedBy : employeeName || "",
          lastUpdatedBy: employeeName || "",
        }
        await updateDoc(uniqueItemRef, {
          ...uniqueItemData,
          updatedAt: serverTimestamp(),
        })
        toast.success("Chemical Item Updated", {
          description: `Chemical item "${formData.name} - ${initialData!.id}" updated successfully.`,
        })
      } else if (isAddingNewChemicalType) {
        // Scenario: Adding a new chemical type only (no unique items)
        await setDoc(
          chemicalInventoryRef,
          {
            ...cleanGeneralInfoData,
            chemicalId: generatedChemicalId, // Store the Chemical ID in the document
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        )

        toast.success("Success", {
          description: `Chemical type "${formData.name}" added successfully with ID: ${generatedChemicalId}.`,
        })
      } else {
        // Scenario: Adding a new unique item to existing chemical
        const uniqueItemId = generateUniqueItemDocId(formData.variant, formData.batchNo, deliveryDate)
        const uniqueItemRef = doc(db!, "chemicalInventory", chemicalInventoryId, "unique-items", uniqueItemId)

        // Check for duplicate unique item ID
        const docSnap = await getDoc(uniqueItemRef)
        if (docSnap.exists()) {
          toast.error("Error", {
            description: `A unique item with this Variant, Batch No., and Delivery Date combination already exists for "${formData.name}". Please use a unique combination.`,
          })
          setIsSubmitting(false)
          return
        }

        // First, ensure the parent chemical type document exists and update its general info
        await setDoc(chemicalInventoryRef, cleanGeneralInfoData, { merge: true })

        // Then, add the new unique item to the subcollection
        const uniqueItemData: Omit<ChemicalUniqueItem, "id" | "createdAt" | "updatedAt"> = {
          batchNo: formData.batchNo || "",
          lotNo: formData.lotNo || "",
          deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : null,
          variant: formData.variant || "",
          containerQuantity: formData.containerQuantity ?? null,
          unit: formData.unit || "g",
          numberOfContainers: formData.numberOfContainers ?? 0,
          location: formData.location || "",
          expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
          status: formData.status || "Available",
          recordedBy: employeeName || "",
          lastUpdatedBy: employeeName || "",
        }
        await setDoc(uniqueItemRef, {
          ...uniqueItemData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })

        toast.success("Success", {
          description: `Chemical item "${formData.name} - ${uniqueItemId}" added successfully.`,
        })
      }

      resetForm()
      setIsSubmitting(false)
      onClose(true) // Pass true to indicate data was successfully saved
    } catch (error) {
      console.error("Error saving chemical:", error)
      toast.error("Error", {
        description: "Failed to save chemical. Please try again.",
      })
      setIsSubmitting(false)
    }
  }

  // Determine disabled states for fields based on mode
  const isGeneralInfoDisabled = isEditingUniqueItem || isAddingNewUniqueItemToExistingChemical
  // Corrected logic: unique item specific fields are only disabled when editing the chemical type's general info
  const isUniqueItemSpecificDisabled = isEditingChemicalType

  const hideUniqueItemFields = true
  // Hide supplier-related fields when adding new chemical type (but not MSDS)
  const hideSupplierFields = isAddingNewChemicalType

  // Determine form title
  const formTitle = () => {
    switch (mode) {
      case "add-new-chemical-type":
        return "Add New Chemical Type"
      case "add-new-unique-item":
        return "Add New Unique Item"
      case "edit-unique-item":
        return "Edit Chemical Item"
      case "edit-chemical-type":
        return "Edit Chemical Type"
      default:
        return "Chemical Form"
    }
  }

  // Determine submit button text
  const submitButtonText = () => {
    if (isSubmitting)
      return (
        <>
          <span className="animate-spin mr-2">⏳</span>Saving...
        </>
      )
    switch (mode) {
      case "add-new-chemical-type":
        return "Add Chemical Type"
      case "add-new-unique-item":
        return "Add Unique Item"
      case "edit-unique-item":
        return "Update Chemical Item"
      case "edit-chemical-type":
        return "Update Chemical Type"
      default:
        return "Submit"
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div className="bg-[#F0EAD6] border border-[#DDD7B1] rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-[10000]">
        <div className="flex justify-between items-center p-4 border-b border-[#4A7C74]">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-[#2F3E2E]">{formTitle()}</h2>
            {isAddingNewChemicalType && generatedChemicalId && (
              <p className="text-sm text-[#8B8378] mt-1">
                Chemical ID: <span className="font-mono font-semibold text-[#4A7C74]">{generatedChemicalId}</span>
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onClose(false)}
            className="text-[#8B8378] hover:text-[#2F3E2E]"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-4">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#4A7C74] pb-2">Basic Information</h3>

                {/* Name field - disabled if adding unique item or editing unique item */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[#2F3E2E]">
                    Name *
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                    placeholder="Enter chemical name (e.g., Sodium Hydroxide)"
                    required
                    disabled={isGeneralInfoDisabled}
                  />
                </div>

                {/* Chemical Formula */}
                <div className="space-y-2">
                  <Label htmlFor="chemicalFormula" className="text-[#2F3E2E]">
                    Chemical Formula
                  </Label>
                  <Input
                    id="chemicalFormula"
                    name="chemicalFormula"
                    value={formData.chemicalFormula || ""}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                    placeholder="e.g. NaOH, H2SO4"
                    disabled={isGeneralInfoDisabled}
                  />
                </div>

                {/* CAS Number - NEW FIELD */}
                <div className="space-y-2">
                  <Label htmlFor="casNumber" className="text-[#2F3E2E]">
                    CAS Number
                  </Label>
                  <Input
                    id="casNumber"
                    name="casNumber"
                    value={formData.casNumber || ""}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                    placeholder="e.g. 1310-73-2"
                    disabled={isGeneralInfoDisabled}
                  />
                  <p className="text-xs text-[#8B8378]">
                    Chemical Abstracts Service Registry Number - unique identifier for chemical substances
                  </p>
                </div>

                {/* Brand field - hidden when adding new chemical type */}
                {!hideSupplierFields && (
                  <div className="space-y-2">
                    <Label htmlFor="brand" className="text-[#2F3E2E]">
                      Brand
                    </Label>
                    <Input
                      id="brand"
                      name="brand"
                      value={formData.brand || ""}
                      onChange={handleChange}
                      className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                      placeholder="e.g., Sigma-Aldrich, Merck"
                      disabled={isEditingUniqueItem}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-[#2F3E2E]">
                    Category
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleSelectChange("category", value)}
                    disabled={isGeneralInfoDisabled}
                  >
                    <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] z-[99999]">
                      <SelectItem value="Reagents">
                        Reagents
                        <p className="text-xs text-[#8B8378]">
                          General-purpose chemicals used in experiments and reactions.
                        </p>
                      </SelectItem>
                      <SelectItem value="Solvents">
                        Solvents
                        <p className="text-xs text-[#8B8378]">
                          Organic or inorganic liquids used to dissolve substances (e.g., ethanol, acetone).
                        </p>
                      </SelectItem>
                      <SelectItem value="Acids">
                        Acids
                        <p className="text-xs text-[#8B8378]">
                          Includes strong and and weak acids (e.g., HCl, acetic acid).
                        </p>
                      </SelectItem>
                      <SelectItem value="Bases / Alkalis">
                        Bases / Alkalis
                        <p className="text-xs text-[#8B8378]">Includes strong and weak bases (e.g., NaOH, ammonia).</p>
                      </SelectItem>
                      <SelectItem value="Salts">
                        Salts
                        <p className="text-xs text-[#8B8378]">Ionic compounds (e.g., NaCl, KNO₃).</p>
                      </SelectItem>
                      <SelectItem value="Indicators / Dyes">
                        Indicators / Dyes
                        <p className="text-xs text-[#8B8378]">
                          pH indicators, staining agents (e.g., phenolphthalein, methylene blue).
                        </p>
                      </SelectItem>
                      <SelectItem value="Buffers">
                        Buffers
                        <p className="text-xs text-[#8B8378]">pH-stabilizing solutions (e.g., phosphate buffer).</p>
                      </SelectItem>
                      <SelectItem value="Standards / Reference Materials">
                        Standards / Reference Materials
                        <p className="text-xs text-[#8B8378]">
                          Certified substances for calibration or quality control.
                        </p>
                      </SelectItem>
                      <SelectItem value="Analytical Reagents">
                        Analytical Reagents
                        <p className="text-xs text-[#8B8378]">High-purity chemicals for tests and measurements.</p>
                      </SelectItem>
                      <SelectItem value="Biologicals / Biochemicals">
                        Biologicals / Biochemicals
                        <p className="text-xs text-[#8B8378]">Enzymes, proteins, nucleic acids, etc.</p>
                      </SelectItem>
                      <SelectItem value="Gases">
                        Gases
                        <p className="text-xs text-[#8B8378]">Compressed or liquefied gases (e.g., nitrogen, CO₂).</p>
                      </SelectItem>
                      <SelectItem value="Hazardous Chemicals">
                        Hazardous Chemicals
                        <p className="text-xs text-[#8B8378]">
                          Toxic, corrosive, flammable, or otherwise regulated substances.
                        </p>
                      </SelectItem>
                      <SelectItem value="Waste / Expired Chemicals">
                        Waste / Expired Chemicals
                        <p className="text-xs text-[#8B8378]">Items to be disposed of or no longer in use.</p>
                      </SelectItem>
                      <SelectItem value="Consumables">
                        Consumables
                        <p className="text-xs text-[#8B8378]">
                          Non-chemical items consumed in procedures (e.g., agar, gel media, ethanol wipes).
                        </p>
                      </SelectItem>
                      <SelectItem value="Prepared Solutions">
                        Prepared Solutions
                        <p className="text-xs text-[#8B8378]">Stock solutions, dilutions, or custom formulations.</p>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Services field */}
                <div className="space-y-2">
                  <Label htmlFor="services" className="text-[#2F3E2E]">
                    Services (e.g., for micronutrients, for Phosphorus analysis)
                  </Label>
                  <Textarea
                    id="services"
                    name="services"
                    value={formData.services || ""}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] min-h-[80px]"
                    placeholder="Enter services or applications for this chemical"
                    disabled={isGeneralInfoDisabled}
                  />
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Safety Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#4A7C74] pb-2">
                  Safety Information
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="hazardClass" className="text-[#2F3E2E]">
                    Hazard Class (Max 4)
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] hover:bg-[#C0B89F]",
                          !formData.hazardClass || (formData.hazardClass.length === 0 && "text-[#8B8378]"),
                        )}
                        disabled={isGeneralInfoDisabled}
                      >
                        {formData.hazardClass && formData.hazardClass.length > 0
                          ? formData.hazardClass.map((h) => (
                              <Badge key={h} className="mr-1 bg-[#4A7C74] text-white hover:bg-[#2F3E2E]">
                                {h}
                              </Badge>
                            ))
                          : "Select hazard class..."}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] z-[99999]">
                      <div className="grid grid-cols-1 gap-1 p-2">
                        {HAZARD_CLASSES.map((hazard) => (
                          <div
                            key={hazard}
                            className="flex items-center space-x-2 p-2 rounded-md hover:bg-[#C0B89F] cursor-pointer"
                            onClick={() =>
                              handleHazardClassChange(hazard, !(formData.hazardClass || []).includes(hazard))
                            }
                          >
                            <Checkbox
                              id={`hazard-${hazard}`}
                              checked={(formData.hazardClass || []).includes(hazard)}
                              onCheckedChange={(checked) => handleHazardClassChange(hazard, checked as boolean)}
                              disabled={
                                isGeneralInfoDisabled ||
                                ((formData.hazardClass || []).length >= 4 &&
                                  !(formData.hazardClass || []).includes(hazard))
                              }
                            />
                            <Label
                              htmlFor={`hazard-${hazard}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {hazard}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signalWord" className="text-[#2F3E2E]">
                    Signal Word
                  </Label>
                  <Select
                    value={formData.signalWord || ""}
                    onValueChange={(value) => handleSelectChange("signalWord", value)}
                    disabled={isGeneralInfoDisabled}
                  >
                    <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                      <SelectValue placeholder="Select signal word" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] z-[99999]">
                      {SIGNAL_WORDS.map((signalWord) => (
                        <SelectItem key={signalWord} value={signalWord}>
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                signalWord === "Non-Hazardous"
                                  ? "bg-blue-600 text-white border border-gray-300"
                                  : signalWord === "Warning"
                                    ? "text-black"
                                    : "bg-red-500 text-black"
                              }`}
                              style={signalWord === "Warning" ? { backgroundColor: "hsl(36, 92%, 51%)" } : {}}
                            >
                              {signalWord}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[#8B8378]">
                    GHS signal word indicating the relative level of severity of hazard
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storageRequirements" className="text-[#2F3E2E]">
                    Storage Requirements
                  </Label>
                  <Select
                    value={formData.storageRequirements || ""}
                    onValueChange={(value) => handleSelectChange("storageRequirements", value)}
                    disabled={isGeneralInfoDisabled}
                  >
                    <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                      <SelectValue placeholder="Select storage requirements" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] z-[99999]">
                      <SelectItem value="Room Temperature">Room Temperature</SelectItem>
                      <SelectItem value="Refrigerated (2-8°C)">Refrigerated (2-8°C)</SelectItem>
                      <SelectItem value="Freezer (-20°C)">Freezer (-20°C)</SelectItem>
                      <SelectItem value="Deep Freeze (-80°C)">Deep Freeze (-80°C)</SelectItem>
                      <SelectItem value="Flammable Cabinet">Flammable Cabinet</SelectItem>
                      <SelectItem value="Acid Cabinet">Acid Cabinet</SelectItem>
                      <SelectItem value="Base Cabinet">Base Cabinet</SelectItem>
                      <SelectItem value="Ventilated">Ventilated</SelectItem>
                      <SelectItem value="Dark">Dark</SelectItem>
                      <SelectItem value="Dry">Dry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* MSDS Link - MOVED TO SAFETY INFORMATION and ALWAYS VISIBLE */}
                <div className="space-y-2">
                  <Label htmlFor="msdsLink" className="text-[#2F3E2E]">
                    MSDS Link
                  </Label>
                  <Input
                    id="msdsLink"
                    name="msdsLink"
                    value={formData.msdsLink || ""}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                    placeholder="Enter MSDS document link"
                    disabled={isGeneralInfoDisabled}
                  />
                  <p className="text-xs text-[#8B8378]">
                    Material Safety Data Sheet - essential safety information for this chemical
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes Section - Full Width */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#4A7C74] pb-2">Additional Notes</h3>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-[#2F3E2E]">
                Notes
              </Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes || ""}
                onChange={handleChange}
                className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] min-h-[100px]"
                placeholder="Enter additional notes or comments about this chemical"
                disabled={isGeneralInfoDisabled}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-[#4A7C74]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose(false)} // Pass false to indicate no data was saved when canceling
              className="bg-transparent border-[#C0B89F] text-[#2F3E2E] hover:bg-[#E0D9C0]"
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-[#E0D9C0] hover:bg-[#C0B89F] text-[#2F3E2E]" disabled={isSubmitting}>
              {submitButtonText()}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
