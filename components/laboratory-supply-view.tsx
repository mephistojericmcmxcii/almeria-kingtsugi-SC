"use client"

import { useState, useEffect } from "react"
import { Printer, Edit, X, FlaskConical, AlertTriangle, Info, CalendarX, CalendarCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format, isPast } from "date-fns" // Import isPast
import { Badge } from "@/components/ui/badge"
import { collection, query, where, getDocs } from "firebase/firestore" // Import Firestore functions
import { db } from "@/lib/firebase" // Import db

interface LaboratorySupply {
  id: string
  itemName: string
  category: string
  unit: string
  quantity: number
  unitPrice: number
  totalCost?: number
  supplier?: string
  location?: string
  purchaseDate?: string
  deliveryDate?: string
  reorderLevel?: number
  notes?: string
  imageUrl?: string
  lastUpdated?: string
  lastUpdatedBy?: string
  expiryDate?: string
  variant?: string
  brand?: string
}

interface LaboratorySupplyViewProps {
  equipment: LaboratorySupply
  onClose: () => void
  onEdit: () => void
}

export default function LaboratorySupplyView({ equipment, onClose, onEdit }: LaboratorySupplyViewProps) {
  const [isPrinting, setIsPrinting] = useState(false)
  const [modifierName, setModifierName] = useState<string | null>(null) // State to hold resolved name

  // Format date if available
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not specified"
    return format(new Date(dateString), "PPP")
  }

  // Format currency
  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return "Not specified"
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount)
  }

  // Calculate total value
  const totalValue = equipment.quantity * (equipment.unitPrice || 0)

  // Check if stock is low
  const isLowStock = equipment.reorderLevel && equipment.quantity <= equipment.reorderLevel

  // Check if item is expired
  const isExpired = equipment.expiryDate ? isPast(new Date(equipment.expiryDate)) : false

  // Handle print
  const handlePrint = () => {
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
      setIsPrinting(false)
    }, 100)
  }

  // Fetch employee name based on email (lastUpdatedBy)
  useEffect(() => {
    const fetchEmployeeName = async () => {
      console.log("LaboratorySupplyView: --- Starting name resolution for 'Last Updated By' ---")
      console.log("LaboratorySupplyView: Raw 'equipment.lastUpdatedBy' value:", equipment.lastUpdatedBy)

      if (!equipment.lastUpdatedBy) {
        setModifierName(null)
        console.log("LaboratorySupplyView: 'lastUpdatedBy' is empty or null. No lookup performed.")
        return
      }

      // Check if lastUpdatedBy contains an email pattern
      if (equipment.lastUpdatedBy.includes("@")) {
        console.log(
          `LaboratorySupplyView: 'lastUpdatedBy' (${equipment.lastUpdatedBy}) looks like an email. Attempting Firestore lookup in 'employees' collection.`,
        )
        try {
          const employeesRef = collection(db!, "employees")
          const q = query(employeesRef, where("email", "==", equipment.lastUpdatedBy))
          const querySnapshot = await getDocs(q)

          if (!querySnapshot.empty) {
            const employeeData = querySnapshot.docs[0].data()
            const resolvedName = employeeData.name || employeeData.fullName || null
            setModifierName(resolvedName)
            console.log(
              "LaboratorySupplyView: Employee found in Firestore. Data:",
              employeeData,
              "Resolved name:",
              resolvedName,
            )
          } else {
            setModifierName(null) // No matching employee found
            console.log("LaboratorySupplyView: No employee record found for email:", equipment.lastUpdatedBy)
          }
        } catch (error) {
          console.error("LaboratorySupplyView: Error fetching employee name from Firestore:", error)
          setModifierName(null) // Reset on error
        }
      } else {
        // If it's not an email, it's likely already the name (from previous saves) or "Unknown User"
        // In this case, we just display it as is, no lookup needed.
        setModifierName(equipment.lastUpdatedBy)
        console.log(
          `LaboratorySupplyView: 'lastUpdatedBy' (${equipment.lastUpdatedBy}) is not an email. Displaying as is.`,
        )
      }
      console.log("LaboratorySupplyView: --- Finished name resolution ---")
    }

    fetchEmployeeName()
  }, [equipment.lastUpdatedBy])

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:p-0">
      <div className="bg-[#F0EAD6] border border-[#DDD7B1] rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:bg-white print:text-black print:shadow-none print:rounded-none print:border-none print:w-full print:max-w-none">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[#DDD7B1] print:border-gray-300 print:bg-gray-100">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#2F3E2E] print:text-black">Laboratory Supply Details</h2>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrint}
              className="text-[#8B8378] hover:text-[#2F3E2E] bg-[#E0D9C0] hover:bg-[#C0B89F] border-[#C0B89F]"
            >
              <Printer className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onEdit}
              className="text-[#8B8378] hover:text-[#2F3E2E] bg-[#E0D9C0] hover:bg-[#C0B89F] border-[#C0B89F]"
            >
              <Edit className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-[#8B8378] hover:text-[#2F3E2E]">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6 print:text-black">
          {/* Item Header with Image */}
          <div className="bg-[#E0D9C0] p-6 rounded-lg border border-[#C0B89F] print:bg-gray-100 print:border-gray-300">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Item Info */}
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge className="bg-[#4A7C74] hover:bg-[#3A6C64] print:bg-[#D0E0D0] print:text-[#2F3E2E]">
                    {equipment.category}
                  </Badge>
                  {isLowStock && (
                    <Badge className="bg-red-600 hover:bg-red-700 print:bg-red-100 print:text-red-800">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Low Stock
                    </Badge>
                  )}
                  {equipment.expiryDate && (
                    <Badge
                      className={
                        isExpired
                          ? "bg-red-600 hover:bg-red-700 print:bg-red-100 print:text-red-800"
                          : "bg-[#60A5FA] hover:bg-[#4A8CFD] print:bg-[#E0F2FE] print:text-[#1E40AF]"
                      }
                    >
                      {isExpired ? <CalendarX className="mr-1 h-3 w-3" /> : <CalendarCheck className="mr-1 h-3 w-3" />}
                      {isExpired ? "Expired" : "Not Expired"}
                    </Badge>
                  )}
                  {equipment.brand && (
                    <Badge className="bg-[#4A7C74] hover:bg-[#3A6C64] print:bg-[#D0E0D0] print:text-[#2F3E2E]">
                      Brand: {equipment.brand}
                    </Badge>
                  )}
                  {equipment.variant && (
                    <Badge className="bg-[#A78BFA] hover:bg-[#9373F7] print:bg-[#EDE9FE] print:text-[#6D28D9]">
                      {equipment.variant}
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl font-bold text-[#2F3E2E] print:text-black mb-2">{equipment.itemName}</h1>
                <p className="text-[#8B8378] print:text-gray-600 text-lg">ID: {equipment.id}</p>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[#8B8378] print:text-gray-600 text-sm">Current Stock</span>
                    <p className="text-[#2F3E2E] font-bold text-xl print:text-black">
                      {equipment.quantity} {equipment.unit}(s)
                    </p>
                  </div>
                  <div>
                    <span className="text-[#8B8378] print:text-gray-600 text-sm">Total Value</span>
                    <p className="text-[#2F3E2E] font-bold text-xl print:text-black">{formatCurrency(totalValue)}</p>
                  </div>
                </div>
              </div>

              {/* Item Image */}
              <div className="flex-shrink-0">
                <div className="w-48 h-48 border border-[#C0B89F] rounded-lg overflow-hidden bg-[#E0D9C0]/50 print:border-gray-300 print:bg-gray-100">
                  {equipment.imageUrl ? (
                    <img
                      src={equipment.imageUrl || "/placeholder.svg"}
                      alt={equipment.itemName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-[#8B8378] text-sm text-center p-4 print:text-gray-500">
                        No image available
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inventory Details (Combined) */}
            <div className="bg-[#E0D9C0] p-5 rounded-lg border border-[#C0B89F] print:bg-white print:border-gray-200">
              <div className="flex items-center gap-2 mb-4 text-[#2F3E2E] print:text-black">
                <FlaskConical className="h-5 w-5 text-[#4A7C74] print:text-[#4A7C74]" />
                <h3 className="text-lg font-semibold">Inventory Details</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-[#C0B89F] print:border-gray-200">
                  <span className="text-[#8B8378] print:text-gray-600">Unit Price</span>
                  <span className="text-[#2F3E2E] font-medium print:text-black">
                    {formatCurrency(equipment.unitPrice)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#C0B89F] print:border-gray-200">
                  <span className="text-[#8B8378] print:text-gray-600">Reorder Level</span>
                  <span className="text-[#2F3E2E] font-medium print:text-black">
                    {equipment.reorderLevel || "Not set"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#C0B89F] print:border-gray-200">
                  <span className="text-[#8B8378] print:text-gray-600">Storage Location</span>
                  <span className="text-[#2F3E2E] font-medium print:text-black">
                    {equipment.location || "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#C0B89F] print:border-gray-200">
                  <span className="text-[#8B8378] print:text-gray-600">Supplier</span>
                  <span className="text-[#2F3E2E] font-medium print:text-black">
                    {equipment.supplier || "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-[#8B8378] print:text-gray-600">Purchase Date</span>
                  <span className="text-[#2F3E2E] font-medium print:text-black text-sm">
                    {equipment.purchaseDate ? formatDate(equipment.purchaseDate) : "Not specified"}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes & Additional Info */}
            <div className="space-y-4">
              <div className="bg-[#E0D9C0] p-5 rounded-lg border border-[#C0B89F] print:bg-white print:border-gray-200">
                <div className="flex items-center gap-2 mb-4 text-[#2F3E2E] print:text-black">
                  <Info className="h-5 w-5 text-[#4A7C74] print:text-[#4A7C74]" />
                  <h3 className="text-lg font-semibold">Additional Information</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-[#C0B89F] print:border-gray-200">
                    <span className="text-[#8B8378] print:text-gray-600">Brand</span>
                    <span className="text-[#2F3E2E] font-medium print:text-black">
                      {equipment.brand || "No brand specified"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#C0B89F] print:border-gray-200">
                    <span className="text-[#8B8378] print:text-gray-600">Additional Variant</span>
                    <span className="text-[#2F3E2E] font-medium print:text-black">
                      {equipment.variant || "No additional variant"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#C0B89F] print:border-gray-200">
                    <span className="text-[#8B8378] print:text-gray-600">Expiry Date</span>
                    <span className="text-[#2F3E2E] font-medium print:text-black">
                      {equipment.expiryDate ? formatDate(equipment.expiryDate) : "Not specified"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#C0B89F] print:border-gray-200">
                    <span className="text-[#8B8378] print:text-gray-600">Last Updated By</span>
                    <span className="text-[#2F3E2E] font-medium print:text-black">
                      {modifierName || equipment.lastUpdatedBy || "Not recorded"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-[#8B8378] print:text-gray-600">Last Updated</span>
                    <span className="text-[#2F3E2E] font-medium print:text-black text-sm">
                      {equipment.lastUpdated ? formatDate(equipment.lastUpdated) : "Not recorded"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[#E0D9C0] p-5 rounded-lg border border-[#C0B89F] print:bg-white print:border-gray-200">
                <h4 className="text-[#8B8378] mb-3 print:text-gray-600 font-medium">Notes</h4>
                <div className="bg-[#E0D9C0] p-4 rounded-md border border-[#C0B89F] min-h-[120px] print:bg-gray-100 print:border-gray-300">
                  <p className="text-[#2F3E2E] whitespace-pre-wrap print:text-black leading-relaxed">
                    {equipment.notes || "No additional notes available."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stock Status Alert */}
          {isLowStock && (
            <div className="bg-red-100 p-5 rounded-lg border border-red-300 print:bg-red-100 print:border-red-300 print:text-red-800">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-700 print:text-red-700 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-red-800 print:text-red-800 mb-1">Low Stock Warning</h3>
                  <p className="text-red-800 print:text-red-800">
                    Current quantity ({equipment.quantity}) is at or below the reorder level ({equipment.reorderLevel}).
                    Consider restocking this item soon.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Print footer */}
          <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-sm text-gray-500">
            <div className="flex justify-between">
              <p>Printed on: {format(new Date(), "PPP 'at' p")}</p>
              <p>Item ID: {equipment.id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
