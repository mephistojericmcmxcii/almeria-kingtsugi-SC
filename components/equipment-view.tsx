"use client"

import { useState, useEffect } from "react"
import {
  X,
  FileText,
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
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface DocumentItem {
  id: string
  fileName: string
  originalFileName: string
  url: string
  uploadedAt: string
  type: "image" | "pdf" | "other"
  associatedRecordId?: string
  associatedRecordRefNo?: string
}

interface MaintenanceRecord {
  id: string
  joNo: string
  referenceNo: string
  date: string
  servicer: string
  remarks?: string
  documentUrl?: string | null
  originalFileName?: string | null
  certificateStatus?: string // Added this line
}

interface Equipment {
  id: string
  equipmentId: string
  name: string
  category: string
  serialNumber: string
  location: string
  manufacturer: string
  model: string
  supplier?: string
  purchaseDate?: string
  warrantyExpiration?: string
  cost?: number
  condition: string
  assignedTo?: string
  status: string
  notes?: string
  imageUrl?: string
  brand?: string
  lastModified?: string
  modifiedBy?: string
  maintenanceRecords?: MaintenanceRecord[]
  documents?: DocumentItem[]
  calibrationStatus?: string
  nextPMCDate?: string // Added for next PM/Calibration Date
  utilizationType?: string // Corrected field name for utilization status
  transferredInfo?: string | null // ADDED: Field for transferred information
}

interface EquipmentViewProps {
  equipment: Equipment
  onClose: () => void
  onEdit: () => void
}

export default function EquipmentView({ equipment, onClose, onEdit }: EquipmentViewProps) {
  const [isPrinting, setIsPrinting] = useState(false)
  const [modifierName, setModifierName] = useState<string | null>(null)
  const [fetchedDocuments, setFetchedDocuments] = useState<DocumentItem[]>([])
  const [loadingDocuments, setLoadingDocuments] = useState(true)

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not specified"
    try {
      return format(new Date(dateString), "PPP")
    } catch (error) {
      console.error("Error formatting date:", dateString, error)
      return "Invalid Date"
    }
  }

  const handlePrint = () => {
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
      setIsPrinting(false)
    }, 100)
  }

  useEffect(() => {
    document.body.classList.add("overflow-hidden")
    const overlayDiv = document.createElement("div")
    overlayDiv.id = "modal-backdrop-view"
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
      const existingOverlay = document.getElementById("modal-backdrop-view")
      if (existingOverlay) {
        document.body.removeChild(existingOverlay)
      }
    }
  }, [])

  useEffect(() => {
    const fetchEmployeeName = async () => {
      if (!equipment.modifiedBy) return
      try {
        if (equipment.modifiedBy.includes("@")) {
          const employeesRef = collection(db!, "employees")
          const q = query(employeesRef, where("email", "==", equipment.modifiedBy))
          const querySnapshot = await getDocs(q)
          if (!querySnapshot.empty) {
            const employeeData = querySnapshot.docs[0].data()
            setModifierName(employeeData.name || employeeData.fullName || null)
          }
        }
      } catch (error) {
        console.error("Error fetching employee name:", error)
      }
    }
    fetchEmployeeName()
  }, [equipment.modifiedBy])

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!equipment.id) {
        console.log("DEBUG: Equipment ID is not available, skipping document fetch.")
        setLoadingDocuments(false)
        return
      }
      setLoadingDocuments(true)
      setFetchedDocuments([])
      console.log(`DEBUG: Attempting to fetch documents for equipment ID (field): "${equipment.equipmentId}"`)
      try {
        if (!db) {
          console.error("DEBUG: Firestore DB instance is not available. Please check lib/firebase.ts")
          setLoadingDocuments(false)
          return
        }
        const docsRef = collection(db, "equipmentDocumentation")
        const q = query(docsRef, where("equipmentId", "==", equipment.equipmentId))
        const querySnapshot = await getDocs(q)
        if (querySnapshot.empty) {
          console.log(
            `DEBUG: No documents found in 'equipmentDocumentation' for equipmentId (field): "${equipment.equipmentId}"`,
          )
        } else {
          const documentsData: DocumentItem[] = querySnapshot.docs.map((doc) => {
            const data = doc.data() as Omit<DocumentItem, "id">
            console.log(`DEBUG: Fetched document ID: ${doc.id}, Data:`, data)
            return { id: doc.id, ...data }
          })
          setFetchedDocuments(documentsData)
          console.log(
            `DEBUG: Successfully fetched ${documentsData.length} documents for equipment ID (field): "${equipment.equipmentId}"`,
            documentsData,
          )
        }
      } catch (error) {
        console.error("DEBUG: Error fetching associated documents:", error)
      } finally {
        setLoadingDocuments(false)
      }
    }
    fetchDocuments()
  }, [equipment.id, equipment.equipmentId])

  const getLatestMaintenanceOrCalibrationDate = () => {
    if (!equipment.maintenanceRecords || equipment.maintenanceRecords.length === 0) {
      return "N/A"
    }
    const latestRecord = equipment.maintenanceRecords.reduce((latest, current) => {
      const latestDate = new Date(latest.date)
      const currentDate = new Date(current.date)
      return currentDate > latestDate ? current : latest
    })
    return formatDate(latestRecord.date)
  }

  const getOverallCertificateStatus = () => {
    if (!equipment.maintenanceRecords || equipment.maintenanceRecords.length === 0) {
      return "Not specified"
    }

    // Prioritize "to be follow" or "no certificate"
    const hasToBeFollow = equipment.maintenanceRecords.some((record) => record.certificateStatus === "to be follow")
    if (hasToBeFollow) return "To be followed"

    const hasNoCertificate = equipment.maintenanceRecords.some(
      (record) => record.certificateStatus === "no certificate",
    )
    if (hasNoCertificate) return "No certificate"

    // If all records have "w/ certificate" or no specific status, return "w/ certificate"
    const allWithCertificate = equipment.maintenanceRecords.every(
      (record) => record.certificateStatus === "w/ certificate" || !record.certificateStatus,
    )
    if (allWithCertificate) return "With certificate"

    return "Not specified" // Fallback for mixed or undefined states
  }

  const shouldShowNextPMCDate =
    equipment.calibrationStatus &&
    (equipment.calibrationStatus.toLowerCase().includes("for pm") ||
      equipment.calibrationStatus.toLowerCase().includes("for calibration"))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0">
      <div className="bg-[#F0EAD6] border-[#DDD7B1] rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:bg-white print:text-black print:shadow-none print:rounded-none print:border-none print:w-full print:max-w-none relative z-50">
        <div className="flex justify-between items-center p-4 border-b border-[#4A7C74] print:border-gray-300 print:bg-gray-100">
          <h2 className="text-xl font-bold text-[#2F3E2E] print:text-black">Equipment Details</h2>
          <div className="flex items-center gap-2 print:hidden">
            <Button
              variant="outline"
              size="icon"
              onClick={onEdit}
              className="text-[#8B8378] hover:text-[#2F3E2E] bg-[#E0D9C0] hover:bg-[#C0B89F] border-[#4A7C74] transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-[#8B8378] hover:text-[#2F3E2E] transition-colors"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-3 print:text-black">
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
                value="maintenance"
                className="text-[#2F3E2E] data-[state=active]:bg-[#4A7C74] data-[state=active]:text-white transition-colors"
              >
                <span className="sm:hidden">PMC</span>
                <span className="hidden sm:inline">Preventive Maintenance & Calibration</span>
              </TabsTrigger>
              <TabsTrigger
                value="document"
                className="text-[#2F3E2E] data-[state=active]:bg-[#4A7C74] data-[state=active]:text-white transition-colors"
              >
                <span className="sm:hidden">Docs</span>
                <span className="hidden sm:inline">Document</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column: Image, Basic Information */}
                <div className="space-y-3">
                  {/* Equipment Image */}
                  <div className="bg-[#E8E2C9] p-3 rounded-md shadow-sm print:bg-gray-100 print:shadow-none">
                    <h3 className="text-xl font-semibold text-[#4A7C74] border-b border-[#4A7C74] pb-1 print:text-black print:border-gray-300">
                      Equipment Image
                    </h3>
                    <div className="flex justify-center md:justify-start pt-2">
                      {equipment.imageUrl ? (
                        <div className="w-40 h-40 border border-[#4A7C74] rounded-md overflow-hidden shadow-md hover:scale-105 transition-transform print:border-gray-300 print:shadow-none sm:w-32 sm:h-32">
                          <img
                            src={equipment.imageUrl || "/placeholder.svg"}
                            alt={equipment.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-40 h-40 border border-dashed border-[#4A7C74] rounded-md flex items-center justify-center bg-gradient-to-r from-[#E8E2C9] to-[#F0EAD6] print:border-gray-300 print:bg-gray-100 sm:w-32 sm:h-32">
                          <span className="text-[#8B8378] text-sm text-center p-2 print:text-gray-500">
                            No image available
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Basic Information */}
                  <div className="bg-[#E8E2C9] p-3 rounded-md shadow-sm print:bg-gray-100 print:shadow-none">
                    <h3 className="text-xl font-semibold text-[#4A7C74] border-b border-[#4A7C74] pb-1 print:text-black print:border-gray-300">
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 gap-2 pt-2">
                      <div className="flex items-start gap-2">
                        <Tag className="h-4 w-4 text-[#4A7C74] mt-1 print:text-gray-600" />
                        <div>
                          <p className="text-[#8B8378] text-xs font-light print:text-gray-600">Equipment ID</p>
                          <p className="text-[#2F3E2E] font-medium print:text-black">
                            {equipment.equipmentId || "Not specified"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Box className="h-4 w-4 text-[#4A7C74] mt-1 print:text-gray-600" />
                        <div>
                          <p className="text-[#8B8378] text-xs font-light print:text-gray-600">Name</p>
                          <p className="text-[#2F3E2E] font-medium print:text-black">{equipment.name}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Box className="h-4 w-4 text-[#4A7C74] mt-1 print:text-gray-600" />
                        <div>
                          <p className="text-[#8B8378] text-xs font-light print:text-gray-600">Model</p>
                          <p className="text-[#2F3E2E] font-medium print:text-black">
                            {equipment.model || "Not specified"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Box className="h-4 w-4 text-[#4A7C74] mt-1 print:text-gray-600" />
                        <div>
                          <p className="text-[#8B8378] text-xs font-light print:text-gray-600">Category</p>
                          <p className="text-[#2F3E2E] font-medium print:text-black">{equipment.category}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Tag className="h-4 w-4 text-[#4A7C74] mt-1 print:text-gray-600" />
                        <div>
                          <p className="text-[#8B8378] text-xs font-light print:text-gray-600">Serial Number</p>
                          <p className="text-[#2F3E2E] font-medium print:text-black">
                            {equipment.serialNumber || "Not specified"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-[#4A7C74] mt-1 print:text-gray-600" />
                        <div>
                          <p className="text-[#8B8378] text-xs font-light print:text-gray-600">Location</p>
                          <p className="text-[#2F3E2E] font-medium print:text-black">{equipment.location}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Factory className="h-4 w-4 text-[#4A7C74] mt-1 print:text-gray-600" />
                        <div>
                          <p className="text-[#8B8378] text-xs font-light print:text-gray-600">Manufacturer</p>
                          <p className="text-[#2F3E2E] font-medium print:text-black">
                            {equipment.manufacturer || "Not specified"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Box className="h-4 w-4 text-[#4A7C74] mt-1 print:text-gray-600" />
                        <div>
                          <p className="text-[#8B8378] text-xs font-light print:text-gray-600">Brand</p>
                          <p className="text-[#2F3E2E] font-medium print:text-black">
                            {equipment.brand || "Not specified"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Box className="h-4 w-4 text-[#4A7C74] mt-1 print:text-gray-600" />
                        <div>
                          <p className="text-[#8B8378] text-xs font-light print:text-gray-600">Supplier</p>
                          <p className="text-[#2F3E2E] font-medium print:text-black">
                            {equipment.supplier || "Not specified"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <DollarSign className="h-4 w-4 text-[#4A7C74] mt-1 print:text-gray-600" />
                        <div>
                          <p className="text-[#8B8378] text-xs font-light print:text-gray-600">Cost</p>
                          <p className="text-[#2F3E2E] font-medium print:text-black">
                            {equipment.cost && typeof equipment.cost === "number"
                              ? `₱${equipment.cost.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : "Not specified"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-[#4A7C74] mt-1 print:text-gray-600" />
                        <div>
                          <p className="text-[#8B8378] text-xs font-light print:text-gray-600">Purchase Date</p>
                          <p className="text-[#2F3E2E] font-medium print:text-black">
                            {equipment.purchaseDate ? formatDate(equipment.purchaseDate) : "Not specified"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-[#4A7C74] mt-1 print:text-gray-600" />
                        <div>
                          <p className="text-[#8B8378] text-xs font-light print:text-gray-600">Warranty Expiration</p>
                          <p className="text-[#2F3E2E] font-medium print:text-black">
                            {equipment.warrantyExpiration ? formatDate(equipment.warrantyExpiration) : "Not specified"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Operational Status */}
                <div className="space-y-3">
                  <div className="bg-[#E8E2C9] p-3 rounded-md shadow-sm print:bg-gray-100 print:shadow-none">
                    <h3 className="text-xl font-semibold text-[#4A7C74] border-b border-[#4A7C74] pb-1 print:text-black print:border-gray-300">
                      Operational Status
                    </h3>
                    <div className="grid grid-cols-1 gap-2 pt-2">
                      {/* Status */}
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-[#4A7C74] mt-1 print:text-gray-600" />
                        <div>
                          <p className="text-[#8B8378] text-xs font-light print:text-gray-600">Status</p>
                          <p className="text-[#2F3E2E] font-medium print:text-black">{equipment.status}</p>
                        </div>
                      </div>
                      {/* Transferred Information (Conditional) */}
                      {equipment.status === "Transferred" && equipment.transferredInfo && (
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-[#4A7C74] mt-1 print:text-gray-600" />
                          <div>
                            <p className="text-[#8B8378] text-xs font-light print:text-gray-600">
                              Transferred Information
                            </p>
                            <p className="text-[#2F3E2E] font-medium print:text-black">{equipment.transferredInfo}</p>
                          </div>
                        </div>
                      )}
                      {/* Utilization Type */}
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-[#4A7C74] mt-1 print:text-gray-600" />
                        <div>
                          <p className="text-[#8B8378] text-xs font-light print:text-gray-600">Utilization Type</p>
                          <p className="text-[#2F3E2E] font-medium print:text-black">
                            {equipment.utilizationType || "Not specified"}
                          </p>
                        </div>
                      </div>
                      {/* Calibration Status */}
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-[#4A7C74] mt-1 print:text-gray-600" />
                        <div>
                          <p className="text-[#8B8378] text-xs font-light print:text-gray-600">Calibration Status</p>
                          <p className="text-[#2F3E2E] font-medium print:text-black">
                            {equipment.calibrationStatus || "Not specified"}
                          </p>
                        </div>
                      </div>
                      {/* Next PM/Calibration Date (Conditional) */}
                      {shouldShowNextPMCDate && (
                        <div className="flex items-start gap-2">
                          <Calendar className="h-4 w-4 text-[#4A7C74] mt-1 print:text-gray-600" />
                          <div>
                            <p className="text-[#8B8378] text-xs font-light print:text-gray-600">
                              Next PM/Calibration Date
                            </p>
                            <p className="text-[#2F3E2E] font-medium print:text-black">
                              {equipment.nextPMCDate ? formatDate(equipment.nextPMCDate) : "Not specified"}
                            </p>
                          </div>
                        </div>
                      )}
                      {/* Condition */}
                      <div className="flex items-start gap-2">
                        <Wrench className="h-4 w-4 text-[#4A7C74] mt-1 print:text-gray-600" />
                        <div>
                          <p className="text-[#8B8378] text-xs font-light print:text-gray-600">Condition</p>
                          <p className="text-[#2F3E2E] font-medium print:text-black">{equipment.condition}</p>
                        </div>
                      </div>
                      {/* Certificate Status */}
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-[#4A7C74] mt-1 print:text-gray-600" />
                        <div>
                          <p className="text-[#8B8378] text-xs font-light print:text-gray-600">Certificate Status</p>
                          <p className="text-[#2F3E2E] font-medium print:text-black">{getOverallCertificateStatus()}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-[#4A7C74] mt-1 print:text-gray-600" />
                        <div>
                          <p className="text-[#8B8378] text-xs font-light print:text-gray-600">Assigned To</p>
                          <p className="text-[#2F3E2E] font-medium print:text-black">
                            {equipment.assignedTo || "Not assigned"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-[#4A7C74] mt-1 print:text-gray-600" />
                        <div>
                          <p className="text-[#8B8378] text-xs font-light print:text-gray-600">
                            Latest Maintenance/Calibration Date
                          </p>
                          <p className="text-[#2F3E2E] font-medium print:text-black">
                            {getLatestMaintenanceOrCalibrationDate()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-[#4A7C74] mt-1 print:text-gray-600" />
                        <div>
                          <p className="text-[#8B8378] text-xs font-light print:text-gray-600">Remarks</p>
                          <p className="text-[#2F3E2E] font-medium print:text-black">
                            {equipment.notes || "No remarks"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="maintenance" className="mt-3">
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-[#2F3E2E] border-b border-[#4A7C74] pb-1 print:text-black print:border-gray-300">
                  Maintenance & Calibration Log
                </h3>
                {equipment.maintenanceRecords && equipment.maintenanceRecords.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table className="min-w-full bg-[#E8E2C9] border border-[#4A7C74] rounded-md print:bg-gray-100 print:border-gray-300">
                      <TableHeader>
                        <TableRow className="bg-[#C0B89F] text-[#2F3E2E] print:bg-gray-200 print:text-black">
                          <TableHead className="py-2 px-4 text-left font-semibold">J.O No.</TableHead>
                          <TableHead className="py-2 px-4 text-left font-semibold">Reference No.</TableHead>
                          <TableHead className="py-2 px-4 text-left font-semibold">Date</TableHead>
                          <TableHead className="py-2 px-4 text-left font-semibold">Servicer</TableHead>
                          <TableHead className="py-2 px-4 text-left font-semibold">Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {equipment.maintenanceRecords.map((record) => (
                          <TableRow
                            key={record.id}
                            className="border-b border-[#DDD7B1] last:border-b-0 print:border-gray-300"
                          >
                            <TableCell className="py-2 px-4 text-[#2F3E2E] print:text-black">{record.joNo}</TableCell>
                            <TableCell className="py-2 px-4 text-[#2F3E2E] print:text-black">
                              {record.referenceNo}
                            </TableCell>
                            <TableCell className="py-2 px-4 text-[#2F3E2E] print:text-black">
                              {formatDate(record.date)}
                            </TableCell>
                            <TableCell className="py-2 px-4 text-[#2F3E2E] print:text-black">
                              {record.servicer}
                            </TableCell>
                            <TableCell className="py-2 px-4 text-[#2F3E2E] print:text-black">
                              {record.remarks || "N/A"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center text-[#8B8378] p-4 border border-dashed border-[#4A7C74] rounded-md bg-[#E8E2C9] print:border-gray-300 print:bg-gray-100 print:text-gray-500">
                    No maintenance or calibration records available.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="document" className="mt-3">
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-[#2F3E2E] border-b border-[#4A7C74] pb-1 print:text-black print:border-gray-300">
                  Associated Documents
                </h3>
                {loadingDocuments ? (
                  <div className="text-center text-[#8B8378] p-4 border border-dashed border-[#4A7C74] rounded-md bg-[#E8E2C9] print:border-gray-300 print:bg-gray-100 print:text-gray-500">
                    Loading associated documents...
                  </div>
                ) : fetchedDocuments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table className="min-w-full bg-[#E8E2C9] border border-[#4A7C74] rounded-md print:bg-gray-100 print:border-gray-300">
                      <TableHeader>
                        <TableRow className="bg-[#C0B89F] text-[#2F3E2E] print:bg-gray-200 print:text-black">
                          <TableHead className="py-2 px-4 text-left font-semibold">File Name</TableHead>
                          <TableHead className="py-2 px-4 text-left font-semibold">Type</TableHead>
                          <TableHead className="py-2 px-4 text-left font-semibold">Uploaded At</TableHead>
                          <TableHead className="py-2 px-4 text-left font-semibold">Associated Record</TableHead>
                          <TableHead className="py-2 px-4 text-left font-semibold print:hidden">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fetchedDocuments.map((doc) => (
                          <TableRow
                            key={doc.id}
                            className="border-b border-[#DDD7B1] last:border-b-0 print:border-gray-300"
                          >
                            <TableCell className="py-2 px-4 text-[#2F3E2E] print:text-black">
                              {doc.originalFileName}
                            </TableCell>
                            <TableCell className="py-2 px-4 text-[#2F3E2E] print:text-black">
                              {doc.type || "N/A"}
                            </TableCell>
                            <TableCell className="py-2 px-4 text-[#2F3E2E] print:text-black">
                              {formatDate(doc.uploadedAt)}
                            </TableCell>
                            <TableCell className="py-2 px-4 text-[#2F3E2E] print:text-black">
                              {doc.associatedRecordRefNo || "N/A"}
                            </TableCell>
                            <TableCell className="py-2 px-4 text-[#2F3E2E] print:hidden">
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[#2F3E2E] hover:underline"
                              >
                                <FileText className="h-4 w-4" />
                                View
                              </a>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center text-[#8B8378] p-4 border border-dashed border-[#4A7C74] rounded-md bg-[#E8E2C9] print:border-gray-300 print:bg-gray-100 print:text-gray-500">
                    No associated documents available.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="bg-[#E8E2C9] p-3 rounded-md shadow-sm print:bg-gray-100 print:shadow-none">
            <h3 className="text-xl font-semibold text-[#4A7C74] border-b border-[#4A7C74] pb-1 print:text-black print:border-gray-300">
              Inventory Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-[#4A7C74] mt-1 print:text-gray-600" />
                <div>
                  <p className="text-[#8B8378] text-xs font-light print:text-gray-600">Last Modified</p>
                  <p className="text-[#2F3E2E] font-medium print:text-black">
                    {equipment.lastModified
                      ? formatDate(equipment.lastModified) +
                        " at " +
                        new Date(equipment.lastModified).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "Not available"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-[#4A7C74] mt-1 print:text-gray-600" />
                <div>
                  <p className="text-[#8B8378] text-xs font-light print:text-gray-600">Modified By</p>
                  <p className="text-[#2F3E2E] font-medium print:text-black">
                    {modifierName || equipment.modifiedBy || "Not available"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-sm text-gray-500">
            <p>Printed on: {format(new Date(), "PPP 'at' p")}</p>
            <p>Equipment ID: {equipment.equipmentId || equipment.id}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
