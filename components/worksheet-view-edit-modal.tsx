"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { X, Save, FileText, Link } from "lucide-react"
import { naturalSort } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

// Lab Report interface
interface LabReport {
  id: string
  reportCode: string
  parameterCategory: string[]
  parameters: string[]
  dateStarted: Date | null
  dateFinished: Date | null
  sampleCodes: string[]
  equipment?: Array<{ id: string; name: string }>
  incidentReport?: string
  reviewerComments?: string
  status: string
  createdAt: Date
  worksheetFileUrl?: string
}

// Sample interface
interface Sample {
  id: string
  dateReceived: Date
  sampleType: string
  status: string
  requestedParameter: string
  parameters: string[]
  samples: Array<{
    sampleCode: string
    description: string
    laboratorySampleCode: string
    status?: string
  }>
  deadline?: Date
  results?: Record<
    string,
    {
      MCF?: {
        analysisDate?: string
        method?: string
        reportCode?: string
        unit?: string
        value?: string
      }
      [key: string]: any
    }
  >
  isReadOnly?: boolean
}

// Parameter interface
interface Parameter {
  id: string
  name: string
  category: string
  unit?: string
  method?: string
  adequateValue?: string // Added adequateValue field
}

// Equipment interface
interface Equipment {
  id: string
  equipmentId?: string
  name: string
  status: string
}

interface WorksheetViewEditModalProps {
  isOpen: boolean
  onClose: () => void
  currentReport: LabReport | null
  samples: Sample[]
  parameters: Parameter[] // Ensure parameters are passed as a prop
  equipmentList: Equipment[]
  analysisValues: Record<string, Record<string, string>>
  setAnalysisValues: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>
  isSubmitting: boolean
  onAnalysisSubmit: (e: React.FormEvent) => void
  isCurrentReportLocked: boolean
  setCurrentReport: React.Dispatch<React.SetStateAction<LabReport | null>>
  onFileUpload: (file: File) => Promise<void>
  onFileDelete: (url: string) => Promise<void>
}

