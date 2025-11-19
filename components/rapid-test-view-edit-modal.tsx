"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Save } from "lucide-react"
import { toast } from "sonner"
import { doc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface RapidTestViewEditModalProps {
  isOpen: boolean
  onClose: () => void
  testData: {
    id: string
    laboratoryCode: string
    sampleType: string
    performedDate: Date
    performedBy: string
    status: string
    lsrfNo?: string
  }
  onSave?: () => void
}

export default function RapidTestViewEditModal({ isOpen, onClose, testData, onSave }: RapidTestViewEditModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [parameters, setParameters] = useState({
    pH: "",
    "Avail. N": "",
    "Avail. P": "",
    K: "",
  })

  useEffect(() => {
    // Reset form when modal opens
    if (isOpen) {
      setIsEditing(false)
      loadExistingParameters()
    }
  }, [isOpen, testData])

  const loadExistingParameters = async () => {
    try {
      if (!testData.laboratoryCode || !testData.id) {
        console.log("[v0] No laboratory code or test ID available, skipping parameter load")
        return
      }

      const sampleDocId = testData.id.split("-").slice(0, -1).join("-")
      console.log("[v0] Loading parameters for sample:", sampleDocId, "lab code:", testData.laboratoryCode)

      const sampleDoc = await getDoc(doc(db!, "samples", sampleDocId))

      if (sampleDoc.exists()) {
        const sampleData = sampleDoc.data()

        // Load parameters from the nested results structure
        if (sampleData.results && sampleData.results[testData.laboratoryCode]) {
          const labResults = sampleData.results[testData.laboratoryCode]
          setParameters({
            pH: labResults.pH?.value || "",
            "Avail. N": labResults["Avail. N"]?.value || "",
            "Avail. P": labResults["Avail. P"]?.value || "",
            K: labResults.K?.value || "",
          })
        }
      } else {
        console.log("[v0] Sample document not found:", sampleDocId)
      }
    } catch (error) {
      console.error("[v0] Error loading parameters:", error)
    }
  }

  const handleParameterChange = (param: string, value: string) => {
    setParameters((prev) => ({
      ...prev,
      [param]: value,
    }))
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)

      if (!testData.laboratoryCode || !testData.id) {
        toast.error("Laboratory code and test ID are required to save parameters")
        return
      }

      const sampleDocId = testData.id.split("-").slice(0, -1).join("-")
      console.log("[v0] Saving parameters to sample:", sampleDocId, "lab code:", testData.laboratoryCode)

      const sampleDoc = await getDoc(doc(db!, "samples", sampleDocId))

      if (!sampleDoc.exists()) {
        toast.error("Sample not found")
        return
      }

      const sampleData = sampleDoc.data()

      // Build the results structure following the worksheet pattern
      const existingResults = sampleData.results || {}
      const currentDate = new Date().toISOString()

      // Initialize the lab code results if not exists
      if (!existingResults[testData.laboratoryCode]) {
        existingResults[testData.laboratoryCode] = {}
      }

      const parameterNames = ["pH", "Avail. N", "Avail. P", "K"]
      parameterNames.forEach((paramName) => {
        const paramData: any = {
          value: parameters[paramName],
          analysisDate: currentDate,
          reportCode: testData.laboratoryCode,
        }

        if (paramName === "pH") {
          paramData.unit = "pH"
        }

        existingResults[testData.laboratoryCode][paramName] = paramData
      })

      // Update the sample document with the new results
      await updateDoc(doc(db!, "samples", sampleDocId), {
        results: existingResults,
        updatedAt: currentDate,
      })

      toast.success("Parameters saved successfully!")
      setIsEditing(false)
      onSave?.()
    } catch (error) {
      console.error("[v0] Error saving parameters:", error)
      toast.error("Failed to save parameters")
    } finally {
      setIsSaving(false)
    }
  }

  const getDefaultUnit = (parameterName: string): string => {
    const unitMap: Record<string, string> = {
      pH: "pH",
      "Avail. N": "%",
      "Avail. P": "mg/kg",
      K: "mg/kg",
    }
    return unitMap[parameterName] || "mg/L"
  }

  const getDefaultMethod = (parameterName: string): string => {
    const methodMap: Record<string, string> = {
      pH: "pH 1:1",
      "Avail. N": "Computed from OM",
      "Avail. P": "Bray 1",
      K: "Flame Photometry",
    }
    return methodMap[parameterName] || ""
  }

  const getParameterAdequateValue = (parameterName: string): string => {
    const adequateValueMap: Record<string, string> = {
      pH: "5.5-8.5",
      "Avail. N": ">0.1",
      "Avail. P": ">5",
      K: ">40",
    }
    return adequateValueMap[parameterName] || ""
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#F0EAD6] border border-[#DDD7B1] rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#DDD7B1] flex-shrink-0">
          <h2 className="text-lg font-bold text-[#2F3E2E]">Rapid Test Details</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* View-only fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#2F3E2E] border-b border-[#DDD7B1] pb-2">Sample Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#2F3E2E]">Laboratory Code</Label>
                <Input
                  value={testData.laboratoryCode}
                  readOnly
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#2F3E2E]">Status</Label>
                <Input value={testData.status} readOnly className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]" />
              </div>
            </div>
          </div>

          {/* Editable parameters */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#2F3E2E] border-b border-[#DDD7B1] pb-2 flex-1">
                Test Parameters
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="ml-2 text-[#5B8C5A] border-[#5B8C5A] hover:bg-[#5B8C5A] hover:text-white"
              >
                {isEditing ? "Cancel" : "Edit"}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(parameters).map(([param, value]) => (
                <div key={param} className="space-y-2">
                  <Label className="text-[#2F3E2E]">{param}</Label>
                  <Input
                    value={value}
                    onChange={(e) => handleParameterChange(param, e.target.value)}
                    readOnly={!isEditing}
                    placeholder={`Enter ${param} value`}
                    className={`${
                      isEditing
                        ? "bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                        : "bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions - sticky footer */}
        <div className="flex justify-end gap-4 p-4 border-t border-[#DDD7B1] flex-shrink-0 bg-[#F0EAD6]">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="bg-[#8B8378] hover:bg-[#7A7060] text-white border-[#8B8378]"
          >
            Close
          </Button>
          {isEditing && (
            <Button onClick={handleSave} disabled={isSaving} className="bg-[#5B8C5A] hover:bg-[#4A7049] text-white">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
