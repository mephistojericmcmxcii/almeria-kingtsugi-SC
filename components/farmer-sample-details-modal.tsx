"use client"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { HashIcon, MessageSquareTextIcon, CheckCircleIcon, UserIcon, FlaskConicalIcon } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { updateFarmerSampleDetailsInSamplingData, getSamplingDataDocument } from "@/lib/firestore"
import type { IndividualSampleData } from "@/lib/firestore"
import { Badge } from "@/components/ui/badge"

// Define the interface for a single farmer's details
interface FarmerDetail {
  name: string
  latitude: string
  longitude: string
  crops: string
  area: string // in hectares
  soilSampleType: string
  vegetativeCovers: string
  numberOfSamplesText: string // e.g., "3 samples"
}

interface FarmerSampleDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  farmerDetail: FarmerDetail | null
  samplingRecordId: string // The main sampling record ID (e.g., SDF-YY-XXXX)
  farmerIndex: number // Index of the farmer in the farmerDetails array
}

export default function FarmerSampleDetailsModal({
  isOpen,
  onClose,
  farmerDetail,
  samplingRecordId,
  farmerIndex,
}: FarmerSampleDetailsModalProps) {
  const [remarks, setRemarks] = useState<string[]>([])
  const [sampleIds, setSampleIds] = useState<string[]>([])
  const [statuses, setStatuses] = useState<string[]>([])
  const [preparedBy, setPreparedBy] = useState<string[]>([]) // New state for Prepared By
  const [preparationMethods, setPreparationMethods] = useState<string[]>([]) // New state for Preparation Method
  const [lsrfNos, setLsrfNos] = useState<string[]>([])
  const [numSamples, setNumSamples] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const sampleStatusOptions = useMemo(
    () => [
      { value: "Pending", label: "Pending" },
      { value: "Collected", label: "Collected" },
      { value: "In Transit", label: "In Transit" },
      { value: "Received", label: "Received" },
      { value: "In Progress", label: "In Progress" },
      { value: "Completed", label: "Completed" },
      { value: "Cancelled", label: "Cancelled" },
    ],
    [],
  )

  useEffect(() => {
    const fetchAndSetSampleData = async () => {
      if (isOpen && farmerDetail && samplingRecordId && farmerIndex !== -1) {
        const match = farmerDetail.numberOfSamplesText.match(/\d+/)
        const expectedNumSamples = match ? Number.parseInt(match[0], 10) : 0
        setNumSamples(expectedNumSamples)

        // Always initialize with generated IDs and default status first
        const initialSampleIds = Array.from(
          { length: expectedNumSamples },
          (_, index) =>
            `${samplingRecordId}-F${String(farmerIndex + 1).padStart(2, "0")}-S${String(index + 1).padStart(2, "0")}`,
        )
        const initialRemarks = Array(expectedNumSamples).fill("")
        const initialStatuses = Array(expectedNumSamples).fill("Pending") // Default status
        const initialPreparedBy = Array(expectedNumSamples).fill("") // Initialize new field
        const initialPreparationMethods = Array(expectedNumSamples).fill("") // Initialize new field
        const initialLsrfNos = Array(expectedNumSamples).fill("")

        setSampleIds(initialSampleIds)
        setRemarks(initialRemarks)
        setStatuses(initialStatuses)
        setPreparedBy(initialPreparedBy) // Set new state
        setPreparationMethods(initialPreparationMethods) // Set new state
        setLsrfNos(initialLsrfNos)

        try {
          const samplingDoc = await getSamplingDataDocument(samplingRecordId)
          if (samplingDoc && samplingDoc.farmerDetails[farmerIndex]) {
            const farmerData = samplingDoc.farmerDetails[farmerIndex]
            const fetchedSamples: IndividualSampleData[] = farmerData.samples || []

            // Override with fetched data if available
            const newSampleIds = [...initialSampleIds] // Start with generated IDs
            const newRemarks = [...initialRemarks] // Start with empty remarks
            const newStatuses = [...initialStatuses] // Start with default statuses
            const newPreparedBy = [...initialPreparedBy] // Copy initial
            const newPreparationMethods = [...initialPreparationMethods] // Copy initial
            const newLsrfNos = [...initialLsrfNos]

            fetchedSamples.forEach((sample, idx) => {
              if (idx < expectedNumSamples) {
                newSampleIds[idx] = sample.customSampleId || newSampleIds[idx] // Use fetched or keep generated
                newRemarks[idx] = sample.remark || newRemarks[idx] // Use fetched or keep empty
                newStatuses[idx] = sample.status || newStatuses[idx] // Use fetched or keep default
                newPreparedBy[idx] = sample.preparedBy || newPreparedBy[idx] // Use fetched or keep empty
                newPreparationMethods[idx] = sample.prepMethod || newPreparationMethods[idx] // Use fetched or keep empty
                newLsrfNos[idx] = sample.lsrfNo || newLsrfNos[idx]
              }
            })

            setSampleIds(newSampleIds)
            setRemarks(newRemarks)
            setStatuses(newStatuses)
            setPreparedBy(newPreparedBy) // Update state
            setPreparationMethods(newPreparationMethods) // Update state
            setLsrfNos(newLsrfNos)
          }
        } catch (error) {
          console.error("Error fetching sample details:", error)
          toast({
            title: "Error",
            description: "Failed to load existing sample details. Using default generated IDs and statuses.",
            variant: "destructive",
          })
          // If fetch fails, the initial generated IDs and statuses will remain
        }
      }
    }

    fetchAndSetSampleData()
  }, [isOpen, farmerDetail, samplingRecordId, farmerIndex, toast])

  if (!isOpen || !farmerDetail) return null

  const handleRemarkChange = (index: number, value: string) => {
    const newRemarks = [...remarks]
    newRemarks[index] = value
    setRemarks(newRemarks)
  }

  const handleSampleIdChange = (index: number, value: string) => {
    const newSampleIds = [...sampleIds]
    newSampleIds[index] = value
    setSampleIds(newSampleIds)
  }

  const handleLsrfNoChange = (index: number, value: string) => {
    const newLsrfNos = [...lsrfNos]
    newLsrfNos[index] = value
    setLsrfNos(newLsrfNos)
  }

  const handleStatusChange = (index: number, value: string) => {
    const newStatuses = [...statuses]
    newStatuses[index] = value
    setStatuses(newStatuses)
  }

  const handlePreparedByChange = (index: number, value: string) => {
    const newPreparedBy = [...preparedBy]
    newPreparedBy[index] = value
    setPreparedBy(newPreparedBy)
  }

  const handlePreparationMethodChange = (index: number, value: string) => {
    const newPreparationMethods = [...preparationMethods]
    newPreparationMethods[index] = value
    setPreparationMethods(newPreparationMethods)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const samplesToSave = Array.from({ length: numSamples }).map((_, index) => ({
        customSampleId: sampleIds[index] || "", // Ensure it's not empty, though it should be pre-filled
        remark: remarks[index] || "",
        status: statuses[index] || "Pending", // Ensure status is included, default to "Pending"
        preparedBy: preparedBy[index] || "", // Include new field
        prepMethod: preparationMethods[index] || "", // Include new field
        lsrfNo: lsrfNos[index] || "",
      }))

      await updateFarmerSampleDetailsInSamplingData(samplingRecordId, farmerIndex, samplesToSave)
      toast({
        title: "Success!",
        description: "Sample details saved successfully.",
        variant: "default",
      })
      onClose() // Close modal on successful save
    } catch (error: any) {
      console.error("Error saving sample details:", error)
      toast({
        title: "Error",
        description: `Failed to save sample details: ${error.message || "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Pending":
        return "secondary"
      case "Collected":
      case "Received":
        return "default"
      case "In Transit":
      case "In Progress":
        return "outline"
      case "Completed":
        return "default"
      case "Cancelled":
        return "destructive"
      default:
        return "secondary"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1440px] max-h-[90vh] overflow-y-auto bg-[#F0EAD6] text-[#2F3E2E] border-[#DDD7B1] p-0">
        <DialogHeader className="p-6 pb-2 bg-[#4A7C74] rounded-t-lg">
          <DialogTitle className="text-xl font-semibold text-white">Sample Details for {farmerDetail.name}</DialogTitle>
          <DialogDescription className="text-[#F0EFE9]">
            Manage individual sample data for this farmer from Sampling ID: {samplingRecordId}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="rounded-md border border-[#DDD7B1] overflow-hidden">
            <Table className="w-full border-collapse">
              <TableHeader className="bg-[#C0B89F]">
                <TableRow className="hover:bg-[#E0D9C0] border-[#DDD7B1]">
                  <TableHead className="p-2 text-[#2F3E2E] w-[5%]">
                    <HashIcon className="h-4 w-4 inline-block mr-1" />
                  </TableHead>
                  <TableHead className="p-2 text-[#2F3E2E] w-[15%]">Sample ID</TableHead>
                  <TableHead className="p-2 text-[#2F3E2E] w-[15%]">LSRF No.</TableHead> {/* New column */}
                  <TableHead className="p-2 text-[#2F3E2E] w-[15%]">
                    <UserIcon className="h-4 w-4 inline-block mr-1" /> Prepared By
                  </TableHead>
                  <TableHead className="p-2 text-[#2F3E2E] w-[20%]">
                    <FlaskConicalIcon className="h-4 w-4 inline-block mr-1" /> Preparation Method
                  </TableHead>
                  <TableHead className="p-2 text-[#2F3E2E] w-[10%]">
                    <CheckCircleIcon className="h-4 w-4 inline-block mr-1" /> Status
                  </TableHead>
                  <TableHead className="p-2 text-[#2F3E2E] w-[35%]">
                    <MessageSquareTextIcon className="h-4 w-4 inline-block mr-1" /> Remarks
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: numSamples }).map((_, index) => (
                  <TableRow key={index} className="hover:bg-[#E0D9C0] border-[#DDD7B1]">
                    <TableCell className="p-2 text-[#2F3E2E] font-medium whitespace-nowrap w-[5%]">
                      {index + 1}
                    </TableCell>
                    <TableCell className="p-2 text-[#2F3E2E] w-[15%]">
                      <Input
                        type="text"
                        placeholder={`Enter Sample ID for Sample ${index + 1}`}
                        value={sampleIds[index] || ""}
                        onChange={(e) => handleSampleIdChange(index, e.target.value)}
                        className="bg-[#FAF8F2] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#8B8378] w-full h-9"
                        disabled={statuses[index] !== "Pending"} // Disable if status is not Pending
                      />
                    </TableCell>
                    <TableCell className="p-2 text-[#2F3E2E] w-[15%]">
                      <div className="flex items-center bg-[#FAF8F2] border border-[#DDD7B1] text-[#2F3E2E] rounded-md px-3 py-2 h-9 w-full">
                        {lsrfNos[index] || ""}
                      </div>
                    </TableCell>
                    <TableCell className="p-2 text-[#2F3E2E] w-[15%]">
                      <div className="flex items-center bg-[#FAF8F2] border border-[#DDD7B1] text-[#2F3E2E] rounded-md px-3 py-2 h-9 w-full">
                        {/* This div is now a display for preparedBy, it should not be an input */}
                        {preparedBy[index] || ""}
                      </div>
                    </TableCell>
                    <TableCell className="p-2 text-[#2F3E2E] w-[20%]">
                      <div className="flex items-center bg-[#FAF8F2] border border-[#DDD7B1] text-[#2F3E2E] rounded-md px-3 py-2 h-9 w-full">
                        {/* This div is now a display for preparationMethods, it should not be an input */}
                        {preparationMethods[index] || ""}
                      </div>
                    </TableCell>
                    <TableCell className="p-2 text-[#2F3E2E] w-[10%]">
                      <Badge variant={getStatusBadgeVariant(statuses[index] || "Pending")}>
                        {statuses[index] || "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-2 text-[#2F3E2E] w-[35%]">
                      <Textarea
                        placeholder={`Add remarks for Sample ${index + 1}...`}
                        value={remarks[index] || ""}
                        onChange={(e) => handleRemarkChange(index, e.target.value)}
                        className="bg-[#FAF8F2] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#8B8378] h-9 w-full"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-[#DDD7B1]">
          <Button className="bg-[#E0D9C0] hover:bg-[#C0B89F] text-[#2F3E2E]" onClick={onClose} disabled={isSaving}>
            Close
          </Button>
          <Button className="bg-[#4A7C74] hover:bg-[#3A6C64] text-white" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
