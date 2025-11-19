"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Clock, CheckCircle, Printer } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { updateSampleStatusToReleased } from "@/lib/firestore"
import { generateSampleReportBodyHtml, formatDate, getStatusColor } from "@/components/print-layout-analysis-result"
import type { Sample } from "@/types"

// Update the props interface to support both sample and customer views
interface SampleViewModalProps {
  sampleId?: string
  customerData?: {
    id: string
    fullName: string
    email?: string
    phone?: string
    organization?: string
    clientType?: string
    isRSBSA?: string | boolean
    rsbsaIdNo?: string
    address?: string
    birthday?: string
    createdAt?: Date
    updatedAt?: Date
    sampleEntries?: any[]
  }
  viewType?: "sample" | "customer"
  onClose: () => void
}

export default function SampleViewModal({
  sampleId,
  customerData,
  viewType = "sample",
  onClose,
}: SampleViewModalProps) {
  const router = useRouter()
  const [sample, setSample] = useState<Sample | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [stkLabReportData, setStkLabReportData] = useState<any>(null)

  const fetchSampleData = async (id: string) => {
    try {
      setLoading(true)
      const sampleDoc = await getDoc(doc(db!, "samples", id))

      if (sampleDoc.exists()) {
        const data = sampleDoc.data()

        let earliestAnalysisDate: Date | undefined = undefined

        // Scan results to find the earliest analysis date
        if (data.results) {
          for (const labCode in data.results) {
            if (data.results.hasOwnProperty(labCode)) {
              const labCodeResults = data.results[labCode]
              for (const param in labCodeResults) {
                if (labCodeResults.hasOwnProperty(param)) {
                  const paramData = labCodeResults[param]
                  if (paramData.analysisDate) {
                    const currentAnalysisDate = paramData.analysisDate?.toDate
                      ? paramData.analysisDate.toDate()
                      : paramData.analysisDate
                    if (!earliestAnalysisDate || currentAnalysisDate < earliestAnalysisDate) {
                      earliestAnalysisDate = currentAnalysisDate
                    }
                  }
                }
              }
            }
          }
        }

        const processedData: Sample = {
          id: sampleDoc.id,
          lsrfNo: data.lsrfNo || "",
          dateReceived: data.dateReceived?.toDate ? data.dateReceived.toDate() : data.dateReceived,
          customerName: data.customerName || "",
          customerAddress: data.customerAddress || "",
          customerPhone: data.customerPhone || "",
          customerEmail: data.customerEmail || "",
          customerBirthday: data.customerBirthday || "",
          customerOrganization: data.customerOrganization || "",
          isRSBSA: data.isRSBSA === true || data.isRSBSA === "Yes" ? "Yes" : "No",
          rsbsaIdNo: data.rsbsaIdNo || "",
          clientType: data.clientType || "",
          sampleType: data.sampleType || "",
          serviceType: data.serviceType || undefined,
          status: data.status || "pending",
          samples: data.samples || [],
          soilType: data.soilType || "",
          soilLocation: data.soilLocation || "",
          soilDepth: data.soilDepth || "",
          plantType: data.plantType || "",
          plantPart: data.plantPart || "",
          plantAge: data.plantAge || "",
          fertilizerType: data.fertilizerType || "",
          fertilizerBrand: data.fertilizerBrand || "",
          fertilizerComposition: data.fertilizerComposition || "",
          otherDescription: data.otherDescription || "",
          requestedTests: data.requestedTests || [],
          notes: data.notes || "",
          requestedParameter: data.requestedParameter || "",
          parameters: data.parameters || [],
          amountDue: data.amountDue || 0,
          amountPaid: data.amountPaid || 0,
          paymentStatus: data.paymentStatus || "Unpaid",
          discountApplied: data.discountApplied || 0,
          dueDate: data.dueDate ? data.dueDate.toDate() : undefined,
          analysisCompleted: data.analysisCompleted ? data.analysisCompleted.toDate() : undefined,
          productionBatchNo: data.productionBatchNo || "",
          mushroomVariety: data.mushroomVariety || "",
          harvestDate: data.harvestDate ? data.harvestDate.toDate() : undefined,
          quantity: data.quantity || 0,
          quantityUnit: data.quantityUnit || "",
          purposeOfSample: data.purposeOfSample || "",
          storageConditions: data.storageConditions || "",
          results: data.results || {},
          soilSampleLocation: data.soilSampleLocation || "",
          inoculantType: data.inoculantType || "",
          targetCrop: data.targetCrop || "",
          applicationMethod: data.applicationMethod || "",
          inoculantQuantity: data.inoculantQuantity || 0,
          inoculantUnit: data.inoculantUnit || "",
          spawnType: data.spawnType || "",
          substrateType: data.substrateType || "",
          spawnQuantity: data.spawnQuantity || 0,
          spawnUnit: data.spawnUnit || "",
          farmLocation: data.farmLocation || "",
          farmSize: data.farmSize || 0,
          gpsCoordinates: data.gpsCoordinates || "",
          mappingPurpose: data.mappingPurpose || "",
          targetCropFertilizer: data.targetCropFertilizer || "",
          growthStage: data.growthStage || "",
          soilTestResults: data.soilTestResults || "",
          farmingSystem: data.farmingSystem || "",
          specificConcerns: data.specificConcerns || "",
          numberOfSamples: data.numberOfSamples || 0,
          analysisStarted: earliestAnalysisDate || (data.analysisStarted ? data.analysisStarted.toDate() : undefined),
          tags: Array.isArray(data.tags)
            ? data.tags
            : typeof data.tags === "string"
              ? data.tags.split(",").map((tag: string) => tag.trim())
              : [],
          releasedAt: data.releasedAt ? data.releasedAt.toDate() : undefined,
          cropType: data.cropType || "",
        }
        setSample(processedData)

        if (data.serviceType === "stk" && data.samples && data.samples.length > 0) {
          const firstSample = data.samples[0]
          const labCode = firstSample.laboratorySampleCode || firstSample.sampleCode
          if (labCode) {
            try {
              const stkDoc = await getDoc(doc(db!, "labreport-stk", labCode))
              if (stkDoc.exists()) {
                setStkLabReportData(stkDoc.data())
              }
            } catch (err) {
              console.error("Error fetching STK lab report:", err)
            }
          }
        }
      } else {
        console.error("Sample not found")
        toast({
          title: "Error",
          description: "Sample not found",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching sample:", error)
      toast({
        title: "Error",
        description: "Failed to load sample details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReleaseSample = async () => {
    if (!sample || !sample.id) return

    setIsUpdatingStatus(true)
    try {
      await updateSampleStatusToReleased(sample.id)
      toast({
        title: "Success",
        description: "Sample successfully marked as released.",
        variant: "default",
      })
      // Re-fetch sample data to update the UI after successful release
      if (sampleId) {
        await fetchSampleData(sampleId)
      }
    } catch (error: any) {
      console.error("Error releasing sample:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to mark sample as released.",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  useEffect(() => {
    if (viewType === "sample" && sampleId) {
      fetchSampleData(sampleId)
    } else if (viewType === "customer" && customerData) {
      setLoading(false)
    }
  }, [sampleId, viewType, customerData])

  const handlePrint = () => {
    if (!sample) {
      toast({
        title: "Error",
        description: "No sample data available to print.",
        variant: "destructive",
      })
      return
    }

    try {
      const bodyHtmlContent = generateSampleReportBodyHtml(sample, stkLabReportData)

      // Open a new window/tab for printing
      const printWindow = window.open("", "_blank", "width=800,height=900,resizable=yes,scrollbars=yes")
      if (!printWindow) {
        toast({
          title: "Error",
          description: "Failed to open print window. Please allow pop-ups for this site.",
          variant: "destructive",
        })
        return
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Sample Report - ${sample.lsrfNo}</title>
            <style>
              body { margin: 0; padding: 20px; font-family: serif; }
              @media print { body { margin: 0; padding: 0; } }
            </style>
          </head>
          <body>
            ${bodyHtmlContent}
          </body>
        </html>
      `)
      printWindow.document.close()

      // Wait for content to render, then focus the window
      printWindow.onload = () => {
        printWindow.focus()
      }
    } catch (error) {
      console.error("Error generating or printing report:", error)
      toast({
        title: "Error",
        description: "Failed to generate or print report. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Render the customer view
  const renderCustomerView = () => {
    if (!customerData) return null

    console.log("[v0] Customer data in modal:", customerData)
    console.log("[v0] Customer isRSBSA value:", customerData.isRSBSA)
    console.log("[v0] Customer rsbsaIdNo value:", customerData.rsbsaIdNo)

    return (
      <div className="space-y-6">
        {/* Customer Information */}
        <div>
          <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#5B8C5A] pb-2">Customer Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-[#8B8378] text-sm">Customer Name</p>
              <p className="text-[#2F3E2E] font-medium">{customerData.fullName}</p>
            </div>
            {customerData.organization && (
              <div>
                <p className="text-[#8B8378] text-sm">Organization</p>
                <p className="text-[#2F3E2E]">{customerData.organization}</p>
              </div>
            )}
            {customerData.email && (
              <div>
                <p className="text-[#8B8378] text-sm">Email</p>
                <p className="text-[#2F3E2E]">{customerData.email}</p>
              </div>
            )}
            {customerData.phone && (
              <div>
                <p className="text-[#8B8378] text-sm">Phone</p>
                <p className="text-[#2F3E2E]">{customerData.phone}</p>
              </div>
            )}
            {customerData.address && (
              <div>
                <p className="text-[#8B8378] text-sm">Address</p>
                <p className="text-[#2F3E2E]">{customerData.address}</p>
              </div>
            )}
            {customerData.clientType && (
              <div>
                <p className="text-[#8B8378] text-sm">Client Type</p>
                <p className="text-[#2F3E2E]">{customerData.clientType}</p>
              </div>
            )}
            {/* FIX: Display RSBSA Member status correctly */}
            <div>
              <p className="text-[#8B8378] text-sm">RSBSA Member</p>
              <p className="text-[#2F3E2E]">
                {customerData.isRSBSA === "Yes" || customerData.isRSBSA === true ? "Yes" : "No"}
              </p>
            </div>
            {(customerData.isRSBSA === "Yes" || customerData.isRSBSA === true) && customerData.rsbsaIdNo && (
              <div>
                <p className="text-[#8B8378] text-sm">RSBSA ID Number</p>
                <p className="text-[#2F3E2E]">{customerData.rsbsaIdNo}</p>
              </div>
            )}
            {customerData.birthday && (
              <div>
                <p className="text-[#8B8378] text-sm">Birthday</p>
                <p className="text-[#2F3E2E]">{customerData.birthday}</p>
              </div>
            )}
            {customerData.createdAt && (
              <div>
                <p className="text-[#8B8378] text-sm">Customer Since</p>
                <p className="text-[#2F3E2E]">{formatDate(customerData.createdAt)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Summary Statistics - Moved above Sample History */}
        <div>
          <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#5B8C5A] pb-2">Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div className="bg-[#E0D9C0] p-4 rounded-md">
              <p className="text-[#8B8378] text-sm">Total Submissions</p>
              <p className="text-2xl font-bold text-[#2F3E2E]">
                {customerData.sampleEntries ? customerData.sampleEntries.length : 0}
              </p>
            </div>
            <div className="bg-[#E0D9C0] p-4 rounded-md">
              <p className="text-[#8B8378] text-sm">Total Samples</p>
              <p className="text-2xl font-bold text-[#2F3E2E]">
                {customerData.sampleEntries
                  ? customerData.sampleEntries.reduce(
                      (total, entry) => total + (entry.samples ? entry.samples.length : 0),
                      0,
                    )
                  : 0}
              </p>
            </div>
            <div className="bg-[#E0D9C0] p-4 rounded-md">
              <p className="text-[#8B8378] text-sm">Completed Analyses</p>
              <p className="text-2xl font-bold text-[#2F3E2E]">
                {customerData.sampleEntries
                  ? customerData.sampleEntries.filter((entry) => entry.status.toLowerCase() === "completed").length
                  : 0}
              </p>
            </div>
          </div>
        </div>

        {/* Sample History - Moved below Summary */}
        <div>
          <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#5B8C5A] pb-2">Sample History</h3>
          <div className="mt-4 rounded-md border border-[#DDD7B1]">
            <Table>
              <TableHeader className="bg-[#C0B89F]">
                <TableRow className="hover:bg-[#C0B89F] border-[#DDD7B1]">
                  <TableHead className="text-[#2F3E2E]">LSRF No.</TableHead>
                  <TableHead className="text-[#2F3E2E]">Date Received</TableHead>
                  <TableHead className="text-[#2F3E2E]">Date Released</TableHead>
                  <TableHead className="text-[#2F3E2E]">Sample Count</TableHead>
                  <TableHead className="text-[#2F3E2E]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerData.sampleEntries && customerData.sampleEntries.length > 0 ? (
                  customerData.sampleEntries.map((entry, index) => (
                    <TableRow key={index} className="hover:bg-[#E0D9C0] border-[#DDD7B1]">
                      <TableCell className="font-medium text-[#2F3E2E]">{entry.lsrfNo}</TableCell>
                      <TableCell className="text-[#2F3E2E]">{formatDate(entry.dateReceived)}</TableCell>
                      <TableCell className="text-[#2F3E2E]">
                        {entry.analysisCompleted ? formatDate(entry.analysisCompleted) : "Not yet released"}
                      </TableCell>
                      <TableCell className="text-[#2F3E2E]">{entry.samples ? entry.samples.length : 0}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(entry.status)}>{entry.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-[#8B8378] py-4">
                      No sample history found for this customer
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    )
  }

  // Render the sample view (original content)
  const renderSampleView = () => {
    if (!sample) return null

    const isTestingSample = sample.serviceType === "testing" || !sample.serviceType
    const isNonTestingGeneral = sample.serviceType === "non-testing"
    const isSTK = sample.serviceType === "stk"
    const isSoilInoculant = sample.serviceType === "soil_inoculant"
    const isMushroomSpawn = sample.serviceType === "mushroom_spawn"
    const isGeotagging = sample.serviceType === "geotagging"
    const isFertilizerRecommendation = sample.serviceType === "fertilizer_recommendation"

    return (
      <div className="space-y-6">
        {/* Key Information Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#E0D9C0] p-4 rounded-md">
          <div>
            <p className="text-[#8B8378] text-sm">LSRF Reference No.</p>
            <p className="text-[#2F3E2E] font-medium">{sample.lsrfNo}</p>
          </div>
          <div>
            <p className="text-[#8B8378] text-sm">Date Received</p>
            <p className="text-[#2F3E2E]">{formatDate(sample.dateReceived)}</p>
          </div>
          <div>
            <p className="text-[#8B8378] text-sm">Due Date</p>
            <p className="text-[#2F3E2E]">{formatDate(sample.dueDate)}</p>
          </div>
          <div>
            <p className="text-[#8B8378] text-sm">Client Type</p>
            <p className="text-[#2F3E2E]">{sample.clientType}</p>
          </div>
          <div>
            <p className="text-[#8B8378] text-sm">Status</p>
            <Badge className={getStatusColor(sample.status)}>{sample.status}</Badge>
          </div>
          <div>
            <p className="text-[#8B8378] text-sm">Service Type</p>
            <p className="text-[#2F3E2E]">{sample.serviceType || "N/A"}</p>
          </div>
          {sample.releasedAt && ( // Display releasedAt if available
            <div>
              <p className="text-[#8B8378] text-sm">Date Released</p>
              <p className="text-[#2F3E2E]">{formatDate(sample.releasedAt)}</p>
            </div>
          )}
        </div>

        {/* Customer Information */}
        <div className="col-span-1 md:col-span-3 mt-2">
          <h4 className="text-[#2F3E2E] font-medium border-b border-[#5B8C5A] pb-1 mb-2">Customer Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-[#8B8378] text-sm">Customer Name</p>
              <p className="text-[#2F3E2E] font-medium">{sample.customerName}</p>
            </div>
            <div>
              <p className="text-[#8B8378] text-sm">Organization</p>
              <p className="text-[#2F3E2E]">{sample.customerOrganization || "N/A"}</p>
            </div>

            <div>
              <p className="text-[#8B8378] text-sm">Address</p>
              <p className="text-[#2F3E2E]">{sample.customerAddress || "N/A"}</p>
            </div>
            <div>
              <p className="text-[#8B8378] text-sm">Phone</p>
              <p className="text-[#2F3E2E]">{sample.customerPhone || "N/A"}</p>
            </div>
            <div>
              <p className="text-[#8B8378] text-sm">Email</p>
              <p className="text-[#2F3E2E]">{sample.customerEmail || "N/A"}</p>
            </div>
            {/* FIX: Display RSBSA Member status correctly */}
            <div>
              <p className="text-[#8B8378] text-sm">RSBSA Member</p>
              <p className="text-[#2F3E2E]">{sample.isRSBSA === "Yes" || sample.isRSBSA === true ? "Yes" : "No"}</p>
            </div>
            {(sample.isRSBSA === "Yes" || sample.isRSBSA === true) && (
              <div>
                <p className="text-[#8B8378] text-sm">RSBSA ID Number</p>
                <p className="text-[#2F3E2E]">{sample.rsbsaIdNo || "N/A"}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tags Section */}
        {sample.tags && sample.tags.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#5B8C5A] pb-2">Tags</h3>
            <div className="bg-[#E0D9C0] p-4 rounded-md flex flex-wrap gap-2">
              {sample.tags.map((tag: string, index: number) => (
                <Badge key={tag} className="bg-[#C0B89F] text-[#2F3E2E]">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Analysis Timestamps (only for testing samples) */}
        {isTestingSample && (sample.analysisStarted || sample.analysisCompleted) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#E0D9C0] p-3 rounded-md">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#5B8C5A]" />
              <div>
                <p className="text-[#8B8378] text-sm">Analysis Started</p>
                <p className="text-[#2F3E2E]">{formatDate(sample.analysisStarted)}</p>
              </div>
            </div>
            {sample.analysisCompleted && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[#5B8C5A]" />
                <div>
                  <p className="text-[#8B8378] text-sm">Analysis Completed</p>
                  <p className="text-[#2F3E2E]">{formatDate(sample.analysisCompleted)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sample Information Section (Testing Specific) */}
        {isTestingSample && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#5B8C5A] pb-2">Sample Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-[#8B8378] text-sm">Number of Samples</p>
                <p className="text-[#2F3E2E]">{sample.numberOfSamples || "N/A"}</p>
              </div>
              {sample.requestedParameter && (
                <div>
                  <p className="text-[#8B8378] text-sm">Requested Parameter</p>
                  <p className="text-[#2F3E2E]">{sample.requestedParameter}</p>
                </div>
              )}
              {sample.parameters && sample.parameters.length > 0 && (
                <div>
                  <p className="text-[#8B8378] text-sm">Parameters</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {sample.parameters.map((param: string) => (
                      <Badge key={param} className="bg-[#C0B89F] text-[#2F3E2E]">
                        {param}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Non-Testing General Details */}
        {isNonTestingGeneral && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#5B8C5A] pb-2">
              General Non-Testing Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#E0D9C0] p-4 rounded-md">
              <div>
                <p className="text-[#8B8378] text-sm">Product Type</p>
                <p className="text-[#2F3E2E]">{sample.productType || "N/A"}</p>
              </div>
              <div>
                <p className="text-[#8B8378] text-sm">Production Batch No.</p>
                <p className="text-[#2F3E2E]">{sample.productionBatchNo || "N/A"}</p>
              </div>
              <div>
                <p className="text-[#8B8378] text-sm">Harvest/Production Date</p>
                <p className="text-[#2F3E2E]">{formatDate(sample.harvestDate)}</p>
              </div>
              <div>
                <p className="text-[#8B8378] text-sm">Quantity</p>
                <p className="text-[#2F3E2E]">
                  {sample.quantity || "N/A"} {sample.quantityUnit || ""}
                </p>
              </div>
              <div>
                <p className="text-[#8B8378] text-sm">Purpose of Sample</p>
                <p className="text-[#2F3E2E]">{sample.purposeOfSample || "N/A"}</p>
              </div>
              <div>
                <p className="text-[#8B8378] text-sm">Storage Conditions</p>
                <p className="text-[#2F3E2E]">{sample.storageConditions || "N/A"}</p>
              </div>
            </div>
          </div>
        )}

        {/* STK (Soil Rapid Test) Details */}
        {isSTK && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#5B8C5A] pb-2">
              STK (Soil Rapid Test) Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#E0D9C0] p-4 rounded-md">
              <div>
                <p className="text-[#8B8378] text-sm">Soil Sample Location</p>
                <p className="text-[#2F3E2E]">{sample.soilSampleLocation || "N/A"}</p>
              </div>
              <div>
                <p className="text-[#8B8378] text-sm">Soil Depth (cm)</p>
                <p className="text-[#2F3E2E]">{sample.soilDepth || "N/A"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[#8B8378] text-sm">Crop Type</p>
                <p className="text-[#2F3E2E]">{sample.cropType || "N/A"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Soil Inoculant Details */}
        {isSoilInoculant && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#5B8C5A] pb-2">
              Soil Inoculant Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#E0D9C0] p-4 rounded-md">
              <div>
                <p className="text-[#8B8378] text-sm">Inoculant Type</p>
                <p className="text-[#2F3E2E]">{sample.inoculantType || "N/A"}</p>
              </div>
              <div>
                <p className="text-[#8B8378] text-sm">Target Crop</p>
                <p className="text-[#2F3E2E]">{sample.targetCrop || "N/A"}</p>
              </div>
              <div>
                <p className="text-[#8B8378] text-sm">Application Method</p>
                <p className="text-[#2F3E2E]">{sample.applicationMethod || "N/A"}</p>
              </div>
              <div>
                <p className="text-[#8B8378] text-sm">Quantity Required</p>
                <p className="text-[#2F3E2E]">
                  {sample.inoculantQuantity || "N/A"} {sample.inoculantUnit || ""}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mushroom Spawn Details */}
        {isMushroomSpawn && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#5B8C5A] pb-2">
              Mushroom Spawn Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#E0D9C0] p-4 rounded-md">
              <div>
                <p className="text-[#8B8378] text-sm">Mushroom Variety</p>
                <p className="text-[#2F3E2E]">{sample.mushroomVariety || "N/A"}</p>
              </div>
              <div>
                <p className="text-[#8B8378] text-sm">Spawn Type</p>
                <p className="text-[#2F3E2E]">{sample.spawnType || "N/A"}</p>
              </div>
              <div>
                <p className="text-[#8B8378] text-sm">Substrate Type</p>
                <p className="text-[#2F3E2E]">{sample.substrateType || "N/A"}</p>
              </div>
              <div>
                <p className="text-[#8B8378] text-sm">Quantity Required</p>
                <p className="text-[#2F3E2E]">
                  {sample.spawnQuantity || "N/A"} {sample.spawnUnit || ""}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Geotagging Details */}
        {isGeotagging && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#5B8C5A] pb-2">Geotagging Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#E0D9C0] p-4 rounded-md">
              <div>
                <p className="text-[#8B8378] text-sm">Farm/Field Location</p>
                <p className="text-[#2F3E2E]">{sample.farmLocation || "N/A"}</p>
              </div>
              <div>
                <p className="text-[#8B8378] text-sm">Farm Size (hectares)</p>
                <p className="text-[#2F3E2E]">{sample.farmSize || "N/A"}</p>
              </div>
              <div>
                <p className="text-[#8B8378] text-sm">GPS Coordinates</p>
                <p className="text-[#2F3E2E]">{sample.gpsCoordinates || "N/A"}</p>
              </div>
              <div>
                <p className="text-[#8B8378] text-sm">Mapping Purpose</p>
                <p className="text-[#2F3E2E]">{sample.mappingPurpose || "N/A"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Fertilizer Recommendation Details */}
        {isFertilizerRecommendation && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#5B8C5A] pb-2">
              Fertilizer Recommendation Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#E0D9C0] p-4 rounded-md">
              <div>
                <p className="text-[#8B8378] text-sm">Target Crop</p>
                <p className="text-[#2F3E2E]">{sample.targetCropFertilizer || "N/A"}</p>
              </div>
              <div>
                <p className="text-[#8B8378] text-sm">Growth Stage</p>
                <p className="text-[#2F3E2E]">{sample.growthStage || "N/A"}</p>
              </div>
              <div>
                <p className="text-[#8B8378] text-sm">Soil Test Results Available?</p>
                <p className="text-[#2F3E2E]">{sample.soilTestResults || "N/A"}</p>
              </div>
              <div>
                <p className="text-[#8B8378] text-sm">Farming System</p>
                <p className="text-[#2F3E2E]">{sample.farmingSystem || "N/A"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[#8B8378] text-sm">Specific Concerns/Issues</p>
                <p className="text-[#2F3E2E] whitespace-pre-wrap">{sample.specificConcerns || "N/A"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Information */}
        {sample.paymentStatus && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#5B8C5A] pb-2">Payment Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#E0D9C0] p-4 rounded-md">
              <div>
                <p className="text-[#8B8378] text-sm">Payment Status</p>
                <Badge
                  className={`mt-1 ${
                    sample.paymentStatus === "Paid"
                      ? "bg-green-500/20 text-green-300"
                      : sample.paymentStatus === "Partially Paid"
                        ? "bg-yellow-500/20 text-yellow-300"
                        : "bg-red-500/20 text-red-300"
                  }`}
                >
                  {sample.paymentStatus}
                </Badge>
              </div>
              <div>
                <p className="text-[#8B8378] text-sm">Client Type</p>
                <p className="text-[#2F3E2E]">{sample.clientType || "Regular"}</p>
              </div>
              <div>
                <p className="text-[#8B8378] text-sm">Amount Due</p>
                <p className="text-[#2F3E2E]">₱{sample.amountDue ? sample.amountDue.toFixed(2) : "0.00"}</p>
              </div>
              <div>
                <p className="text-[#8B8378] text-sm">Amount Paid</p>
                <p className="text-[#2F3E2E]">₱{sample.amountPaid ? sample.amountPaid.toFixed(2) : "0.00"}</p>
              </div>
              {sample.discountApplied > 0 && (
                <div>
                  <p className="text-[#8B8378] text-sm">Discount Applied</p>
                  <p className="text-[#2F3E2E]">₱{sample.discountApplied.toFixed(2)}</p>
                </div>
              )}
              {sample.paymentStatus === "Partially Paid" && (
                <div>
                  <p className="text-[#8B8378] text-sm">Balance</p>
                  <p className="text-[#2F3E2E]">₱{(sample.amountDue - sample.amountPaid).toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* New Tabs for Lab Code Information and Analysis Results (only for testing samples) */}
        {isTestingSample && (
          <Tabs defaultValue="lab-code-info" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="lab-code-info">Lab Code Information</TabsTrigger>
              <TabsTrigger value="analysis-results">Analysis Results</TabsTrigger>
            </TabsList>

            <TabsContent value="lab-code-info" className="space-y-4">
              <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#5B8C5A] pb-2">
                Lab Code Information
              </h3>
              <div className="overflow-x-auto">
                <Table className="border border-[#DDD7B1]">
                  <TableHeader className="bg-[#C0B89F]">
                    <TableRow className="hover:bg-[#C0B89F] border-[#DDD7B1]">
                      <TableHead className="text-[#2F3E2E]">Laboratory Code</TableHead>
                      <TableHead className="text-[#2F3E2E]">Sample ID</TableHead>
                      <TableHead className="text-[#2F3E2E]">Sampling Site</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sample.samples && sample.samples.length > 0 ? (
                      sample.samples.map((sampleItem: any, index: number) => (
                        <TableRow key={index} className="hover:bg-[#E0D9C0] border-[#DDD7B1]">
                          <TableCell className="font-medium text-[#2F3E2E]">
                            {sampleItem.laboratorySampleCode || sampleItem.sampleCode || "N/A"}
                          </TableCell>
                          <TableCell className="text-[#2F3E2E]">{sampleItem.sampleID || "N/A"}</TableCell>
                          <TableCell className="text-[#2F3E2E]">{sampleItem.samplingSite || "N/A"}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-[#8B8378] py-4">
                          No lab code information available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="analysis-results" className="space-y-4">
              <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#5B8C5A] pb-2">Analysis Results</h3>

              {sample.status?.toLowerCase() !== "completed" && sample.status?.toLowerCase() !== "released" ? (
                <div className="bg-[#FDF3D7] text-[#A07C00] p-4 rounded-md flex items-center justify-center h-32">
                  <p className="text-center font-medium">
                    Analysis results will be available once the sample status is &quot;Completed&quot; or
                    &quot;Released&quot;.
                  </p>
                </div>
              ) : (
                // Results Table - Now supports both numeric and text values
                <div className="overflow-x-auto">
                  <Table className="border border-[#DDD7B1]">
                    <TableHeader className="bg-[#C0B89F]">
                      <TableRow className="hover:bg-[#C0B89F] border-[#DDD7B1]">
                        <TableHead className="text-[#2F3E2E]">Laboratory Code</TableHead>
                        {sample.parameters &&
                          sample.parameters.map((param: string, index: number) => (
                            <TableHead key={index} className="text-[#2F3E2E]">
                              {param}
                            </TableHead>
                          ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sample.samples &&
                        sample.samples.map((sampleItem: any, index: number) => {
                          const sampleCodeForResults =
                            sampleItem.laboratorySampleCode ||
                            sampleItem.sampleCode ||
                            `${String(index + 1).padStart(3, "0")}`
                          return (
                            <TableRow key={index} className="hover:bg-[#E0D9C0] border-[#DDD7B1]">
                              <TableCell className="font-medium text-[#2F3E2E]">{sampleCodeForResults}</TableCell>
                              {sample.parameters &&
                                sample.parameters.map((param: string, paramIndex: number) => {
                                  const resultValue = sample.results?.[sampleCodeForResults]?.[param]?.value
                                  const resultUnit = sample.results?.[sampleCodeForResults]?.[param]?.unit
                                  const displayValue =
                                    resultValue !== undefined && resultValue !== null ? String(resultValue) : "N/A"
                                  return (
                                    <TableCell key={paramIndex} className="text-[#2F3E2E]">
                                      {displayValue}
                                      {resultUnit && (
                                        <span className="text-[#8B8378] text-xs ml-1">({resultUnit})</span>
                                      )}
                                    </TableCell>
                                  )
                                })}
                            </TableRow>
                          )
                        })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {isNonTestingGeneral && (
          <Tabs defaultValue="lab-code-info" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="lab-code-info">Lab Code Information</TabsTrigger>
              <TabsTrigger value="analysis-results">Analysis Results</TabsTrigger>
            </TabsList>

            <TabsContent value="lab-code-info" className="space-y-4">
              <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#5B8C5A] pb-2">
                Lab Code Information
              </h3>
              <div className="overflow-x-auto">
                <Table className="border border-[#DDD7B1]">
                  <TableHeader className="bg-[#C0B89F]">
                    <TableRow className="hover:bg-[#C0B89F] border-[#DDD7B1]">
                      <TableHead className="text-[#2F3E2E]">Laboratory Code</TableHead>
                      <TableHead className="text-[#2F3E2E]">Sample ID</TableHead>
                      <TableHead className="text-[#2F3E2E]">Sampling Site</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sample.samples && sample.samples.length > 0 ? (
                      sample.samples.map((sampleItem: any, index: number) => (
                        <TableRow key={index} className="hover:bg-[#E0D9C0] border-[#DDD7B1]">
                          <TableCell className="font-medium text-[#2F3E2E]">
                            {sampleItem.laboratorySampleCode || sampleItem.sampleCode || "N/A"}
                          </TableCell>
                          <TableCell className="text-[#2F3E2E]">{sampleItem.sampleID || "N/A"}</TableCell>
                          <TableCell className="text-[#2F3E2E]">{sampleItem.samplingSite || "N/A"}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-[#8B8378] py-4">
                          No lab code information available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="analysis-results" className="space-y-4">
              <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#5B8C5A] pb-2">Analysis Results</h3>
              {sample.status?.toLowerCase() !== "completed" && sample.status?.toLowerCase() !== "released" ? (
                <div className="bg-[#FDF3D7] text-[#A07C00] p-4 rounded-md flex items-center justify-center h-32">
                  <p className="text-center font-medium">
                    Analysis results will be available once the sample status is &quot;Completed&quot; or
                    &quot;Released&quot;.
                  </p>
                </div>
              ) : (
                // Results Table - Now supports both numeric and text values
                <div className="overflow-x-auto">
                  <Table className="border border-[#DDD7B1]">
                    <TableHeader className="bg-[#C0B89F]">
                      <TableRow className="hover:bg-[#C0B89F] border-[#DDD7B1]">
                        <TableHead className="text-[#2F3E2E]">Laboratory Code</TableHead>
                        {sample.parameters &&
                          sample.parameters.map((param: string, index: number) => (
                            <TableHead key={index} className="text-[#2F3E2E]">
                              {param}
                            </TableHead>
                          ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sample.samples &&
                        sample.samples.map((sampleItem: any, index: number) => {
                          const sampleCodeForResults =
                            sampleItem.laboratorySampleCode ||
                            sampleItem.sampleCode ||
                            `${String(index + 1).padStart(3, "0")}`
                          return (
                            <TableRow key={index} className="hover:bg-[#E0D9C0] border-[#DDD7B1]">
                              <TableCell className="font-medium text-[#2F3E2E]">{sampleCodeForResults}</TableCell>
                              {sample.parameters &&
                                sample.parameters.map((param: string, paramIndex: number) => {
                                  const resultValue = sample.results?.[sampleCodeForResults]?.[param]?.value
                                  const resultUnit = sample.results?.[sampleCodeForResults]?.[param]?.unit
                                  const displayValue =
                                    resultValue !== undefined && resultValue !== null ? String(resultValue) : "N/A"
                                  return (
                                    <TableCell key={paramIndex} className="text-[#2F3E2E]">
                                      {displayValue}
                                      {resultUnit && (
                                        <span className="text-[#8B8378] text-xs ml-1">({resultUnit})</span>
                                      )}
                                    </TableCell>
                                  )
                                })}
                            </TableRow>
                          )
                        })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {isSTK && (
          <Tabs defaultValue="lab-code-info" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="lab-code-info">Lab Code Information</TabsTrigger>
              <TabsTrigger value="analysis-results">Analysis Results</TabsTrigger>
            </TabsList>

            <TabsContent value="lab-code-info" className="space-y-4">
              <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#5B8C5A] pb-2">
                Lab Code Information
              </h3>
              <div className="overflow-x-auto">
                <Table className="border border-[#DDD7B1]">
                  <TableHeader className="bg-[#C0B89F]">
                    <TableRow className="hover:bg-[#C0B89F] border-[#DDD7B1]">
                      <TableHead className="text-[#2F3E2E]">Laboratory Code</TableHead>
                      <TableHead className="text-[#2F3E2E]">Sample ID</TableHead>
                      <TableHead className="text-[#2F3E2E]">Sampling Site</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sample.samples && sample.samples.length > 0 ? (
                      sample.samples.map((sampleItem: any, index: number) => (
                        <TableRow key={index} className="hover:bg-[#E0D9C0] border-[#DDD7B1]">
                          <TableCell className="font-medium text-[#2F3E2E]">
                            {sampleItem.laboratorySampleCode || sampleItem.sampleCode || "N/A"}
                          </TableCell>
                          <TableCell className="text-[#2F3E2E]">{sampleItem.sampleID || "N/A"}</TableCell>
                          <TableCell className="text-[#2F3E2E]">{sampleItem.samplingSite || "N/A"}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-[#8B8378] py-4">
                          No lab code information available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="analysis-results" className="space-y-4">
              <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#5B8C5A] pb-2">Analysis Results</h3>

              {sample.status?.toLowerCase() !== "completed" && sample.status?.toLowerCase() !== "released" ? (
                <div className="bg-[#FDF3D7] text-[#A07C00] p-4 rounded-md flex items-center justify-center h-32">
                  <p className="text-center font-medium">
                    Analysis results will be available once the sample status is &quot;Completed&quot; or
                    &quot;Released&quot;.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="border border-[#DDD7B1]">
                    <TableHeader className="bg-[#C0B89F]">
                      <TableRow className="hover:bg-[#C0B89F] border-[#DDD7B1]">
                        <TableHead className="text-[#2F3E2E]">Laboratory Code</TableHead>
                        <TableHead className="text-[#2F3E2E]">pH</TableHead>
                        <TableHead className="text-[#2F3E2E]">Avail. N</TableHead>
                        <TableHead className="text-[#2F3E2E]">Avail. P</TableHead>
                        <TableHead className="text-[#2F3E2E]">K</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sample.samples &&
                        sample.samples.map((sampleItem: any, index: number) => {
                          const sampleCodeForResults =
                            sampleItem.laboratorySampleCode ||
                            sampleItem.sampleCode ||
                            `${String(index + 1).padStart(3, "0")}`
                          const resultsSource = stkLabReportData || sample.results
                          return (
                            <TableRow key={index} className="hover:bg-[#E0D9C0] border-[#DDD7B1]">
                              <TableCell className="font-medium text-[#2F3E2E]">{sampleCodeForResults}</TableCell>
                              <TableCell className="text-[#2F3E2E]">
                                {resultsSource?.[sampleCodeForResults]?.["pH"]?.value || "N/A"}
                                {resultsSource?.[sampleCodeForResults]?.["pH"]?.unit && (
                                  <span className="text-[#8B8378] text-xs ml-1">
                                    ({resultsSource[sampleCodeForResults]["pH"].unit})
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-[#2F3E2E]">
                                {resultsSource?.[sampleCodeForResults]?.["Avail. N"]?.value || "N/A"}
                                {resultsSource?.[sampleCodeForResults]?.["Avail. N"]?.unit && (
                                  <span className="text-[#8B8378] text-xs ml-1">
                                    ({resultsSource[sampleCodeForResults]["Avail. N"].unit})
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-[#2F3E2E]">
                                {resultsSource?.[sampleCodeForResults]?.["Avail. P"]?.value || "N/A"}
                                {resultsSource?.[sampleCodeForResults]?.["Avail. P"]?.unit && (
                                  <span className="text-[#8B8378] text-xs ml-1">
                                    ({resultsSource[sampleCodeForResults]["Avail. P"].unit})
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-[#2F3E2E]">
                                {resultsSource?.[sampleCodeForResults]?.["K"]?.value || "N/A"}
                                {resultsSource?.[sampleCodeForResults]?.["K"]?.unit && (
                                  <span className="text-[#8B8378] text-xs ml-1">
                                    ({resultsSource[sampleCodeForResults]["K"].unit})
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Additional Notes */}
        {sample.notes && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#5B8C5A] pb-2">Additional Notes</h3>
            <div className="bg-[#E0D9C0] p-4 rounded-md">
              <p className="text-[#2F3E2E] whitespace-pre-wrap">{sample.notes}</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-[#F0EAD6] border border-[#DDD7B1] rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#DDD7B1] sticky top-0 z-10 bg-[#F0EAD6]">
          <h2 className="text-xl font-bold text-[#2F3E2E]">
            {viewType === "sample" ? "Sample Details" : "Customer Details"}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="text-[#8B8378] hover:text-[#2F3E2E] hover:bg-[#C0B89F]"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2F3E2E]"></div>
            </div>
          ) : error ? (
            <div className="bg-red-500/20 border border-red-500 text-[#2F3E2E] p-4 rounded-md">{error}</div>
          ) : viewType === "sample" ? (
            renderSampleView()
          ) : (
            renderCustomerView()
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-[#DDD7B1]">
          {viewType === "sample" &&
            sample &&
            (sample.status?.toLowerCase() === "completed" || sample.status?.toLowerCase() === "released") &&
            sample.serviceType === "testing" && (
              <Button
                className="bg-[#5B8C5A] hover:bg-[#4A7049] text-white flex items-center gap-2"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4" />
                Print Report
              </Button>
            )}
          {viewType === "sample" &&
            sample &&
            (sample.status?.toLowerCase() === "completed" || sample.status?.toLowerCase() === "released") &&
            sample.serviceType === "non-testing" && (
              <Button
                className="bg-[#5B8C5A] hover:bg-[#4A7049] text-white flex items-center gap-2"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4" />
                Print Report
              </Button>
            )}
          {viewType === "sample" &&
            sample &&
            (sample.status?.toLowerCase() === "completed" || sample.status?.toLowerCase() === "released") &&
            sample.serviceType === "stk" && (
              <Button
                className="bg-[#5B8C5A] hover:bg-[#4A7049] text-white flex items-center gap-2"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4" />
                Print Report
              </Button>
            )}
          {viewType === "sample" && sample && sample.status?.toLowerCase() === "completed" && (
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              onClick={handleReleaseSample}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? "Releasing..." : "Mark as Released"}
            </Button>
          )}
          <Button className="bg-[#5B8C5A] hover:bg-[#4A7049] text-white" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
