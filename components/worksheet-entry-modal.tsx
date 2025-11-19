"use client"

import type React from "react"
// Removed useEffect import
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X } from 'lucide-react'
import { format } from "date-fns"

// Lab Report interface (renamed from Equipment for clarity)
interface LabReport {
  id: string
  reportCode: string
  parameterCategory: string[] // This will effectively hold only one item now
  parameters: string[]
  dateStarted: Date | null
  dateFinished: Date | null
  sampleCodes: string[]
  equipment?: Array<{ id: string; name: string; minutes: number }>
  chemicals?: Array<{ id: string; name: string; amount: string }>
  incidentReport?: string
  status: string
  createdAt: Date
  createdBy: string // Added createdBy field
}

// Sample interface for type safety (needed for sample code selection)
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
  unit?: string // Add unit property
}

interface WorksheetEntryModalProps {
  isOpen: boolean
  onClose: () => void
  selectedWorksheet: LabReport | null
  newLabReport: Omit<LabReport, "id" | "createdAt">
  setNewLabReport: React.Dispatch<React.SetStateAction<Omit<LabReport, "id" | "createdAt">>>
  parameters: Parameter[]
  sampleTypes: string[]
  availableSamples: { sampleCode: string; sampleType: string }[]
  analyzedSamples: string[]
  onSubmit: (e: React.FormEvent) => void
  isSubmitting: boolean
  setSelectedParameter: React.Dispatch<React.SetStateAction<string>>
  samples: Sample[] // Added samples prop
  userName: string // Added userName prop
}

