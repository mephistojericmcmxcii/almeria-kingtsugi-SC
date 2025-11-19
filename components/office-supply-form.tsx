"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  X,
  Upload,
  Package,
  AlertTriangle,
  Info,
  Tag,
  MapPin,
  Factory,
  DollarSign,
  Calendar,
  FileText,
  ImageIcon,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDocs } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { db, storage, auth } from "@/lib/firebase"
import { toast } from "@/components/ui/use-toast"

// Import memoized input components
import MemoizedInput from "@/components/memoized-input"
import MemoizedTextarea from "@/components/memoized-textarea"

// Interface for OfficeSupply (updated to match view and new fields, using itemName)
interface OfficeSupply {
  id: string // Firestore document ID
  itemName: string // Corresponds to name in form
  category: string
  quantity: number
  unit: string
  location: string
  unitPrice?: number // Corresponds to costPerUnit in form
  supplier?: string
  purchaseDate?: string
  reorderLevel?: number
  notes?: string
  imageUrl?: string
  deliveryDate?: string
  brand?: string
  additionalVariant?: string
  status: string // e.g., "In Stock", "Low Stock", "Out of Stock"
  createdAt?: { seconds: number; nanoseconds: number } | string
  createdBy?: string
  updatedAt?: { seconds: number; nanoseconds: number } | string
  lastUpdatedBy?: string
}

interface Supplier {
  id: string
  name: string
}

interface OfficeSupplyFormProps {
  onClose: () => void
  initialData?: OfficeSupply | null
}

