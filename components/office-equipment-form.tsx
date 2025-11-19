"use client"

import React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  X,
  Upload,
  Tag,
  Box,
  MapPin,
  Factory,
  DollarSign,
  Calendar,
  User,
  AlertCircle,
  Wrench,
  FileText,
  ImageIcon,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
// Removed Popover, PopoverContent, PopoverTrigger, Calendar as ShadcnCalendar, cn imports
import { updateDoc, doc, serverTimestamp, getDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { db, storage, auth } from "@/lib/firebase"
import { toast } from "@/components/ui/use-toast"
import { setDoc, deleteDoc } from "firebase/firestore" // Import setDoc and deleteDoc

// Import default Input component
import { Input } from "@/components/ui/input"
import MemoizedTextarea from "@/components/memoized-textarea"

// Import useDebounce from hooks
import { useDebounce } from "@/hooks/use-debounce"

// OfficeEquipment interface for type safety
interface OfficeEquipment {
  id: string // Firestore document ID
  equipmentId: string // The user-defined equipment code
  name: string
  category: string
  serialNumber: string
  location: string
  manufacturer?: string | null
  model?: string | null
  purchaseDate?: string | null // ISO string
  warrantyExpiration?: string | null // ISO string
  cost?: number | null
  condition?: string | null
  assignedTo?: string | null
  status: string
  notes?: string | null
  imageUrl?: string | null
  voltage?: string | null
  brand?: string | null
  createdAt?: { seconds: number; nanoseconds: number } | string
  createdBy?: string
  updatedAt?: { seconds: number; nanoseconds: number } | string
  lastUpdatedBy?: string
  [key: string]: string | number | undefined | null | { seconds: number; nanoseconds: number }
}

interface OfficeEquipmentFormProps {
  onClose: () => void
  initialData?: OfficeEquipment | null
}

// Helper function to create form groups with icons (moved outside and memoized)
const FormField = React.memo(function FormField({
  label,
  id,
  children,
  icon,
  required = false,
}: {
  label: string
  id: string
  children: React.ReactNode
  icon: React.ReactNode
  required?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-[#2F3E2E] flex items-center gap-1">
        {icon}
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
    </div>
  )
})

// Get current user email
function getCurrentUser() {
  if (typeof window !== "undefined") {
    if (auth) {
      const user = auth.currentUser
      return user?.email || "Unknown User"
    } else {
      console.warn("Firebase Auth is not initialized. Returning 'Unknown User'.")
      return "Unknown User"
    }
  }
  return "Unknown User"
}

// Compress image before upload
async function compressImage(file: File, quality = 0.2): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.crossOrigin = "anonymous" // Set crossOrigin for canvas image drawing
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        const MAX_WIDTH = 800
        const MAX_HEIGHT = 800
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height
            height = MAX_HEIGHT
          }
        }

        canvas.width = width
        canvas.height = height

        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Canvas to Blob conversion failed"))
              return
            }
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          },
          "image/jpeg",
          quality,
        )
      }
      img.onerror = (error) => reject(error)
    }
    reader.onerror = (error) => reject(error)
  })
}

