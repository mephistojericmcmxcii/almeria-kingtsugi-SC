"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  X,
  Upload,
  Plus,
  Trash2,
  Edit,
  FileText,
  ImageIcon,
  Tag,
  Wrench,
  Box,
  MapPin,
  Factory,
  DollarSign,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { collection, doc, updateDoc, getDoc, getDocs, setDoc, deleteDoc, query, where } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { db, storage, auth } from "@/lib/firebase"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

// Import default Input component
import { Input } from "@/components/ui/input"
import MemoizedTextarea from "@/components/memoized-textarea"

// Import useDebounce from hooks
import { useDebounce } from "@/hooks/use-debounce"

// Interface for individual maintenance/calibration records
interface MaintenanceRecord {
  id: string
  joNo: string
  referenceNo: string
  date: string // ISO string
  servicer: string
  remarks?: string | null // Added remarks field
  certificateStatus?: "w/ certificate" | "no certificate" | "to be follow" | null // MODIFIED: Single string field
}

// Interface for documents to be listed in the new tab
interface DocumentItem {
  id: string // Unique ID for the document entry (Firestore document ID)
  equipmentId: string // NEW: Link to the equipment
  fileName: string // This will now store the original file name (e.g., [referenceNo]_[timestamp].pdf)
  url: string
  type: "image" | "pdf" | "other" // More specific types
  uploadedAt: string // ISO string
  associatedRecordId?: string // Optional: if it belongs to a maintenance record
  associatedRecordRefNo?: string // Optional: reference number of the associated maintenance record
  originalFileName: string // Store original file name
  description?: string // Optional: for general documents
}

// Equipment interface for type safety
interface Equipment {
  id: string
  equipmentId: string
  name: string
  category: string
  serialNumber: string
  location: string
  brand: string
  model: string
  supplier?: string | null
  purchaseDate?: string | null
  warrantyExpiration?: string | null
  cost?: number | null
  condition: string
  assignedTo?: string | null
  maintenanceRecords?: MaintenanceRecord[] | null // Array of maintenance/calibration records
  status: string
  notes?: string | null
  imageUrl?: string | null
  voltage?: string | null
  power?: string | null
  calibrationStatus?: string | null
  utilizationType?: string | null
  nextPMCDate?: string | null // ADDED: Field for next PM/Calibration date
  transferredInfo?: string | null // ADDED: Field for transferred information
}

interface Supplier {
  id: string
  name: string
}

interface EquipmentFormProps {
  onClose: () => void
  initialData?: Equipment
}

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

