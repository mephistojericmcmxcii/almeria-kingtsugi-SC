"use client"
import { X, Edit, Printer, Info, Eye, Trash2, ExternalLink, Plus } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format, isPast, isWithinInterval, addMonths } from "date-fns"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import UniqueItemDetailsModal from "@/components/unique-item-details-modal"
import ChemicalEditItemForm from "@/components/chemical-edit-item-form"
import ChemicalAddItemForm from "@/components/chemical-add-item-form"
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface ChemicalGeneralInfo {
  name: string
  chemicalId?: string
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

interface ChemicalUniqueItem {
  id: string
  tagId?: string
  brand: string
  batchNo: string
  lotNo?: string
  deliveryDate: string
  variant?: string
  containerQuantity: number
  unit: string
  numberOfContainers: number
  location: string
  expiryDate?: string
  lastRestocked?: string
  status: string
  recordedBy: string
  lastUpdatedBy?: string
  createdAt?: { seconds: number; nanoseconds: number }
  updatedAt?: { seconds: number; nanoseconds: number }
}

interface AggregatedChemical {
  id: string
  name: string
  chemicalFormula?: string
  category: string
  services?: string
  variantCount: number
  totalContainers: number
  generalInfo: ChemicalGeneralInfo
  uniqueItemDetails: ChemicalUniqueItem[]
}

interface ChemicalViewProps {
  aggregatedChemical: AggregatedChemical
  onClose: (dataChanged?: boolean) => void
  onEditChemicalType: (generalInfo: ChemicalGeneralInfo) => void
  onEditUniqueItem: (item: ChemicalUniqueItem & ChemicalGeneralInfo) => void
  onAddUniqueItem: (parentChemicalId: string) => void
  onDataRefresh?: () => void
}

export default function ChemicalView({
  aggregatedChemical,
  onClose,
  onEditChemicalType,
  onEditUniqueItem,
  onAddUniqueItem,
  onDataRefresh,
}: ChemicalViewProps) {
  const [localUniqueItems, setLocalUniqueItems] = useState<ChemicalUniqueItem[]>(aggregatedChemical.uniqueItemDetails)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString())
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [hazardImages, setHazardImages] = useState<Array<{ url: string; label: string }>>([])

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    itemId: string | null
  }>({ open: false, itemId: null })

  const [detailsModal, setDetailsModal] = useState<{ open: boolean; item: ChemicalUniqueItem | null }>({
    open: false,
    item: null,
  })
  const [editModal, setEditModal] = useState<{ open: boolean; item: ChemicalUniqueItem | null }>({
    open: false,
    item: null,
  })
  const [addModal, setAddModal] = useState(false)

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  const chemicalGeneralInfo = aggregatedChemical.generalInfo

  const getCalculatedStatus = (expiryDate?: string, firebaseStatus?: string) => {
    // Check if Firebase status starts with "Released" first
    if (firebaseStatus && firebaseStatus.toLowerCase().startsWith("released")) {
      return "Released"
    }

    // Fall back to expiry-based calculation
    if (!expiryDate) return "Available"

    const expiry = new Date(expiryDate)
    const now = new Date()

    if (isPast(expiry)) {
      return "Expired"
    } else if (isNearExpiry(expiryDate)) {
      return "Near Expiry"
    } else {
      return "Available"
    }
  }

  const getCalculatedStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "expired":
        return "bg-red-500 text-white"
      case "near expiry":
        return "bg-orange-500 text-white"
      case "available":
        return "bg-green-500 text-white"
      case "released":
        return "bg-blue-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  const isNearExpiry = (expiryDate?: string) => {
    if (!expiryDate) return false
    const expiry = new Date(expiryDate)
    const now = new Date()
    const oneMonthFromNow = addMonths(now, 1)
    return isWithinInterval(expiry, { start: now, end: oneMonthFromNow }) && !isPast(expiry)
  }

  useEffect(() => {
    setLocalUniqueItems(aggregatedChemical.uniqueItemDetails)
  }, [aggregatedChemical.uniqueItemDetails])

  const availableYears = useMemo(() => {
    const years = new Set<string>()
    localUniqueItems.forEach((item) => {
      const tagId = item.tagId || item.id
      const match = tagId.match(/RSL-CH-\d+-(\d+)\.\d+/)
      if (match) {
        const yearCode = match[1]
        const fullYear = yearCode.length === 2 ? `20${yearCode}` : yearCode
        years.add(fullYear)
      }
    })
    return Array.from(years).sort((a, b) => Number.parseInt(b) - Number.parseInt(a))
  }, [localUniqueItems])

  const filteredUniqueItems = useMemo(() => {
    let filtered = localUniqueItems

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          (item.tagId && item.tagId.toLowerCase().includes(query)) ||
          (item.batchNo && item.batchNo.toLowerCase().includes(query)) ||
          (item.lotNo && item.lotNo.toLowerCase().includes(query)) ||
          (item.brand && item.brand.toLowerCase().includes(query)) ||
          (item.location && item.location.toLowerCase().includes(query)) ||
          (item.status && item.status.toLowerCase().includes(query)) ||
          (item.deliveryDate && item.deliveryDate.toLowerCase().includes(query)) ||
          (item.expiryDate && item.expiryDate.toLowerCase().includes(query)),
      )
    }

    if (yearFilter !== "all") {
      filtered = filtered.filter((item) => {
        const tagId = item.tagId || item.id
        const match = tagId.match(/RSL-CH-\d+-(\d+)\.\d+/)
        if (match) {
          const yearCode = match[1]
          const fullYear = yearCode.length === 2 ? `20${yearCode}` : yearCode
          return fullYear === yearFilter
        }
        return false
      })
    }

    if (statusFilter !== "all") {
      console.log("[v0] Status filter applied:", statusFilter)
      filtered = filtered.filter((item) => {
        const calculatedStatus = getCalculatedStatus(item.expiryDate, item.status)
        const matches = calculatedStatus.toLowerCase() === statusFilter.toLowerCase()
        console.log(
          `[v0] Item ${item.tagId || item.id}: calculated="${calculatedStatus}", filter="${statusFilter}", matches=${matches}`,
        )
        return matches
      })
      console.log("[v0] Filtered items count:", filtered.length)
    }

    filtered.sort((a, b) => {
      const tagA = a.tagId || a.id
      const tagB = b.tagId || b.id

      const getNumericPart = (tagId: string) => {
        const parts = tagId.split(".")
        const lastPart = parts[parts.length - 1]
        return Number.parseInt(lastPart, 10) || 0
      }

      const numA = getNumericPart(tagA)
      const numB = getNumericPart(tagB)

      return numB - numA
    })

    return filtered
  }, [localUniqueItems, searchQuery, yearFilter, statusFilter])

  const availableStatuses = useMemo(() => {
    return [...new Set(localUniqueItems.map((item) => item.status).filter(Boolean))].sort()
  }, [localUniqueItems])

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not specified"
    try {
      return format(new Date(dateString), "PPP")
    } catch {
      return "Invalid date"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "available":
        return "bg-green-500 text-white"
      case "low stock":
        return "bg-yellow-500 text-white"
      case "out of stock":
        return "bg-red-500 text-white"
      case "on order":
        return "bg-blue-500 text-white"
      case "expired":
        return "bg-gray-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  const getHazardInfo = (hazardClass: string) => {
    const hazard = hazardClass?.toLowerCase() || ""
    const hazardMap: Record<string, { imagePath: string; label: string }> = {
      explosive: { imagePath: "/ghs-logo/exploding-bomb.png", label: "Explosive" },
      flammable: { imagePath: "/ghs-logo/flammable.png", label: "Flame (Fire Hazards)" },
      "fire hazards": { imagePath: "/ghs-logo/flammable.png", label: "Flame (Fire Hazards)" },
      oxidizer: { imagePath: "/ghs-logo/oxidizer.png", label: "Flame Over Circle (Oxidizing Hazards)" },
      "oxidizing hazards": { imagePath: "/ghs-logo/oxidizer.png", label: "Flame Over Circle (Oxidizing Hazards)" },
      "gas cylinder": { imagePath: "/ghs-logo/gas-cylinder.png", label: "Gas Cylinder (Gases Under Pressure)" },
      "gases under pressure": { imagePath: "/ghs-logo/gas-cylinder.png", label: "Gas Cylinder (Gases Under Pressure)" },
      corrosive: { imagePath: "/ghs-logo/corrosive.png", label: "Corrosion" },
      corrosion: { imagePath: "/ghs-logo/corrosive.png", label: "Corrosion" },
      toxic: { imagePath: "/ghs-logo/skull.png", label: "Skull and Crossbones (Toxic)" },
      "skull and crossbones": { imagePath: "/ghs-logo/skull.png", label: "Skull and Crossbones (Toxic)" },
      "health hazard": { imagePath: "/ghs-logo/health-hazard.png", label: "Health Hazard" },
      "serious health effects": { imagePath: "/ghs-logo/health-hazard.png", label: "Health Hazard" },
      irritant: { imagePath: "/ghs-logo/exclamation-mark.png", label: "Exclamation Mark (Irritant)" },
      "exclamation mark": { imagePath: "/ghs-logo/exclamation-mark.png", label: "Exclamation Mark (Irritant)" },
      "environmental hazard": { imagePath: "/ghs-logo/environment.png", label: "Environment (Aquatic Hazard)" },
      "aquatic environment": { imagePath: "/ghs-logo/environment.png", label: "Environment (Aquatic Hazard)" },
    }

    return hazardMap[hazard] || { imagePath: "/ghs-logo/no-ghs.png", label: "No GHS Symbol" }
  }

  useEffect(() => {
    const hazards = Array.isArray(chemicalGeneralInfo.hazardClass)
      ? chemicalGeneralInfo.hazardClass
      : chemicalGeneralInfo.hazardClass
        ? [chemicalGeneralInfo.hazardClass]
        : ["No Hazard"]

    const images = hazards.map((hazard) => {
      const { imagePath, label } = getHazardInfo(hazard)
      return { url: imagePath, label }
    })

    setHazardImages(images)
  }, [chemicalGeneralInfo.hazardClass])

  const handleDeleteClick = (itemId: string) => {
    setDeleteDialog({ open: true, itemId })
  }

  const confirmDelete = async () => {
    if (!deleteDialog.itemId) return

    try {
      console.log("[v0] Starting delete process for item:", deleteDialog.itemId)

      const itemRef = doc(db!, "chemicalInventory", aggregatedChemical.id, "unique-items", deleteDialog.itemId)
      await deleteDoc(itemRef)
      console.log("[v0] Successfully deleted from Firebase")

      setLocalUniqueItems((prev) => prev.filter((item) => item.id !== deleteDialog.itemId))

      setDeleteDialog({ open: false, itemId: null })

      console.log("[v0] Delete process completed successfully")
    } catch (error) {
      console.error("[v0] Error deleting item:", error)
      await refreshLocalItems()
    }
  }

  const handleViewDetails = (item: ChemicalUniqueItem) => {
    setDetailsModal({ open: true, item })
  }

  const handleEditItem = (item: ChemicalUniqueItem) => {
    setEditModal({ open: true, item })
  }

  const refreshLocalItems = async () => {
    try {
      const uniqueItemsRef = collection(db!, "chemicalInventory", aggregatedChemical.id, "unique-items")
      const snapshot = await getDocs(uniqueItemsRef)
      const items: ChemicalUniqueItem[] = []
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as ChemicalUniqueItem)
      })
      setLocalUniqueItems(items)
    } catch (error) {
      console.error("Error refreshing items:", error)
    }
  }

  const handleAddSuccess = () => {
    setAddModal(false)
    refreshLocalItems()
  }

  const handleEditSuccess = () => {
    setEditModal({ open: false, item: null })
    refreshLocalItems()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:p-0">
      <div className="bg-[#F0EAD6] border border-[#DDD7B1] rounded-lg shadow-lg w-full max-w-7xl max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:bg-white print:text-black print:shadow-none print:rounded-none print:border-none print:w-full print:max-w-none">
        <div className="flex justify-between items-center p-4 border-b border-[#4A7C74] print:border-gray-300 print:bg-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-[#2F3E2E] print:text-black">Chemical Type Details</h2>
              {chemicalGeneralInfo.chemicalId && (
                <p className="text-sm text-[#8B8378] print:text-gray-600">
                  Chemical ID:{" "}
                  <span className="font-mono font-semibold text-[#4A7C74] print:text-gray-800">
                    {chemicalGeneralInfo.chemicalId}
                  </span>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.print()}
              className="text-[#8B8378] hover:text-[#2F3E2E] bg-[#E0D9C0] hover:bg-[#C0B89F] border-[#4A7C74]"
            >
              <Printer className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onEditChemicalType(chemicalGeneralInfo)}
              className="text-[#8B8378] hover:text-[#2F3E2E] bg-[#E0D9C0] hover:bg-[#C0B89F] border-[#4A7C74]"
            >
              <Edit className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onClose()}
              className="text-[#8B8378] hover:text-[#2F3E2E]"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6 print:text-black">
          <div className="bg-[#E8E2C9] p-6 rounded-lg border border-[#4A7C74] print:bg-gray-100 print:border-gray-300">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge className="bg-[#4A7C74] hover:bg-[#2F3E2E] print:bg-emerald-100 print:text-emerald-800">
                    {chemicalGeneralInfo.category}
                  </Badge>
                  {chemicalGeneralInfo.chemicalId && (
                    <Badge className="bg-[#8B8378] hover:bg-[#2F3E2E] print:bg-gray-100 print:text-gray-800 font-mono">
                      {chemicalGeneralInfo.chemicalId}
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl font-bold text-[#2F3E2E] print:text-black mb-2">{chemicalGeneralInfo.name}</h1>
                <p className="text-[#8B8378] print:text-gray-600 text-lg">
                  Formula: {chemicalGeneralInfo.chemicalFormula || "N/A"}
                </p>
                {chemicalGeneralInfo.supplier && (
                  <p className="text-[#8B8378] print:text-gray-600 text-lg">Supplier: {chemicalGeneralInfo.supplier}</p>
                )}
                {chemicalGeneralInfo.catalogNumber && (
                  <p className="text-[#8B8378] print:text-gray-600 text-lg">
                    Catalog No.: {chemicalGeneralInfo.catalogNumber}
                  </p>
                )}
                {chemicalGeneralInfo.services && (
                  <p className="text-[#8B8378] print:text-gray-600 text-lg">Services: {chemicalGeneralInfo.services}</p>
                )}
                {chemicalGeneralInfo.msdsLink && (
                  <div className="flex items-center gap-2 text-[#8B8378] print:text-gray-600 text-lg">
                    MSDS:
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(chemicalGeneralInfo.msdsLink, "_blank")}
                      className="text-[#2F3E2E] hover:underline bg-[#E0D9C0] hover:bg-[#C0B89F] border-[#4A7C74] print:text-blue-700 print:border-gray-300"
                    >
                      View MSDS <ExternalLink className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                )}
                {chemicalGeneralInfo.storageRequirements && (
                  <p className="text-[#8B8378] print:text-gray-600 text-lg">
                    Storage Type: {chemicalGeneralInfo.storageRequirements}
                  </p>
                )}
                <div className="mt-4">
                  <span className="text-[#8B8378] print:text-gray-600 text-sm">Total Available Items</span>
                  <p className="text-[#2F3E2E] font-bold text-xl print:text-black">
                    {
                      localUniqueItems.filter(
                        (item) => item.status && !item.status.toLowerCase().startsWith("released"),
                      ).length
                    }
                  </p>
                </div>
              </div>

              <div className="flex-shrink-0">
                <div className="w-48 h-48 border border-[#4A7C74] rounded-lg overflow-hidden bg-[#E8E2C9] flex flex-col items-center justify-center p-2 text-center print:border-gray-300 print:bg-gray-100">
                  {hazardImages.length === 1 ? (
                    <div className="flex flex-col items-center justify-center w-full h-full">
                      <Image
                        src={hazardImages[0].url || "/placeholder.svg"}
                        alt={hazardImages[0].label}
                        width={128}
                        height={128}
                        className="w-32 h-32 object-contain"
                      />
                    </div>
                  ) : hazardImages.length > 1 ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      {hazardImages.slice(0, 4).map((image, index) => {
                        const positions = [
                          "top-0 left-1/2 -translate-x-1/2",
                          "left-0 top-1/2 -translate-y-1/2",
                          "right-0 top-1/2 -translate-y-1/2",
                          "bottom-0 left-1/2 -translate-x-1/2",
                        ]
                        return (
                          <div key={index} className={`absolute transform ${positions[index]}`}>
                            <Image
                              src={image.url || "/placeholder.svg"}
                              alt={image.label}
                              width={80}
                              height={80}
                              className="w-20 h-20 object-contain"
                            />
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#4A7C74] print:text-[#4A7C74]">
                      No Hazard Info
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#E8E2C9] p-5 rounded-lg border border-[#4A7C74] print:bg-white print:border-gray-200">
            <h4 className="text-[#8B8378] mb-3 print:text-gray-600 font-medium">Notes for Chemical Type</h4>
            <div className="bg-[#E8E2C9] p-4 rounded-md border border-[#4A7C74] min-h-[120px] print:bg-gray-100 print:border-gray-300">
              <p className="text-[#2F3E2E] whitespace-pre-wrap print:text-black leading-relaxed">
                {chemicalGeneralInfo.notes || "No additional notes available for this chemical type."}
              </p>
            </div>
          </div>

          <div className="bg-[#E8E2C9] p-5 rounded-lg border border-[#4A7C74] print:bg-white print:border-gray-200">
            <div className="flex justify-between items-center gap-2 mb-4 text-[#2F3E2E] print:text-black">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-[#4A7C74] print:text-[#4A7C74]" />
                <h3 className="text-lg font-semibold">
                  Unique Items ({filteredUniqueItems.length} of{" "}
                  {
                    localUniqueItems.filter((item) => item.status && !item.status.toLowerCase().startsWith("released"))
                      .length
                  }{" "}
                  available)
                </h3>
              </div>
              <Button
                onClick={() => setAddModal(true)}
                className="bg-[#4A7C74] hover:bg-[#2F3E2E] text-white print:hidden"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Item
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-4 print:hidden">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search unique items (Tag ID, Batch No., Lot No., Brand, Location, Status, Dates)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#E0D9C0] border-[#4A7C74] text-[#2F3E2E] placeholder:text-[#8B8378] focus:ring-[#4A7C74] focus:border-[#4A7C74]"
                />
              </div>
              <div className="w-full sm:w-32">
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="bg-[#E0D9C0] border-[#4A7C74] text-[#2F3E2E] focus:ring-[#4A7C74] focus:border-[#4A7C74]">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#E0D9C0] border-[#4A7C74]">
                    <SelectItem value="all" className="text-[#2F3E2E] hover:bg-[#C0B89F]">
                      All Years (
                      {
                        localUniqueItems.filter(
                          (item) => item.status && !item.status.toLowerCase().startsWith("released"),
                        ).length
                      }{" "}
                      available)
                    </SelectItem>
                    {availableYears.map((year) => {
                      const count = localUniqueItems.filter((item) => {
                        const tagId = item.tagId || item.id
                        const match = tagId.match(/RSL-CH-\d+-(\d+)\.\d+/)
                        if (match) {
                          const yearCode = match[1]
                          const fullYear = yearCode.length === 2 ? `20${yearCode}` : yearCode
                          return fullYear === year
                        }
                        return false
                      }).length
                      return (
                        <SelectItem key={year} value={year} className="text-[#2F3E2E] hover:bg-[#C0B89F]">
                          {year} ({count})
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-[#E0D9C0] border-[#4A7C74] text-[#2F3E2E] focus:ring-[#4A7C74] focus:border-[#4A7C74]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#E0D9C0] border-[#4A7C74]">
                    {hardcodedStatusOptions.map((option) => {
                      const count =
                        option.value === "all"
                          ? localUniqueItems.filter(
                              (item) => item.status && !item.status.toLowerCase().startsWith("released"),
                            ).length
                          : localUniqueItems.filter((item) => {
                              const calculatedStatus = getCalculatedStatus(item.expiryDate, item.status)
                              return calculatedStatus.toLowerCase() === option.value.toLowerCase()
                            }).length
                      return (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="text-[#2F3E2E] hover:bg-[#C0B89F]"
                        >
                          {option.label} ({count})
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {localUniqueItems.length === 0 ? (
              <p className="text-[#8B8378] text-center py-4">No unique items recorded for this chemical type.</p>
            ) : filteredUniqueItems.length === 0 ? (
              <p className="text-[#8B8378] text-center py-4">No unique items match your search or filter criteria.</p>
            ) : (
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto rounded-md border border-[#DDD7B1] print:border-gray-300">
                <Table className="w-full border-collapse text-xs">
                  <TableHeader className="bg-[#DDD7B1] print:bg-gray-100 sticky top-0 z-10">
                    <TableRow className="hover:bg-[#E0D9C0] border-[#DDD7B1] print:hover:bg-gray-200 print:border-gray-300">
                      <TableHead className="p-3 text-[#2F3E2E] print:text-black text-left">Tag ID</TableHead>
                      <TableHead className="p-3 text-[#2F3E2E] print:text-black text-left">Brand</TableHead>
                      <TableHead className="p-3 text-[#2F3E2E] print:text-black text-left">Delivery Date</TableHead>
                      <TableHead className="p-3 text-[#2F3E2E] print:text-black text-left">Quantity</TableHead>
                      <TableHead className="p-3 text-[#2F3E2E] print:text-black text-left">Location</TableHead>
                      <TableHead className="p-3 text-[#2F3E2E] print:text-black text-left">Expiry Date</TableHead>
                      <TableHead className="p-3 text-[#2F3E2E] print:text-black text-left">Status</TableHead>
                      <TableHead className="p-3 text-[#2F3E2E] text-center print:hidden">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUniqueItems.map((item) => (
                      <TableRow
                        key={item.id}
                        className="hover:bg-[#E0D9C0] border-[#DDD7B1] print:hover:bg-gray-100 print:border-gray-300"
                      >
                        <TableCell className="p-3 align-middle text-[#2F3E2E] print:text-black font-mono">
                          {item.tagId || item.id}
                        </TableCell>
                        <TableCell className="p-3 align-middle text-[#2F3E2E] print:text-black">
                          {item.brand || "N/A"}
                        </TableCell>
                        <TableCell className="p-3 align-middle text-[#2F3E2E] print:text-black">
                          {formatDate(item.deliveryDate)}
                        </TableCell>
                        <TableCell className="p-3 align-middle text-[#2F3E2E] print:text-black">
                          {item.containerQuantity} {item.unit}
                        </TableCell>
                        <TableCell className="p-3 align-middle text-[#2F3E2E] print:text-black">
                          {item.location}
                        </TableCell>
                        <TableCell className="p-3 align-middle text-[#2F3E2E] print:text-black">
                          {item.expiryDate ? formatDate(item.expiryDate) : "N/A"}
                        </TableCell>
                        <TableCell className="p-3 align-middle text-[#2F3E2E] print:text-black">
                          <Badge
                            className={`${getCalculatedStatusColor(getCalculatedStatus(item.expiryDate, item.status))}`}
                          >
                            {item.status && item.status.toLowerCase().startsWith("released")
                              ? item.status
                              : getCalculatedStatus(item.expiryDate, item.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-3 align-middle text-right print:hidden">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="h-8 w-8 rounded-md p-0 text-[#8B8378] hover:text-[#2F3E2E] hover:bg-[#C0B89F]"
                              onClick={() => handleViewDetails(item)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4 mx-auto" />
                            </button>
                            <button
                              type="button"
                              className="h-8 w-8 rounded-md p-0 text-[#8B8378] hover:text-[#2F3E2E] hover:bg-[#C0B89F]"
                              onClick={() => handleEditItem(item)}
                              title="Edit Item"
                            >
                              <Edit className="h-4 w-4 mx-auto" />
                            </button>
                            <button
                              type="button"
                              className="h-8 w-8 rounded-md p-0 text-[#8B8378] hover:text-[#FF6347] hover:bg-[#C0B89F]"
                              onClick={() => handleDeleteClick(item.id)}
                              title="Delete Item"
                            >
                              <Trash2 className="h-4 w-4 mx-auto" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-sm text-gray-500">
            <div className="flex justify-between">
              <p>Printed on: {format(new Date(), "PPP 'at' p")}</p>
              <p>Chemical ID: {chemicalGeneralInfo.chemicalId || aggregatedChemical.id}</p>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => !open && setDeleteDialog({ open: false, itemId: null })}
      >
        <AlertDialogContent className="bg-[#F0EAD6] border-[#4A7C74]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#2F3E2E]">Delete Unique Chemical Item</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8B8378]">
              Are you sure you want to delete this unique chemical item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeleteDialog({ open: false, itemId: null })}
              className="bg-[#E0D9C0] text-[#2F3E2E] border-[#4A7C74] hover:bg-[#C0B89F]"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 text-white hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {detailsModal.open && detailsModal.item && (
        <UniqueItemDetailsModal
          chemicalUniqueItem={detailsModal.item}
          chemicalGeneralInfo={chemicalGeneralInfo}
          onClose={() => setDetailsModal({ open: false, item: null })}
          onEdit={(item) => {
            setDetailsModal({ open: false, item: null })
            onEditUniqueItem(item)
          }}
        />
      )}

      {editModal.open && editModal.item && (
        <ChemicalEditItemForm
          onClose={() => setEditModal({ open: false, item: null })}
          parentChemicalId={aggregatedChemical.id}
          parentChemicalInfo={chemicalGeneralInfo}
          existingItem={editModal.item}
          onSuccess={handleEditSuccess}
        />
      )}

      {addModal && (
        <ChemicalAddItemForm
          onClose={() => setAddModal(false)}
          parentChemicalId={aggregatedChemical.id}
          parentChemicalInfo={chemicalGeneralInfo}
          onSuccess={handleAddSuccess}
        />
      )}
    </div>
  )
}

const hardcodedStatusOptions = [
  { value: "all", label: "All Status" },
  { value: "available", label: "Available" },
  { value: "near expiry", label: "Near Expiry" },
  { value: "expired", label: "Expired" },
  { value: "released", label: "Released" },
]
