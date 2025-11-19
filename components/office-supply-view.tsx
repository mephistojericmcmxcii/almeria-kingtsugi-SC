"use client"

import { useState, useEffect } from "react"
import { Printer, Edit, X, Package, AlertTriangle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface OfficeSupply {
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
  reorderLevel?: number
  notes?: string
  imageUrl?: string
  lastUpdated?: string
  deliveryDate?: string
  brand?: string
  additionalVariant?: string
  createdBy?: string
  createdAt?: string
  lastUpdatedBy?: string
}

interface OfficeSupplyViewProps {
  supply: OfficeSupply
  onClose: () => void
  onEdit: () => void
}

export default function OfficeSupplyView({ supply, onClose, onEdit }: OfficeSupplyViewProps) {
  const [isPrinting, setIsPrinting] = useState(false)
  const [modifierName, setModifierName] = useState<string | null>(null)

  const formatDate = (dateString?: string | any) => {
    if (!dateString) return "Not specified"
    try {
      if (typeof dateString === "object" && dateString.toDate) {
        return format(dateString.toDate(), "PPP")
      }
      return format(new Date(dateString), "PPP")
    } catch (error) {
      return "Invalid date"
    }
  }

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return "Not specified"
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount)
  }

  const totalValue = supply.quantity * (supply.unitPrice || 0)
  const isLowStock = supply.reorderLevel && supply.quantity <= supply.reorderLevel

  const handlePrint = () => {
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
      setIsPrinting(false)
    }, 100)
  }

  useEffect(() => {
    const fetchEmployeeName = async () => {
      if (!supply.lastUpdatedBy) {
        setModifierName(null)
        return
      }

      if (supply.lastUpdatedBy.includes("@")) {
        try {
          const employeesRef = collection(db!, "employees")
          const q = query(employeesRef, where("email", "==", supply.lastUpdatedBy))
          const querySnapshot = await getDocs(q)

          if (!querySnapshot.empty) {
            const employeeData = querySnapshot.docs[0].data()
            const resolvedName = employeeData.name || employeeData.fullName || null
            setModifierName(resolvedName)
          } else {
            setModifierName(null)
          }
        } catch (error) {
          console.error("Error fetching employee name from Firestore:", error)
          setModifierName(null)
        }
      } else {
        setModifierName(supply.lastUpdatedBy)
      }
    }

    fetchEmployeeName()
  }, [supply.lastUpdatedBy])

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:p-0">
      <div className="bg-[#F0EAD6] border border-[#DDD7B1] rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:bg-white print:text-black print:shadow-none print:rounded-none print:border-none print:w-full print:max-w-none">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[#4A7C74] print:border-gray-300 print:bg-gray-100">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#2F3E2E] print:text-black">Office Supply Details</h2>
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
            <Button variant="ghost" size="icon" onClick={onClose} className="text-[#8B8378] hover:text-[#2F3E2E]">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6 print:text-black">
          {/* Item Header with Image */}
          {supply && (
            <div className="bg-[#E8E2C9] p-6 rounded-lg border border-[#4A7C74] print:bg-gray-100 print:border-gray-300">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Item Info */}
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge className="bg-[#4A7C74] hover:bg-[#2F3E2E] print:bg-emerald-100 print:text-emerald-800">
                      {supply.category}
                    </Badge>
                    {isLowStock && (
                      <Badge className="bg-red-600 hover:bg-red-700 print:bg-red-100 print:text-red-800">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Low Stock
                      </Badge>
                    )}
                    {supply.brand && (
                      <Badge className="bg-green-600 hover:bg-green-700 print:bg-green-100 print:text-green-800">
                        Brand: {supply.brand}
                      </Badge>
                    )}
                    {supply.additionalVariant && (
                      <Badge className="bg-purple-600 hover:bg-purple-700 print:bg-purple-100 print:text-purple-800">
                        {supply.additionalVariant}
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-3xl font-bold text-[#2F3E2E] print:text-black mb-2">{supply.itemName}</h1>
                  <p className="text-[#8B8378] print:text-gray-600 text-lg">ID: {supply.id}</p>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[#8B8378] print:text-gray-600 text-sm">Current Stock</span>
                      <p className="text-[#2F3E2E] font-bold text-xl print:text-black">
                        {supply.quantity} {supply.unit}(s)
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
                  <div className="w-48 h-48 border border-[#4A7C74] rounded-lg overflow-hidden bg-[#E8E2C9] print:border-gray-300 print:bg-gray-100">
                    {supply.imageUrl ? (
                      <img
                        src={supply.imageUrl || "/placeholder.svg"}
                        alt={supply.itemName}
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
          {supply && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Inventory Details (Combined) */}
              <div className="bg-[#E8E2C9] p-5 rounded-lg border border-[#4A7C74] print:bg-white print:border-gray-200">
                <div className="flex items-center gap-2 mb-4 text-[#2F3E2E] print:text-black">
                  <Package className="h-5 w-5 text-[#4A7C74] print:text-[#4A7C74]" />
                  <h3 className="text-lg font-semibold">Inventory Details</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-[#4A7C74] print:border-gray-200">
                    <span className="text-[#8B8378] print:text-gray-600">Unit Price</span>
                    <span className="text-[#2F3E2E] font-medium print:text-black">
                      {formatCurrency(supply.unitPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#4A7C74] print:border-gray-200">
                    <span className="text-[#8B8378] print:text-gray-600">Reorder Level</span>
                    <span className="text-[#2F3E2E] font-medium print:text-black">
                      {supply.reorderLevel || "Not set"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#4A7C74] print:border-gray-200">
                    <span className="text-[#8B8378] print:text-gray-600">Storage Location</span>
                    <span className="text-[#2F3E2E] font-medium print:text-black">
                      {supply.location || "Not specified"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#4A7C74] print:border-gray-200">
                    <span className="text-[#8B8378] print:text-gray-600">Supplier</span>
                    <span className="text-[#2F3E2E] font-medium print:text-black">
                      {supply.supplier || "Not specified"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-[#8B8378] print:text-gray-600">Purchase Date</span>
                    <span className="text-[#2F3E2E] font-medium print:text-black text-sm">
                      {supply.purchaseDate ? formatDate(supply.purchaseDate) : "Not specified"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes & Additional Info */}
              <div className="space-y-4">
                <div className="bg-[#E8E2C9] p-5 rounded-lg border border-[#4A7C74] print:bg-white print:border-gray-200">
                  <div className="flex items-center gap-2 mb-4 text-[#2F3E2E] print:text-black">
                    <Info className="h-5 w-5 text-[#4A7C74] print:text-[#4A7C74]" />
                    <h3 className="text-lg font-semibold">Additional Information</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-[#4A7C74] print:border-gray-200">
                      <span className="text-[#8B8378] print:text-gray-600">Brand</span>
                      <span className="text-[#2F3E2E] font-medium print:text-black">
                        {supply.brand || "No brand specified"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#4A7C74] print:border-gray-200">
                      <span className="text-[#8B8378] print:text-gray-600">Additional Variant</span>
                      <span className="text-[#2F3E2E] font-medium print:text-black">
                        {supply.additionalVariant || "No additional variant"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#4A7C74] print:border-gray-200">
                      <span className="text-[#8B8378] print:text-gray-600">Delivery Date</span>
                      <span className="text-[#2F3E2E] font-medium print:text-black">
                        {supply.deliveryDate ? formatDate(supply.deliveryDate) : "Not specified"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#4A7C74] print:border-gray-200">
                      <span className="text-[#8B8378] print:text-gray-600">Last Updated By</span>
                      <span className="text-[#2F3E2E] font-medium print:text-black">
                        {modifierName || supply.lastUpdatedBy || "Not recorded"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-[#8B8378] print:text-gray-600">Last Updated</span>
                      <span className="text-[#2F3E2E] font-medium print:text-black text-sm">
                        {supply.lastUpdated ? formatDate(supply.lastUpdated) : "Not recorded"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#E8E2C9] p-5 rounded-lg border border-[#4A7C74] print:bg-white print:border-gray-200">
                  <h4 className="text-[#8B8378] mb-3 print:text-gray-600 font-medium">Notes</h4>
                  <div className="bg-[#E8E2C9] p-4 rounded-md border border-[#4A7C74] min-h-[120px] print:bg-gray-100 print:border-gray-300">
                    <p className="text-[#2F3E2E] whitespace-pre-wrap print:text-black leading-relaxed">
                      {supply.notes || "No additional notes available."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stock Status Alert */}
          {isLowStock && (
            <div className="bg-red-500/20 p-5 rounded-lg border border-red-500/50 print:bg-red-100 print:border-red-300 print:text-red-800">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-400 print:text-red-700 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-[#2F3E2E] print:text-red-800 mb-1">Low Stock Warning</h3>
                  <p className="text-[#2F3E2E] print:text-red-800">
                    Current quantity ({supply.quantity}) is at or below the reorder level ({supply.reorderLevel}).
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
              <p>Item ID: {supply.id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