function EquipmentForm({ onClose, initialData }: EquipmentFormProps) {
  // Form state
  const [formData, setFormData] = useState<Omit<Equipment, "id">>({
    equipmentId: "",
    name: "",
    category: "",
    serialNumber: "",
    location: "",
    brand: "",
    model: "",
    condition: "Good",
    status: "Operational",
    assignedTo: "",
    notes: "",
    voltage: "",
    power: "",
    calibrationStatus: "",
    utilizationType: "",
    nextPMCDate: "", // ADDED: Initialize nextPMCDate
    transferredInfo: "", // ADDED: Initialize transferredInfo
  })

  // Image upload state
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [equipmentIdExists, setEquipmentIdExists] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [customSupplier, setCustomSupplier] = useState("")
  const [showCustomSupplier, setShowCustomSupplier] = useState(false)

  // Date states for general details (now storing strings)
  const [purchaseDate, setPurchaseDate] = useState<string>("")
  const [warrantyExpiration, setWarrantyExpiration] = useState<string>("")
  const [nextPMCDate, setNextPMCDate] = useState<string>("") // ADDED: State for next PMC date

  // State for maintenance/calibration records
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([])
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null)
  const [currentRecordForm, setCurrentRecordForm] = useState<Omit<MaintenanceRecord, "id">>({
    joNo: "",
    referenceNo: "",
    date: "",
    servicer: "",
    remarks: "", // Initialize remarks
    certificateStatus: null, // MODIFIED: Initialize as null
  })

  // State for document upload within maintenance record modal
  const [recordDocumentFile, setRecordDocumentFile] = useState<File | null>(null)
  const [recordDocumentPreview, setRecordDocumentPreview] = useState<string | null>(null) // For displaying file name or image preview
  const [currentRecordDocumentId, setCurrentRecordDocumentId] = useState<string | null>(null) // To track existing document for editing record

  // NEW: State for general document upload modal
  const [isAddGeneralDocumentModalOpen, setIsAddGeneralDocumentModalOpen] = useState(false)
  const [newDocumentFile, setNewDocumentFile] = useState<File | null>(null)
  const [newDocumentPreview, setNewDocumentPreview] = useState<string | null>(null)
  const [newDocumentDescription, setNewDocumentDescription] = useState<string>("")

  // State for all documents (for the new Documentation tab)
  const [allDocuments, setAllDocuments] = useState<DocumentItem[]>([])
  const [documentsToDelete, setDocumentsToDelete] = useState<string[]>([]) // Stores Firestore IDs of documents to delete

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
    const loadInitialData = async () => {
      if (initialData) {
        setFormData({
          equipmentId: initialData.equipmentId || "",
          name: initialData.name || "",
          category: initialData.category || "",
          serialNumber: initialData.serialNumber || "",
          location: initialData.location || "",
          brand: initialData.brand || "",
          model: initialData.model || "",
          condition: initialData.condition || "Good",
          status: initialData.status || "Operational",
          assignedTo: initialData.assignedTo || "",
          notes: initialData.notes || "",
          cost: initialData.cost,
          purchaseDate: initialData.purchaseDate,
          warrantyExpiration: initialData.warrantyExpiration,
          imageUrl: initialData.imageUrl,
          supplier: initialData.supplier,
          voltage: initialData.voltage || "",
          power: initialData.power || "",
          calibrationStatus: initialData.calibrationStatus || "",
          utilizationType: initialData.utilizationType || "",
          nextPMCDate: initialData.nextPMCDate || "", // ADDED: Set initial nextPMCDate
          transferredInfo: initialData.transferredInfo || "", // ADDED: Set initial transferredInfo
        })

        // Check if supplier is not in the list
        if (initialData.supplier && !suppliers.some((s) => s.name === initialData.supplier)) {
          setCustomSupplier(initialData.supplier)
          setShowCustomSupplier(true)
        }

        // Set date states if available (format to "yyyy-MM-dd" string)
        if (initialData.purchaseDate) setPurchaseDate(format(new Date(initialData.purchaseDate), "yyyy-MM-dd"))
        if (initialData.warrantyExpiration)
          setWarrantyExpiration(format(new Date(initialData.warrantyExpiration), "yyyy-MM-dd"))
        if (initialData.nextPMCDate) setNextPMCDate(format(new Date(initialData.nextPMCDate), "yyyy-MM-dd")) // ADDED: Set nextPMCDate state

        // Set maintenance records if available
        if (initialData.maintenanceRecords) {
          setMaintenanceRecords(initialData.maintenanceRecords)
        }

        // Fetch all documents related to this equipment from the equipmentDocumentation collection
        try {
          if (db && initialData.equipmentId) {
            const q = query(
              collection(db, "equipmentDocumentation"),
              where("equipmentId", "==", initialData.equipmentId),
            )
            const querySnapshot = await getDocs(q)
            const fetchedDocs: DocumentItem[] = []
            querySnapshot.forEach((docSnap) => {
              fetchedDocs.push({ id: docSnap.id, ...docSnap.data() } as DocumentItem)
            })
            setAllDocuments(fetchedDocs)
          }
        } catch (error) {
          console.error("Error fetching equipment documents:", error)
          toast({
            title: "Error",
            description: "Failed to load associated documents.",
            variant: "destructive",
          })
        }

        // Set image preview if available
        if (initialData.imageUrl) {
          setImagePreview(initialData.imageUrl)
        }
      } else {
        // Reset allDocuments when adding new equipment
        setAllDocuments([])
        setDocumentsToDelete([]) // Clear documents to delete for new forms
      }
    }

    loadInitialData()
  }, [initialData, suppliers])

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
        const equipmentRef = doc(db!, "equipment", equipmentId)
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
  ) // Dependency on initialData

  // Debounce the checkEquipmentIdExists function
  const debouncedCheckEquipmentIdExists = useDebounce(checkEquipmentIdExists, 500)

  // Handle input changes for main form
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target

      if (name === "equipmentId") {
        debouncedCheckEquipmentIdExists(value)
      }

      setFormData((prev) => ({ ...prev, [name]: value }))
    },
    [debouncedCheckEquipmentIdExists],
  ) // Dependency on debounced function

  // Handle select changes for main form
  const handleSelectChange = useCallback((name: string, value: string) => {
    if (name === "supplier" && value === "custom") {
      setShowCustomSupplier(true)
      return
    } else if (name === "supplier") {
      setShowCustomSupplier(false)
    }

    setFormData((prev) => ({ ...prev, [name]: value }))

    // If calibration status changes to something other than "For PM and/or Calibration", clear nextPMCDate
    if (name === "calibrationStatus" && value !== "For PM and/or Calibration") {
      setNextPMCDate("") // Set to empty string
    }
    // If status changes to something other than "Transferred", clear transferredInfo
    if (name === "status" && value !== "Transferred") {
      setFormData((prev) => ({ ...prev, transferredInfo: "" }))
    }
  }, []) // No dependencies needed if it only uses setFormData

  // Handle custom supplier input
  const handleCustomSupplierChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCustomSupplier(value)
    setFormData((prev) => ({ ...prev, supplier: value }))
  }, []) // No dependencies needed

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
  }, []) // No dependencies needed

  // Handle changes for maintenance record form
  const handleRecordFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setCurrentRecordForm((prev) => ({ ...prev, [name]: value }))
  }, []) // No dependencies needed

  // Handle document file change (for maintenance record modal)
  const handleRecordDocumentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const fileType = file.type

      if (!fileType.startsWith("image/") && fileType !== "application/pdf") {
        toast({
          title: "Invalid file type",
          description: "Only image (JPG, PNG, GIF) or PDF files are allowed.",
          variant: "destructive",
        })
        setRecordDocumentFile(null)
        setRecordDocumentPreview(null)
        return
      }

      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        toast({
          title: "File too large",
          description: "Document must be less than 10MB.",
          variant: "destructive",
        })
        setRecordDocumentFile(null)
        setRecordDocumentPreview(null)
        return
      }

      setRecordDocumentFile(file)
      setRecordDocumentPreview(file.name) // Display original file name for preview in modal
    }
  }, []) // No dependencies needed

  // NEW: Handle document file change (for general document modal)
  const handleNewDocumentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const fileType = file.type

      if (!fileType.startsWith("image/") && fileType !== "application/pdf") {
        toast({
          title: "Invalid file type",
          description: "Only image (JPG, PNG, GIF) or PDF files are allowed.",
          variant: "destructive",
        })
        setNewDocumentFile(null)
        setNewDocumentPreview(null)
        return
      }

      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        toast({
          title: "File too large",
          description: "Document must be less than 10MB.",
          variant: "destructive",
        })
        setNewDocumentFile(null)
        setNewDocumentPreview(null)
        return
      }

      setNewDocumentFile(file)
      setNewDocumentPreview(file.name)
    }
  }, []) // No dependencies needed

  // Add/Edit maintenance record
  const handleAddOrUpdateRecord = useCallback(async () => {
    if (
      !currentRecordForm.joNo ||
      !currentRecordForm.referenceNo ||
      !currentRecordForm.date ||
      !currentRecordForm.servicer
    ) {
      toast({
        title: "Missing fields",
        description: "Please fill all required fields for the record.",
        variant: "destructive",
      })
      return
    }

    // Determine the ID for the maintenance record first
    const recordId = editingRecord ? editingRecord.id : Date.now().toString()

    let newDocumentItem: DocumentItem | null = null
    let oldDocumentFirestoreIdToDelete: string | null = null

    // Find existing document associated with this record if editing
    const existingDocForRecord = allDocuments.find((doc) => doc.associatedRecordId === recordId)

    // Handle document upload/removal for maintenance record
    if (recordDocumentFile) {
      // A new file is selected for upload
      try {
        const fileExtension = recordDocumentFile.name.split(".").pop()
        const storageFileName = `${currentRecordForm.referenceNo}_${Date.now()}.${fileExtension}`

        if (!storage) throw new Error("Firebase storage is not initialized.")
        const docStorageRef = ref(storage, `equipment_documents/${storageFileName}`)
        await uploadBytes(docStorageRef, recordDocumentFile)
        const uploadedDocumentUrl = await getDownloadURL(docStorageRef)

        // If there was an existing document for this record, mark it for deletion
        if (existingDocForRecord) {
          oldDocumentFirestoreIdToDelete = existingDocForRecord.id
        }

        // Create a NEW DocumentItem with a NEW Firestore ID
        newDocumentItem = {
          id: doc(collection(db!, "equipmentDocumentation")).id, // Always generate a new Firestore ID for new uploads
          equipmentId: formData.equipmentId, // Link to the main equipment
          fileName: storageFileName, // Stored name in storage
          originalFileName: recordDocumentFile.name, // Original name from user
          url: uploadedDocumentUrl,
          type: recordDocumentFile.type.includes("pdf")
            ? "pdf"
            : recordDocumentFile.type.startsWith("image/")
              ? "image"
              : "other",
          uploadedAt: new Date().toISOString(), // Use current date for upload
          associatedRecordId: recordId, // Link to the maintenance record
          associatedRecordRefNo: currentRecordForm.referenceNo,
        }

        toast({ title: "Document uploaded", description: "Document uploaded successfully." })
      } catch (error) {
        console.error("Error uploading document:", error)
        toast({ title: "Document upload failed", description: "Failed to upload document.", variant: "destructive" })
        return // Prevent saving record if document upload fails
      }
    } else if (existingDocForRecord && !recordDocumentPreview) {
      // Existing document was removed from preview (no new file selected)
      oldDocumentFirestoreIdToDelete = existingDocForRecord.id
    }

    // Update maintenance records state
    const newOrUpdatedRecord: MaintenanceRecord = {
      id: recordId, // Use the determined recordId
      ...currentRecordForm,
      certificateStatus: currentRecordForm.certificateStatus || null, // MODIFIED: Save the selected status
    }

    if (editingRecord) {
      setMaintenanceRecords((prev) =>
        prev.map((record) => (record.id === editingRecord.id ? newOrUpdatedRecord : record)),
      )
    } else {
      setMaintenanceRecords((prev) => [...prev, newOrUpdatedRecord])
    }

    // Update allDocuments state and documentsToDelete
    setAllDocuments((prevDocs) => {
      let updatedDocs = prevDocs

      if (oldDocumentFirestoreIdToDelete) {
        // Remove the old document from allDocuments
        updatedDocs = updatedDocs.filter((d) => d.id !== oldDocumentFirestoreIdToDelete)
        // Add its Firestore ID to documentsToDelete for cleanup on main submit
        setDocumentsToDelete((prev) => [...prev, oldDocumentFirestoreIdToDelete!])
      }

      if (newDocumentItem) {
        // Add the new document item
        updatedDocs = [...updatedDocs, newDocumentItem]
      }
      return updatedDocs
    })

    setIsAddRecordModalOpen(false)
    setCurrentRecordForm({
      joNo: "",
      referenceNo: "",
      date: "",
      servicer: "",
      remarks: "",
      certificateStatus: null, // MODIFIED: Reset to null
    })
    setRecordDocumentFile(null)
    setRecordDocumentPreview(null)
    setCurrentRecordDocumentId(null) // Reset
  }, [
    currentRecordForm,
    editingRecord,
    recordDocumentFile,
    allDocuments,
    formData.equipmentId,
    currentRecordDocumentId,
  ]) // Dependencies for useCallback

  // NEW: Handle general document upload
  const handleUploadNewDocument = useCallback(async () => {
    if (!newDocumentFile) {
      toast({
        title: "No file selected",
        description: "Please select a document to upload.",
        variant: "destructive",
      })
      return
    }

    if (!formData.equipmentId) {
      toast({
        title: "Equipment ID missing",
        description: "Please enter an Equipment ID before uploading documents.",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    try {
      const fileExtension = newDocumentFile.name.split(".").pop()
      const storageFileName = `${formData.equipmentId}_${Date.now()}.${fileExtension}`

      if (!storage) throw new Error("Firebase storage is not initialized.")
      const docStorageRef = ref(storage, `equipment_documents/${storageFileName}`)
      await uploadBytes(docStorageRef, newDocumentFile)
      const uploadedDocumentUrl = await getDownloadURL(docStorageRef)

      const newDocItem: DocumentItem = {
        id: doc(collection(db!, "equipmentDocumentation")).id, // Generate new Firestore ID
        equipmentId: formData.equipmentId,
        fileName: storageFileName,
        originalFileName: newDocumentFile.name,
        url: uploadedDocumentUrl,
        type: newDocumentFile.type.includes("pdf")
          ? "pdf"
          : newDocumentFile.type.startsWith("image/")
            ? "image"
            : "other",
        uploadedAt: new Date().toISOString(),
        description: newDocumentDescription, // Save the description
      }

      setAllDocuments((prev) => [...prev, newDocItem])
      toast({ title: "Document uploaded", description: "Document uploaded successfully." })

      // Reset modal state
      setNewDocumentFile(null)
      setNewDocumentPreview(null)
      setNewDocumentDescription("")
      setIsAddGeneralDocumentModalOpen(false)
    } catch (error) {
      console.error("Error uploading general document:", error)
      toast({ title: "Upload failed", description: "Failed to upload document.", variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }, [newDocumentFile, formData.equipmentId, newDocumentDescription]) // Dependencies for useCallback

  // Delete maintenance record
  const handleDeleteRecord = useCallback(
    async (id: string) => {
      // Find any associated document and mark for deletion
      const associatedDoc = allDocuments.find((doc) => doc.associatedRecordId === id)
      if (associatedDoc) {
        setDocumentsToDelete((prev) => [...prev, associatedDoc.id])
        setAllDocuments((prev) => prev.filter((doc) => doc.id !== associatedDoc.id))
      }

      setMaintenanceRecords((prev) => prev.filter((record) => record.id !== id))
    },
    [allDocuments],
  ) // Dependency on allDocuments

  // Open modal for editing
  const handleEditRecord = useCallback(
    (record: MaintenanceRecord) => {
      setEditingRecord(record)
      setCurrentRecordForm({
        joNo: record.joNo,
        referenceNo: record.referenceNo,
        date: record.date,
        servicer: record.servicer,
        remarks: record.remarks || "",
        certificateStatus: record.certificateStatus || null, // MODIFIED: Set the existing status
      })

      // Find and set the associated document for preview
      const associatedDoc = allDocuments.find((doc) => doc.associatedRecordId === record.id)
      if (associatedDoc) {
        setRecordDocumentPreview(associatedDoc.originalFileName)
        setCurrentRecordDocumentId(associatedDoc.id) // Store the Firestore ID of the document
      } else {
        setRecordDocumentPreview(null)
        setCurrentRecordDocumentId(null)
      }
      setRecordDocumentFile(null) // Clear file input when editing
      setIsAddRecordModalOpen(true)
    },
    [allDocuments],
  ) // Dependency on allDocuments

  // Handle form submission
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

      const timestamp = new Date().toISOString()
      const username = getCurrentUser()

      const equipmentData: Omit<Equipment, "documents"> = {
        // Exclude 'documents' from equipmentData
        ...(initialData ? { id: initialData.id } : {}),
        equipmentId: formData.equipmentId,
        name: String(formData.name || ""),
        category: String(formData.category || ""),
        serialNumber: String(formData.serialNumber || ""),
        location: String(formData.location || ""),
        brand: String(formData.brand || ""),
        model: String(formData.model || ""),
        supplier: showCustomSupplier
          ? customSupplier
          : typeof formData.supplier === "string"
            ? formData.supplier
            : undefined,
        purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : undefined, // Convert string to Date for saving
        warrantyExpiration: warrantyExpiration ? new Date(warrantyExpiration).toISOString() : undefined, // Convert string to Date for saving
        cost: formData.cost !== undefined ? Number(formData.cost) : undefined,
        condition: String(formData.condition || ""),
        assignedTo: String(formData.assignedTo || ""),
        maintenanceRecords: maintenanceRecords.length > 0 ? maintenanceRecords : null, // Save the array
        status: String(formData.status || ""),
        notes: String(formData.notes || ""),
        imageUrl: typeof formData.imageUrl === "string" ? formData.imageUrl : undefined,
        voltage: String(formData.voltage || ""),
        power: String(formData.power || ""),
        lastModified: timestamp,
        modifiedBy: username,
        calibrationStatus: String(formData.calibrationStatus || ""),
        utilizationType: String(formData.utilizationType || ""),
        nextPMCDate: nextPMCDate ? new Date(nextPMCDate).toISOString() : null, // ADDED: Save nextPMCDate
        transferredInfo: formData.status === "Transferred" ? String(formData.transferredInfo || "") : null, // ADDED: Save transferredInfo only if status is Transferred
      }

      Object.keys(equipmentData).forEach((key) => {
        if (equipmentData[key] === undefined) {
          equipmentData[key] = null
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
              console.error("Error deleting old equipment image:", error)
            }
          }

          try {
            if (!storage) {
              throw new Error("Firebase storage is not initialized.")
            }
            const storageRef = ref(storage, `equipment/${Date.now()}_${image.name}`)
            await uploadBytes(storageRef, image)
            const downloadURL = await getDownloadURL(storageRef)
            equipmentData.imageUrl = downloadURL
            setUploading(false)
          } catch (error) {
            console.error("Error uploading equipment image:", error)
            setUploading(false)
          }
        } else if (initialData?.imageUrl && !imagePreview) {
          // If image was removed
          try {
            if (!storage) throw new Error("Firebase storage is not initialized.")
            const oldImageRef = ref(storage, initialData.imageUrl)
            await deleteObject(oldImageRef)
            equipmentData.imageUrl = null
          } catch (error) {
            console.error("Error deleting equipment image on removal:", error)
          }
        }

        // Handle documents in equipmentDocumentation collection
        if (db) {
          // 1. Delete documents marked for deletion
          for (const docId of documentsToDelete) {
            try {
              const docRef = doc(db, "equipmentDocumentation", docId)
              const docSnap = await getDoc(docRef)
              if (docSnap.exists()) {
                const docData = docSnap.data() as DocumentItem
                if (docData.url && storage) {
                  // Ensure we delete the correct file from storage based on its URL
                  const storageRef = ref(storage, docData.url)
                  await deleteObject(storageRef).catch((e) => console.warn("Could not delete storage file:", e))
                }
                await deleteDoc(docRef)
              }
            } catch (error) {
              console.error(`Error deleting document ${docId}:`, error)
              toast({
                title: "Document deletion failed",
                description: `Failed to delete document ${docId}.`,
                variant: "destructive",
              })
            }
          }

          // 2. Add/Update documents in allDocuments state
          // Filter out documents that were just deleted (if any overlap due to timing/logic)
          const documentsToSave = allDocuments.filter((docItem) => !documentsToDelete.includes(docItem.id))

          for (const docItem of documentsToSave) {
            try {
              // Use setDoc with merge: true. This will create the document if it doesn't exist,
              // or update it if it does. This is robust for both new and existing documents.
              await setDoc(doc(db, "equipmentDocumentation", docItem.id), docItem, { merge: true })
            } catch (error) {
              console.error(`Error saving document ${docItem.id}:`, error)
              toast({
                title: "Document save failed",
                description: `Failed to save document ${docItem.id}.`,
                variant: "destructive",
              })
            }
          }
        }

        if (initialData) {
          try {
            if (initialData.equipmentId !== formData.equipmentId) {
              await setDoc(doc(db!, "equipment", formData.equipmentId), equipmentData)
              await deleteDoc(doc(db!, "equipment", initialData.id))
              toast({
                title: "Equipment updated",
                description: "Equipment has been updated with new ID",
              })
            } else {
              await updateDoc(doc(db!, "equipment", formData.equipmentId), equipmentData)
              toast({
                title: "Equipment updated",
                description: "Equipment has been updated successfully",
              })
            }
          } catch (error) {
            console.error("Error updating equipment:", error)
            toast({
              title: "Update failed",
              description: "Failed to update equipment. Please try again.",
              variant: "destructive",
            })
            setFormSubmitting(false)
            return
          }
        } else {
          await setDoc(doc(db!, "equipment", formData.equipmentId), equipmentData)
          toast({
            title: "Equipment added",
            description: "New equipment has been added successfully",
          })
        }

        onClose()
      } catch (error) {
        console.error("Error saving equipment:", error)
        toast({
          title: "Error",
          description: "Failed to save equipment. Please try again.",
          variant: "destructive",
        })
      } finally {
        setFormSubmitting(false)
      }
    },
    [
      formData,
      initialData,
      image,
      imagePreview,
      purchaseDate,
      warrantyExpiration,
      nextPMCDate, // ADDED: Dependency for nextPMCDate
      maintenanceRecords,
      documentsToDelete,
      allDocuments,
      checkEquipmentIdExists,
      onClose,
      showCustomSupplier,
      customSupplier,
    ],
  ) // Dependencies for useCallback

  // Form rendering
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-[#F0EAD6] border border-[#DDD7B1] rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto relative z-50">
        <div className="flex justify-between items-center p-4 border-b border-[#4A7C74] print:border-gray-300 print:bg-gray-100">
          <h2 className="text-xl font-bold text-[#2F3E2E] print:text-black">
            {initialData ? "Edit Equipment" : "Add New Equipment"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-[#8B8378] hover:text-[#2F3E2E]">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-[#E0D9C0] border border-[#4A7C74] rounded-md print:hidden">
              <TabsTrigger
                value="general"
                className="text-[#2F3E2E] data-[state=active]:bg-[#4A7C74] data-[state=active]:text-white transition-colors"
              >
                <span className="sm:hidden">General</span>
                <span className="hidden sm:inline">General Details</span>
              </TabsTrigger>
              <TabsTrigger
                value="maintenance-calibration"
                className="text-[#2F3E2E] data-[state=active]:bg-[#4A7C74] data-[state=active]:text-white transition-colors"
              >
                <span className="sm:hidden">PMC</span>
                <span className="hidden sm:inline">Preventive Maintenance and Calibration</span>
              </TabsTrigger>
              <TabsTrigger
                value="documentation"
                className="text-[#2F3E2E] data-[state=active]:bg-[#4A7C74] data-[state=active]:text-white transition-colors"
              >
                <span className="sm:hidden">Docs</span>
                <span className="hidden sm:inline">Documentation</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column */}
                <div className="space-y-4">
                  {/* Basic Information Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2 flex items-center gap-1">
                      <Box className="h-4 w-4 text-[#4A7C74]" />
                      Basic Information
                    </h3>

                    <div className="space-y-2">
                      <Label htmlFor="equipmentId" className="text-[#2F3E2E] flex items-center gap-1">
                        <Tag className="h-4 w-4 text-[#4A7C74]" />
                        Equipment ID *
                      </Label>
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
                    </div>
                    {equipmentIdExists && (
                      <p className="text-red-600 text-sm mt-1">
                        This Equipment ID already exists. Please use a different ID.
                      </p>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-[#2F3E2E] flex items-center gap-1">
                        <Box className="h-4 w-4 text-[#4A7C74]" />
                        Name *
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name ?? ""}
                        onChange={handleChange}
                        className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                        placeholder="Enter equipment name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      {" "}
                      {/* Keep this div for Select component */}
                      <Label htmlFor="category" className="text-[#2F3E2E] flex items-center gap-1">
                        <Box className="h-4 w-4 text-[#4A7C74]" />
                        Category *
                      </Label>
                      <Select
                        value={String(formData.category ?? "")}
                        onValueChange={(value) => handleSelectChange("category", value)}
                        required
                      >
                        <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] z-[60]">
                          <SelectItem value="Analytical">Analytical</SelectItem>
                          <SelectItem value="Measurement">Measurement</SelectItem>
                          <SelectItem value="Processing">Processing</SelectItem>
                          <SelectItem value="Safety">Safety</SelectItem>
                          <SelectItem value="Storage">Storage</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="serialNumber" className="text-[#2F3E2E] flex items-center gap-1">
                        <Tag className="h-4 w-4 text-[#4A7C74]" />
                        Serial Number
                      </Label>
                      <Input
                        id="serialNumber"
                        name="serialNumber"
                        value={formData.serialNumber ?? ""}
                        onChange={handleChange}
                        className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                        placeholder="Enter serial number"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-[#2F3E2E] flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-[#4A7C74]" />
                        Location *
                      </Label>
                      <Input
                        id="location"
                        name="location"
                        value={formData.location ?? ""}
                        onChange={handleChange}
                        className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                        placeholder="Enter location"
                        required
                      />
                    </div>
                  </div>

                  {/* Brand Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2 flex items-center gap-1">
                      <Factory className="h-4 w-4 text-[#4A7C74]" />
                      Brand Information
                    </h3>

                    <div className="space-y-2">
                      <Label htmlFor="brand" className="text-[#2F3E2E] flex items-center gap-1">
                        <Factory className="h-4 w-4 text-[#4A7C74]" />
                        Brand
                      </Label>
                      <Input
                        id="brand"
                        name="brand"
                        value={formData.brand ?? ""}
                        onChange={handleChange}
                        className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                        placeholder="Enter brand"
                      />
                    </div>

                    <div className="space-y-2">
                      {" "}
                      {/* Keep this div for Select component */}
                      <Label htmlFor="supplier" className="text-[#2F3E2E] flex items-center gap-1">
                        <Box className="h-4 w-4 text-[#4A7C74]" />
                        Supplier
                      </Label>
                      <Select
                        value={showCustomSupplier ? "custom" : String(formData.supplier ?? "")}
                        onValueChange={(value) => handleSelectChange("supplier", value)}
                      >
                        <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] max-h-60 z-[60]">
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
                          <Input
                            id="customSupplier"
                            value={customSupplier}
                            onChange={handleCustomSupplierChange}
                            className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] mt-2"
                            placeholder="Enter custom supplier name"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="model" className="text-[#2F3E2E] flex items-center gap-1">
                        <Box className="h-4 w-4 text-[#4A7C74]" />
                        Model
                      </Label>
                      <Input
                        id="model"
                        name="model"
                        value={formData.model ?? ""}
                        onChange={handleChange}
                        className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                        placeholder="Enter model"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="purchaseDate" className="text-[#2F3E2E] flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-[#4A7C74]" />
                        Purchase Date
                      </Label>
                      <Input
                        id="purchaseDate"
                        name="purchaseDate"
                        type="date"
                        value={purchaseDate}
                        onChange={(e) => setPurchaseDate(e.target.value)}
                        className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="warrantyExpiration" className="text-[#2F3E2E] flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-[#4A7C74]" />
                        Warranty Expiration
                      </Label>
                      <Input
                        id="warrantyExpiration"
                        name="warrantyExpiration"
                        type="date"
                        value={warrantyExpiration}
                        onChange={(e) => setWarrantyExpiration(e.target.value)}
                        className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cost" className="text-[#2F3E2E] flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-[#4A7C74]" />
                        Cost (PHP)
                      </Label>
                      <Input
                        id="cost"
                        name="cost"
                        type="number"
                        value={formData.cost || ""}
                        onChange={handleChange}
                        className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                        placeholder="Enter cost"
                      />
                    </div>
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
                          <Input
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

                  {/* Status and Condition */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4 text-[#4A7C74]" />
                      Status and Condition
                    </h3>

                    <div className="space-y-2">
                      {" "}
                      {/* Keep this div for Select component */}
                      <Label htmlFor="status" className="text-[#2F3E2E] flex items-center gap-1">
                        <AlertCircle className="h-4 w-4 text-[#4A7C74]" />
                        Status *
                      </Label>
                      <Select
                        value={String(formData.status ?? "")}
                        onValueChange={(value) => handleSelectChange("status", value)}
                        required
                      >
                        <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] z-[60]">
                          <SelectItem value="Operational">Operational</SelectItem>
                          <SelectItem value="Idle">Idle</SelectItem>
                          <SelectItem value="For Repair">For Repair</SelectItem>
                          <SelectItem value="For Decommission">For Decommission</SelectItem>
                          <SelectItem value="Transferred">Transferred</SelectItem> {/* ADDED: Transferred status */}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Conditional Textarea for Transferred Status */}
                    {formData.status === "Transferred" && (
                      <MemoizedTextarea
                        label="Transferred Information"
                        id="transferredInfo"
                        name="transferredInfo"
                        value={formData.transferredInfo ?? ""}
                        onChange={handleChange}
                        className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] min-h-[80px]"
                        placeholder="Enter details about the transfer (e.g., new location, recipient, date)"
                      />
                    )}

                    {/* Utilization Type */}
                    <div className="space-y-2">
                      {" "}
                      {/* Keep this div for Select component */}
                      <Label htmlFor="utilizationType" className="text-[#2F3E2E] flex items-center gap-1">
                        <Wrench className="h-4 w-4 text-[#4A7C74]" />
                        Utilization Type
                      </Label>
                      <Select
                        value={String(formData.utilizationType ?? "")}
                        onValueChange={(value) => handleSelectChange("utilizationType", value)}
                      >
                        <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                          <SelectValue placeholder="Select utilization type" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] z-[60]">
                          <SelectItem value="Routinary – Used daily or per SOP">
                            Routinary – Used daily or per SOP
                          </SelectItem>
                          <SelectItem value="General – Used regularly, but not always essential">
                            General – Used regularly, but not always essential
                          </SelectItem>
                          <SelectItem value="Occasional – Used infrequently or under specific scenarios">
                            Occasional – Used infrequently or under specific scenarios
                          </SelectItem>
                          <SelectItem value="Standby / Backup – Only used when primary equipment is down">
                            Standby / Backup – Only used when primary equipment is down
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* END OF NEW DROPDOWN */}

                    <div className="space-y-2">
                      {" "}
                      {/* Keep this div for Select component */}
                      <Label htmlFor="calibrationStatus" className="text-[#2F3E2E] flex items-center gap-1">
                        <CheckCircle className="h-4 w-4 text-[#4A7C74]" />
                        Calibration Status
                      </Label>
                      <Select
                        value={String(formData.calibrationStatus ?? "")}
                        onValueChange={(value) => handleSelectChange("calibrationStatus", value)}
                      >
                        <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                          <SelectValue placeholder="Select calibration status" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] z-[60]">
                          <SelectItem value="Calibrated">Calibrated</SelectItem>
                          <SelectItem value="For PM and/or Calibration">For PM and/or Calibration</SelectItem>
                          <SelectItem value="Calibration Expired">Calibration Expired</SelectItem>
                          <SelectItem value="Not Required">Not Required</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Conditional Date Picker for nextPMCDate */}
                    {formData.calibrationStatus === "For PM and/or Calibration" && (
                      <div className="space-y-2">
                        <Label htmlFor="nextPMCDate" className="text-[#2F3E2E] flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-[#4A7C74]" />
                          Next PM/Calibration Date
                        </Label>
                        <Input
                          id="nextPMCDate"
                          name="nextPMCDate"
                          type="date"
                          value={nextPMCDate}
                          onChange={(e) => setNextPMCDate(e.target.value)}
                          className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      {" "}
                      {/* Keep this div for Select component */}
                      <Label htmlFor="condition" className="text-[#2F3E2E] flex items-center gap-1">
                        <Wrench className="h-4 w-4 text-[#4A7C74]" />
                        Condition
                      </Label>
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
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assignedTo" className="text-[#2F3E2E] flex items-center gap-1">
                        <User className="h-4 w-4 text-[#4A7C74]" />
                        Assigned To
                      </Label>
                      <Input
                        id="assignedTo"
                        name="assignedTo"
                        value={formData.assignedTo ?? ""}
                        onChange={handleChange}
                        className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                        placeholder="Enter person responsible"
                      />
                    </div>

                    {/* Power Requirements Section */}
                    <div className="space-y-2">
                      <Label htmlFor="voltage" className="text-[#2F3E2E] flex items-center gap-1">
                        <AlertCircle className="h-4 w-4 text-[#4A7C74]" />
                        Voltage
                      </Label>
                      <Input
                        id="voltage"
                        name="voltage"
                        value={formData.voltage ?? ""}
                        onChange={handleChange}
                        className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                        placeholder="e.g., 220V"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="power" className="text-[#2F3E2E] flex items-center gap-1">
                        <AlertCircle className="h-4 w-4 text-[#4A7C74]" />
                        Power
                      </Label>
                      <Input
                        id="power"
                        name="power"
                        value={formData.power ?? ""}
                        onChange={handleChange}
                        className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                        placeholder="e.g., 1.5kW"
                      />
                    </div>
                    <MemoizedTextarea
                      label="Remarks"
                      id="notes"
                      icon={FileText}
                      name="notes"
                      value={formData.notes ?? ""}
                      onChange={handleChange}
                      className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] min-h-[80px]"
                      placeholder="Add any additional remarks"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Preventive Maintenance and Calibration Tab */}
            <TabsContent value="maintenance-calibration" className="mt-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2">
                  Maintenance and Calibration Log
                </h3>
                <Button
                  type="button"
                  onClick={() => {
                    setEditingRecord(null)
                    setCurrentRecordForm({
                      joNo: "",
                      referenceNo: "",
                      date: "",
                      servicer: "",
                      remarks: "",
                      certificateStatus: null, // MODIFIED: Reset to null
                    })
                    setRecordDocumentFile(null)
                    setRecordDocumentPreview(null)
                    setCurrentRecordDocumentId(null) // Reset
                    setIsAddRecordModalOpen(true)
                  }}
                  className="bg-[#E0D9C0] hover:bg-[#C0B89F] text-[#2F3E2E] mb-4"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Record
                </Button>

                <div className="rounded-md border border-[#DDD7B1] overflow-hidden">
                  <Table>
                    <TableHeader className="bg-[#C0B89F]">
                      <TableRow>
                        <TableHead className="text-[#2F3E2E]">J.O No.</TableHead>
                        <TableHead className="text-[#2F3E2E]">Reference No.</TableHead>
                        <TableHead className="text-[#2F3E2E]">Date</TableHead>
                        <TableHead className="text-[#2F3E2E]">Servicer</TableHead>
                        <TableHead className="text-[#2F3E2E]">Remarks</TableHead>
                        <TableHead className="text-[#2F3E2E] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-[#F0EAD6]">
                      {maintenanceRecords.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-[#8B8378]">
                            No maintenance or calibration records yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        maintenanceRecords.map((record) => (
                          <TableRow key={record.id} className="border-[#DDD7B1] hover:bg-[#E0D9C0]/50">
                            <TableCell className="font-medium text-[#2F3E2E]">{record.joNo}</TableCell>
                            <TableCell className="text-[#2F3E2E]">{record.referenceNo}</TableCell>
                            <TableCell className="text-[#2F3E2E]">{format(new Date(record.date), "PPP")}</TableCell>
                            <TableCell className="text-[#2F3E2E]">{record.servicer}</TableCell>
                            <TableCell className="text-[#2F3E2E]">{record.remarks}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditRecord(record)}
                                className="text-[#8B8378] hover:text-[#2F3E2E] mr-2"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteRecord(record.id)}
                                className="text-red-600 hover:text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            {/* New: Documentation Tab */}
            <TabsContent value="documentation" className="mt-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2">
                  All Equipment Documents
                </h3>
                <Button
                  type="button"
                  onClick={() => {
                    setNewDocumentFile(null)
                    setNewDocumentPreview(null)
                    setNewDocumentDescription("")
                    setIsAddGeneralDocumentModalOpen(true)
                  }}
                  className="bg-[#E0D9C0] hover:bg-[#C0B89F] text-[#2F3E2E] mb-4"
                  disabled={!formData.equipmentId} // Disable if equipment ID is not set
                >
                  <Upload className="h-4 w-4 mr-2" /> Upload Document
                </Button>
                {!formData.equipmentId && (
                  <p className="text-red-600 text-sm mt-1">
                    Please enter an Equipment ID in the General Details tab to upload documents.
                  </p>
                )}

                <div className="rounded-md border border-[#DDD7B1] overflow-hidden">
                  <Table>
                    <TableHeader className="bg-[#C0B89F]">
                      <TableRow>
                        <TableHead className="text-[#2F3E2E]">File Name</TableHead>
                        <TableHead className="text-[#2F3E2E]">Type</TableHead>
                        <TableHead className="text-[#2F3E2E]">Uploaded Date</TableHead>
                        <TableHead className="text-[#2F3E2E]">Associated Record</TableHead>
                        <TableHead className="text-[#2F3E2E]">Description</TableHead> {/* New column */}
                        <TableHead className="text-[#2F3E2E] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-[#F0EAD6]">
                      {allDocuments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-[#8B8378]">
                            No documents uploaded for this equipment yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        allDocuments.map((docItem) => (
                          <TableRow key={docItem.id} className="border-[#DDD7B1] hover:bg-[#E0D9C0]/50">
                            <TableCell className="font-medium text-[#2F3E2E] flex items-center gap-2">
                              {docItem.type === "pdf" ? (
                                <FileText className="h-4 w-4 text-red-600" />
                              ) : (
                                <ImageIcon className="h-4 w-4 text-blue-600" />
                              )}
                              {docItem.originalFileName} {/* Display original file name here */}
                            </TableCell>
                            <TableCell className="text-[#2F3E2E]">{docItem.type.toUpperCase()}</TableCell>
                            <TableCell className="text-[#2F3E2E]">
                              {format(new Date(docItem.uploadedAt), "PPP")}
                            </TableCell>
                            <TableCell className="text-[#2F3E2E]">
                              {docItem.associatedRecordRefNo ? `Ref: ${docItem.associatedRecordRefNo}` : "N/A"}
                            </TableCell>
                            <TableCell className="text-[#2F3E2E]">{docItem.description || "N/A"}</TableCell>{" "}
                            {/* Display description */}
                            <TableCell className="text-right">
                              <a
                                href={docItem.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#2F3E2E] hover:underline inline-flex items-center gap-1 mr-2"
                              >
                                View
                              </a>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setDocumentsToDelete((prev) => [...prev, docItem.id])
                                  setAllDocuments((prev) => prev.filter((d) => d.id !== docItem.id))
                                  toast({
                                    title: "Document marked for deletion",
                                    description: "Document will be deleted upon saving equipment.",
                                  })
                                }}
                                className="text-red-600 hover:text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          </Tabs>

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

        {/* Add/Edit Record Modal */}
        <Dialog open={isAddRecordModalOpen} onOpenChange={setIsAddRecordModalOpen}>
          <DialogContent className="sm:max-w-[425px] bg-[#F0EAD6] text-[#2F3E2E] border-[#DDD7B1]">
            <DialogHeader>
              <DialogTitle className="text-[#2F3E2E]">{editingRecord ? "Edit Record" : "Add New Record"}</DialogTitle>
              <DialogDescription className="text-[#8B8378]">
                Enter details for the maintenance or calibration record.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="joNo" className="text-[#2F3E2E]">
                  J.O No.
                </Label>
                <Input
                  id="joNo"
                  name="joNo"
                  value={currentRecordForm.joNo}
                  onChange={handleRecordFormChange}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                  placeholder="Enter J.O Number"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referenceNo" className="text-[#2F3E2E]">
                  Reference No.
                </Label>
                <Input
                  id="referenceNo"
                  name="referenceNo"
                  value={currentRecordForm.referenceNo}
                  onChange={handleRecordFormChange}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                  placeholder="Enter Reference Number"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date" className="text-[#2F3E2E] flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-[#4A7C74]" />
                  Date
                </Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={currentRecordForm.date}
                  onChange={handleRecordFormChange}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="servicer" className="text-[#2F3E2E]">
                  Service Provider
                </Label>
                <Input
                  id="servicer"
                  name="servicer"
                  value={currentRecordForm.servicer}
                  onChange={handleRecordFormChange}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                  placeholder="Enter Service Provider Name"
                  required
                />
              </div>
              {/* MODIFIED: RadioGroup for certificate status */}
              <div className="space-y-2">
                <Label className="text-[#2F3E2E]">Certificate Status</Label>
                <RadioGroup
                  value={currentRecordForm.certificateStatus || ""}
                  onValueChange={(value: "w/ certificate" | "no certificate" | "to be follow") =>
                    setCurrentRecordForm((prev) => ({ ...prev, certificateStatus: value }))
                  }
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="w/ certificate"
                      id="cert-w-certificate"
                      className="border-[#C0B89F] data-[state=checked]:bg-[#4A7C74] data-[state=checked]:text-white"
                    />
                    <Label htmlFor="cert-w-certificate" className="text-[#2F3E2E]">
                      w/ certificate
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="no certificate"
                      id="cert-no-certificate"
                      className="border-[#C0B89F] data-[state=checked]:bg-[#4A7C74] data-[state=checked]:text-white"
                    />
                    <Label htmlFor="cert-no-certificate" className="text-[#2F3E2E]">
                      no certificate
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="to be follow"
                      id="cert-to-be-follow"
                      className="border-[#C0B89F] data-[state=checked]:bg-[#4A7C74] data-[state=checked]:text-white"
                    />
                    <Label htmlFor="cert-to-be-follow" className="text-[#2F3E2E]">
                      to be follow
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <MemoizedTextarea
                label="Remarks"
                id="remarks"
                name="remarks"
                value={currentRecordForm.remarks ?? ""}
                onChange={handleRecordFormChange}
                className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] min-h-[80px]"
                placeholder="Add any additional remarks"
              />
              {/* Document Upload Field for Maintenance Record */}
              <div className="space-y-2">
                <Label htmlFor="recordDocument" className="text-[#2F3E2E]">
                  Document (PDF or Image)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="recordDocument"
                    name="recordDocument"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleRecordDocumentChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] flex-grow"
                  />
                  {recordDocumentPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setRecordDocumentFile(null)
                        setRecordDocumentPreview(null)
                        // If there was an existing document, mark its Firestore ID for deletion
                        if (currentRecordDocumentId) {
                          setDocumentsToDelete((prev) => [...prev, currentRecordDocumentId])
                          setAllDocuments((prev) => prev.filter((d) => d.id !== currentRecordDocumentId))
                          setCurrentRecordDocumentId(null)
                        }
                      }}
                      className="text-red-600 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {recordDocumentPreview && (
                  <p className="text-sm text-[#8B8378] mt-1">
                    {recordDocumentFile ? recordDocumentFile.name : recordDocumentPreview}
                  </p>
                )}
                <p className="text-xs text-[#8B8378]">Max size: 10MB. Formats: JPG, PNG, GIF, PDF.</p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddRecordModalOpen(false)}
                className="bg-transparent border-[#C0B89F] text-[#2F3E2E] hover:bg-[#E0D9C0]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAddOrUpdateRecord}
                className="bg-[#E0D9C0] hover:bg-[#C0B89F] text-[#2F3E2E]"
              >
                {editingRecord ? "Save Changes" : "Add Record"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* NEW: Add General Document Modal */}
        <Dialog open={isAddGeneralDocumentModalOpen} onOpenChange={setIsAddGeneralDocumentModalOpen}>
          <DialogContent className="sm:max-w-[425px] bg-[#F0EAD6] text-[#2F3E2E] border-[#DDD7B1]">
            <DialogHeader>
              <DialogTitle className="text-[#2F3E2E]">Upload New Document</DialogTitle>
              <DialogDescription className="text-[#8B8378]">
                Upload a general document related to this equipment.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newDocumentFile" className="text-[#2F3E2E]">
                  Document (PDF or Image) *
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="newDocumentFile"
                    name="newDocumentFile"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleNewDocumentChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] flex-grow"
                    required
                  />
                  {newDocumentPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setNewDocumentFile(null)
                        setNewDocumentPreview(null)
                      }}
                      className="text-red-600 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {newDocumentPreview && (
                  <p className="text-sm text-[#8B8378] mt-1">
                    {newDocumentFile ? newDocumentFile.name : newDocumentPreview}
                  </p>
                )}
                <p className="text-xs text-[#8B8378]">Max size: 10MB. Formats: JPG, PNG, GIF, PDF.</p>
              </div>
              <MemoizedTextarea
                label="Description (Optional)"
                id="newDocumentDescription"
                name="newDocumentDescription"
                value={newDocumentDescription}
                onChange={(e) => setNewDocumentDescription(e.target.value)}
                className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] min-h-[80px]"
                placeholder="e.g., User Manual, Calibration Certificate, etc."
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddGeneralDocumentModalOpen(false)}
                className="bg-transparent border-[#C0B89F] text-[#2F3E2E] hover:bg-[#E0D9C0]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleUploadNewDocument}
                className="bg-[#E0D9C0] hover:bg-[#C0B89F] text-[#2F3E2E]"
                disabled={!newDocumentFile || uploading}
              >
                {uploading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span> Uploading...
                  </>
                ) : (
                  "Upload Document"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default EquipmentForm
