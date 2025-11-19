"use client"

import React, { useState, useEffect, useMemo } from "react" // Add React import here
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { X, Check, Ban } from "lucide-react"
import { naturalSort } from "@/components/ui/table"
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
  reviewerComments?: string // New field for reviewer comments
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
  }>
  deadline?: Date
  results?: Record<string, Record<string, any>>
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

interface WorksheetViewEditVerifierProps {
  isOpen: boolean
  onClose: () => void
  currentReport: LabReport | null
  samples: Sample[]
  parameters: Parameter[]
  analysisValues: Record<string, Record<string, string>>
  isSubmitting: boolean
  isCurrentReportLocked: boolean
  onApprove: (reportId: string, comments: string) => Promise<void>
  onReject: (reportId: string, comments: string) => Promise<void>
}

export default function WorksheetViewEditVerifier({
  isOpen,
  onClose,
  currentReport,
  samples,
  parameters,
  analysisValues,
  isSubmitting,
  isCurrentReportLocked,
  onApprove,
  onReject,
}: WorksheetViewEditVerifierProps) {
  const [reviewerComments, setReviewerComments] = useState<string>(currentReport?.reviewerComments || "")
  const [mcfValues, setMcfValues] = useState<Record<string, Record<string, string>>>({})

  // Parameters that use MCF
  const mcfParameters = useMemo(() => ["Avail. P", "OM", "K"], [])

  useEffect(() => {
    setReviewerComments(currentReport?.reviewerComments || "")
  }, [currentReport?.reviewerComments])

  useEffect(() => {
    if (currentReport && samples.length > 0) {
      const initialMcf: Record<string, Record<string, string>> = {}
      currentReport.sampleCodes.forEach((laboratorySampleCode) => {
        initialMcf[laboratorySampleCode] = {}
        const sampleData = samples.find((s) => s.samples.some((ss) => ss.laboratorySampleCode === laboratorySampleCode))

        if (sampleData && sampleData.results && sampleData.results[laboratorySampleCode]) {
          // Access the MCF value from the specific laboratorySampleCode's results.MCF.value
          const mcfValueForSample = sampleData.results[laboratorySampleCode].MCF?.value

          mcfParameters.forEach((param) => {
            // Assign this single MCF value to all relevant parameters for this sample
            initialMcf[laboratorySampleCode][param] = mcfValueForSample || "1.00"
          })
        } else {
          // If no sampleData or results found, default to "1.00" for all MCF parameters
          mcfParameters.forEach((param) => {
            initialMcf[laboratorySampleCode][param] = "1.00"
          })
        }
      })
      setMcfValues(initialMcf)
    }
  }, [currentReport, mcfParameters, samples])

  if (!isOpen || !currentReport) return null

  // Helper functions to get default units and methods
  const getDefaultUnit = (parameter: string): string => {
    switch (parameter) {
      case "pH":
        return "pH units"
      case "Turbidity":
        return "NTU"
      case "Color":
        return "TCU"
      default:
        return "mg/L"
    }
  }

  const getDefaultMethod = (parameter: string, requestedParameter: string): string => {
    switch (parameter) {
      case "pH":
        return "Electrometric Method"
      case "Turbidity":
        return "Nephelometric Method"
      case "Color":
        return "Spectrophotometric Method"
      default:
        return requestedParameter
    }
  }

  const getParameterAdequateValue = (parameterName: string): string => {
    const param = parameters.find((p) => p.name === parameterName)
    return param?.adequateValue || ""
  }

  const handleApprove = async () => {
    if (currentReport) {
      await onApprove(currentReport.id, reviewerComments)
    }
  }

  const handleReject = async () => {
    if (currentReport) {
      await onReject(currentReport.id, reviewerComments)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#F0EAD6] border border-[#DDD7B1] rounded-lg shadow-lg w-full max-w-5xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#DDD7B1]">
          <h2 className="text-xl font-bold text-[#2F3E2E]">Review Analysis Data - {currentReport.reportCode}</h2>
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
          {/* Display Incident Report if available */}
          {currentReport.incidentReport && (
            <div className="space-y-2">
              <Label htmlFor="incident-report-display" className="text-[#2F3E2E]">
                Incident Report (from Analyst)
              </Label>
              <Textarea
                id="incident-report-display"
                value={currentReport.incidentReport}
                readOnly
                className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
              />
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2">
              Sample Analysis Values
            </h3>
            <div className="overflow-x-auto">
              <Table className="border border-[#DDD7B1]">
                <TableHeader className="bg-[#E0D9C0]">
                  <TableRow className="hover:bg-[#C0B89F] border-[#DDD7B1]">
                    <TableHead className="text-[#2F3E2E] sticky left-0 bg-[#E0D9C0]">Laboratory Sample Code</TableHead>
                    {currentReport.parameters.map((paramName, index) => {
                      const foundParam = parameters.find((p) => p.name === paramName)
                      const unitToDisplay = foundParam?.unit || getDefaultUnit(paramName)
                      const methodToDisplay = foundParam?.method || getDefaultMethod(paramName, "")
                      const adequateValue = getParameterAdequateValue(paramName)
                      return (
                        <React.Fragment key={index}>
                          {mcfParameters.includes(paramName) && <TableHead className="text-[#2F3E2E]">MCF</TableHead>}
                          <TableHead className="text-[#2F3E2E]">
                            {paramName} ({unitToDisplay})
                            {adequateValue && <div className="text-xs text-[#8B8378]">Adequate: {adequateValue}</div>}
                          </TableHead>
                          {paramName === "pH" && <TableHead className="text-[#2F3E2E]">P Method</TableHead>}
                          {paramName === "OM" && (
                            <TableHead key={`avail-n-${index}`} className="text-[#2F3E2E]">
                              Avail. N (mg/L)
                            </TableHead>
                          )}
                          {paramName !== "pH" && paramName !== "OM" && methodToDisplay && (
                            <TableHead key={`method-${index}`} className="text-[#2F3E2E]">
                              {methodToDisplay}
                            </TableHead>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...currentReport.sampleCodes].sort(naturalSort).map((laboratorySampleCode, sampleIndex) => {
                    const sampleObj = samples.find((s) =>
                      s.samples.some((ss) => ss.laboratorySampleCode === laboratorySampleCode),
                    )

                    return (
                      <TableRow key={sampleIndex} className="hover:bg-[#E0D9C0] border-[#DDD7B1]">
                        <TableCell className="font-medium text-[#2F3E2E] sticky left-0 bg-[#F0EAD6]">
                          {laboratorySampleCode}
                          {sampleObj && <div className="text-xs text-[#8B8378] mt-1">{sampleObj.sampleType}</div>}
                        </TableCell>
                        {currentReport.parameters.map((param, paramIndex) => {
                          const currentMcf = mcfValues[laboratorySampleCode]?.[param] || "1.00"
                          const isDefaultMcf = currentMcf === "1.00"
                          const pHValue = Number.parseFloat(analysisValues[laboratorySampleCode]?.pH || "0")
                          const pMethod = pHValue <= 6.5 ? "Bray 1" : "Olsen"
                          const foundParam = parameters.find((p) => p.name === param)
                          const methodToDisplay = foundParam?.method || getDefaultMethod(param, "")

                          return (
                            <React.Fragment key={paramIndex}>
                              {mcfParameters.includes(param) && (
                                <TableCell>
                                  <Input
                                    value={currentMcf}
                                    readOnly // Make MCF input read-only
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className={cn(
                                      "bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] h-8 w-1/2 placeholder:text-[#8B8378] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                                      isDefaultMcf && "text-red-400", // Apply light red color
                                    )}
                                    placeholder="MCF"
                                    type="number"
                                    step="0.01"
                                  />
                                </TableCell>
                              )}
                              <TableCell>
                                <Input
                                  value={analysisValues[laboratorySampleCode]?.[param] || ""}
                                  readOnly // Always read-only in verifier modal
                                  className={cn(
                                    "bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] h-8 placeholder:text-[#8B8378]",
                                    param === "pH" ? "w-1/4" : "w-full", // Reduce pH input length
                                  )}
                                  placeholder="Enter value"
                                  type="number"
                                  step="0.01"
                                />
                              </TableCell>
                              {param === "pH" && (
                                <TableCell>
                                  <div className="text-sm text-[#2F3E2E]">{pMethod}</div>
                                </TableCell>
                              )}
                              {param === "OM" && (
                                <TableCell key={`avail-n-value-${paramIndex}`}>
                                  <Input
                                    value={(
                                      Number.parseFloat(analysisValues[laboratorySampleCode]?.OM || "0") * 0.05
                                    ).toFixed(2)}
                                    readOnly
                                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] h-8 w-full placeholder:text-[#8B8378]"
                                    type="number"
                                    step="0.01"
                                  />
                                </TableCell>
                              )}
                              {param !== "pH" && param !== "OM" && methodToDisplay && (
                                <TableCell key={`method-value-${paramIndex}`}>
                                  <div className="text-sm text-[#2F3E2E]">{methodToDisplay}</div>
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

          <div className="space-y-2">
            <Label htmlFor="reviewer-comments" className="text-[#2F3E2E]">
              Reviewer Comments
            </Label>
            <Textarea
              id="reviewer-comments"
              value={reviewerComments}
              onChange={(e) => setReviewerComments(e.target.value)}
              placeholder="Add comments for the analyst..."
              className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378] min-h-[100px]"
              disabled={isSubmitting || isCurrentReportLocked}
            />
          </div>
        </div>
        <div className="flex justify-end p-4 border-t border-[#DDD7B1] gap-4">
          <Button
            className="bg-[#5B8C5A] hover:bg-[#4A7049] text-white flex items-center gap-2"
            onClick={handleApprove}
            disabled={isSubmitting || isCurrentReportLocked}
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Approving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Approve Report
              </>
            )}
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
            onClick={handleReject}
            disabled={isSubmitting || isCurrentReportLocked}
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Rejecting...
              </>
            ) : (
              <>
                <Ban className="h-4 w-4" />
                Reject Report
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