export default function WorksheetViewEditModal({
  isOpen,
  onClose,
  currentReport,
  samples,
  parameters, // Destructure parameters from props
  equipmentList,
  analysisValues,
  setAnalysisValues,
  isSubmitting,
  onAnalysisSubmit,
  isCurrentReportLocked,
  setCurrentReport,
  onFileUpload,
  onFileDelete,
}: WorksheetViewEditModalProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [selectedEquipmentInternal, setSelectedEquipmentInternal] = useState<Equipment | null>(null)
  const [pHMethodFilter, setPHMethodFilter] = useState<string>("All")
  const [mcfValues, setMcfValues] = useState<Record<string, Record<string, string>>>({})
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null)

  const authContext = useAuth()
  const isAdmin = authContext?.isAdmin ?? false
  const hasPermission = authContext?.hasPermission ?? (() => false)
  const canOverrideReadOnly = isAdmin || hasPermission("JOLA-verifier")
  const isReadOnlyMode = (currentReport?.status === "Verified" || isCurrentReportLocked) && !canOverrideReadOnly

  // Parameters that use MCF
  const mcfParameters = useMemo(() => ["Avail. P", "OM", "K"], [])

  const isAnySampleReleased = useMemo(() => {
    if (!currentReport || !samples) return false
    return currentReport.sampleCodes.some((laboratorySampleCode) => {
      const sampleObj = samples.find((s) => s.samples.some((ss) => ss.laboratorySampleCode === laboratorySampleCode))
      const individualSample = sampleObj?.samples.find((ss) => ss.laboratorySampleCode === laboratorySampleCode)
      return individualSample?.status?.toLowerCase() === "released"
    })
  }, [currentReport, samples])

  // Effect to update uploaded file state when currentReport.worksheetFileUrl changes
  useEffect(() => {
    if (currentReport?.worksheetFileUrl && currentReport.worksheetFileUrl.trim() !== "") {
      try {
        const url = new URL(currentReport.worksheetFileUrl)
        const fileName = url.pathname.split("/").pop() || "Uploaded File"
        setUploadedFileName(fileName)
        setUploadedFileUrl(currentReport.worksheetFileUrl)
      } catch (error) {
        console.error("Invalid worksheetFileUrl:", currentReport.worksheetFileUrl, error)
        setUploadedFileName(null)
        setUploadedFileUrl(null)
      }
    } else {
      setUploadedFileName(null)
      setUploadedFileUrl(null)
    }
  }, [currentReport?.worksheetFileUrl])

  // Initialize MCF values when currentReport or samples change
  useEffect(() => {
    if (currentReport && samples.length > 0) {
      const initialMcf: Record<string, Record<string, string>> = {}
      currentReport.sampleCodes.forEach((laboratorySampleCode) => {
        initialMcf[laboratorySampleCode] = {}
        const sampleData = samples.find((s) => s.samples.some((ss) => ss.laboratorySampleCode === laboratorySampleCode))

        if (sampleData && sampleData.results && sampleData.results[laboratorySampleCode]) {
          const mcfValueForSample = sampleData.results[laboratorySampleCode].MCF?.value
          mcfParameters.forEach((param) => {
            initialMcf[laboratorySampleCode][param] = mcfValueForSample || "1.00"
          })
        } else {
          mcfParameters.forEach((param) => {
            initialMcf[laboratorySampleCode][param] = "1.00"
          })
        }
      })
      setMcfValues(initialMcf)
    }
  }, [currentReport, mcfParameters, samples])

  // Helper function to get default unit for a parameter from the parameters list
  const getDefaultUnit = useCallback(
    (parameterName: string): string => {
      const param = parameters.find((p) => p.name === parameterName)
      return param?.unit || "mg/L" // Default to "mg/L" if unit is not found
    },
    [parameters],
  ) // Add parameters to dependency array

  // Helper function to get default method for a parameter from the parameters list
  const getDefaultMethod = useCallback(
    (parameterName: string, requestedParameter: string): string => {
      const param = parameters.find((p) => p.name === parameterName)
      if (param?.method) {
        return param.method
      }

      // Fallback to hardcoded values only if method is not found in parameters
      switch (parameterName) {
        case "pH":
          return "Electrometric Method"
        case "Turbidity":
          return "Nephelometric Method"
        case "Color":
          return "Spectrophotometric Method"
        case "Avail. N":
          return "Computed from OM"
        default:
          return param?.name || requestedParameter
      }
    },
    [parameters],
  )

  // Helper function to get parameter method from the parameters list
  const getParameterMethod = useCallback(
    (parameterName: string): string => {
      const param = parameters.find((p) => p.name === parameterName)
      return param?.method || ""
    },
    [parameters],
  )

  const getParameterAdequateValue = useCallback(
    (parameterName: string): string => {
      const param = parameters.find((p) => p.name === parameterName)
      return param?.adequateValue || ""
    },
    [parameters],
  )

  // Handler for internal file upload
  const handleInternalFileUpload = useCallback(
    async (file: File) => {
      setIsUploading(true)
      try {
        await onFileUpload(file)
      } finally {
        setIsUploading(false)
      }
    },
    [onFileUpload],
  )

  // Handler for internal file deletion
  const handleInternalFileDelete = useCallback(async () => {
    if (uploadedFileUrl) {
      setIsUploading(true)
      try {
        await onFileDelete(uploadedFileUrl)
      } finally {
        setIsUploading(false)
      }
    }
  }, [onFileDelete, uploadedFileUrl])

  // Form submission handler with validation
  const handleSubmitWithValidation = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (!currentReport) {
        toast({
          title: "Error",
          description: "Current report data is missing.",
          variant: "destructive",
        })
        return
      }

      let allFieldsFilled = true
      for (const laboratorySampleCode of currentReport.sampleCodes) {
        for (const param of currentReport.parameters) {
          // Only validate non-MCF parameters
          if (!mcfParameters.includes(param)) {
            if (
              !analysisValues[laboratorySampleCode]?.[param] ||
              analysisValues[laboratorySampleCode]?.[param].trim() === ""
            ) {
              allFieldsFilled = false
              break
            }
          }
        }
        if (!allFieldsFilled) break
      }

      if (!allFieldsFilled) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required analysis values for all samples before submitting.",
          variant: "destructive",
        })
        return
      }

      onAnalysisSubmit(e)
    },
    [currentReport, mcfParameters, analysisValues, onAnalysisSubmit],
  )

  if (!isOpen || !currentReport) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#F0EAD6] border border-[#DDD7B1] rounded-lg shadow-lg w-full max-w-5xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#DDD7B1]">
          <h2 className="text-xl font-bold text-[#2F3E2E]">Analysis Data - {currentReport.reportCode}</h2>
          <Button
            variant="ghost"
            size="icon"
            className="text-[#8B8378] hover:text-[#2F3E2E] hover:bg-[#C0B89F]"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmitWithValidation}>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="worksheet" className="text-[#2F3E2E]">
                    Upload Worksheet/Excel File
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="worksheet"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleInternalFileUpload(e.target.files[0])
                        }
                      }}
                      disabled={isUploading || isReadOnlyMode || !!uploadedFileUrl || isAnySampleReleased}
                    />
                    {isUploading && (
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#5B8C5A]"></div>
                    )}
                  </div>
                  {uploadedFileUrl && (
                    <div className="flex items-center gap-2 text-sm text-[#5B8C5A]">
                      <FileText className="h-4 w-4" />
                      <span>{uploadedFileName}</span>
                      <a
                        href={uploadedFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#5B8C5A] hover:underline"
                      >
                        <Link className="h-4 w-4" />
                      </a>
                      {!isReadOnlyMode && !isAnySampleReleased && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-500 hover:bg-red-100/20"
                          onClick={handleInternalFileDelete}
                          disabled={isUploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipment-used" className="text-[#2F3E2E]">
                    Equipment Used
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      disabled={isReadOnlyMode || isAnySampleReleased}
                      onValueChange={(value) => {
                        const equipment = equipmentList.find((e) => e.id === value)
                        if (equipment) {
                          setSelectedEquipmentInternal({
                            id: equipment.id,
                            name: equipment.name || "Unknown Equipment",
                            status: equipment.status,
                          })
                        }
                      }}
                      value={selectedEquipmentInternal?.id || ""}
                    >
                      <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] w-64">
                        <SelectValue placeholder="Select equipment" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E] max-h-[300px]">
                        {equipmentList.map((equip) => (
                          <SelectItem key={equip.id} value={equip.id} className="text-[#2F3E2E] hover:bg-[#E0D9C0]">
                            {equip.id} : {equip.name || "Unknown Equipment"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      className="bg-[#5B8C5A] hover:bg-[#4A7049]"
                      disabled={!selectedEquipmentInternal || isReadOnlyMode || isAnySampleReleased}
                      onClick={() => {
                        if (selectedEquipmentInternal && currentReport) {
                          const updatedReport = { ...currentReport }
                          if (!updatedReport.equipment) {
                            updatedReport.equipment = []
                          }
                          if (!updatedReport.equipment.some((e) => e.id === selectedEquipmentInternal.id)) {
                            updatedReport.equipment = [
                              ...updatedReport.equipment,
                              { id: selectedEquipmentInternal.id, name: selectedEquipmentInternal.name },
                            ]
                            setCurrentReport(updatedReport)
                            setSelectedEquipmentInternal(null)
                          }
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>

                  {currentReport.equipment && currentReport.equipment.length > 0 && (
                    <div className="space-y-2 mt-2 border border-[#DDD7B1] rounded-md p-2">
                      {currentReport.equipment.map((equip) => (
                        <div key={equip.id} className="flex items-center gap-2">
                          <Badge className="bg-[#5B8C5A] text-white flex-shrink-0">{equip.name}</Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-500 hover:bg-red-100/20"
                            onClick={() => {
                              if (isReadOnlyMode || isAnySampleReleased) return
                              if (currentReport) {
                                const updatedReport = { ...currentReport }
                                updatedReport.equipment =
                                  updatedReport.equipment?.filter((e) => e.id !== equip.id) || []
                                setCurrentReport(updatedReport)
                              }
                            }}
                            disabled={isReadOnlyMode || isAnySampleReleased}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {currentReport.parameters.includes("pH") && (
                  <div className="space-y-2">
                    <Label htmlFor="ph-method-filter" className="text-[#2F3E2E]">
                      Filter P Method
                    </Label>
                    <Select
                      value={pHMethodFilter}
                      onValueChange={setPHMethodFilter}
                      disabled={isReadOnlyMode || isAnySampleReleased}
                    >
                      <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] w-64">
                        <SelectValue placeholder="Filter by pH method" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
                        <SelectItem value="All" className="text-[#2F3E2E] hover:bg-[#E0D9C0]">
                          All
                        </SelectItem>
                        <SelectItem value="Bray 1" className="text-[#2F3E2E] hover:bg-[#E0D9C0]">
                          Bray 1
                        </SelectItem>
                        <SelectItem value="Olsen" className="text-[#2F3E2E] hover:bg-[#E0D9C0]">
                          Olsen
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {currentReport.reviewerComments !== undefined && currentReport.reviewerComments !== null && (
                <div className="space-y-2">
                  <Label htmlFor="reviewer-comments-display" className="text-[#2F3E2E]">
                    Reviewer Comments
                  </Label>
                  <Textarea
                    id="reviewer-comments-display"
                    value={currentReport.reviewerComments}
                    readOnly
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378] min-h-[200px]"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2">
                Sample Analysis Values
              </h3>
              <div className="overflow-x-auto">
                <Table className="border border-[#DDD7B1]">
                  <TableHeader className="bg-[#E0D9C0]">
                    <TableRow className="hover:bg-[#C0B89F] border-[#DDD7B1]">
                      <TableHead className="text-[#2F3E2E] sticky left-0 bg-[#E0D9C0]">
                        Laboratory Sample Code
                      </TableHead>
                      {currentReport.parameters.map((paramName, index) => {
                        const unitToDisplay = getDefaultUnit(paramName)
                        return (
                          <React.Fragment key={index}>
                            {mcfParameters.includes(paramName) && <TableHead className="text-[#2F3E2E]">MCF</TableHead>}
                            <TableHead className="text-[#2F3E2E]">
                              {paramName} ({unitToDisplay})
                            </TableHead>
                            {paramName === "pH" && <TableHead className="text-[#2F3E2E]">P Method</TableHead>}
                            {paramName === "OM" && <TableHead className="text-[#2F3E2E]">Avail. N (%)</TableHead>}
                          </React.Fragment>
                        )
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...(currentReport.sampleCodes || [])]
                      .sort(naturalSort)
                      .filter((laboratorySampleCode) => {
                        if (pHMethodFilter === "All") return true
                        const pHValue = analysisValues[laboratorySampleCode]?.["pH"]
                        // Only filter if pH value is present and valid
                        if (pHValue === undefined || pHValue === null || pHValue.trim() === "") {
                          return false
                        }
                        const pMethod = Number.parseFloat(pHValue) <= 5.5 ? "Bray 1" : "Olsen"
                        return pMethod === pHMethodFilter
                      })
                      .map((laboratorySampleCode, sampleIndex) => {
                        const sampleObj = samples.find((s) =>
                          s.samples.some((ss) => ss.laboratorySampleCode === laboratorySampleCode),
                        )
                        const individualSample = sampleObj?.samples.find(
                          (ss) => ss.laboratorySampleCode === laboratorySampleCode,
                        )
                        const isReleased = individualSample?.status?.toLowerCase() === "released"

                        return (
                          <TableRow key={sampleIndex} className="hover:bg-[#E0D9C0] border-[#DDD7B1]">
                            <TableCell
                              className={cn(
                                "font-medium text-[#2F3E2E] sticky left-0 bg-[#F0EAD6]",
                                isReleased && "bg-red-100 text-red-800",
                              )}
                            >
                              {laboratorySampleCode}
                              {sampleObj && <div className="text-xs text-[#8B8378] mt-1">{sampleObj.sampleType}</div>}
                            </TableCell>
                            {currentReport.parameters.map((param, paramIndex) => {
                              const pHValue = analysisValues[laboratorySampleCode]?.["pH"]
                              const pMethod =
                                param === "pH" && pHValue !== undefined && pHValue !== null && pHValue.trim() !== ""
                                  ? Number.parseFloat(pHValue) <= 5.5
                                    ? "Bray 1"
                                    : "Olsen"
                                  : ""
                              const currentMcf = mcfValues[laboratorySampleCode]?.[param] || "1.00"
                              const isDefaultMcf = currentMcf === "1.00"

                              return (
                                <React.Fragment key={paramIndex}>
                                  {mcfParameters.includes(param) && (
                                    <TableCell>
                                      <Input
                                        value={currentMcf}
                                        readOnly
                                        onWheel={(e) => e.currentTarget.blur()} // Prevent number input scroll
                                        className={cn(
                                          "bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] h-8 w-1/2 placeholder:text-[#8B8378] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                                          isDefaultMcf && "text-red-400",
                                          isReleased && "bg-red-50 text-red-800 border-red-200",
                                        )}
                                        placeholder="MCF"
                                        type="number"
                                        step="0.01"
                                        disabled={isReadOnlyMode || isReleased}
                                      />
                                    </TableCell>
                                  )}
                                  <TableCell>
                                    <Input
                                      value={analysisValues[laboratorySampleCode]?.[param] || ""}
                                      onChange={(e) => {
                                        const newValues = { ...analysisValues }
                                        if (!newValues[laboratorySampleCode]) {
                                          newValues[laboratorySampleCode] = {}
                                        }
                                        newValues[laboratorySampleCode][param] = e.target.value

                                        // If the current parameter is "OM", also compute and save "Avail. N"
                                        if (param === "OM") {
                                          const omValue = Number.parseFloat(e.target.value || "0")
                                          const availNValue = (omValue * 0.05).toFixed(2)
                                          newValues[laboratorySampleCode]["Avail. N"] = availNValue
                                        }
                                        setAnalysisValues(newValues)
                                      }}
                                      onWheel={(e) => e.currentTarget.blur()} // Prevent number input scroll
                                      className={cn(
                                        "bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] h-8 w-1/2 placeholder:text-[#8B8378] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                                        isReleased && "bg-red-50 text-red-800 border-red-200",
                                      )}
                                      placeholder="Enter value"
                                      type="number"
                                      step="0.01"
                                      disabled={isReadOnlyMode || isReleased}
                                    />
                                  </TableCell>
                                  {param === "pH" && (
                                    <TableCell>
                                      {pMethod && (
                                        <Badge
                                          className={cn(
                                            pMethod === "Bray 1"
                                              ? "bg-[#5B8C5A] text-white"
                                              : "bg-[#8B8378] text-white",
                                            isReleased && "bg-red-600 text-white",
                                          )}
                                        >
                                          {pMethod}
                                        </Badge>
                                      )}
                                    </TableCell>
                                  )}
                                  {param === "OM" && (
                                    <TableCell>
                                      <Input
                                        value={analysisValues[laboratorySampleCode]?.["Avail. N"] || ""}
                                        readOnly
                                        className={cn(
                                          "bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] h-8 w-1/2 placeholder:text-[#8B8378] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                                          isReleased && "bg-red-50 text-red-800 border-red-200",
                                        )}
                                        placeholder="Avail. N"
                                        type="number"
                                        step="0.01"
                                        disabled
                                      />
                                    </TableCell>
                                  )}
                                </React.Fragment>
                              )
                            })}
                          </TableRow>
                        )
                      })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          <div className="flex justify-end p-4 border-t border-[#DDD7B1] gap-4">
            <Button
              className="bg-[#4CAF50] hover:bg-[#3D8B3D] text-white flex items-center gap-2"
              type="submit"
              disabled={isSubmitting || isReadOnlyMode || isAnySampleReleased}
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Submitting...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Submit Analysis Data
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
