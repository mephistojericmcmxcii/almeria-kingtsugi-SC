"use client"
import { X, Edit, Printer, Info, CalendarX, CalendarCheck } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format, isPast } from "date-fns"
import ChemicalEditItemForm from "@/components/chemical-edit-item-form"

// Interfaces for the new data structure
interface ChemicalGeneralInfo {
  name: string
  chemicalFormula?: string
  brand?: string
  category: string
  supplier?: string
  catalogNumber?: string
  msdsLink?: string // Retained for data passing, but not displayed
  hazardClass?: string[] // Retained for data passing, but not displayed
  storageRequirements?: string // Retained for data passing, but not displayed
  services?: string
  notes?: string
}

interface ChemicalUniqueItem {
  id: string // Document ID of the unique item in subcollection
  tagId: string // Auto-generated tag ID
  supplierName: string // Supplier name field
  catalogNumber: string // Catalog number field
  brand: string // Added brand field
  batchNo: string
  lotNo?: string
  deliveryDate: string // Stored as YYYY-MM-DD string
  variant?: string
  containerQuantity: number
  unit: string
  location: string
  expiryDate?: string
  status: string
  remarks?: string // Remarks/comments field
  recordedBy: string
  lastUpdatedBy?: string
  createdAt?: { seconds: number; nanoseconds: number }
  updatedAt?: { seconds: number; nanoseconds: number }
}

interface UniqueItemDetailsModalProps {
  chemicalUniqueItem: ChemicalUniqueItem // The specific unique item to display
  chemicalGeneralInfo: ChemicalGeneralInfo // The general info for the chemical type (for context)
  onClose: () => void
  onEdit: (item: ChemicalUniqueItem & ChemicalGeneralInfo) => void // Pass combined data for edit
  onDelete: () => void // Callback to refresh parent list
}

