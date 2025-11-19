"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { X, AlertCircle, CheckCircle, CheckCheck, Clock } from "lucide-react"
import { doc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Timestamp } from "firebase/firestore"
import { useAuth } from "@/lib/auth-context"

interface AnalysisFormProps {
  sampleId: string
  sample: any
  onClose: () => void
  isReadOnly?: boolean
  initialSelectedLabCode?: string // New prop to highlight a specific lab code
}

export default function AnalysisForm({
  sampleId,
  sample,
  onClose,
  isReadOnly = true,
  initialSelectedLabCode,
}: AnalysisFormProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [results, setResults] = useState<Record<string, Record<string, any>>>({})
  const [isCompleted, setIsCompleted] = useState(false)
  const [analysisStarted, setAnalysisStarted] = useState<Date | null>(null)
  const [analysisCompleted, setAnalysisCompleted] = useState<Date | null>(null)
  const [isFirstSave, setIsFirstSave] = useState(true)
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({}) // Refs for table rows
  const { hasPermission, isAdmin } = useAuth()

  useEffect(() => {
    const fetchSampleResults = async () => {
      try {
        setLoading(true)
        const docRef = doc(db!, "samples", sampleId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          // Check if sample is already completed
          if (data.status === "Completed") {
            setIsCompleted(true)
          }

          // Determine the earliest analysis start date from the 'results' field
          let earliestAnalysisDate: Date | null = null

          if (data.results) {
            Object.values(data.results).forEach((sampleCodeResults: any) => {
              Object.values(sampleCodeResults).forEach((paramResult: any) => {
                const resultAnalysisDate = paramResult.analysisDate
                if (resultAnalysisDate) {
                  let parsedDate: Date | null = null
                  if (typeof resultAnalysisDate.toDate === "function") {
                    // Firebase Timestamp
                    parsedDate = resultAnalysisDate.toDate()
                  } else if (typeof resultAnalysisDate === "string" || resultAnalysisDate instanceof Date) {
                    // ISO string or already a Date object
                    parsedDate = new Date(resultAnalysisDate)
                  }

                  if (
                    parsedDate &&
                    !isNaN(parsedDate.getTime()) &&
                    (!earliestAnalysisDate || parsedDate < earliestAnalysisDate)
                  ) {
                    earliestAnalysisDate = parsedDate
                  }
                }
              })
            })
          }

          setAnalysisStarted(earliestAnalysisDate)
          setIsFirstSave(!earliestAnalysisDate)

          if (data.analysisCompleted && typeof data.analysisCompleted.toDate === "function") {
            setAnalysisCompleted(data.analysisCompleted.toDate())
          }

          // Initialize results structure if it doesn't exist
          if (data.results) {
            setResults(data.results)
          } else {
            // Create empty results structure for each sample code and parameter
            const initialResults: Record<string, Record<string, any>> = {}

            if (sample.samples && Array.isArray(sample.samples)) {
              sample.samples.forEach((sampleItem: any) => {
                const sampleCode = sampleItem.laboratorySampleCode || sampleItem.sampleCode
                initialResults[sampleCode] = {}

                if (sample.parameters && Array.isArray(sample.parameters)) {
                  sample.parameters.forEach((param: string) => {
                    initialResults[sampleCode][param] = {
                      value: "",
                      unit: getDefaultUnit(param),
                      method: getDefaultMethod(param, sample.requestedParameter),
                    }
                  })
                }
              })
            }

            setResults(initialResults)
          }
        }
      } catch (error) {
        console.error("Error fetching sample results:", error)
        setError("Failed to load sample results. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchSampleResults()
  }, [sampleId, sample])

  // Scroll to the initial selected lab code when the component mounts or initialSelectedLabCode changes
  useEffect(() => {
    if (initialSelectedLabCode && rowRefs.current[initialSelectedLabCode]) {
      rowRefs.current[initialSelectedLabCode]?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [initialSelectedLabCode, loading, sample.samples]) // Depend on loading and sample.samples to ensure refs are populated

  const getDefaultUnit = (parameter: string) => {
    switch (parameter) {
      case "pH":
        return "pH units"
      case "Organic Matter":
        return "%"
      case "Phosphorus":
      case "Nitrogen":
      case "Potassium":
        return "mg/kg"
      case "Copper":
      case "Zinc":
      case "Iron":
      case "Manganese":
      case "Boron":
        return "mg/kg"
      default:
        return ""
    }
  }

  const getDefaultMethod = (parameter: string, requestedParameter: string) => {
    // we'll keep the existing logic for now. This component should be refactored to receive parameters as props.
    if (requestedParameter === "physico-chemical") {
      return "Standard Method"
    } else if (requestedParameter === "micro") {
      return "Atomic Absorption"
    } else if (requestedParameter === "special") {
      switch (parameter) {
        case "Heavy Metals":
          return "ICP-MS"
        case "Pesticide Residue":
          return "GC-MS"
        case "Microbial Analysis":
          return "Plate Count"
        case "Texture Analysis":
          return "Hydrometer"
        default:
          return "Various"
      }
    }
    return ""
  }

  const handleResultChange = (sampleCode: string, parameter: string, value: string) => {
    if (isCompleted) return // Prevent changes if completed

    setResults((prevResults) => {
      const updatedResults = { ...prevResults }

      if (!updatedResults[sampleCode]) {
        updatedResults[sampleCode] = {}
      }

      if (!updatedResults[sampleCode][parameter]) {
        updatedResults[sampleCode][parameter] = {}
      }

      updatedResults[sampleCode][parameter] = {
        ...updatedResults[sampleCode][parameter],
        value: value,
      }

      return updatedResults
    })
  }

  const handleSaveResults = async () => {
    try {
      setSaving(true)
      setError("")

      let hasEmptyValues = false
      // Iterate through all expected sample codes from the 'sample' prop
      sample.samples.forEach((sampleItem: any) => {
        const sampleCode = sampleItem.laboratorySampleCode || sampleItem.sampleCode
        // For each sample code, iterate through all expected parameters
        sample.parameters.forEach((param: string) => {
          // Check if the result for this specific sampleCode and parameter exists and has a non-empty value
          if (!results[sampleCode] || !results[sampleCode][param] || results[sampleCode][param].value === "") {
            hasEmptyValues = true
          }
        })
      })

      if (hasEmptyValues) {
        setError("Please fill in all parameter values before saving the analysis.")
        setSaving(false)
        return
      }

      const now = Timestamp.now()
      const newResults = { ...results }

      Object.keys(newResults).forEach((sampleCode) => {
        if (newResults[sampleCode]) {
          Object.keys(newResults[sampleCode]).forEach((param) => {
            const paramResult = newResults[sampleCode][param]
            if (paramResult.value && paramResult.value !== "" && !paramResult.analysisDate) {
              newResults[sampleCode][param] = {
                ...paramResult,
                analysisDate: now,
              }
            }
          })
        }
      })

      const updateData: any = {
        results: newResults,
        status: "Processing",
        updatedAt: now,
      }

      const docRef = doc(db!, "samples", sampleId)
      await updateDoc(docRef, updateData)

      setSuccess(true)

      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (error) {
      console.error("Error saving results:", error)
      setError("Failed to save results. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleCompleteAnalysis = async () => {
    try {
      setCompleting(true)
      setError("")

      let hasEmptyValues = false
      // Iterate through all expected sample codes from the 'sample' prop
      sample.samples.forEach((sampleItem: any) => {
        const sampleCode = sampleItem.laboratorySampleCode || sampleItem.sampleCode
        // For each sample code, iterate through all expected parameters
        sample.parameters.forEach((param: string) => {
          // Check if the result for this specific sampleCode and parameter exists and has a non-empty value
          if (!results[sampleCode] || !results[sampleCode][param] || results[sampleCode][param].value === "") {
            hasEmptyValues = true
          }
        })
      })

      if (hasEmptyValues) {
        setError("Please fill in all parameter values before completing the analysis.")
        setCompleting(false)
        return
      }

      const now = Timestamp.now()

      const docRef = doc(db!, "samples", sampleId)
      await updateDoc(docRef, {
        results: results,
        status: "Completed",
        updatedAt: now,
        analysisCompleted: now,
      })

      setAnalysisCompleted(now.toDate())
      setIsCompleted(true)
      setSuccess(true)

      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (error) {
      console.error("Error completing analysis:", error)
      setError("Failed to complete analysis. Please try again.")
    } finally {
      setCompleting(false)
    }
  }

  // Helper function to format dates with time
  const formatDateWithTime = (date: Date | undefined | null) => {
    if (!date) return "N/A"
    return format(date, "MMM dd, yyyy, h:mm a")
  }

  // Helper function to format dates without time
  const formatDateOnly = (date: Date | undefined | null) => {
    if (!date) return "N/A"
    return format(date, "MMM dd, yyyy")
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-emerald-800 border border-emerald-700 rounded-lg shadow-lg w-full max-w-5xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-emerald-700">
          <h2 className="text-xl font-bold text-white">
            Sample Analysis
            {isCompleted && <Badge className="ml-2 bg-green-500/20 text-green-300">Completed</Badge>}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-300 hover:text-white hover:bg-emerald-700"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-white p-3 rounded-md flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 border border-green-500 text-white p-3 rounded-md flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              {isCompleted ? "Analysis completed successfully!" : "Results saved successfully!"}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            </div>
          ) : (
            <>
              {/* Sample Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white border-b border-emerald-700 pb-2">Sample Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Sample Type</p>
                    <p className="text-white font-medium">{sample.sampleType}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Date Received</p>
                    <p className="text-white">
                      {/* Use formatDateOnly for Date Received */}
                      {formatDateOnly(
                        sample.dateReceived instanceof Timestamp ? sample.dateReceived.toDate() : sample.dateReceived,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Deadline</p>
                    <p className="text-white">
                      {/* Use formatDateOnly for Deadline */}
                      {formatDateOnly(
                        sample.deadline instanceof Timestamp ? sample.deadline.toDate() : sample.deadline,
                      )}
                    </p>
                  </div>
                </div>

                {/* Analysis Timestamps */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 bg-emerald-700/20 p-3 rounded-md">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-400" />
                    <div>
                      <p className="text-gray-400 text-sm">Analysis Started</p>
                      <p className="text-white">{formatDateWithTime(analysisStarted)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <div>
                      <p className="text-gray-400 text-sm">Analysis Completed</p>
                      <p className="text-white">{formatDateWithTime(analysisCompleted)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-2">
                  <p className="text-gray-400 text-sm">Requested Parameters</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {sample.parameters &&
                      sample.parameters.map((param: string) => (
                        <Badge key={param} className="bg-emerald-700/50 text-emerald-100">
                          {param}
                        </Badge>
                      ))}
                  </div>
                </div>
              </div>

              {/* Analysis Results */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white border-b border-emerald-700 pb-2">Analysis Results</h3>

                <div className="overflow-x-auto">
                  <Table className="border border-emerald-700">
                    <TableHeader className="bg-emerald-700/50">
                      <TableRow className="hover:bg-emerald-700/70 border-emerald-600">
                        <TableHead className="text-white sticky left-0 bg-emerald-700/50">
                          Laboratory Sample Code
                        </TableHead>
                        {sample.parameters.map((param: string, index: number) => (
                          <TableHead key={index} className="text-white">
                            {param}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sample.samples.map(
                        (
                          sampleItem: { laboratorySampleCode: string; sampleCode?: string; description?: string },
                          sampleIndex: number,
                        ) => {
                          const sampleCode = sampleItem.laboratorySampleCode || sampleItem.sampleCode
                          const hasResults = results && results[sampleCode]

                          return (
                            <TableRow
                              key={sampleCode} // Use sampleCode as key for ref
                              ref={(el) => (rowRefs.current[sampleCode] = el)} // Assign ref
                              className={`hover:bg-emerald-700/30 border-emerald-600 ${
                                initialSelectedLabCode === sampleCode ? "bg-emerald-700/50 ring-2 ring-emerald-400" : ""
                              }`}
                            >
                              <TableCell className="font-medium text-white sticky left-0 bg-emerald-800">
                                {sampleCode}
                                <div className="text-xs text-gray-400 mt-1">{sampleItem.description}</div>
                              </TableCell>
                              {sample.parameters.map((param: string, paramIndex: number) => {
                                const resultData = hasResults && results[sampleCode][param]

                                return (
                                  <TableCell key={paramIndex} className="p-2">
                                    {isReadOnly ? (
                                      <div className="bg-emerald-700/30 border border-emerald-600 rounded p-2 text-white">
                                        {resultData?.value ? (
                                          <div>
                                            <div className="font-medium">{resultData.value}</div>
                                            <div className="text-xs text-gray-300 mt-1">
                                              {resultData.unit && <span>{resultData.unit} • </span>}
                                              {resultData.method && <span>{resultData.method}</span>}
                                            </div>
                                          </div>
                                        ) : (
                                          <span className="text-gray-400">-</span>
                                        )}
                                      </div>
                                    ) : (
                                      <Input
                                        value={
                                          hasResults && results[sampleCode][param]?.value
                                            ? results[sampleCode][param].value
                                            : ""
                                        }
                                        onChange={(e) => handleResultChange(sampleCode, param, e.target.value)}
                                        className="bg-emerald-700 border-emerald-600 text-white h-8 w-full"
                                        placeholder="Enter value"
                                      />
                                    )}
                                  </TableCell>
                                )
                              })}
                            </TableRow>
                          )
                        },
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end p-4 border-t border-emerald-700 gap-4">
          <Button className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={onClose}>
            Cancel
          </Button>

          {!isCompleted && (
            <>
              <Button
                className={`bg-green-600 hover:bg-green-500 text-white flex items-center gap-2 ${
                  !isAdmin && !hasPermission("JOLA-verifier") ? "opacity-70 cursor-not-allowed" : ""
                }`}
                onClick={handleCompleteAnalysis}
                disabled={saving || loading || completing || (!isAdmin && !hasPermission("JOLA-verifier"))}
              >
                {completing ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCheck className="h-4 w-4" />
                    Complete Analysis
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