export default function OfficeEquipmentForm({ onClose, initialData }: OfficeEquipmentFormProps) {
  const [formData, setFormData] = useState<Omit<OfficeEquipment, "id" | "createdAt" | "updatedAt">>({
    equipmentId: "",
    name: "",
    category: "",
    serialNumber: "",
    location: "",
    status: "Available", // Default status
    manufacturer: null,
    model: null,
    purchaseDate: null,
    warrantyExpiration: null,
    cost: null,
    condition: null,
    assignedTo: null,
    notes: null,
    imageUrl: null,
    voltage: null,
    brand: null,
  })

  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [equipmentIdExists, setEquipmentIdExists] = useState(false)

  // Date states for general details (now storing YYYY-MM-DD strings for native input)
  const [purchaseDate, setPurchaseDate] = useState<string | undefined>(undefined)
  const [warrantyExpiration, setWarrantyExpiration] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (initialData) {
      setFormData({
        equipmentId: initialData.equipmentId || "",
        name: initialData.name || "",
        category: initialData.category || "",
        serialNumber: initialData.serialNumber || "",
        location: initialData.location || "",
        manufacturer: initialData.manufacturer || null,
        model: initialData.model || null,
        purchaseDate: initialData.purchaseDate || null,
        warrantyExpiration: initialData.warrantyExpiration || null,
        cost: initialData.cost !== null ? Number(initialData.cost) : null,
        condition: initialData.condition || null,
        assignedTo: initialData.assignedTo || null,
        status: initialData.status || "Available",
        notes: initialData.notes || null,
        imageUrl: initialData.imageUrl || null,
        voltage: initialData.voltage || null,
        brand: initialData.brand || null,
      })

      // Set date states if available, format to YYYY-MM-DD for native input
      if (initialData.purchaseDate) setPurchaseDate(format(new Date(initialData.purchaseDate), "yyyy-MM-dd"))
      if (initialData.warrantyExpiration)
        setWarrantyExpiration(format(new Date(initialData.warrantyExpiration), "yyyy-MM-dd"))

      // Set image preview if available
      if (initialData.imageUrl) {
        setImagePreview(initialData.imageUrl)
      }
    }
  }, [initialData])

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.classList.add("overflow-hidden")
    const overlayDiv = document.createElement("div")
    overlayDiv.id = "modal-backdrop"
    overlayDiv.style.position = "fixed"
    overlayDiv.style.top = "0"
    overlayDiv.style.left = "0"
    overlayDiv.style.width = "100vw"
    overlayDiv.style.height = "100vh"
    overlayDiv.style.backgroundColor = "rgba(0, 0, 0, 0.8)"
    overlayDiv.style.zIndex = "40"
    document.body.appendChild(overlayDiv)

    return () => {
      document.body.classList.remove("overflow-hidden")
      const existingOverlay = document.getElementById("modal-backdrop")
      if (existingOverlay) {
        document.body.removeChild(existingOverlay)
      }
    }
  }, [])

  // Check if equipment ID already exists
  const checkEquipmentIdExists = useCallback(
    async (equipmentId: string) => {
      if (!equipmentId.trim()) {
        setEquipmentIdExists(false)
        return false
      }

      try {
        const equipmentRef = doc(db!, "officeEquipment", equipmentId)
        const equipmentDoc = await getDoc(equipmentRef)

        if (initialData && initialData.equipmentId === equipmentId) {
          setEquipmentIdExists(false)
          return false
        }

        const exists = equipmentDoc.exists()
        setEquipmentIdExists(exists)
        return exists
      } catch (error) {
        console.error("Error checking equipment ID:", error)
        return false
      }
    },
    [initialData],
  )

  // Debounce the checkEquipmentIdExists function
  const debouncedCheckEquipmentIdExists = useDebounce(checkEquipmentIdExists, 500)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target

      if (name === "equipmentId") {
        debouncedCheckEquipmentIdExists(value)
      }

      setFormData((prev) => ({ ...prev, [name]: value }))
    },
    [debouncedCheckEquipmentIdExists],
  )

  const handleSelectChange = useCallback((name: keyof OfficeEquipment, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }, [])

  // Handle image upload
  const handleImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image must be less than 5MB",
          variant: "destructive",
        })
        return
      }

      try {
        const compressedFile = await compressImage(file, 0.2)
        setImage(compressedFile)
        setImagePreview(URL.createObjectURL(compressedFile))
      } catch (error) {
        console.error("Error compressing image:", error)
        setImage(file)
        setImagePreview(URL.createObjectURL(file))
        toast({
          title: "Image compression failed",
          description: "Using original image instead",
          variant: "destructive",
        })
      }
    }
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      if (typeof formData.equipmentId !== "string" || !formData.equipmentId.trim()) {
        toast({
          title: "Equipment ID required",
          description: "Please enter an equipment ID",
          variant: "destructive",
        })
        return
      }

      const idExists = await checkEquipmentIdExists(String(formData.equipmentId))
      if (idExists && !initialData) {
        toast({
          title: "Equipment ID already exists",
          description: "Please use a different equipment ID",
          variant: "destructive",
        })
        return
      }

      const username = getCurrentUser()

      const dataToSave: Omit<OfficeEquipment, "id"> = {
        equipmentId: formData.equipmentId,
        name: String(formData.name || ""),
        category: String(formData.category || ""),
        serialNumber: String(formData.serialNumber || ""),
        location: String(formData.location || ""),
        manufacturer: formData.manufacturer || null,
        model: formData.model || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : null, // Convert back to ISO string for storage
        warrantyExpiration: warrantyExpiration ? new Date(warrantyExpiration).toISOString() : null, // Convert back to ISO string for storage
        cost: formData.cost !== null ? Number(formData.cost) : null,
        condition: formData.condition || null,
        assignedTo: formData.assignedTo || null,
        status: String(formData.status || ""),
        notes: formData.notes || null,
        imageUrl: formData.imageUrl || null,
        voltage: formData.voltage || null,
        brand: formData.brand || null,
        updatedAt: serverTimestamp(),
        lastUpdatedBy: username,
      }

      // Ensure null for empty strings for optional fields
      Object.keys(dataToSave).forEach((key) => {
        const typedKey = key as keyof typeof dataToSave
        if (typeof dataToSave[typedKey] === "string" && (dataToSave[typedKey] as string).trim() === "") {
          dataToSave[typedKey] = null
        }
      })

      try {
        setFormSubmitting(true)

        // Handle image upload for equipment (main image)
        if (image) {
          setUploading(true)
          if (initialData?.imageUrl) {
            try {
              if (!storage) {
                throw new Error("Firebase storage is not initialized.")
              }
              const oldImageRef = ref(storage, initialData.imageUrl)
              await deleteObject(oldImageRef)
            } catch (error) {
              console.error("Error deleting old office equipment image:", error)
            }
          }

          try {
            if (!storage) {
              throw new Error("Firebase storage is not initialized.")
            }
            const storageRef = ref(storage, `office_equipment_images/${Date.now()}_${image.name}`)
            await uploadBytes(storageRef, image)
            const downloadURL = await getDownloadURL(storageRef)
            dataToSave.imageUrl = downloadURL
            setUploading(false)
          } catch (error) {
            console.error("Error uploading office equipment image:", error)
            setUploading(false)
          }
        } else if (initialData?.imageUrl && !imagePreview) {
          // If image was removed
          try {
            if (!storage) throw new Error("Firebase storage is not initialized.")
            const oldImageRef = ref(storage, initialData.imageUrl)
            await deleteObject(oldImageRef)
            dataToSave.imageUrl = null
          } catch (error) {
            console.error("Error deleting office equipment image on removal:", error)
          }
        }

        if (initialData) {
          try {
            if (initialData.equipmentId !== formData.equipmentId) {
              // If equipmentId changed, create new doc and delete old one
              await setDoc(doc(db!, "officeEquipment", formData.equipmentId), {
                ...dataToSave,
                createdAt: initialData.createdAt, // Preserve original creation timestamp
                createdBy: initialData.createdBy, // Preserve original creator
              })
              await deleteDoc(doc(db!, "officeEquipment", initialData.id))
              toast({
                title: "Office Equipment updated",
                description: "Office equipment has been updated with new ID",
              })
            } else {
              // Update existing document
              await updateDoc(doc(db!, "officeEquipment", initialData.id), dataToSave)
              toast({
                title: "Office Equipment updated",
                description: "Office equipment has been updated successfully",
              })
            }
          } catch (error) {
            console.error("Error updating office equipment:", error)
            toast({
              title: "Update failed",
              description: "Failed to update office equipment. Please try again.",
              variant: "destructive",
            })
            setFormSubmitting(false)
            return
          }
        } else {
          // Add new document
          await setDoc(doc(db!, "officeEquipment", formData.equipmentId), {
            ...dataToSave,
            createdAt: serverTimestamp(),
            createdBy: username,
          })
          toast({
            title: "Office Equipment added",
            description: "New office equipment has been added successfully",
          })
        }

        onClose()
      } catch (error) {
        console.error("Error saving office equipment:", error)
        toast({
          title: "Error",
          description: "Failed to save office equipment. Please try again.",
          variant: "destructive",
        })
      } finally {
        setFormSubmitting(false)
      }
    },
    [formData, initialData, image, imagePreview, purchaseDate, warrantyExpiration, checkEquipmentIdExists, onClose],
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-[#F0EAD6] border border-[#DDD7B1] rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-50">
        <div className="flex justify-between items-center p-4 border-b border-[#4A7C74] print:border-gray-300 print:bg-gray-100">
          <h2 className="text-xl font-bold text-[#2F3E2E] print:text-black">
            {initialData ? "Edit Office Equipment" : "Add New Office Equipment"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-[#8B8378] hover:text-[#2F3E2E]">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-4">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2 flex items-center gap-1">
                  <Box className="h-4 w-4 text-[#4A7C74]" />
                  Basic Information
                </h3>

                <FormField
                  label="Equipment ID"
                  id="equipmentId"
                  icon={<Tag className="h-4 w-4 text-[#4A7C74]" />}
                  required
                >
                  <Input
                    id="equipmentId"
                    name="equipmentId"
                    value={formData.equipmentId ?? ""}
                    onChange={handleChange}
                    className={`bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] ${equipmentIdExists ? "border-red-500" : ""}`}
                    placeholder="Enter equipment ID"
                    required
                    disabled={!!initialData}
                  />
                  {equipmentIdExists && (
                    <p className="text-red-600 text-sm mt-1">
                      This Equipment ID already exists. Please use a different ID.
                    </p>
                  )}
                </FormField>

                <FormField label="Name" id="name" icon={<Box className="h-4 w-4 text-[#4A7C74]" />} required>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name ?? ""}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                    placeholder="Enter equipment name"
                    required
                  />
                </FormField>

                <FormField label="Category" id="category" icon={<Box className="h-4 w-4 text-[#4A7C74]" />} required>
                  <Select
                    value={String(formData.category ?? "")}
                    onValueChange={(value) => handleSelectChange("category", value)}
                    required
                  >
                    <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] z-[60]">
                      <SelectItem value="Computer">Computer</SelectItem>
                      <SelectItem value="Printer">Printer</SelectItem>
                      <SelectItem value="Monitor">Monitor</SelectItem>
                      <SelectItem value="Furniture">Furniture</SelectItem>
                      <SelectItem value="Network Device">Network Device</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField
                  label="Serial Number"
                  id="serialNumber"
                  icon={<Tag className="h-4 w-4 text-[#4A7C74]" />}
                  required
                >
                  <Input
                    id="serialNumber"
                    name="serialNumber"
                    value={formData.serialNumber ?? ""}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                    placeholder="Enter serial number"
                    required
                  />
                </FormField>

                <FormField label="Location" id="location" icon={<MapPin className="h-4 w-4 text-[#4A7C74]" />} required>
                  <Input
                    id="location"
                    name="location"
                    value={formData.location ?? ""}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                    placeholder="Enter location"
                    required
                  />
                </FormField>
              </div>

              {/* Brand & Manufacturer Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2 flex items-center gap-1">
                  <Factory className="h-4 w-4 text-[#4A7C74]" />
                  Brand & Manufacturer
                </h3>

                <FormField label="Brand" id="brand" icon={<Factory className="h-4 w-4 text-[#4A7C74]" />}>
                  <Input
                    id="brand"
                    name="brand"
                    value={formData.brand ?? ""}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                    placeholder="Enter brand"
                  />
                </FormField>

                <FormField label="Manufacturer" id="manufacturer" icon={<Factory className="h-4 w-4 text-[#4A7C74]" />}>
                  <Input
                    id="manufacturer"
                    name="manufacturer"
                    value={formData.manufacturer ?? ""}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                    placeholder="Enter manufacturer"
                  />
                </FormField>

                <FormField label="Model" id="model" icon={<Box className="h-4 w-4 text-[#4A7C74]" />}>
                  <Input
                    id="model"
                    name="model"
                    value={formData.model ?? ""}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                    placeholder="Enter model"
                  />
                </FormField>

                <FormField label="Voltage" id="voltage" icon={<Zap className="h-4 w-4 text-[#4A7C74]" />}>
                  <Input
                    id="voltage"
                    name="voltage"
                    value={formData.voltage ?? ""}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                    placeholder="e.g., 220V"
                  />
                </FormField>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Image Upload */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2 flex items-center gap-1">
                  <ImageIcon className="h-4 w-4 text-[#4A7C74]" />
                  Equipment Image
                </h3>

                <div className="flex flex-col items-center space-y-4">
                  <div className="w-32 h-32 border-2 border-dashed border-[#C0B89F] rounded-md flex items-center justify-center overflow-hidden bg-[#E0D9C0]/50">
                    {imagePreview ? (
                      <img
                        src={imagePreview || "/placeholder.svg"}
                        alt="Equipment preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[#8B8378] text-sm text-center p-2">No image</span>
                    )}
                  </div>

                  <div className="flex items-center">
                    <Label htmlFor="image" className="cursor-pointer">
                      <div className="flex items-center gap-2 bg-[#E0D9C0] hover:bg-[#C0B89F] text-[#2F3E2E] px-3 py-2 rounded-md">
                        <Upload className="h-4 w-4" />
                        <span>{imagePreview ? "Change Image" : "Upload Image"}</span>
                      </div>
                      <Input id="image" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </Label>

                    {imagePreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-red-600 hover:text-red-500 hover:bg-[#E0D9C0] ml-2"
                        onClick={() => {
                          setImage(null)
                          setImagePreview(null)
                          setFormData((prev) => ({ ...prev, imageUrl: null }))
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-[#8B8378]">Max size: 5MB. Recommended: 2x2 ratio</p>
                </div>
              </div>

              {/* Purchase & Warranty */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2 flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-[#4A7C74]" />
                  Purchase & Warranty
                </h3>

                <FormField
                  label="Purchase Date"
                  id="purchaseDate"
                  icon={<Calendar className="h-4 w-4 text-[#4A7C74]" />}
                >
                  <Input
                    id="purchaseDate"
                    name="purchaseDate"
                    type="date"
                    value={purchaseDate ?? ""}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                  />
                </FormField>

                <FormField
                  label="Warranty Expiration"
                  id="warrantyExpiration"
                  icon={<Calendar className="h-4 w-4 text-[#4A7C74]" />}
                >
                  <Input
                    id="warrantyExpiration"
                    name="warrantyExpiration"
                    type="date"
                    value={warrantyExpiration ?? ""}
                    onChange={(e) => setWarrantyExpiration(e.target.value)}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                  />
                </FormField>

                <FormField label="Cost (PHP)" id="cost" icon={<DollarSign className="h-4 w-4 text-[#4A7C74]" />}>
                  <Input
                    id="cost"
                    name="cost"
                    type="number"
                    value={formData.cost ?? ""}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                    placeholder="Enter cost"
                  />
                </FormField>
              </div>

              {/* Status and Condition */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-[#4A7C74]" />
                  Status and Condition
                </h3>

                <FormField
                  label="Status"
                  id="status"
                  icon={<AlertCircle className="h-4 w-4 text-[#4A7C74]" />}
                  required
                >
                  <Select
                    value={String(formData.status ?? "")}
                    onValueChange={(value) => handleSelectChange("status", value)}
                    required
                  >
                    <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] z-[60]">
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="In Use">In Use</SelectItem>
                      <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                      <SelectItem value="Retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Condition" id="condition" icon={<Wrench className="h-4 w-4 text-[#4A7C74]" />}>
                  <Select
                    value={String(formData.condition ?? "")}
                    onValueChange={(value) => handleSelectChange("condition", value)}
                  >
                    <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] z-[60]">
                      <SelectItem value="Excellent">Excellent</SelectItem>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Fair">Fair</SelectItem>
                      <SelectItem value="Poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Assigned To" id="assignedTo" icon={<User className="h-4 w-4 text-[#4A7C74]" />}>
                  <Input
                    id="assignedTo"
                    name="assignedTo"
                    value={formData.assignedTo ?? ""}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                    placeholder="Enter person responsible"
                  />
                </FormField>

                <FormField label="Notes" id="notes" icon={<FileText className="h-4 w-4 text-[#4A7C74]" />}>
                  <MemoizedTextarea
                    id="notes"
                    name="notes"
                    value={formData.notes ?? ""}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] min-h-[80px]"
                    placeholder="Add any additional notes"
                  />
                </FormField>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-[#DDD7B1]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-transparent border-[#C0B89F] text-[#2F3E2E] hover:bg-[#E0D9C0]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#E0D9C0] hover:bg-[#C0B89F] text-[#2F3E2E]"
              disabled={formSubmitting || uploading || equipmentIdExists}
            >
              {formSubmitting || uploading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  {uploading ? "Uploading..." : "Saving..."}
                </>
              ) : initialData ? (
                "Update Equipment"
              ) : (
                "Add Equipment"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