export default function WorksheetEntryModal({
  isOpen,
  onClose,
  selectedWorksheet,
  newLabReport,
  setNewLabReport,
  parameters,
  sampleTypes,
  availableSamples,
  analyzedSamples,
  onSubmit,
  isSubmitting,
  setSelectedParameter,
  samples,
  userName, // Destructure userName
}: WorksheetEntryModalProps) {
  if (!isOpen) return null

  // Removed useEffect block that was causing potential issues.
  // The createdBy field is now solely managed by the parent component (WorksheetPage).

  const handleParameterCategoryChange = (value: string) => {
    setNewLabReport((prev) => ({
      ...prev,
      parameterCategory: value ? [value] : [],
      parameters: [], // Clear parameters when category changes
      sampleCodes: [], // Deselect all sample codes
    }))
    setSelectedParameter("") // Deselect parameter
  }

  const handleParameterChange = (value: string) => {
    setNewLabReport((prev) => ({
      ...prev,
      parameters: value ? [value] : [],
      sampleCodes: [], // Deselect all sample codes
    }))
    setSelectedParameter(value)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#F0EAD6] border border-[#DDD7B1] rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[#DDD7B1]">
          <h2 className="text-xl font-bold text-[#2F3E2E]">
            {selectedWorksheet ? "Edit Worksheet" : "New Worksheet Entry"}
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
        <form onSubmit={onSubmit}>
          <div className="grid gap-4 py-4 px-6 max-h-[calc(90vh-180px)] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="report-code" className="text-[#2F3E2E]">
                  Worksheet Code
                </Label>
                <Input
                  id="report-code"
                  placeholder="pH-25-001"
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                  value={newLabReport.reportCode}
                  onChange={(e) => setNewLabReport({ ...newLabReport, reportCode: e.target.value })}
                  required
                  disabled={!!selectedWorksheet} // Disable if editing
                />
                <p className="text-xs text-[#8B8378]">Format: Parameter-Year-Number (e.g., pH-25-001)</p>
              </div>
              <div className="space-y-2">
                <Label className="text-[#2F3E2E]">Parameter Category</Label>
                <Select
                  value={newLabReport.parameterCategory[0] || ""}
                  onValueChange={handleParameterCategoryChange}
                >
                  <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
                    <SelectItem value="macro" className="focus:bg-[#E0D9C0] focus:text-[#2F3E2E]">
                      Macro
                    </SelectItem>
                    <SelectItem value="micro" className="focus:bg-[#E0D9C0] focus:text-[#2F3E2E]">
                      Micro
                    </SelectItem>
                    <SelectItem value="special" className="focus:bg-[#E0D9C0] focus:text-[#2F3E2E]">
                      Special
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parameter" className="text-[#2F3E2E]">
                Parameter
              </Label>
              <Select
                value={newLabReport.parameters[0] || ""}
                onValueChange={handleParameterChange}
                disabled={newLabReport.parameterCategory.length === 0}
              >
                <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                  <SelectValue placeholder="Select parameter" />
                </SelectTrigger>
                <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
                  {parameters
                    .filter((param) => newLabReport.parameterCategory.includes(param.category.toLowerCase()))
                    .map((param) => (
                      <SelectItem key={param.id} value={param.name} className="focus:bg-[#E0D9C0] focus:text-[#2F3E2E]">
                        {param.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date-start" className="text-[#2F3E2E]">
                  Date Analysis Started
                </Label>
                <Input
                  id="date-start"
                  type="date"
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                  value={newLabReport.dateStarted ? format(newLabReport.dateStarted, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    const value = e.target.value
                    setNewLabReport({
                      ...newLabReport,
                      dateStarted: value ? new Date(value) : null,
                    })
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="incident-report" className="text-[#2F3E2E]">
                Incident Report (if any)
              </Label>
              <Textarea
                id="incident-report"
                placeholder="Describe any incidents that occurred during analysis..."
                className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378] min-h-[80px]"
                value={newLabReport.incidentReport || ""}
                onChange={(e) => setNewLabReport({ ...newLabReport, incidentReport: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-[#2F3E2E]">Sample Codes</Label>
                <Badge variant="outline" className="bg-[#E0D9C0] text-[#2F3E2E]">
                  {newLabReport.sampleCodes.length} Selected
                </Badge>
              </div>
              <div className="bg-[#E0D9C0] border border-[#C0B89F] rounded-md p-3 max-h-[200px] overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                  {newLabReport.parameters.length === 1 ? (
                    availableSamples
                      .filter((sample) => {
                        const originalSample = samples.find((s) =>
                          s.samples.some(
                            (ss) => ss.laboratorySampleCode === sample.sampleCode || ss.sampleCode === sample.sampleCode,
                          ),
                        )

                        if (!originalSample) return false

                        const hasRequestedParameter = originalSample.parameters.includes(newLabReport.parameters[0])

                        const isBeingAnalyzed = analyzedSamples.includes(sample.sampleCode)
                        const isCompleted = originalSample.status === "Completed"
                        const hasResults =
                          originalSample.results?.[sample.sampleCode] &&
                          originalSample.results?.[sample.sampleCode]?.[newLabReport.parameters[0]]

                        return hasRequestedParameter && !isBeingAnalyzed && !isCompleted && !hasResults
                      })
                      .map((sample) => {
                        const isSelected = newLabReport.sampleCodes.includes(sample.sampleCode)

                        return (
                          <div key={sample.sampleCode} className="flex items-center space-x-2">
                            <Checkbox
                              id={`sample-${sample.sampleCode}`}
                              className="border-[#C0B89F] data-[state=checked]:bg-[#5B8C5A]"
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setNewLabReport({
                                    ...newLabReport,
                                    sampleCodes: [...newLabReport.sampleCodes, sample.sampleCode],
                                  })
                                } else {
                                  setNewLabReport({
                                    ...newLabReport,
                                    sampleCodes: newLabReport.sampleCodes.filter((code) => code !== sample.sampleCode),
                                  })
                                }
                              }}
                            />
                            <Label htmlFor={`sample-${sample.sampleCode}`} className="text-[#2F3E2E]">
                              {sample.sampleCode} ({sample.sampleType})
                            </Label>
                          </div>
                        )
                      })
                  ) : (
                    <div className="text-[#8B8378] text-center py-2">
                      Please select a parameter first to see available samples
                    </div>
                  )}
                  {newLabReport.parameters.length === 1 &&
                    availableSamples.filter((sample) => {
                      const originalSample = samples.find((s) =>
                        s.samples.some(
                          (ss) => ss.laboratorySampleCode === sample.sampleCode || ss.sampleCode === sample.sampleCode,
                        ),
                      )

                      if (!originalSample) return false

                      const hasRequestedParameter = originalSample.parameters.includes(newLabReport.parameters[0])

                      const isBeingAnalyzed = analyzedSamples.includes(sample.sampleCode)
                      const isCompleted = originalSample.status === "Completed"
                      const hasResults =
                        originalSample.results?.[sample.sampleCode] &&
                        originalSample.results?.[sample.sampleCode]?.[newLabReport.parameters[0]]

                      return hasRequestedParameter && !isBeingAnalyzed && !isCompleted && !hasResults
                    }).length === 0 && (
                      <div className="text-[#8B8378] text-center py-2">
                        No samples available for the selected parameter
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 border-t border-[#DDD7B1]">
            <Button
              type="button"
              variant="outline"
              className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] hover:bg-[#C0B89F]"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-[#5B8C5A] hover:bg-[#4A7049] text-white" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Worksheet"}
            </Button>
          </DialogFooter>
        </form>
      </div>
    </div>
  )
}
