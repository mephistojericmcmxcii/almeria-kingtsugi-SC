"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { collection, getDocs, query, orderBy, doc, getDoc, writeBatch } from "firebase/firestore"
import { db } from "@/lib/firebase" // Ensure this imports your initialized Firestore instance
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast" // Import useToast
import type { SamplingDataDocument, IndividualSampleData } from "@/lib/firestore" // Import necessary types

interface SamplePrepMultipleUpdatesModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdateSuccess: () => void // Add this line
}

interface SampleData {
  samplingDocId: string
  farmerIndex: number
  sampleIndex: number
  customSampleId: string
  status: string
}

interface SamplePrepForModal {
  id: string // Unique ID for the sample (e.g., samplingDocId-farmerIndex-sampleIndex)
  sampleID: string // The customSampleId
  status: string // Added status to filter locally
}

export default function SamplePrepMultipleUpdatesModal({
  isOpen,
  onClose,
  onUpdateSuccess,
}: SamplePrepMultipleUpdatesModalProps) {
  const [allSamples, setAllSamples] = useState<SamplePrepForModal[]>([]) // Store all non-completed samples
  const [loading, setLoading] = useState(true)
  const [selectedSampleIds, setSelectedSampleIds] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<string>("pending") // New state for filter
  const [searchTerm, setSearchTerm] = useState<string>("") // New state for search term

  // State for the update fields
  const [preparedBy, setPreparedBy] = useState<string>("")
  const [preparationMethod, setPreparationMethod] = useState<string>("")
  const [statusToUpdate, setStatusToUpdate] = useState<string>("")

  const { toast } = useToast() // Initialize useToast

  // Reset statusToUpdate when filterStatus changes to prevent invalid selections
  useEffect(() => {
    setStatusToUpdate("")
  }, [filterStatus])

  useEffect(() => {
    if (isOpen) {
      const fetchSamples = async () => {
        setLoading(true)
        try {
          if (!db) {
            console.error("Firestore db is not initialized")
            toast({
              title: "Error",
              description: "Firestore database is not initialized.",
              variant: "destructive",
            })
            return
          }

          const samplingDataRef = collection(db, "samplingData")
          const q = query(samplingDataRef, orderBy("dateCollected", "desc"))
          const querySnapshot = await getDocs(q)

          const fetchedSamples: SamplePrepForModal[] = []
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data() as SamplingDataDocument // Use the imported type
            const samplingDocId = docSnap.id

            data.farmerDetails?.forEach((farmerDetail, farmerIndex) => {
              farmerDetail.samples?.forEach((sample, sampleIndex) => {
                const customSampleId = sample.customSampleId || "N/A"
                const sampleStatus = (sample.status || "").toLowerCase().trim()

                // Only include samples that are NOT "completed" or "complete"
                if (sampleStatus !== "completed" && sampleStatus !== "complete") {
                  fetchedSamples.push({
                    id: `${samplingDocId}-${farmerIndex}-${sampleIndex}`,
                    sampleID: customSampleId,
                    status: sampleStatus, // Store status for local filtering
                  })
                }
              })
            })
          })
          setAllSamples(fetchedSamples)
        } catch (error) {
          console.error("Error fetching samples for multiple updates:", error)
          toast({
            title: "Error",
            description: "Failed to load samples. Please try again.",
            variant: "destructive",
          })
        } finally {
          setLoading(false)
        }
      }
      fetchSamples()
    } else {
      // Reset state when modal closes
      setAllSamples([])
      setLoading(true)
      setSelectedSampleIds(new Set())
      setPreparedBy("")
      setPreparationMethod("")
      setStatusToUpdate("")
      setFilterStatus("pending") // Reset filter
      setSearchTerm("") // Reset search term
    }
  }, [isOpen, toast])

  // Filter samples based on filterStatus and searchTerm
  const filteredSamples = useMemo(() => {
    return allSamples.filter((sample) => {
      const matchesStatus = sample.status === filterStatus
      const matchesSearch = searchTerm ? sample.sampleID.toLowerCase().includes(searchTerm.toLowerCase()) : true
      return matchesStatus && matchesSearch
    })
  }, [allSamples, filterStatus, searchTerm])

  const handleCheckboxChange = (sampleId: string, isChecked: boolean) => {
    setSelectedSampleIds((prevSelected) => {
      const newSelected = new Set(prevSelected)
      if (isChecked) {
        newSelected.add(sampleId)
      } else {
        newSelected.delete(sampleId)
      }
      return newSelected
    })
  }

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      const allVisibleSampleIds = new Set(filteredSamples.map((sample) => sample.id))
      setSelectedSampleIds(allVisibleSampleIds)
    } else {
      setSelectedSampleIds(new Set())
    }
  }

  const isAllSelected = filteredSamples.length > 0 && selectedSampleIds.size === filteredSamples.length
  const isIndeterminate = selectedSampleIds.size > 0 && selectedSampleIds.size < filteredSamples.length

  const handleApplyUpdates = async () => {
    if (!db) {
      toast({
        title: "Error",
        description: "Database not initialized.",
        variant: "destructive",
      })
      return
    }

    if (selectedSampleIds.size === 0) {
      toast({
        title: "No Samples Selected",
        description: "Please select at least one sample to update.",
        variant: "default",
      })
      return
    }

    if (!preparedBy && !preparationMethod && !statusToUpdate) {
      toast({
        title: "No Update Fields Provided",
        description: "Please fill in at least one field to update.",
        variant: "default",
      })
      return
    }

    setLoading(true)
    try {
      const batch = writeBatch(db)
      const updatesBySamplingDocAndFarmer = new Map<string, Map<number, Set<number>>>()

      console.log("--- Starting Batch Update Process ---")
      console.log("Selected Sample IDs:", Array.from(selectedSampleIds))

      // Group selected samples by samplingDocId and farmerIndex
      selectedSampleIds.forEach((id) => {
        // Corrected parsing logic: split from the end to get farmerIndex and sampleIndex
        const parts = id.split("-")
        if (parts.length < 3) {
          console.error(`Invalid ID format: ${id}. Expected at least 3 parts. Skipping.`)
          return
        }
        const sampleIndex = Number.parseInt(parts[parts.length - 1], 10)
        const farmerIndex = Number.parseInt(parts[parts.length - 2], 10)
        const samplingDocId = parts.slice(0, parts.length - 2).join("-") // Rejoin the rest as samplingDocId

        if (isNaN(farmerIndex) || isNaN(sampleIndex)) {
          console.error(`Invalid farmerIndex or sampleIndex in ID: ${id}. Skipping.`)
          return
        }

        if (!updatesBySamplingDocAndFarmer.has(samplingDocId)) {
          updatesBySamplingDocAndFarmer.set(samplingDocId, new Map())
        }
        const farmerMap = updatesBySamplingDocAndFarmer.get(samplingDocId)!
        if (!farmerMap.has(farmerIndex)) {
          farmerMap.set(farmerIndex, new Set())
        }
        farmerMap.get(farmerIndex)!.add(sampleIndex)
      })

      console.log(
        "Grouped Updates (Map<samplingDocId, Map<farmerIndex, Set<sampleIndex>>>):",
        updatesBySamplingDocAndFarmer,
      )

      // Process updates for each sampling document
      for (const [samplingDocId, farmerUpdates] of updatesBySamplingDocAndFarmer.entries()) {
        const samplingDocRef = doc(db, "samplingData", samplingDocId)
        const samplingDocSnap = await getDoc(samplingDocRef)

        if (!samplingDocSnap.exists()) {
          console.warn(`Sampling record with ID '${samplingDocId}' not found in Firestore. Skipping.`)
          continue
        }

        const currentData = samplingDocSnap.data() as SamplingDataDocument
        // Create a deep copy to avoid direct mutation of Firestore data
        // This is crucial for nested arrays/objects to ensure Firestore detects changes
        const updatedFarmerDetails = JSON.parse(JSON.stringify(currentData.farmerDetails || []))

        console.log(`\nProcessing document: '${samplingDocId}'`)
        console.log("Original Farmer Details (from Firestore):", currentData.farmerDetails)
        console.log("Deep Copied Farmer Details (before modification):", updatedFarmerDetails)

        for (const [farmerIndex, sampleIndicesToUpdate] of farmerUpdates.entries()) {
          if (updatedFarmerDetails[farmerIndex] && updatedFarmerDetails[farmerIndex].samples) {
            console.log(`  Processing farmer index: ${farmerIndex}`)
            console.log(`  Samples to update for this farmer:`, Array.from(sampleIndicesToUpdate))

            updatedFarmerDetails[farmerIndex].samples = updatedFarmerDetails[farmerIndex].samples.map(
              (sample: IndividualSampleData, idx: number) => {
                if (sampleIndicesToUpdate.has(idx)) {
                  console.log(`    Updating sample at original index ${idx} (Custom ID: ${sample.customSampleId})`)
                  console.log(
                    `      Before update: Prepared By: '${sample.preparedBy}', Method: '${sample.prepMethod}', Status: '${sample.status}'`,
                  )

                  // Apply updates only if the field is provided (not empty string)
                  if (preparedBy) sample.preparedBy = preparedBy
                  if (preparationMethod) sample.prepMethod = preparationMethod
                  if (statusToUpdate) sample.status = statusToUpdate
                  sample.createdAt = new Date().toISOString() // Update timestamp to reflect last modification

                  console.log(
                    `      After update: Prepared By: '${sample.preparedBy}', Method: '${sample.prepMethod}', Status: '${sample.status}'`,
                  )
                }
                return sample
              },
            )
          } else {
            console.warn(
              `  Farmer index ${farmerIndex} or its samples not found in document '${samplingDocId}'s deep copy.`,
            )
          }
        }
        console.log("Deep Copied Farmer Details (after modification, before batch update):", updatedFarmerDetails)
        // Add the update operation to the batch
        batch.update(samplingDocRef, { farmerDetails: updatedFarmerDetails })
        console.log(`Added update for document '${samplingDocId}' to batch.`)
      }

      console.log("\nAttempting to commit batch...")
      await batch.commit()
      console.log("Batch committed successfully!")

      toast({
        title: "Success",
        description: `${selectedSampleIds.size} samples updated successfully!`,
        variant: "default",
      })
      onUpdateSuccess() // Call the callback to refresh the parent component's data
      onClose() // Close modal after applying
    } catch (error) {
      console.error("Error applying multiple updates:", error)
      toast({
        title: "Error",
        description: `Failed to apply updates: ${error instanceof Error ? error.message : String(error)}. Please check console for details.`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      console.log("--- Batch Update Process Finished ---")
    }
  }

  const canApplyUpdates = selectedSampleIds.size > 0 && (preparedBy || preparationMethod || statusToUpdate)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col bg-[#F0EAD6] border-[#DDD7B1]">
        <DialogHeader className="border-b border-[#4A7C74] pb-4">
          <DialogTitle className="text-xl font-bold text-[#2F3E2E]">Multiple Sample Updates</DialogTitle>
          <DialogDescription className="text-[#8B8378]">
            Select samples to apply batch updates. Only Sample IDs are displayed here, excluding completed samples.
          </DialogDescription>
        </DialogHeader>

        {/* Search bar and Filter Dropdown */}
        <div className="flex flex-col md:flex-row justify-between items-center mt-4 mb-2 gap-2">
          <div className="flex-grow w-full md:w-auto">
            <Label htmlFor="searchSampleId" className="sr-only">
              Search Sample ID
            </Label>
            <Input
              id="searchSampleId"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Sample ID..."
              className="w-full bg-[#E0D9C0] border-[#4A7C74] text-[#2F3E2E]"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Label htmlFor="filterStatus" className="text-[#2F3E2E] whitespace-nowrap">
              Status:
            </Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger id="filterStatus" className="w-[180px] h-8 bg-[#E0D9C0] border-[#4A7C74] text-[#2F3E2E]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-white text-[#2F3E2E]">
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">In Preparation</SelectItem>
                <SelectItem value="ready">Ready for Analysis</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-[#2F3E2E] font-semibold ml-2">({filteredSamples.length})</span>
          </div>
        </div>

        {/* Scrollable area for the table */}
        <div className="flex-grow overflow-y-auto border rounded-md bg-[#E8E2C9] border-[#4A7C74]">
          {loading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-8 w-full bg-[#C0B89F]" />
              <Skeleton className="h-8 w-full bg-[#C0B89F]" />
              <Skeleton className="h-8 w-full bg-[#C0B89F]" />
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-[#C0B89F] z-10">
                <TableRow>
                  <TableHead className="w-[40px] py-2 text-[#2F3E2E]">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all samples"
                      className={isIndeterminate ? "indeterminate" : ""}
                    />
                  </TableHead>
                  <TableHead className="py-2 text-[#2F3E2E]">Sample ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSamples.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-4 text-[#8B8378]">
                      No samples found for update with current filter and search term.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSamples.map((sample) => (
                    <TableRow key={sample.id} className="border-b border-[#DDD7B1]">
                      <TableCell className="py-1">
                        <Checkbox
                          checked={selectedSampleIds.has(sample.id)}
                          onCheckedChange={(checked) => handleCheckboxChange(sample.id, !!checked)}
                          aria-label={`Select sample ${sample.sampleID}`}
                        />
                      </TableCell>
                      <TableCell
                        className="cursor-pointer py-1 text-sm text-[#2F3E2E]"
                        onClick={() => handleCheckboxChange(sample.id, !selectedSampleIds.has(sample.id))}
                      >
                        {sample.sampleID}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Fixed update fields section */}
        <div className="pt-4 border-t mt-4 border-[#4A7C74]">
          <h3 className="text-lg font-semibold mb-4 text-[#2F3E2E]">Update Fields</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preparedBy" className="text-[#8B8378]">
                Prepared By
              </Label>
              <Input
                id="preparedBy"
                value={preparedBy}
                onChange={(e) => setPreparedBy(e.target.value)}
                placeholder="Enter name"
                className="bg-white border-[#DDD7B1] text-[#2F3E2E]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preparationMethod" className="text-[#8B8378]">
                Preparation Method
              </Label>
              <Select value={preparationMethod} onValueChange={setPreparationMethod}>
                <SelectTrigger id="preparationMethod" className="bg-white border-[#DDD7B1] text-[#2F3E2E]">
                  <SelectValue placeholder="Select a method" />
                </SelectTrigger>
                <SelectContent className="bg-white text-[#2F3E2E]">
                  <SelectItem value="air drying">Air Drying</SelectItem>
                  <SelectItem value="grinding">Grinding</SelectItem>
                  <SelectItem value="pounding">Pounding</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status" className="text-[#8B8378]">
                Status
              </Label>
              <Select value={statusToUpdate} onValueChange={setStatusToUpdate} disabled={filterStatus === "ready"}>
                <SelectTrigger id="status" className="bg-white border-[#DDD7B1] text-[#2F3E2E]">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent className="bg-white text-[#2F3E2E]">
                  {filterStatus === "pending" && (
                    <>
                      <SelectItem value="processing">In Preparation</SelectItem>
                      <SelectItem value="ready">Ready for Analysis</SelectItem>
                    </>
                  )}
                  {filterStatus === "processing" && <SelectItem value="ready">Ready for Analysis</SelectItem>}
                  {/* If filterStatus is "ready", no items will be rendered, and the select will be disabled */}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleApplyUpdates}
            disabled={!canApplyUpdates || loading} // Disable button while loading
            className="mt-6 w-full bg-[#4A7C74] hover:bg-[#2F3E2E] text-white"
          >
            {loading ? "Applying..." : "Apply Updates"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