// Helper function to create form groups with icons (copied from equipment-form)
const FormField = React.memo(function FormField({
  label,
  id,
  children,
  icon,
}: {
  label: string
  id: string
  children: React.ReactNode
  icon: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-[#2F3E2E] flex items-center gap-1">
        {icon}
        {label}
      </Label>
      {children}
    </div>
  )
})

// Get current user email (copied from equipment-form)
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

// Compress image before upload (copied from equipment-form)
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

export default function OfficeSupplyForm({ onClose, initialData }: OfficeSupplyFormProps) {
  const [formData, setFormData] = useState<Partial<OfficeSupply>>(
    initialData || {
      itemName: "",
      category: "",
      quantity: 0,
      unit: "",
      location: "",
      status: "In Stock", // Default status
      unitPrice: undefined,
      supplier: undefined,
      purchaseDate: undefined,
      reorderLevel: undefined,
      notes: undefined,
      imageUrl: undefined,
      deliveryDate: undefined,
      brand: undefined,
      additionalVariant: undefined,
    },
  )
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [customSupplier, setCustomSupplier] = useState("")
  const [showCustomSupplier, setShowCustomSupplier] = useState(false)

  // Fetch suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const suppliersRef = collection(db!, "suppliers")
        const querySnapshot = await getDocs(suppliersRef)
        const suppliersList: Supplier[] = []

        querySnapshot.forEach((doc) => {
          suppliersList.push({
            id: doc.id,
            name: doc.data().name || doc.data().companyName || "Unknown",
          })
        })

        setSuppliers(suppliersList)
      } catch (error) {
        console.error("Error fetching suppliers:", error)
      }
    }

    fetchSuppliers()
  }, [])

  // Initialize form with initial data
  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        itemName: initialData.itemName || "",
        category: initialData.category || "",
        quantity: initialData.quantity || 0,
        unit: initialData.unit || "",
        location: initialData.location || "",
        unitPrice: initialData.unitPrice,
        supplier: initialData.supplier,
        purchaseDate: initialData.purchaseDate,
        reorderLevel: initialData.reorderLevel,
        notes: initialData.notes,
        imageUrl: initialData.imageUrl,
        deliveryDate: initialData.deliveryDate,
        brand: initialData.brand,
        additionalVariant: initialData.additionalVariant,
        status: initialData.status || "In Stock",
      })

      // Set image preview if available
      if (initialData.imageUrl) {
        setImagePreview(initialData.imageUrl)
      }

      // Check if supplier is not in the list
      if (initialData.supplier && !suppliers.some((s) => s.name === initialData.supplier)) {
        setCustomSupplier(initialData.supplier)
        setShowCustomSupplier(true)
      }
    }
  }, [initialData, suppliers])

  // Lock body scroll when modal is open (copied from equipment-form)
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

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { id, value } = e.target
      const newValue = id === "quantity" || id === "unitPrice" || id === "reorderLevel" ? Number(value) : value

      setFormData((prev) => ({ ...prev, [id]: newValue }))
      if (errors[id]) {
        setErrors((prev) => ({ ...prev, [id]: "" }))
      }
    },
    [errors],
  )

  const handleSelectChange = useCallback(
    (id: keyof OfficeSupply, value: string) => {
      if (id === "supplier" && value === "custom") {
        setShowCustomSupplier(true)
        setFormData((prev) => ({ ...prev, [id]: "" })) // Clear supplier if custom is selected
      } else if (id === "supplier") {
        setShowCustomSupplier(false)
        setFormData((prev) => ({ ...prev, [id]: value }))
      } else {
        setFormData((prev) => ({ ...prev, [id]: value }))
      }

      if (errors[id]) {
        setErrors((prev) => ({ ...prev, [id]: "" }))
      }
    },
    [errors],
  )

  const handleCustomSupplierChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCustomSupplier(value)
    setFormData((prev) => ({ ...prev, supplier: value }))
  }, [])

  // Handle date change for native date input
  const handleDateInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { id, value } = e.target
      setFormData((prev) => ({ ...prev, [id]: value }))
      if (errors[id]) {
        setErrors((prev) => ({ ...prev, [id]: "" }))
      }
    },
    [errors],
  )

  // Handle image upload (copied from equipment-form)
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.itemName) newErrors.itemName = "Name is required."
    if (!formData.category) newErrors.category = "Category is required."
    if (formData.quantity === undefined || formData.quantity < 0)
      newErrors.quantity = "Quantity must be a non-negative number."
    if (!formData.unit) newErrors.unit = "Unit is required."
    if (!formData.location) newErrors.location = "Location is required."
    if (!formData.status) newErrors.status = "Status is required."
    if (formData.reorderLevel !== undefined && formData.reorderLevel < 0)
      newErrors.reorderLevel = "Reorder Level must be a non-negative number."
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!validateForm()) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields correctly.",
          variant: "destructive",
        })
        return
      }

      setLoading(true)
      const username = getCurrentUser()
      const timestamp = serverTimestamp()

      let imageUrlToSave = formData.imageUrl

      try {
        // Handle image upload
        if (image) {
          setUploadingImage(true)
          // Delete old image if exists and is different
          if (initialData?.imageUrl && initialData.imageUrl !== imagePreview) {
            try {
              if (!storage) throw new Error("Firebase storage is not initialized.")
              const oldImageRef = ref(storage, initialData.imageUrl)
              await deleteObject(oldImageRef)
            } catch (error) {
              console.error("Error deleting old supply image:", error)
            }
          }

          try {
            if (!storage) throw new Error("Firebase storage is not initialized.")
            const storageRef = ref(storage, `office_supplies/${Date.now()}_${image.name}`)
            await uploadBytes(storageRef, image)
            imageUrlToSave = await getDownloadURL(storageRef)
            setUploadingImage(false)
          } catch (error) {
            console.error("Error uploading supply image:", error)
            setUploadingImage(false)
            toast({
              title: "Image upload failed",
              description: "Failed to upload image. Please try again.",
              variant: "destructive",
            })
            return // Stop submission if image upload fails
          }
        } else if (initialData?.imageUrl && !imagePreview) {
          // If image was removed
          try {
            if (!storage) throw new Error("Firebase storage is not initialized.")
            const oldImageRef = ref(storage, initialData.imageUrl)
            await deleteObject(oldImageRef)
            imageUrlToSave = undefined // Set to undefined or null to remove from Firestore
          } catch (error) {
            console.error("Error deleting supply image on removal:", error)
          }
        }

        const dataToSave: Partial<OfficeSupply> = {
          itemName: formData.itemName,
          category: formData.category,
          quantity: Number(formData.quantity),
          unit: formData.unit,
          location: formData.location,
          unitPrice: formData.unitPrice ? Number(formData.unitPrice) : undefined,
          supplier: showCustomSupplier ? customSupplier : formData.supplier,
          purchaseDate: formData.purchaseDate,
          reorderLevel: formData.reorderLevel ? Number(formData.reorderLevel) : undefined,
          notes: formData.notes,
          imageUrl: imageUrlToSave,
          deliveryDate: formData.deliveryDate,
          brand: formData.brand,
          additionalVariant: formData.additionalVariant,
          status: formData.status,
          updatedAt: timestamp,
          lastUpdatedBy: username,
        }

        // Clean up undefined values before saving to Firestore
        Object.keys(dataToSave).forEach((key) => {
          if (dataToSave[key as keyof OfficeSupply] === undefined) {
            delete dataToSave[key as keyof OfficeSupply]
          }
        })

        if (initialData) {
          // Update existing document
          await updateDoc(doc(db!, "officeSupplies", initialData.id), dataToSave)
          toast({
            title: "Success",
            description: "Office supply updated successfully!",
          })
        } else {
          // Add new document
          await addDoc(collection(db!, "officeSupplies"), {
            ...dataToSave,
            createdAt: timestamp,
            createdBy: username,
          })
          toast({
            title: "Success",
            description: "New office supply added successfully!",
          })
        }
        onClose()
      } catch (error) {
        console.error("Error saving office supply:", error)
        toast({
          title: "Error",
          description: `Failed to save office supply: ${error instanceof Error ? error.message : String(error)}`,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
        setUploadingImage(false)
      }
    },
    [formData, initialData, image, imagePreview, onClose, customSupplier, showCustomSupplier],
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-[#F0EAD6] border border-[#DDD7B1] rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto relative z-50">
        <div className="flex justify-between items-center p-4 border-b border-[#4A7C74] print:border-gray-300 print:bg-gray-100">
          <h2 className="text-xl font-bold text-[#2F3E2E] print:text-black">
            {initialData ? "Edit Office Supply" : "Add New Office Supply"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-[#8B8378] hover:text-[#2F3E2E]">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column - Basic Information & Inventory Details */}
            <div className="space-y-4">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2 flex items-center gap-1">
                  <Package className="h-4 w-4 text-[#4A7C74]" />
                  Basic Information
                </h3>

                <FormField label="Name *" id="itemName" icon={<FileText className="h-4 w-4 text-[#4A7C74]" />}>
                  <MemoizedInput
                    id="itemName"
                    value={formData.itemName || ""}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                    required
                  />
                  {errors.itemName && <p className="text-red-500 text-xs">{errors.itemName}</p>}
                </FormField>

                <FormField label="Category *" id="category" icon={<Package className="h-4 w-4 text-[#4A7C74]" />}>
                  <Select
                    onValueChange={(value) => handleSelectChange("category", value)}
                    value={formData.category || ""}
                  >
                    <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#F0EAD6] text-[#2F3E2E] border border-[#DDD7B1] z-[60]">
                      <SelectItem value="Stationery">Stationery</SelectItem>
                      <SelectItem value="Cleaning Supplies">Cleaning Supplies</SelectItem>
                      <SelectItem value="Breakroom Supplies">Breakroom Supplies</SelectItem>
                      <SelectItem value="Paper Products">Paper Products</SelectItem>
                      <SelectItem value="Ink/Toner">Ink/Toner</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-red-500 text-xs">{errors.category}</p>}
                </FormField>

                <FormField label="Supplier" id="supplier" icon={<Factory className="h-4 w-4 text-[#4A7C74]" />}>
                  <Select
                    value={showCustomSupplier ? "custom" : String(formData.supplier ?? "")}
                    onValueChange={(value) => handleSelectChange("supplier", value)}
                  >
                    <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E] max-h-60 z-[60]">
                      <SelectItem value="N/A">N/A</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.name}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom (not in list)</SelectItem>
                    </SelectContent>
                  </Select>

                  {showCustomSupplier && (
                    <div className="mt-2">
                      <MemoizedInput
                        id="customSupplier"
                        value={customSupplier}
                        onChange={handleCustomSupplierChange}
                        className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] mt-2"
                        placeholder="Enter custom supplier name"
                      />
                    </div>
                  )}
                </FormField>

                <FormField label="Brand" id="brand" icon={<Factory className="h-4 w-4 text-[#4A7C74]" />}>
                  <MemoizedInput
                    id="brand"
                    value={formData.brand || ""}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                    placeholder="Enter brand name"
                  />
                </FormField>

                <FormField
                  label="Additional Variant"
                  id="additionalVariant"
                  icon={<Tag className="h-4 w-4 text-[#4A7C74]" />}
                >
                  <MemoizedInput
                    id="additionalVariant"
                    value={formData.additionalVariant || ""}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                    placeholder="e.g., Color, Size, Model"
                  />
                </FormField>
              </div>

              {/* Inventory Details Section */}
              <div className="space-y-4 mt-6">
                <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2 flex items-center gap-1">
                  <Info className="h-4 w-4 text-[#4A7C74]" />
                  Inventory Details
                </h3>

                <FormField label="Quantity *" id="quantity" icon={<AlertCircle className="h-4 w-4 text-[#4A7C74]" />}>
                  <MemoizedInput
                    id="quantity"
                    type="number"
                    value={formData.quantity || 0}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                    required
                  />
                  {errors.quantity && <p className="text-red-500 text-xs">{errors.quantity}</p>}
                </FormField>

                <FormField label="Unit *" id="unit" icon={<Tag className="h-4 w-4 text-[#4A7C74]" />}>
                  <MemoizedInput
                    id="unit"
                    value={formData.unit || ""}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                    required
                  />
                  {errors.unit && <p className="text-red-500 text-xs">{errors.unit}</p>}
                </FormField>

                <FormField label="Location *" id="location" icon={<MapPin className="h-4 w-4 text-[#4A7C74]" />}>
                  <MemoizedInput
                    id="location"
                    value={formData.location || ""}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                    required
                  />
                  {errors.location && <p className="text-red-500 text-xs">{errors.location}</p>}
                </FormField>

                <FormField label="Unit Price" id="unitPrice" icon={<DollarSign className="h-4 w-4 text-[#4A7C74]" />}>
                  <MemoizedInput
                    id="unitPrice"
                    type="number"
                    value={formData.unitPrice || ""}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                    placeholder="Enter cost per unit"
                  />
                </FormField>

                <FormField
                  label="Reorder Level"
                  id="reorderLevel"
                  icon={<AlertTriangle className="h-4 w-4 text-[#4A7C74]" />}
                >
                  <MemoizedInput
                    id="reorderLevel"
                    type="number"
                    value={formData.reorderLevel || ""}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                    placeholder="Enter reorder level"
                  />
                  {errors.reorderLevel && <p className="text-red-500 text-xs">{errors.reorderLevel}</p>}
                </FormField>

                <FormField
                  label="Purchase Date"
                  id="purchaseDate"
                  icon={<Calendar className="h-4 w-4 text-[#4A7C74]" />}
                >
                  <MemoizedInput
                    id="purchaseDate"
                    type="date"
                    value={formData.purchaseDate || ""}
                    onChange={handleDateInputChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                  />
                </FormField>

                <FormField
                  label="Delivery Date"
                  id="deliveryDate"
                  icon={<Calendar className="h-4 w-4 text-[#4A7C74]" />}
                >
                  <MemoizedInput
                    id="deliveryDate"
                    type="date"
                    value={formData.deliveryDate || ""}
                    onChange={handleDateInputChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                  />
                </FormField>
              </div>
            </div>

            {/* Right column - Image Upload, Status & Additional Details */}
            <div className="space-y-4">
              {/* Image Upload */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2 flex items-center gap-1">
                  <ImageIcon className="h-4 w-4 text-[#4A7C74]" />
                  Supply Image
                </h3>

                <div className="flex flex-col items-center space-y-4">
                  <div className="w-32 h-32 border-2 border-dashed border-[#C0B89F] rounded-md flex items-center justify-center overflow-hidden bg-[#E0D9C0]/50">
                    {imagePreview ? (
                      <img
                        src={imagePreview || "/placeholder.svg"}
                        alt="Supply preview"
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
                      <MemoizedInput
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </Label>

                    {imagePreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-red-600 hover:text-red-500 hover:bg-[#E0D9C0] ml-2"
                        onClick={() => {
                          setImage(null)
                          setImagePreview(null)
                          setFormData((prev) => ({ ...prev, imageUrl: undefined }))
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-[#8B8378]">Max size: 5MB. Recommended: 2x2 ratio</p>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-4 mt-6">
                <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-[#4A7C74]" />
                  Status
                </h3>
                <FormField label="Status *" id="status" icon={<AlertCircle className="h-4 w-4 text-[#4A7C74]" />}>
                  <Select onValueChange={(value) => handleSelectChange("status", value)} value={formData.status || ""}>
                    <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#F0EAD6] text-[#2F3E2E] border border-[#DDD7B1] z-[60]">
                      <SelectItem value="In Stock">In Stock</SelectItem>
                      <SelectItem value="Low Stock">Low Stock</SelectItem>
                      <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.status && <p className="text-red-500 text-xs">{errors.status}</p>}
                </FormField>
              </div>

              {/* Additional Details Section */}
              <div className="space-y-4 mt-6">
                <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2 flex items-center gap-1">
                  <Info className="h-4 w-4 text-[#4A7C74]" />
                  Additional Details
                </h3>

                <FormField label="Notes" id="notes" icon={<FileText className="h-4 w-4 text-[#4A7C74]" />}>
                  <MemoizedTextarea
                    id="notes"
                    value={formData.notes || ""}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378] min-h-[80px]"
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
              disabled={loading || uploadingImage}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#E0D9C0] hover:bg-[#C0B89F] text-[#2F3E2E]"
              disabled={loading || uploadingImage}
            >
              {(loading || uploadingImage) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {uploadingImage
                ? "Uploading Image..."
                : loading
                  ? "Saving..."
                  : initialData
                    ? "Save Changes"
                    : "Add Supply"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