export default function UniqueItemDetailsModal({
  chemicalUniqueItem,
  chemicalGeneralInfo,
  onClose,
  onEdit,
  onDelete,
}: UniqueItemDetailsModalProps) {
  // Function to format Firestore Timestamp to readable date string
  const formatFirestoreTimestamp = (timestamp: { seconds: number; nanoseconds: number } | undefined) => {
    if (!timestamp) return "N/A"
    try {
      const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000)
      return format(date, "PPP 'at' p")
    } catch (error) {
      console.error("Error formatting timestamp:", error)
      return "Invalid Date"
    }
  }

  // Format date for display (from YYYY-MM-DD string)
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not specified"
    try {
      return format(new Date(dateString), "PPP")
    } catch (error) {
      return "Invalid date"
    }
  }

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "available":
        return "bg-green-600 hover:bg-green-700 print:bg-green-100 print:text-green-800"
      case "low stock":
        return "bg-yellow-600 hover:bg-yellow-700 print:bg-yellow-100 print:text-yellow-800"
      case "out of stock":
        return "bg-red-600 hover:bg-red-700 print:bg-red-100 print:text-red-800"
      case "expired":
        return "bg-red-600 hover:bg-red-700 print:bg-red-100 print:text-red-800"
      case "on order":
        return "bg-blue-600 hover:bg-blue-700 print:bg-blue-100 print:text-blue-800"
      default:
        return "bg-gray-600 hover:bg-gray-700 print:bg-gray-100 print:text-gray-800"
    }
  }

  const totalQuantity = chemicalUniqueItem.containerQuantity * chemicalUniqueItem.numberOfContainers

  // Check if item is expired
  const isExpired = chemicalUniqueItem.expiryDate ? isPast(new Date(chemicalUniqueItem.expiryDate)) : false

  // Handle print
  const handlePrint = () => {
    window.print()
  }

  const [showEditForm, setShowEditForm] = useState(false)

  const handleEditWithStandaloneForm = () => {
    setShowEditForm(true)
  }

  const handleCloseEditForm = () => {
    setShowEditForm(false)
    onClose() // Close the details modal as well
  }

  const handleEditFormSuccess = () => {
    setShowEditForm(false)
    onClose() // Close the details modal
    // Note: The parent component should handle data refresh
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:p-0">
      <div className="bg-[#F0EAD6] border border-[#DDD7B1] rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:bg-white print:text-black print:shadow-none print:rounded-none print:border-none print:w-full print:max-w-none">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[#4A7C74] print:border-gray-300 print:bg-gray-100">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#2F3E2E] print:text-black">Unique Item Details</h2>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrint}
              className="text-[#8B8378] hover:text-[#2F3E2E] bg-[#E0D9C0] hover:bg-[#C0B89F] border-[#4A7C74]"
            >
              <Printer className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleEditWithStandaloneForm} // Use new standalone edit handler
              className="text-[#8B8378] hover:text-[#2F3E2E] bg-[#E0D9C0] hover:bg-[#C0B89F] border-[#4A7C74]"
            >
              <Edit className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onClose}
              className="text-[#8B8378] hover:text-[#FF6347] bg-[#E0D9C0] hover:bg-[#C0B89F] border-[#4A7C74]"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6 print:text-black">
          {/* Item Header */}
          <div className="bg-[#E8E2C9] p-6 rounded-lg border border-[#4A7C74] print:bg-gray-100 print:border-gray-300">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Item Info */}
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge className="bg-[#4A7C74] hover:bg-[#2F3E2E] print:bg-emerald-100 print:text-emerald-800">
                    {chemicalGeneralInfo.category}
                  </Badge>
                  <Badge className={`${getStatusColor(chemicalUniqueItem.status)}`}>{chemicalUniqueItem.status}</Badge>
                  {chemicalUniqueItem.expiryDate && (
                    <Badge
                      className={
                        isExpired
                          ? "bg-red-600 hover:bg-red-700 print:bg-red-100 print:text-red-800"
                          : "bg-blue-600 hover:bg-blue-700 print:bg-blue-100 print:text-blue-800"
                      }
                    >
                      {isExpired ? <CalendarX className="mr-1 h-3 w-3" /> : <CalendarCheck className="mr-1 h-3 w-3" />}
                      {isExpired ? "Expired" : "Not Expired"}
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl font-bold text-[#2F3E2E] print:text-black mb-2">{chemicalGeneralInfo.name}</h1>
                <p className="text-[#8B8378] print:text-gray-600 text-lg">
                  Formula: {chemicalGeneralInfo.chemicalFormula || "N/A"}
                </p>
                <p className="text-[#4A7C74] print:text-gray-600 text-lg font-mono font-bold">
                  Tag ID: {chemicalUniqueItem.tagId}
                </p>
                <p className="text-[#8B8378] print:text-gray-600 text-lg">Batch No.: {chemicalUniqueItem.batchNo}</p>
                {chemicalUniqueItem.lotNo && (
                  <p className="text-[#8B8378] print:text-gray-600 text-lg">LOT No.: {chemicalUniqueItem.lotNo}</p>
                )}
                {chemicalGeneralInfo.services && (
                  <p className="text-[#8B8378] print:text-gray-600 text-lg">Services: {chemicalGeneralInfo.services}</p>
                )}
                {chemicalUniqueItem.variant && (
                  <p className="text-[#8B8378] print:text-gray-600 text-lg">Variant: {chemicalUniqueItem.variant}</p>
                )}
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[#8B8378] print:text-gray-600 text-sm">Container Quantity</span>
                    <p className="text-[#2F3E2E] font-bold text-xl print:text-black">
                      {chemicalUniqueItem.containerQuantity} {chemicalUniqueItem.unit}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#8B8378] print:text-gray-600 text-sm">Location</span>
                    <p className="text-[#2F3E2E] font-bold text-xl print:text-black">{chemicalUniqueItem.location}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* General Information */}
            <div className="bg-[#E8E2C9] p-5 rounded-lg border border-[#4A7C74] print:bg-white print:border-gray-200">
              <div className="flex items-center gap-2 mb-4 text-[#2F3E2E] print:text-black">
                <Info className="h-5 w-5 text-[#4A7C74] print:text-[#4A7C74]" />
                <h3 className="text-lg font-semibold">Item Information</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-[#4A7C74] print:border-gray-200">
                  <span className="text-[#8B8378] print:text-gray-600">Delivery Date</span>
                  <span className="text-[#2F3E2E] font-medium print:text-black">
                    {formatDate(chemicalUniqueItem.deliveryDate)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#4A7C74] print:border-gray-200">
                  <span className="text-[#8B8378] print:text-gray-600">Expiry Date</span>
                  <span className="text-[#2F3E2E] font-medium print:text-black">
                    {chemicalUniqueItem.expiryDate ? formatDate(chemicalUniqueItem.expiryDate) : "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-[#8B8378] print:text-gray-600">Status</span>
                  <span className="text-[#2F3E2E] font-medium print:text-black">{chemicalUniqueItem.status}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#E8E2C9] p-5 rounded-lg border border-[#4A7C74] print:bg-white print:border-gray-200">
              <div className="flex items-center gap-2 mb-4 text-[#2F3E2E] print:text-black">
                <Info className="h-5 w-5 text-[#4A7C74] print:text-[#4A7C74]" />
                <h3 className="text-lg font-semibold">Supplier & Catalog</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-[#4A7C74] print:border-gray-200">
                  <span className="text-[#8B8378] print:text-gray-600">Supplier Name</span>
                  <span className="text-[#2F3E2E] font-medium print:text-black">
                    {chemicalUniqueItem.supplierName || "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#4A7C74] print:border-gray-200">
                  <span className="text-[#8B8378] print:text-gray-600">Catalog Number</span>
                  <span className="text-[#2F3E2E] font-medium print:text-black">
                    {chemicalUniqueItem.catalogNumber || "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-[#8B8378] print:text-gray-600">Brand</span>
                  <span className="text-[#2F3E2E] font-medium print:text-black">
                    {chemicalUniqueItem.brand || "Not specified"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {chemicalUniqueItem.remarks && (
            <div className="bg-[#E8E2C9] p-5 rounded-lg border border-[#4A7C74] print:bg-white print:border-gray-200">
              <h4 className="text-[#8B8378] mb-3 print:text-gray-600 font-medium">Remarks/Comments</h4>
              <div className="bg-[#E8E2C9] p-4 rounded-md border border-[#4A7C74] min-h-[80px] print:bg-gray-100 print:border-gray-300">
                <p className="text-[#2F3E2E] whitespace-pre-wrap print:text-black leading-relaxed">
                  {chemicalUniqueItem.remarks}
                </p>
              </div>
            </div>
          )}

          {/* Audit Information */}
          <div className="space-y-4 text-sm text-[#8B8378] print:text-gray-600">
            <p>
              <span className="font-semibold">Recorded By:</span> {chemicalUniqueItem.recordedBy}
            </p>
            {chemicalUniqueItem.lastUpdatedBy && (
              <p>
                <span className="font-semibold">Last Updated By:</span> {chemicalUniqueItem.lastUpdatedBy}
              </p>
            )}
            <p>
              <span className="font-semibold">Created At:</span>{" "}
              {formatFirestoreTimestamp(chemicalUniqueItem.createdAt)}
            </p>
            <p>
              <span className="font-semibold">Last Updated At:</span>{" "}
              {formatFirestoreTimestamp(chemicalUniqueItem.updatedAt)}
            </p>
          </div>

          {/* Print footer */}
          <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-sm text-gray-500">
            <div className="flex justify-between">
              <p>Printed on: {format(new Date(), "PPP 'at' p")}</p>
              <p>Tag ID: {chemicalUniqueItem.tagId}</p>
            </div>
          </div>
        </div>
      </div>

      {showEditForm && (
        <ChemicalEditItemForm
          onClose={handleCloseEditForm}
          parentChemicalId={chemicalUniqueItem.id.split("/")[0]} // Extract parent ID from unique item path
          parentChemicalInfo={chemicalGeneralInfo}
          existingItem={chemicalUniqueItem}
          onSuccess={handleEditFormSuccess} // Added onSuccess callback
        />
      )}
    </div>
  )
}
