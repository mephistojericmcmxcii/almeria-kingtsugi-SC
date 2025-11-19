"use client"

import { useState } from "react"
import { Printer, Edit, X, Package, AlertTriangle, Info } from "lucide-react" // Added Info icon
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

// Define the OfficeEquipment interface to match the data structure
interface OfficeEquipment {
  id: string // Firestore document ID
  equipmentId: string // The user-defined equipment code
  name: string
  category: string
  serialNumber: string
  location: string
  manufacturer?: string
  model?: string
  purchaseDate?: string
  warrantyExpiration?: string
  cost?: number
  condition?: string
  assignedTo?: string
  status: string
  notes?: string
  imageUrl?: string
  voltage?: string
  brand?: string
  createdAt?: any // Firebase Timestamp or string
  createdBy?: string
  updatedAt?: any // Firebase Timestamp or string
  lastUpdatedBy?: string
}

interface OfficeEquipmentViewProps {
  equipment: OfficeEquipment
  onClose: () => void
  onEdit: () => void
}

export default function OfficeEquipmentView({ equipment, onClose, onEdit }: OfficeEquipmentViewProps) {
  const [isPrinting, setIsPrinting] = useState(false)

  // Format date for display
  const formatDate = (dateString?: string | any) => {
    if (!dateString) return "N/A"
    try {
      // Handle Firebase Timestamp objects
      if (typeof dateString === "object" && dateString.toDate) {
        return format(dateString.toDate(), "PPP")
      }
      return format(new Date(dateString), "PPP")
    } catch (error) {
      return "Invalid date"
    }
  }

  // Format currency
  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return "N/A"
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount)
  }

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "available":
        return "bg-green-600 hover:bg-green-700 print:bg-green-100 print:text-green-800"
      case "in use":
        return "bg-blue-600 hover:bg-blue-700 print:bg-blue-100 print:text-blue-800"
      case "under maintenance":
        return "bg-yellow-600 hover:bg-yellow-700 print:bg-yellow-100 print:text-yellow-800"
      case "retired":
        return "bg-red-600 hover:bg-red-700 print:bg-red-100 print:text-red-800"
      default:
        return "bg-gray-600 hover:bg-gray-700 print:bg-gray-100 print:text-gray-800"
    }
  }

  // Handle print
  const handlePrint = () => {
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
      setIsPrinting(false)
    }, 100)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:p-0">
      <div className="bg-[#F0EAD6] border border-[#DDD7B1] rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:bg-white print:text-black print:shadow-none print:rounded-none print:border-none print:w-full print:max-w-none">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[#4A7C74] print:border-gray-300 print:bg-gray-100">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#2F3E2E] print:text-black">Office Equipment Details</h2>
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
              onClick={onEdit}
              className="text-[#8B8378] hover:text-[#2F3E2E] bg-[#E0D9C0] hover:bg-[#C0B89F] border-[#4A7C74]"
            >
              <Edit className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost" // Changed to ghost for consistency with chemical-view
              size="icon"
              onClick={onClose}
              className="text-[#8B8378] hover:text-[#2F3E2E]"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6 print:text-black">
          {/* Item Header with Image */}
          {equipment && (
            <div className="bg-[#E8E2C9] p-6 rounded-lg border border-[#4A7C74] print:bg-gray-100 print:border-gray-300">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Item Info */}
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge className="bg-[#4A7C74] hover:bg-[#2F3E2E] print:bg-emerald-100 print:text-emerald-800">
                      {equipment.category}
                    </Badge>
                    {equipment.status === "Under Maintenance" && (
                      <Badge className="bg-yellow-600 hover:bg-yellow-700 print:bg-yellow-100 print:text-yellow-800">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Under Maintenance
                      </Badge>
                    )}
                    {equipment.brand && (
                      <Badge className="bg-green-600 hover:bg-green-700 print:bg-green-100 print:text-green-800">
                        Brand: {equipment.brand}
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-3xl font-bold text-[#2F3E2E] print:text-black mb-2">{equipment.name}</h1>
                  <p className="text-[#8B8378] print:text-gray-600 text-lg">Equipment ID: {equipment.equipmentId}</p>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[#8B8378] print:text-gray-600 text-sm">Current Status</span>
                      <p className="text-[#2F3E2E] font-bold text-xl print:text-black">
                        <Badge className={`${getStatusColor(equipment.status)}`}>{equipment.status}</Badge>
                      </p>
                    </div>
                    <div>
                      <span className="text-[#8B8378] print:text-gray-600 text-sm">Cost</span>
                      <p className="text-[#2F3E2E] font-bold text-xl print:text-black">
                        {formatCurrency(equipment.cost)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Item Image */}
                <div className="flex-shrink-0">
                  <div className="w-48 h-48 border border-[#4A7C74] rounded-lg overflow-hidden bg-[#E8E2C9] print:border-gray-300 print:bg-gray-100">
                    {equipment.imageUrl ? (
                      <img
                        src={equipment.imageUrl || "/placeholder.svg"}
                        alt={equipment.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-400 text-sm text-center p-4 print:text-gray-500">
                          No image available
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Details Grid */}
          {equipment && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Technical Details */}
              <div className="bg-[#E8E2C9] p-5 rounded-lg border border-[#4A7C74] print:bg-white print:border-gray-200">
                <div className="flex items-center gap-2 mb-4 text-[#2F3E2E] print:text-black">
                  <Package className="h-5 w-5 text-[#4A7C74] print:text-[#4A7C74]" />
                  <h3 className="text-lg font-semibold text-[#2F3E2E] print:text-black">Technical Details</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-[#4A7C74] print:border-gray-200">
                    <span className="text-[#8B8378] print:text-gray-600">Serial Number</span>
                    <span className="text-[#2F3E2E] font-medium print:text-black">
                      {equipment.serialNumber || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#4A7C74] print:border-gray-200">
                    <span className="text-[#8B8378] print:text-gray-600">Model</span>
                    <span className="text-[#2F3E2E] font-medium print:text-black">{equipment.model || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#4A7C74] print:border-gray-200">
                    <span className="text-[#8B8378] print:text-gray-600">Manufacturer</span>
                    <span className="text-[#2F3E2E] font-medium print:text-black">
                      {equipment.manufacturer || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#4A7C74] print:border-gray-200">
                    <span className="text-[#8B8378] print:text-gray-600">Voltage</span>
                    <span className="text-[#2F3E2E] font-medium print:text-black">{equipment.voltage || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-[#8B8378] print:text-gray-600">Condition</span>
                    <span className="text-[#2F3E2E] font-medium print:text-black">{equipment.condition || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Administrative Details */}
              <div className="space-y-4">
                <div className="bg-[#E8E2C9] p-5 rounded-lg border border-[#4A7C74] print:bg-white print:border-gray-200">
                  <div className="flex items-center gap-2 mb-4 text-[#2F3E2E] print:text-black">
                    <Info className="h-5 w-5 text-[#4A7C74] print:text-[#4A7C74]" /> {/* Changed to Info icon */}
                    <h3 className="text-lg font-semibold text-[#2F3E2E] print:text-black">Administrative Details</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-[#4A7C74] print:border-gray-200">
                      <span className="text-[#8B8378] print:text-gray-600">Location</span>
                      <span className="text-[#2F3E2E] font-medium print:text-black">{equipment.location || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#4A7C74] print:border-gray-200">
                      <span className="text-[#8B8378] print:text-gray-600">Assigned To</span>
                      <span className="text-[#2F3E2E] font-medium print:text-black">
                        {equipment.assignedTo || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#4A7C74] print:border-gray-200">
                      <span className="text-[#8B8378] print:text-gray-600">Purchase Date</span>
                      <span className="text-[#2F3E2E] font-medium print:text-black text-sm">
                        {formatDate(equipment.purchaseDate)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#4A7C74] print:border-gray-200">
                      <span className="text-[#8B8378] print:text-gray-600">Warranty Expiration</span>
                      <span className="text-[#2F3E2E] font-medium print:text-black text-sm">
                        {formatDate(equipment.warrantyExpiration)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#4A7C74] print:border-gray-200">
                      {" "}
                      {/* Added border-b for consistency */}
                      <span className="text-[#8B8378] print:text-gray-600">Last Updated By</span>
                      <span className="text-[#2F3E2E] font-medium print:text-black">
                        {equipment.lastUpdatedBy || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-[#8B8378] print:text-gray-600">Last Updated Date</span>
                      <span className="text-[#2F3E2E] font-medium print:text-black text-sm">
                        {formatDate(equipment.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#E8E2C9] p-5 rounded-lg border border-[#4A7C74] print:bg-white print:border-gray-200">
                  <h4 className="text-[#8B8378] mb-3 print:text-gray-600 font-medium">Notes</h4>
                  <div className="bg-[#E8E2C9] p-4 rounded-md border border-[#4A7C74] min-h-[120px] print:bg-gray-100 print:border-gray-300">
                    <p className="text-[#2F3E2E] whitespace-pre-wrap print:text-black leading-relaxed">
                      {equipment.notes || "No additional notes available."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Print footer */}
          <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-sm text-gray-500">
            <div className="flex justify-between">
              <p>Printed on: {format(new Date(), "PPP 'at' p")}</p>
              <p>Equipment ID: {equipment.equipmentId}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
