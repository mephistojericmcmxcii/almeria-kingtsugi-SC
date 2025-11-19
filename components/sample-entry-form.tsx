"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Calendar, CreditCard } from 'lucide-react'
import { collection, getDocs, query, where, doc, updateDoc, setDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { addDays, format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
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
import { Checkbox } from "@/components/ui/checkbox"
import AddressPicker from "@/components/address-picker"
import { saveCustomer, type Customer } from "@/lib/customer-service" // Import Customer type
import { cn } from "@/lib/utils"
import {
  getFarmerProfile,
  type SamplingDataDocument,
  type FarmerDetailInFirestore,
  type FarmerProfileDocument,
  type IndividualSampleData, // Import IndividualSampleData
} from "@/lib/firestore" // Import necessary types and functions
import CustomerAutosuggestion from "@/components/customer-autosuggestion" // Import the new component

// Extend the Customer interface to include the new fields, matching CustomerAutosuggestion.tsx
interface ExtendedCustomer extends Customer {
  customerCity?: string
  customerCountry?: string
  customerManualBarangay?: string
  customerPostalCode?: string
  customerProvince?: string
  customerRegion?: string
}

// Props interface for the component
interface SampleEntryFormProps {
  onClose: () => void
  initialData?: any // For editing existing samples
}

interface ClientDiscount {
  id: string
  clientType: string
  discountValue: number
  description: string
}

interface Parameter {
  id: string
  name: string
  price: string
  category: string
}

// New interface for a farmer's sampling summary to display in the modal
interface FarmerSamplingSummary {
  samplingRecordId: string
  farmerIndex: number
  farmerName: string
  numberOfSamples: number
  collectedBy: string // From the parent samplingData document
  location: string // From the parent samplingData document
  farmerDetails: FarmerDetailInFirestore // Full farmer details from samplingData
  farmerProfile: FarmerProfileDocument | null // Fetched farmer profile
}

// New interface for a request sampling summary to display in the modal
interface RequestSamplingSummary {
  samplingDataId: string
  contactPerson: string
  location: string
  numberOfSamples: number
  samplingData: SamplingDataDocument // Full samplingData document
}

export default function SampleEntryForm({ onClose, initialData }: SampleEntryFormProps) {
  // Calculate default deadline (2 weeks from today or from received date if editing)
  const getDefaultDeadline = () => {
    if (initialData?.dueDate) {
      return format(new Date(initialData.dueDate), "yyyy-MM-dd")
    }
    if (initialData?.dateReceived) {
      return format(addDays(new Date(initialData.dateReceived), 14), "yyyy-MM-dd") // Changed to 14 days (2 weeks)
    }
    return format(addDays(new Date(), 14), "yyyy-MM-dd") // Changed to 14 days (2 weeks)
  }

  // Initialize samples array based on initialData or as an empty array
  const initialSamples = initialData?.samples || []
  // Changed default for numberOfSamples from 1 to 0
  const initialNumberOfSamples = initialSamples.length > 0 ? initialSamples.length : 0

  const [formData, setFormData] = useState({
    // Document Reference Information
    lsrfNo: initialData?.lsrfNo || "", // Manual input
    dateReceived: initialData?.dateReceived
      ? initialData.dateReceived instanceof Date
        ? initialData.dateReceived.toISOString().split("T")[0]
        : new Date(initialData.dateReceived).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    dueDate: getDefaultDeadline(), // Renamed from 'deadline'

    // New field for entry type
    entryType: initialData?.entryType || "general", // "general", "farmer", or "request"

    // Customer Information
    customerName: initialData?.customerName || "",
    customerPhone: initialData?.customerPhone || "",
    customerEmail: initialData?.customerEmail || "",
    customerBirthday: initialData?.customerBirthday || "",
    customerOrganization: initialData?.customerOrganization || "",
    // FIX: Ensure isRSBSA is always "Yes" or "No" string based on boolean from initialData
    // Now, initialData.isRSBSA should be boolean from updated Customer interface
    isRSBSA: initialData?.isRSBSA === true ? "Yes" : initialData?.isRSBSA === false ? "No" : "No", // Default to "No"
    rsbsaIdNo: initialData?.rsbsaIdNo || "",
    clientType: initialData?.clientType || "",
    customerRegion: initialData?.customerRegion || null,
    customerProvince: initialData?.customerProvince || null,
    customerCity: initialData?.customerCity || null,
    customerManualBarangay: initialData?.customerManualBarangay || null,
    customerPostalCode: initialData?.customerPostalCode || null,
    customerCountry: initialData?.customerCountry || "Philippines",

    // Sample Information
    tags: initialData?.tags || "", // New field for tags
    sampleType: initialData?.sampleType || "soil", // Changed default to "soil"
    serviceType: initialData?.serviceType || "testing", // Added serviceType, default to "testing"
    requestedParameter: initialData?.requestedParameter || "",
    parameters: initialData?.parameters || [],
    numberOfSamples: initialNumberOfSamples,
    // laboratorySampleCode will be unique for each sample, and auto-generated
    samples: initialSamples.map((s: any) => ({
      laboratorySampleCode: s.laboratorySampleCode || "", // This will be S-YY-XXXX, S-YY-YYYY, etc.
      sampleID: s.sampleID || "",
      samplingSite: s.samplingSite || "",
    })),
    notes: initialData?.notes || "",

    // Conditional fields for sample types
    soilType: initialData?.soilType || "",
    soilDepth: initialData?.soilDepth || "",
    plantType: initialData?.plantType || "",
    plantPart: initialData?.plantPart || "",
    plantAge: initialData?.plantAge || "",
    fertilizerType: initialData?.fertilizerType || "",
    fertilizerBrand: initialData?.fertilizerBrand || "",
    fertilizerComposition: initialData?.fertilizerComposition || "",
    otherDescription: initialData?.otherDescription || "",

    // Payment Information
    amountDue: initialData?.amountDue || 0,
    discountApplied: initialData?.discountApplied || 0,
    paymentStatus: initialData?.paymentStatus || "Unpaid",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [macroParameters, setMacroParameters] = useState<string[]>([])
  const [microParameters, setMicroParameters] = useState<string[]>([])
  const [specialParameters, setSpecialParameters] = useState<string[]>([])
  const [clientDiscounts, setClientDiscounts] = useState<ClientDiscount[]>([])
  const [parameterPrices, setParameterPrices] = useState<Record<string, number>>({})
  const [subtotal, setSubtotal] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [total, setTotal] = useState(0)
  // Changed default for amountPaid to empty string
  const [amountPaid, setAmountPaid] = useState(initialData?.amountPaid === 0 ? 0 : initialData?.amountPaid || "")
  const [paymentStatus, setPaymentStatus] = useState(initialData?.paymentStatus || "Unpaid")
  const [showInPrepModal, setShowInPrepModal] = useState(false)
  const [readyFarmerSamplingSummaries, setReadyFarmerSamplingSummaries] = useState<FarmerSamplingSummary[]>([])
  const [readyRequestSamplingSummaries, setReadyRequestSamplingSummaries] = useState<RequestSamplingSummary[]>([]) // New state for request summaries
  // State to track applied prep IDs, now stores more info for updating nested samples
  const [appliedPrepIds, setAppliedPrepIds] = useState<
    Array<{ id: string; samplingRecordId: string; farmerIndex: number; customSampleId: string }>
  >([])
  const [manualLabCodeOverride, setManualLabCodeOverride] = useState(false) // New state for manual lab code input

  // New state for the list of available sequence numbers (gaps + next available)
  const [availableLabCodeSequences, setAvailableLabCodeSequences] = useState<number[]>([])
  const currentYear = format(new Date(), "yy")

  // Helper to get prefix for sample type
  const getPrefixForSampleType = (sampleType: string): string => {
    switch (sampleType) {
      case "soil":
        return "S"
      case "fertilizer":
        return "F"
      case "plant":
        return "P"
      case "other":
        return "O"
      default:
        return "GEN" // Should ideally not be reached if sampleType is validated
    }
  }

  // Effect to fetch available sequence numbers from Firebase when sampleType changes
  useEffect(() => {
    const fetchAvailableSequences = async () => {
      if (!formData.sampleType) {
        setAvailableLabCodeSequences([]) // Reset if no sample type selected
        return
      }

      setIsSubmitting(true) // Indicate loading
      try {
        const samplePrefix = getPrefixForSampleType(formData.sampleType)
        const q = query(collection(db!, "samples"), where("sampleType", "==", formData.sampleType))
        const querySnapshot = await getDocs(q)

        const usedSequences = new Set<number>()
        let maxUsedSequence = 0

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data()
          if (data.samples && Array.isArray(data.samples)) {
            data.samples.forEach((s: any) => {
              const code = s.laboratorySampleCode
              // Extract sequence number from codes like "S-YY-XXXX"
              if (code && code.startsWith(`${samplePrefix}-${currentYear}-`)) {
                const sequencePart = code.split("-")[2]
                const sequenceNum = Number.parseInt(sequencePart, 10)
                if (!isNaN(sequenceNum)) {
                  usedSequences.add(sequenceNum)
                  if (sequenceNum > maxUsedSequence) {
                    maxUsedSequence = sequenceNum
                  }
                }
              }
            })
          }
        })

        const calculatedAvailableSequences: number[] = []
        // Find missing numbers up to the max used sequence
        for (let i = 1; i <= maxUsedSequence; i++) {
          if (!usedSequences.has(i)) {
            calculatedAvailableSequences.push(i)
          }
        }

        // Add sequential numbers after maxUsedSequence to ensure enough for new entries
        // We'll pre-populate a reasonable number, e.g., up to maxUsedSequence + 100
        // This avoids re-fetching if user increases number of samples slightly
        for (let i = maxUsedSequence + 1; i <= maxUsedSequence + 100; i++) {
          // Pre-fetch a buffer of 100
          calculatedAvailableSequences.push(i)
        }

        setAvailableLabCodeSequences(calculatedAvailableSequences.sort((a, b) => a - b))
      } catch (error) {
        console.error("Error fetching available sequences:", error)
        toast.error("Failed to fetch sample codes. Using default start.", { duration: 3000 })
        // Fallback: provide a simple sequence if fetching fails
        setAvailableLabCodeSequences(Array.from({ length: 100 }, (_, i) => i + 1)) // Default to 1-100
      } finally {
        setIsSubmitting(false)
      }
    }

    fetchAvailableSequences()
  }, [formData.sampleType, currentYear]) // Re-run when sampleType or year changes

  // Modified generateIndividualSampleCode to just format a given sequence number
  const generateIndividualSampleCode = useCallback((sampleType: string, sequenceNum: number): string => {
    const prefix = getPrefixForSampleType(sampleType)
    const currentYear = format(new Date(), "yy")
    return `${prefix}-${currentYear}-${String(sequenceNum).padStart(4, "0")}`
  }, [])

  // Effect to update individual sample codes when numberOfSamples or sampleType/availableLabCodeSequences changes
  useEffect(() => {
    const updateSampleCodes = () => {
      if (!formData.sampleType || isSubmitting) {
        // If no sample type or submitting, reset samples to empty codes
        setFormData((prev) => ({
          ...prev,
          samples: Array.from({ length: prev.numberOfSamples }).map(() => ({
            laboratorySampleCode: "",
            sampleID: "",
            samplingSite: "",
          })),
        }))
        return
      }

      setFormData((prevFormData) => {
        const newSamples = []
        for (let i = 0; i < prevFormData.numberOfSamples; i++) {
          const currentSample = prevFormData.samples[i]
          const initialSample = initialData?.samples?.[i]

          let labCode = ""
          // sampleID: This field should be populated by the customSampleId from the sampling entry,
          // or preserved if already set (e.e.g., from initialData or manual input).
          const sampleId = currentSample?.sampleID || initialSample?.sampleID || ""

          // laboratorySampleCode: This field is auto-generated unless manual override is active.
          if (manualLabCodeOverride) {
            // If manual override is ON, use current manual input or initial data.
            // If no manual code exists yet, still auto-generate for new slots.
            labCode = currentSample?.laboratorySampleCode || initialSample?.laboratorySampleCode || ""
            if (!labCode && availableLabCodeSequences[i]) {
              labCode = generateIndividualSampleCode(prevFormData.sampleType, availableLabCodeSequences[i])
            }
          } else {
            // Manual override is OFF, so always auto-generate if sequence is available.
            if (availableLabCodeSequences[i]) {
              labCode = generateIndividualSampleCode(prevFormData.sampleType, availableLabCodeSequences[i])
            } else {
              console.warn("Not enough available sequences for auto-generation. Falling back to simple increment.")
              labCode = `ERROR-SEQ-${i}` // Fallback
            }
          }

          newSamples.push({
            laboratorySampleCode: labCode,
            sampleID: sampleId, // Use the preserved sampleId (which will be customSampleId from sampling entry)
            samplingSite: currentSample?.samplingSite || initialSample?.samplingSite || "",
          })
        }
        return {
          ...prevFormData,
          samples: newSamples,
        }
      })
    }

    // Only run if availableLabCodeSequences is ready (or if it's an initial load without sample type)
    // and if the number of samples or sample type changes.
    // Also re-run when manualLabCodeOverride changes to apply the new logic.
    if (availableLabCodeSequences.length > 0 || !formData.sampleType) {
      updateSampleCodes()
    }
  }, [
    formData.sampleType,
    formData.numberOfSamples,
    availableLabCodeSequences, // Crucial new dependency
    generateIndividualSampleCode,
    initialData,
    isSubmitting,
    manualLabCodeOverride,
  ])

  // Fetch client discounts from Firebase
  useEffect(() => {
    const fetchClientDiscounts = async () => {
      try {
        if (!db) return
        const clientDiscountsRef = collection(db, "clientDiscounts")
        const querySnapshot = await getDocs(clientDiscountsRef)

        const discounts: ClientDiscount[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          discounts.push({
            id: doc.id,
            clientType: data.clientType,
            discountValue: data.discountValue,
            description: data.description,
          })
        })

        setClientDiscounts(discounts)

        // Set default client type if available and not already set
        if (discounts.length > 0 && !formData.clientType) {
          setFormData((prev) => ({
            ...prev,
            clientType: discounts[0].clientType,
          }))
        }
      } catch (error) {
        console.error("Error fetching client discounts:", error)
      }
    }

    fetchClientDiscounts()
  }, [formData.clientType])

  // Fetch parameters and their prices from Firebase
  useEffect(() => {
    const fetchParameters = async () => {
      try {
        if (!db) return
        const parametersRef = collection(db, "parameters")
        const querySnapshot = await getDocs(parametersRef)

        const macro: string[] = []
        const micro: string[] = []
        const special: string[] = []
        const prices: Record<string, number> = {}

        querySnapshot.forEach((doc) => {
          const data = doc.data() as Parameter
          if (data.category === "macro") {
            macro.push(data.name)
          } else if (data.category === "micro") {
            micro.push(data.name)
          } else if (data.category === "special") {
            special.push(data.name)
          }

          // Store parameter price
          prices[data.name] = Number.parseFloat(data.price) || 0
        })

        setMacroParameters(macro)
        setMicroParameters(micro)
        setSpecialParameters(special)
        setParameterPrices(prices)
      } catch (error) {
        console.error("Error fetching parameters:", error)
      }
    }

    fetchParameters()
  }, [])

  // Calculate totals whenever relevant data changes
  useEffect(() => {
    // Calculate subtotal based on selected parameters
    let calculatedSubtotal = 0
    ;(formData.parameters || []).forEach((param: string) => {
      calculatedSubtotal += parameterPrices[param] || 0
    })

    // Multiply subtotal by the number of samples
    calculatedSubtotal *= formData.numberOfSamples

    // Apply discount based on client type
    const clientDiscount = clientDiscounts.find((discount) => discount.clientType === formData.clientType)

    let calculatedDiscount = 0
    if (clientDiscount) {
      calculatedDiscount = (calculatedSubtotal * clientDiscount.discountValue) / 100
    }

    const calculatedTotal = calculatedSubtotal - calculatedDiscount

    // Determine payment status
    let status = "Unpaid"
    if (amountPaid !== "" && Number(amountPaid) >= calculatedTotal) {
      // Check if amountPaid is not empty string
      status = "Paid"
    } else if (amountPaid !== "" && Number(amountPaid) > 0) {
      // Check if amountPaid is not empty string
      status = "Partially Paid"
    }

    setSubtotal(calculatedSubtotal)
    setDiscount(calculatedDiscount)
    setTotal(calculatedTotal)
    setPaymentStatus(status)

    // Update form data with calculated values
    setFormData((prev) => ({
      ...prev,
      amountDue: calculatedTotal,
      discountApplied: calculatedDiscount,
      paymentStatus: status,
    }))
  }, [formData.parameters, formData.clientType, parameterPrices, clientDiscounts, amountPaid, formData.numberOfSamples])

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Special handling for amount paid
    if (name === "amountPaid") {
      setAmountPaid(value) // Keep as string for empty state
    }
  }

  // Handle select changes
  const handleSelectChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Automatically show "Samples Ready" modal when "Sampling Entry" is selected
    if (name === "entryType") {
      if (value === "farmer") {
        fetchFarmerSamplingSummaries() // Fetch data for the modal
        setShowInPrepModal(true)
      } else if (value === "request") {
        fetchRequestSamplingSummaries() // Fetch data for the new request modal
        setShowInPrepModal(true)
      } else {
        setShowInPrepModal(false)
      }
    }
  }

  // Handle address picker changes
  const handleAddressChange = useCallback(
    (address: {
      region: string | null
      province: string | null
      city: string | null
      manualBarangay: string | null
      postalCode: string | null
      country: string | null
    }) => {
      setFormData((prev) => ({
        ...prev,
        customerRegion: address.region,
        customerProvince: address.province,
        customerCity: address.city,
        customerManualBarangay: address.manualBarangay,
        customerPostalCode: address.postalCode,
        customerCountry: address.country,
      }))
    },
    [],
  )

  // Add a function to handle number of samples change
  const handleNumberOfSamplesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value)
    const newValue = isNaN(value) ? 0 : Math.max(0, Math.min(500, value))

    setFormData((prev) => ({
      ...prev,
      numberOfSamples: newValue,
      // Samples will be updated by the useEffect that watches numberOfSamples and availableLabCodeSequences
      // No need to generate newSamples here directly, just ensure the array length is correct
      samples: Array.from({ length: newValue }).map((_, index) => {
        const existingSample = prev.samples[index]
        return {
          laboratorySampleCode: existingSample?.laboratorySampleCode || "", // Keep existing code if any
          sampleID: existingSample?.sampleID || "", // Keep existing sampleID if present
          samplingSite: existingSample?.samplingSite || "", // Keep existing samplingSite if present
        }
      }),
    }))

    // Clear all applied prep IDs as the sample structure might have changed
    setAppliedPrepIds([])
    toast.info("Number of samples changed. All applied sample preparations have been unlinked.", { duration: 3000 })
  }

  // Function to update the status and lsrfNo of a nested sample within samplingData
  const updateSamplePrepStatus = async (
    samplingRecordId: string,
    farmerIndex: number,
    customSampleId: string,
    lsrfNo: string, // Added lsrfNo parameter
  ) => {
    try {
      if (!db) return
      const samplingDocRef = doc(db, "samplingData", samplingRecordId)
      const docSnap = await getDoc(samplingDocRef)

      if (docSnap.exists()) {
        const data = docSnap.data() as SamplingDataDocument
        const updatedFarmerDetails = [...data.farmerDetails]

        if (farmerIndex < updatedFarmerDetails.length) {
          const farmer = updatedFarmerDetails[farmerIndex]
          if (farmer.samples) {
            const sampleIndex = farmer.samples.findIndex((s) => s.customSampleId === customSampleId)
            if (sampleIndex !== -1) {
              // Update the status and lsrfNo of the specific nested sample
              farmer.samples[sampleIndex] = {
                ...farmer.samples[sampleIndex],
                status: "completed",
                lsrfNo: lsrfNo, // Save the lsrfNo here
              }

              // Update the document in Firestore
              await updateDoc(samplingDocRef, {
                farmerDetails: updatedFarmerDetails,
              })
              toast.success(`Sample preparation ${customSampleId} marked as completed and linked to ${lsrfNo}.`, {
                duration: 3000,
              })
            }
          }
        }
      }
    } catch (error) {
      console.error("Error updating nested sample preparation status:", error)
      toast.error("Failed to update nested sample preparation status.", { duration: 3000 })
    }
  }

  // Modify handleSampleChange to only update soilSampleId and samplingSiteLocation
  const handleSampleChange = (index: number, field: string, value: string) => {
    setFormData((prev) => {
      const newSamples = [...(prev.samples || [])]
      const oldSampleID = newSamples[index]?.sampleID // Get old value before update

      if (newSamples[index]) {
        newSamples[index] = { ...newSamples[index], [field]: value }
      }

      // Logic for un-applying a prep if sampleID is changed
      if (field === "sampleID" && oldSampleID) {
        const correspondingPrep = appliedPrepIds.find(
          (applied) =>
            applied.customSampleId === oldSampleID &&
            applied.id === appliedPrepIds.find((p) => p.customSampleId === oldSampleID)?.id,
        )

        if (correspondingPrep && value !== oldSampleID) {
          // If the old sampleID was from a prep and the new value is different
          setAppliedPrepIds((prevIds) => prevIds.filter((id) => id !== correspondingPrep.id))
          toast.info(`Sample ID ${oldSampleID} unlinked from ready samples.`, { duration: 2000 })
        }
      }

      return {
        ...prev,
        samples: newSamples,
      }
    })
  }

  // Fetch ready farmer sampling summaries from samplingData
  const fetchFarmerSamplingSummaries = async () => {
    try {
      if (!db) return
      const samplingDataRef = collection(db, "samplingData")
      const querySnapshot = await getDocs(samplingDataRef)

      const summaries: FarmerSamplingSummary[] = []
      for (const docSnap of querySnapshot.docs) {
        const samplingRecordId = docSnap.id
        const data = docSnap.data() as SamplingDataDocument

        for (let farmerIndex = 0; farmerIndex < (data.farmerDetails?.length || 0); farmerIndex++) {
          const farmerDetail = data.farmerDetails[farmerIndex]

          // NEW LOGIC: Check if ALL samples for this farmerDetail have status "ready"
          const allSamplesReady =
            (farmerDetail.samples || []).length > 0 &&
            (farmerDetail.samples || []).every((sample: IndividualSampleData) => sample.status === "ready")

          // Only add to summaries if all samples are ready AND there's at least one sample
          if (allSamplesReady) {
            summaries.push({
              samplingRecordId: samplingRecordId,
              farmerIndex: farmerIndex,
              farmerName: farmerDetail.name || "N/A",
              numberOfSamples: (farmerDetail.samples || []).length, // Use total count of samples for this farmer
              collectedBy: data.collectedBy || "N/A",
              location: data.location || "N/A",
              farmerDetails: farmerDetail, // Pass the original farmerDetail
              farmerProfile: farmerDetail.name ? await getFarmerProfile(farmerDetail.name) : null,
            })
          }
        }
      }
      setReadyFarmerSamplingSummaries(summaries)
    } catch (error) {
      console.error("Error fetching ready farmer sampling summaries:", error)
      toast.error("Failed to fetch sampling entries.", { duration: 3000 })
    }
  }

  // Fetch ready request sampling summaries from samplingData
  const fetchRequestSamplingSummaries = async () => {
    try {
      if (!db) return
      const samplingDataRef = collection(db, "samplingData")
      const querySnapshot = await getDocs(samplingDataRef)

      const summaries: RequestSamplingSummary[] = []
      for (const docSnap of querySnapshot.docs) {
        const samplingDataId = docSnap.id
        const data = docSnap.data() as SamplingDataDocument

        // Check if ALL samples across ALL farmerDetails in this samplingData document are "ready"
        let allSamplesReady = true
        let totalSamples = 0
        if (data.farmerDetails && data.farmerDetails.length > 0) {
          for (const farmerDetail of data.farmerDetails) {
            if (farmerDetail.samples && farmerDetail.samples.length > 0) {
              totalSamples += farmerDetail.samples.length
              if (!farmerDetail.samples.every((sample: IndividualSampleData) => sample.status === "ready")) {
                allSamplesReady = false
                break
              }
            } else {
              allSamplesReady = false // If a farmerDetail has no samples, it's not ready
              break
            }
          }
        } else {
          allSamplesReady = false // If no farmerDetails, it's not ready
        }

        if (allSamplesReady && totalSamples > 0) {
          summaries.push({
            samplingDataId: samplingDataId,
            contactPerson: data.contactPerson || "N/A",
            location: data.location || "N/A",
            numberOfSamples: totalSamples,
            samplingData: data, // Store the full document for easy access
          })
        }
      }
      setReadyRequestSamplingSummaries(summaries)
    } catch (error) {
      console.error("Error fetching ready request sampling summaries:", error)
      toast.error("Failed to fetch request sampling entries.", { duration: 3000 })
    }
  }

  const handleFarmerSamplingSummaryClick = (summary: FarmerSamplingSummary) => {
    // Auto-fill Customer Information
    setFormData((prev) => ({
      ...prev,
      customerName: summary.farmerDetails.name || "",
      customerPhone: summary.farmerProfile?.contactNo || "",
      customerEmail: summary.farmerProfile?.emailAddress || "",
      customerBirthday: summary.farmerProfile?.birthday || "",
      customerOrganization: summary.farmerProfile?.organization || "", // Use organization from farmer profile
      isRSBSA: summary.farmerProfile?.isRSBSA ? "Yes" : "No", // Use isRSBSA from farmer profile
      rsbsaIdNo: summary.farmerProfile?.rsbsaNo || "", // Use rsbsaNo from farmer profile
      clientType: prev.clientType, // Keep existing or default
      // Address fields - attempt to parse from homeAddress or use sampling location
      customerRegion: null, // Keep as null as homeAddress is a single string
      customerProvince: null, // Keep as null as homeAddress is a single string
      customerCity: null, // Keep as null as homeAddress is a single string
      customerManualBarangay: summary.farmerProfile?.homeAddress || null, // Populate from homeAddress
      customerPostalCode: null, // Keep as null as homeAddress is a single string
      customerCountry: summary.farmerProfile?.homeAddress ? "Philippines" : "Philippines", // Default country
    }))

    // Determine sample type based on available data in farmerDetails
    let determinedSampleType = "soil" // Default to soil if no specific type is found
    if (summary.farmerDetails.soilSampleType && summary.farmerDetails.soilSampleType !== "") {
      determinedSampleType = "soil"
    } else if (summary.farmerDetails.crops && summary.farmerDetails.crops !== "") {
      determinedSampleType = "plant"
    }

    // Auto-fill Sample Information
    const newSamplesArray = (summary.farmerDetails.samples || []).map((sample) => ({
      laboratorySampleCode: "", // Keep this empty, useEffect will fill it based on determinedSampleType
      sampleID: sample.customSampleId || "", // THIS IS THE CRITICAL PART: Populate sampleID with customSampleId
      samplingSite: summary.location || "", // Use the overall sampling location
    }))

    setFormData((prev) => ({
      ...prev,
      sampleType: determinedSampleType, // Use the correctly determined sample type
      numberOfSamples: newSamplesArray.length,
      samples: newSamplesArray, // This will trigger the useEffect to generate lab codes
      soilDepth: summary.farmerDetails.samplingDepth || "", // Populate soil depth
      // Reset other conditional fields if they don't apply or are not directly mapped
      plantType: "",
      plantPart: "",
      plantAge: "",
      fertilizerType: "",
      fertilizerBrand: "",
      fertilizerComposition: "",
      otherDescription: "",
      requestedParameter: "", // Reset requested parameter for manual selection
      parameters: [], // Reset parameters for manual selection
    }))

    // Store applied prep IDs for status update
    setAppliedPrepIds(
      (summary.farmerDetails.samples || []).map((sample) => ({
        id: `${summary.samplingRecordId}-${summary.farmerIndex}-${sample.customSampleId}`,
        samplingRecordId: summary.samplingRecordId,
        farmerIndex: summary.farmerIndex,
        customSampleId: sample.customSampleId,
      })),
    )

    setShowInPrepModal(false) // Close the modal after selection
    toast.success(`Form filled with details for ${summary.farmerName}'s samples.`, { duration: 3000 })
  }

  const handleRequestSamplingSummaryClick = (summary: RequestSamplingSummary) => {
    // Auto-fill Customer Information from the top-level samplingData document
    setFormData((prev) => ({
      ...prev,
      customerName: summary.samplingData.contactPerson || "", // Changed from summary.contactPerson
      customerPhone: summary.samplingData.contactNo || "", // Changed from contactNumber to contactNo
      customerEmail: summary.samplingData.emailAddress || "",
      customerBirthday: "", // No direct mapping for birthday in samplingData
      customerOrganization: summary.samplingData.associationLGU || "", // Changed from summary.samplingData.organization
      isRSBSA: summary.samplingData.rsbsaIdNo ? "Yes" : "No", // Changed from summary.samplingData.isRSBSA
      rsbsaIdNo: summary.samplingData.rsbsaIdNo || "", // Changed from summary.samplingData.rsbsaIdNo
      clientType: prev.clientType, // Keep existing or default
      // Address fields - use location string for manual barangay, others null
      customerRegion: null,
      customerProvince: null,
      customerCity: null,
      customerManualBarangay: summary.samplingData.address || null, // Changed from summary.location
      customerPostalCode: null,
      customerCountry: "Philippines", // Default country
    }))

    // Flatten all samples from all farmerDetails within this samplingData document
    const allSamples: IndividualSampleData[] = []
    summary.samplingData.farmerDetails?.forEach((farmerDetail) => {
      if (farmerDetail.samples) {
        allSamples.push(...farmerDetail.samples)
      }
    })

    // Determine sample type (assuming all samples in a request are of the same type, or default)
    let determinedSampleType = "soil"
    if (allSamples.length > 0) {
      // Try to infer from the first sample's type, or from farmerDetails
      if (summary.samplingData.farmerDetails?.[0]?.soilSampleType) {
        determinedSampleType = "soil"
      } else if (summary.samplingData.farmerDetails?.[0]?.crops) {
        determinedSampleType = "plant"
      }
    }

    // Auto-fill Sample Information
    const newSamplesArray = allSamples.map((sample) => ({
      laboratorySampleCode: "", // Will be filled by useEffect
      sampleID: sample.customSampleId || "",
      samplingSite: summary.location || "", // Use the overall sampling location
    }))

    setFormData((prev) => ({
      ...prev,
      sampleType: determinedSampleType,
      numberOfSamples: newSamplesArray.length,
      samples: newSamplesArray,
      // Reset other conditional fields as they are specific to individual farmer entries
      soilType: "",
      soilDepth: "",
      plantType: "",
      plantPart: "",
      plantAge: "",
      fertilizerType: "",
      fertilizerBrand: "",
      fertilizerComposition: "",
      otherDescription: "",
      requestedParameter: "",
      parameters: [],
    }))

    // Store applied prep IDs for status update for all samples in this request
    setAppliedPrepIds(
      allSamples.map((sample) => {
        // Find the farmerIndex for this sample
        let farmerIndex = -1
        for (let i = 0; i < (summary.samplingData.farmerDetails?.length || 0); i++) {
          if (summary.samplingData.farmerDetails[i].samples?.some((s) => s.customSampleId === sample.customSampleId)) {
            farmerIndex = i
            break
          }
        }
        return {
          id: `${summary.samplingDataId}-${farmerIndex}-${sample.customSampleId}`,
          samplingRecordId: summary.samplingDataId,
          farmerIndex: farmerIndex,
          customSampleId: sample.customSampleId,
        }
      }),
    )

    setShowInPrepModal(false)
    toast.success(`Form filled with details for request ${summary.samplingDataId}.`, { duration: 3000 })
  }

  // New handler for customer autosuggestion selection
  const handleCustomerSelect = useCallback((customer: ExtendedCustomer) => {
    // Changed type to ExtendedCustomer
    setFormData((prev) => ({
      ...prev,
      customerName: customer.fullName,
      customerPhone: customer.phone || "",
      customerEmail: customer.email || "",
      customerBirthday: customer.birthday || "",
      customerOrganization: customer.organization || "",
      isRSBSA: customer.isRSBSA ? "Yes" : "No", // Convert boolean to "Yes"/"No" string
      rsbsaIdNo: customer.rsbsaIdNo || "",
      clientType: customer.clientType || prev.clientType, // Keep existing if not provided by customer
      customerRegion: customer.customerRegion || null, // Populate from selected customer
      customerProvince: customer.customerProvince || null, // Populate from selected customer
      customerCity: customer.customerCity || null, // Populate from selected customer
      customerManualBarangay: customer.customerManualBarangay || null, // Populate from selected customer
      customerPostalCode: customer.customerPostalCode || null, // Populate from selected customer
      customerCountry: customer.customerCountry || "Philippines", // Populate from selected customer, default to Philippines
    }))
    toast.success(`Customer details for ${customer.fullName} loaded.`, { duration: 3000 })
  }, [])

  // Validate form before showing confirmation dialog
  const validateAndConfirm = async (e: React.FormEvent) => {
    e.preventDefault()

    // Basic validation for required fields
    if (
      !formData.lsrfNo || // lsrfNo is now required manual input
      !formData.dateReceived ||
      !formData.dueDate || // Renamed from 'deadline'
      !formData.customerName ||
      !formData.clientType ||
      !formData.sampleType ||
      (formData.parameters || []).length === 0
    ) {
      setError("Please fill in all required fields (marked with *).")
      toast.error("Please fill in all required fields.", { duration: 3000, dismissible: true })
      return
    }

    // If validation passes, show confirmation dialog
    setShowConfirmDialog(true)
  }

  // Handle actual form submission after confirmation
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)

      // Check if lsrfNo already exists for new entries
      if (!initialData?.id) {
        const docRef = doc(db!, "samples", formData.lsrfNo);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setError(`LSRF Reference No. "${formData.lsrfNo}" already exists. Please use a different number or edit the existing entry.`);
          toast.error(`LSRF Reference No. "${formData.lsrfNo}" already exists.`, {
            duration: 5000,
            dismissible: true,
          });
          setIsSubmitting(false);
          setShowConfirmDialog(false);
          return; // Stop submission
        }
      }

      // The address fields are now directly in formData, no need to reconstruct fullAddress string here
      // unless it's for the 'address' field in the Customer object for backward compatibility.
      // For saving to Customer, we'll pass the structured fields.
      const fullAddressForCustomer = [
        formData.customerManualBarangay,
        formData.customerCity,
        formData.customerProvince,
        formData.customerPostalCode,
        formData.customerCountry,
      ]
        .filter(Boolean)
        .join(", ")

      const sampleData = {
        ...formData,
        dateReceived: new Date(formData.dateReceived),
        dueDate: new Date(formData.dueDate), // Renamed from 'deadline'
        createdAt: initialData?.createdAt || new Date(),
        updatedAt: new Date(),
        status: initialData?.status || "Pending",
        amountDue: total,
        amountPaid: Number(amountPaid), // Convert back to number for saving
        discountApplied: discount,
        paymentStatus: paymentStatus,
        customerAddress: fullAddressForCustomer, // Keep for sample document if needed
        serviceType: "testing", // Explicitly set serviceType for this form
      }

      // Save the customer data to the customers collection
      try {
        await saveCustomer({
          fullName: formData.customerName,
          email: formData.customerEmail,
          phone: formData.customerPhone,
          customerRegion: formData.customerRegion, // Pass structured address
          customerProvince: formData.customerProvince,
          customerCity: formData.customerCity,
          customerManualBarangay: formData.customerManualBarangay,
          customerPostalCode: formData.customerPostalCode,
          customerCountry: formData.customerCountry,
          address: fullAddressForCustomer, // For backward compatibility if needed
          organization: formData.customerOrganization,
          clientType: formData.clientType,
          isRSBSA: formData.isRSBSA === "Yes", // Convert "Yes"/"No" string to boolean
          rsbsaIdNo: formData.rsbsaIdNo,
          birthday: formData.customerBirthday,
          sampleIds: [formData.lsrfNo], // Associate sample with customer
        })
        console.log("Customer data saved successfully.")
      } catch (error) {
        console.error("Error saving customer data:", error)
        toast.error("Failed to save customer data.", { duration: 3000, dismissible: true })
        // Decide if you want to stop submission here or continue with sample save
      }

      // Add the document to Firestore using lsrfNo as the document ID
      if (initialData?.id) {
        await updateDoc(doc(db!, "samples", initialData.id), sampleData)
        console.log("Sample updated successfully")
        toast.success("Sample updated successfully", {
          duration: 3000,
          dismissible: true,
        })
      } else {
        await setDoc(doc(db!, "samples", formData.lsrfNo), sampleData)
        console.log("Sample added with ID: ", formData.lsrfNo)
        toast.success("Sample added successfully", {
          duration: 3000,
          dismissible: true,
        })
      }
      // Update sample preparation statuses after successful save/update
      for (const appliedPrep of appliedPrepIds) {
        await updateSamplePrepStatus(
          appliedPrep.samplingRecordId,
          appliedPrep.farmerIndex,
          appliedPrep.customSampleId,
          formData.lsrfNo, // Pass the lsrfNo here
        )
      }

      onClose()
    } catch (error) {
      console.error("Error processing sample: ", error)
      setError("Failed to process sample. Please try again.")
      toast.error("Failed to process sample. Please try again.", {
        duration: 3000,
        dismissible: true,
      })
    } finally {
      setIsSubmitting(false)
      setShowConfirmDialog(false)
    }
  }

  // Get payment status badge color - Adjusted for better contrast
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-green-600 text-white"
      case "Partially Paid":
        return "bg-yellow-600 text-white"
      case "Unpaid":
      default:
        return "bg-red-600 text-white"
    }
  }

  // Create a key for AddressPicker to force re-render when customer address changes
  // IMPORTANT: Only include region, province, and city in the key.
  // This ensures manual input fields do not cause re-mounts.
  const addressPickerKey = `${formData.customerRegion || ""}-${formData.customerProvince || ""}-${formData.customerCity || ""}`

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#F0EAD6] border border-[#DDD7B1] rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#DDD7B1] sticky top-0 z-10 bg-[#F0EAD6]">
          <h2 className="text-xl font-bold text-[#2F3E2E]">{initialData ? "Edit Sample" : "New Sample Entry"}</h2>
          <Button
            variant="ghost"
            size="icon"
            className="text-[#8B8378] hover:text-[#2F3E2E] hover:bg-[#C0B89F]"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={validateAndConfirm} className="p-6 space-y-6">
          {error && <div className="bg-red-500/20 border border-red-500 text-white p-3 rounded-md">{error}</div>}

          {/* Document Reference Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2">
              Document Reference Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lsrfNo" className="text-[#2F3E2E] flex items-center">
                  LSRF Reference No. *
                </Label>
                <Input
                  id="lsrfNo"
                  name="lsrfNo"
                  value={formData.lsrfNo}
                  onChange={handleChange}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateReceived" className="text-[#2F3E2E] flex items-center">
                  Date Received *
                </Label>
                <Input
                  id="dateReceived"
                  name="dateReceived"
                  type="date"
                  value={formData.dateReceived}
                  onChange={handleChange}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate" className="text-[#2F3E2E] flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Due Date *
                </Label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={handleChange}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Customer Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2">Customer Information</h3>

            {/* Entry Type Selection */}
            <div className="space-y-2">
              <Label className="text-[#2F3E2E]">Entry Type *</Label>
              <Select
                value={formData.entryType}
                onValueChange={(value) => handleSelectChange("entryType", value)}
                required
              >
                <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                  <SelectValue placeholder="Select entry type" />
                </SelectTrigger>
                <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
                  <SelectItem value="general">General Entry</SelectItem>
                  <SelectItem value="farmer">Sampling entry by Farmer</SelectItem>
                  <SelectItem value="request">Sampling entry by Request</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional Customer Information based on Entry Type */}
            {formData.entryType === "general" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Replaced Input with CustomerAutosuggestion */}
                <CustomerAutosuggestion
                  value={formData.customerName}
                  onChange={(value) => setFormData((prev) => ({ ...prev, customerName: value }))}
                  onSelectCustomer={handleCustomerSelect}
                  required
                />

                <div className="space-y-2">
                  <Label htmlFor="customerPhone" className="text-[#2F3E2E]">
                    Phone Number
                  </Label>
                  <Input
                    id="customerPhone"
                    name="customerPhone"
                    value={formData.customerPhone}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerEmail" className="text-[#2F3E2E]">
                    Email Address
                  </Label>
                  <Input
                    id="customerEmail"
                    name="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerBirthday" className="text-[#2F3E2E]">
                    Birthday
                  </Label>
                  <Input
                    id="customerBirthday"
                    name="customerBirthday"
                    type="date"
                    value={formData.customerBirthday}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                  />
                </div>

                {/* Address Picker Integration */}
                <div className="col-span-full space-y-2">
                  <Label className="text-[#2F3E2E]">Customer Address</Label>
                  <AddressPicker
                    key={addressPickerKey} // IMPORTANT: Key now only depends on region, province, city
                    onAddressChange={handleAddressChange}
                    initialRegion={formData.customerRegion || undefined}
                    initialProvince={formData.customerProvince || undefined}
                    initialCity={formData.customerCity || undefined}
                    initialManualBarangay={formData.customerManualBarangay || undefined}
                    initialPostalCode={formData.customerPostalCode || undefined}
                    initialCountry={formData.customerCountry || undefined}
                  />
                </div>

                {/* Organization field */}
                <div className="space-y-2">
                  <Label htmlFor="customerOrganization" className="text-[#2F3E2E]">
                    Organization
                  </Label>
                  <Input
                    id="customerOrganization"
                    name="customerOrganization"
                    value={formData.customerOrganization}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                  />
                </div>

                {/* Client Type field - Moved here to be next to Organization */}
                <div className="space-y-2">
                  <Label className="text-[#2F3E2E]">Client Type *</Label>
                  <Select
                    value={formData.clientType}
                    onValueChange={(value) => handleSelectChange("clientType", value)}
                    required
                  >
                    <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                      <SelectValue placeholder="Select client type" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
                      {clientDiscounts.length > 0 ? (
                        clientDiscounts.map((discount) => (
                          <SelectItem key={discount.id} value={discount.clientType}>
                            {discount.clientType} ({discount.discountValue}% discount)
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="regular">Regular (No discount)</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* RSBSA section - Now in its own row, spanning full width */}
                <div className="col-span-full space-y-2">
                  <Label className="text-[#2F3E2E]">RSBSA?</Label>
                  <RadioGroup
                    value={formData.isRSBSA}
                    onValueChange={(value) => handleSelectChange("isRSBSA", value)}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Yes" id="rsbsa-yes" className="border-[#C0B89F]" />
                      <Label htmlFor="rsbsa-yes" className="text-[#2F3E2E]">
                        Yes
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="No" id="rsbsa-no" className="border-[#C0B89F]" />
                      <Label htmlFor="rsbsa-no" className="text-[#2F3E2E]">
                        No
                      </Label>
                    </div>
                  </RadioGroup>
                  {formData.isRSBSA === "Yes" && (
                    <div className="space-y-2 mt-2">
                      <Label htmlFor="rsbsaIdNo" className="text-[#2F3E2E]">
                        RSBSA ID No.
                      </Label>
                      <Input
                        id="rsbsaIdNo"
                        name="rsbsaIdNo"
                        value={formData.rsbsaIdNo}
                        onChange={handleChange}
                        className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                        placeholder="Enter RSBSA ID Number"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {formData.entryType === "farmer" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-[#C0B89F] rounded-md bg-[#E0D9C0]">
                <div className="space-y-2">
                  <Label htmlFor="customerName" className="text-[#2F3E2E]">
                    Farmer Name
                  </Label>
                  <Input
                    id="customerName"
                    name="customerName"
                    value={formData.customerName || "N/A"}
                    className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone" className="text-[#2F3E2E]">
                    Phone Number
                  </Label>
                  <Input
                    id="customerPhone"
                    name="customerPhone"
                    value={formData.customerPhone || "N/A"}
                    className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerEmail" className="text-[#2F3E2E]">
                    Email Address
                  </Label>
                  <Input
                    id="customerEmail"
                    name="customerEmail"
                    type="email"
                    value={formData.customerEmail || "N/A"}
                    className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerBirthday" className="text-[#2F3E2E]">
                    Birthday
                  </Label>
                  <Input
                    id="customerBirthday"
                    name="customerBirthday"
                    type="date"
                    value={formData.customerBirthday || "N/A"}
                    className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerOrganization" className="text-[#2F3E2E]">
                    Organization
                  </Label>
                  <Input
                    id="customerOrganization"
                    name="customerOrganization"
                    value={formData.customerOrganization || "N/A"}
                    className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#2F3E2E]">RSBSA?</Label>
                  <Input
                    value={formData.isRSBSA || "N/A"}
                    className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                    readOnly
                  />
                </div>
                {formData.isRSBSA === "Yes" && (
                  <div className="space-y-2">
                    <Label htmlFor="rsbsaIdNo" className="text-[#2F3E2E]">
                      RSBSA ID No.
                    </Label>
                    <Input
                      id="rsbsaIdNo"
                      name="rsbsaIdNo"
                      value={formData.rsbsaIdNo || "N/A"}
                      className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                      readOnly
                    />
                  </div>
                )}
                <div className="space-y-2 col-span-full">
                  <Label className="text-[#2F3E2E]">Customer Address</Label>
                  <Input
                    value={
                      [
                        formData.customerManualBarangay,
                        formData.customerCity,
                        formData.customerProvince,
                        formData.customerPostalCode,
                        formData.customerCountry,
                      ]
                        .filter(Boolean)
                        .join(", ") || "N/A"
                    }
                    className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                    readOnly
                  />
                </div>
              </div>
            )}

            {formData.entryType === "request" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-[#C0B89F] rounded-md bg-[#E0D9C0]">
                <div className="space-y-2">
                  <Label htmlFor="customerName" className="text-[#2F3E2E]">
                    Customer Name
                  </Label>
                  <Input
                    id="customerName"
                    name="customerName"
                    value={formData.customerName || "N/A"}
                    className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone" className="text-[#2F3E2E]">
                    Phone Number
                  </Label>
                  <Input
                    id="customerPhone"
                    name="customerPhone"
                    value={formData.customerPhone || "N/A"}
                    className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerEmail" className="text-[#2F3E2E]">
                    Email Address
                  </Label>
                  <Input
                    id="customerEmail"
                    name="customerEmail"
                    type="email"
                    value={formData.customerEmail || "N/A"}
                    className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerOrganization" className="text-[#2F3E2E]">
                    Organization
                  </Label>
                  <Input
                    id="customerOrganization"
                    name="customerOrganization"
                    value={formData.customerOrganization || "N/A"}
                    className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#2F3E2E]">RSBSA?</Label>
                  <Input
                    value={formData.isRSBSA || "N/A"}
                    className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                    readOnly
                  />
                </div>
                {formData.isRSBSA === "Yes" && (
                  <div className="space-y-2">
                    <Label htmlFor="rsbsaIdNo" className="text-[#2F3E2E]">
                      RSBSA ID No.
                    </Label>
                    <Input
                      id="rsbsaIdNo"
                      name="rsbsaIdNo"
                      value={formData.rsbsaIdNo || "N/A"}
                      className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                      readOnly
                    />
                  </div>
                )}
                <div className="space-y-2 col-span-full">
                  <Label className="text-[#2F3E2E]">Customer Address</Label>
                  <Input
                    value={formData.customerManualBarangay || "N/A"} // Display the location string here
                    className="bg-[#E0D9C0]/50 border-[#C0B89F] text-[#2F3E2E] cursor-not-allowed"
                    readOnly
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sample Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2">Sample Information</h3>

            {/* New Tags Input Field */}
            <div className="space-y-2">
              <Label htmlFor="tags" className="text-[#2F3E2E]">
                Tags (comma-separated)
              </Label>
              <Input
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                placeholder="e.g., urgent, research, special handling"
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#2F3E2E]">Sample Type *</Label>
                <RadioGroup
                  value={formData.sampleType}
                  onValueChange={(value) => handleSelectChange("sampleType", value)}
                  className="flex flex-wrap gap-4"
                  required
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="soil" id="soil" className="border-[#C0B89F]" />
                    <Label htmlFor="soil" className="text-[#2F3E2E]">
                      Soil
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="plant" id="plant" className="border-[#C0B89F]" />
                    <Label htmlFor="plant" className="text-[#2F3E2E]">
                      Plant
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fertilizer" id="fertilizer" className="border-[#C0B89F]" />
                    <Label htmlFor="fertilizer" className="text-[#2F3E2E]">
                      Fertilizer
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="other" className="border-[#C0B89F]" />
                    <Label htmlFor="other" className="text-[#2F3E2E]">
                      Other
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-4 mt-4">
                <Label className="text-[#2F3E2E]">Requested Parameter *</Label>
                <Select
                  value={formData.requestedParameter || ""}
                  onValueChange={(value) => handleSelectChange("requestedParameter", value)}
                  required
                >
                  <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                    <SelectValue placeholder="Select parameter type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
                    <SelectItem value="macro">Macro Parameter</SelectItem>
                    <SelectItem value="micro">Micro Parameter</SelectItem>
                    <SelectItem value="special">Special Parameter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.requestedParameter === "macro" && (
                <div className="space-y-2 pl-4 border-l-2 border-[#C0B89F] ml-2">
                  <Label className="text-[#2F3E2E]">Select Macro Parameters</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {macroParameters.length > 0 ? (
                      macroParameters.map((param) => (
                        <div key={param} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`param-${param}`}
                            checked={formData.parameters?.includes(param) || false}
                            onChange={(e) => {
                              const currentParams = formData.parameters || []
                              if (e.target.checked) {
                                handleSelectChange("parameters", [...currentParams, param])
                              } else {
                                handleSelectChange(
                                  "parameters",
                                  currentParams.filter((p: string) => p !== param),
                                )
                              }
                            }}
                            className="rounded border-[#C0B89F] text-[#5B8C5A] focus:ring-[#5B8C5A]"
                          />
                          <Label htmlFor={`param-${param}`} className="text-[#2F3E2E] text-sm">
                            {param} - ₱{parameterPrices[param] || 0}
                          </Label>
                        </div>
                      ))
                    ) : (
                      <div className="text-[#8B8378] text-sm">
                        No macro parameters found. Please add them in Management.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {formData.requestedParameter === "micro" && (
                <div className="space-y-2 pl-4 border-l-2 border-[#C0B89F] ml-2">
                  <Label className="text-[#2F3E2E]">Select Micro Parameters</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {microParameters.length > 0 ? (
                      microParameters.map((param) => (
                        <div key={param} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`param-${param}`}
                            checked={formData.parameters?.includes(param) || false}
                            onChange={(e) => {
                              const currentParams = formData.parameters || []
                              if (e.target.checked) {
                                handleSelectChange("parameters", [...currentParams, param])
                              } else {
                                handleSelectChange(
                                  "parameters",
                                  currentParams.filter((p: string) => p !== param),
                                )
                              }
                            }}
                            className="rounded border-[#C0B89F] text-[#5B8C5A] focus:ring-[#5B8C5A]"
                          />
                          <Label htmlFor={`param-${param}`} className="text-[#2F3E2E] text-sm">
                            {param} - ₱{parameterPrices[param] || 0}
                          </Label>
                        </div>
                      ))
                    ) : (
                      <div className="text-[#8B8378] text-sm">
                        No micro parameters found. Please add them in Management.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {formData.requestedParameter === "special" && (
                <div className="space-y-2 pl-4 border-l-2 border-[#C0B89F] ml-2">
                  <Label className="text-[#2F3E2E]">Select Special Parameters</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {specialParameters.length > 0 ? (
                      specialParameters.map((param) => (
                        <div key={param} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`param-${param}`}
                            checked={formData.parameters?.includes(param) || false}
                            onChange={(e) => {
                              const currentParams = formData.parameters || []
                              if (e.target.checked) {
                                handleSelectChange("parameters", [...currentParams, param])
                              } else {
                                handleSelectChange(
                                  "parameters",
                                  currentParams.filter((p: string) => p !== param),
                                )
                              }
                            }}
                            className="rounded border-[#C0B89F] text-[#5B8C5A] focus:ring-[#5B8C5A]"
                          />
                          <Label htmlFor={`param-${param}`} className="text-[#2F3E2E] text-sm">
                            {param} - ₱{parameterPrices[param] || 0}
                          </Label>
                        </div>
                      ))
                    ) : (
                      <div className="text-[#8B8378] text-sm">
                        No special parameters found. Please add them in Management.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2">Payment Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subtotal" className="text-[#2F3E2E]">
                  Subtotal
                </Label>
                <div className="relative">
                  <Input
                    id="subtotal"
                    value={subtotal.toFixed(2)}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] pl-8 placeholder:text-[#8B8378]"
                    readOnly
                  />
                  <span className="absolute left-3 top-2.5 text-[#8B8378] font-medium">₱</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount" className="text-[#2F3E2E]">
                  Discount (
                  {formData.clientType
                    ? clientDiscounts.find((d) => d.clientType === formData.clientType)?.discountValue || 0
                    : 0}
                  %)
                </Label>
                <div className="relative">
                  <Input
                    id="discount"
                    value={discount.toFixed(2)}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] pl-8 placeholder:text-[#8B8378]"
                    readOnly
                  />
                  <span className="absolute left-3 top-2.5 text-[#8B8378] font-medium">₱</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="total" className="text-[#2F3E2E] font-medium">
                  Total Amount Due
                </Label>
                <div className="relative">
                  <Input
                    id="total"
                    value={total.toFixed(2)}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] pl-8 font-medium placeholder:text-[#8B8378]"
                    readOnly
                  />
                  <span className="absolute left-3 top-2.5 text-[#8B8378] font-medium">₱</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amountPaid" className="text-[#2F3E2E]">
                  Amount Paid
                </Label>
                <div className="relative">
                  <Input
                    id="amountPaid"
                    name="amountPaid"
                    type="number"
                    min="0"
                    step="0.01"
                    value={amountPaid}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] pl-8 placeholder:text-[#8B8378]"
                    placeholder="Enter amount paid"
                  />
                  <span className="absolute left-3 top-2.5 text-[#8B8378] font-medium">₱</span>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-[#2F3E2E]">Payment Status</Label>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-[#8B8378]" />
                  <Badge className={getPaymentStatusColor(paymentStatus)}>{paymentStatus}</Badge>
                  {paymentStatus === "Partially Paid" && (
                    <span className="text-[#8B8378] text-sm">
                      (Balance: ₱{(total - Number(amountPaid)).toFixed(2)})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Conditional fields based on sample type */}
          {formData.sampleType === "soil" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2">Soil Sample Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="soilType" className="text-[#2F3E2E]">
                    Soil Type
                  </Label>
                  <Select value={formData.soilType} onValueChange={(value) => handleSelectChange("soilType", value)}>
                    <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                      <SelectValue placeholder="Select soil type" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
                      <SelectItem value="clay">Clay</SelectItem>
                      <SelectItem value="silt">Silt</SelectItem>
                      <SelectItem value="sand">Sand</SelectItem>
                      <SelectItem value="loam">Loam</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="soilDepth" className="text-[#2F3E2E]">
                    Sampling Depth
                  </Label>
                  <Input
                    id="soilDepth"
                    name="soilDepth"
                    value={formData.soilDepth}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                    placeholder="e.g., 0-15 cm"
                  />
                </div>
              </div>
            </div>
          )}

          {formData.sampleType === "plant" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2">
                Plant Sample Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plantType" className="text-[#2F3E2E]">
                    Plant Type/Species
                  </Label>
                  <Input
                    id="plantType"
                    name="plantType"
                    value={formData.plantType}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plantPart" className="text-[#2F3E2E]">
                    Plant Part
                  </Label>
                  <Select value={formData.plantPart} onValueChange={(value) => handleSelectChange("plantPart", value)}>
                    <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                      <SelectValue placeholder="Select plant part" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
                      <SelectItem value="leaf">Leaf</SelectItem>
                      <SelectItem value="stem">Stem</SelectItem>
                      <SelectItem value="root">Root</SelectItem>
                      <SelectItem value="fruit">Fruit</SelectItem>
                      <SelectItem value="seed">Seed</SelectItem>
                      <SelectItem value="whole">Whole Plant</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plantAge" className="text-[#2F3E2E]">
                    Plant Age/Growth Stage
                  </Label>
                  <Input
                    id="plantAge"
                    name="plantAge"
                    value={formData.plantAge}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                  />
                </div>
              </div>
            </div>
          )}

          {formData.sampleType === "fertilizer" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2">
                Fertilizer Sample Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fertilizerType" className="text-[#2F3E2E]">
                    Fertilizer Type
                  </Label>
                  <Select
                    value={formData.fertilizerType}
                    onValueChange={(value) => handleSelectChange("fertilizerType", value)}
                  >
                    <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                      <SelectValue placeholder="Select fertilizer type" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
                      <SelectItem value="organic">Organic</SelectItem>
                      <SelectItem value="inorganic">Inorganic</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fertilizerBrand" className="text-[#2F3E2E]">
                    Brand/Manufacturer
                  </Label>
                  <Input
                    id="fertilizerBrand"
                    name="fertilizerBrand"
                    value={formData.fertilizerBrand}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="fertilizerComposition" className="text-[#2F3E2E]">
                    Known Composition
                  </Label>
                  <Input
                    id="fertilizerComposition"
                    name="fertilizerComposition"
                    value={formData.fertilizerComposition}
                    onChange={handleChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                    placeholder="e.g., N-P-K ratio"
                  />
                </div>
              </div>
            </div>
          )}

          {formData.sampleType === "other" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2">
                Other Sample Details
              </h3>

              <div className="space-y-2">
                <Label htmlFor="otherDescription" className="text-[#2F3E2E]">
                  Sample Description
                </Label>
                <Textarea
                  id="otherDescription"
                  name="otherDescription"
                  value={formData.otherDescription}
                  onChange={handleChange}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] min-h-[100px] placeholder:text-[#8B8378]"
                  placeholder="Please provide a detailed description of the sample"
                />
              </div>
            </div>
          )}

          {/* Common fields for all sample types */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2">
              Additional Information
            </h3>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-[#2F3E2E]">
                Notes
              </Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] min-h-[80px] placeholder:text-[#8B8378]"
                placeholder="Any additional information about the sample"
              />
            </div>
          </div>

          {/* Sample Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2">Sample Details</h3>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="space-y-2 flex-1">
                  <Label htmlFor="numberOfSamples" className="text-[#2F3E2E]">
                    Number of Samples *
                  </Label>
                  <Input
                    id="numberOfSamples"
                    name="numberOfSamples"
                    type="number"
                    min="0"
                    max="500"
                    value={formData.numberOfSamples}
                    onChange={handleNumberOfSamplesChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] w-24 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none placeholder:text-[#8B8378]"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#2F3E2E]">Options</Label>
                  {/* Removed "In Preparation" checkbox */}
                  {/* New checkbox for manual lab code override */}
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox
                      id="manualLabCodeOverride"
                      checked={manualLabCodeOverride}
                      onCheckedChange={(checked) => setManualLabCodeOverride(checked as boolean)}
                      className="border-[#C0B89F]"
                    />
                    <Label htmlFor="manualLabCodeOverride" className="text-[#2F3E2E] text-sm">
                      Manual Lab Code Input
                    </Label>
                  </div>
                </div>
              </div>

              {/* Dynamic Sample Code, ID and Location fields */}
              <div className="space-y-4">
                <Label className="text-[#2F3E2E]">Individual Sample Details</Label>
                {(formData.samples || []).map(
                  (sample: { laboratorySampleCode: string; sampleID: string; samplingSite: string }, index: number) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 md:grid-cols-5 gap-4 p-3 border border-[#C0B89F] rounded-md"
                    >
                      {/* Laboratory Code */}
                      <div className="space-y-2 col-span-1">
                        <Label htmlFor={`laboratorySampleCode-${index}`} className="text-[#2F3E2E]">
                          Laboratory Code #{index + 1}
                        </Label>
                        <Input
                          id={`laboratorySampleCode-${index}`}
                          value={sample.laboratorySampleCode}
                          onChange={(e) => handleSampleChange(index, "laboratorySampleCode", e.target.value)}
                          className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378] max-w-[120px]"
                          readOnly={!manualLabCodeOverride} // Only read-only if manual override is OFF
                        />
                      </div>
                      {/* Sample ID */}
                      <div className="space-y-2 col-span-1">
                        <Label htmlFor={`sampleID-${index}`} className="text-[#2F3E2E]">
                          Sample ID #{index + 1}
                        </Label>
                        <Input
                          id={`sampleID-${index}`}
                          value={sample.sampleID}
                          onChange={(e) => handleSampleChange(index, "sampleID", e.target.value)}
                          className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                          placeholder="if available"
                        />
                      </div>
                      {/* Sampling Site/Location */}
                      <div className="space-y-2 col-span-3">
                        <Label htmlFor={`samplingSite-${index}`} className="text-[#2F3E2E]">
                          Sampling Site #{index + 1}
                        </Label>
                        <Input
                          id={`samplingSite-${index}`}
                          value={sample.samplingSite}
                          onChange={(e) => handleSampleChange(index, "samplingSite", e.target.value)}
                          className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                          placeholder="e.g., Province, Municipality, Address"
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>

          {/* In Preparation Modal */}
          {showInPrepModal && (
            <div className="fixed inset-0 z-[60] pointer-events-none">
              <div className="absolute right-4 top-4 bottom-4 w-96 bg-[#F0EAD6] border border-[#DDD7B1] rounded-lg shadow-lg overflow-auto pointer-events-auto">
                <div className="flex items-center justify-between p-4 border-b border-[#DDD7B1]">
                  <h3 className="text-lg font-bold text-[#2F3E2E]">Select Sampling Entry</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-[#8B8378] hover:text-[#2F3E2E] hover:bg-[#C0B89F]"
                    onClick={() => {
                      setShowInPrepModal(false)
                    }}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="p-4 space-y-3">
                  {formData.entryType === "farmer" && (
                    <>
                      <div className="text-[#5B8C5A] text-sm italic border-b border-[#C0B89F] pb-2">
                        Select a farmer's sampling record to auto-fill the form.
                      </div>
                      {readyFarmerSamplingSummaries.length === 0 ? (
                        <p className="text-[#8B8378] text-center py-4">No farmer sampling entries found.</p>
                      ) : (
                        readyFarmerSamplingSummaries.map((summary) => (
                          <div
                            key={`${summary.samplingRecordId}-${summary.farmerIndex}`}
                            className={cn(
                              "p-3 border rounded-md cursor-pointer transition-colors",
                              "bg-[#E0D9C0] border-[#C0B89F] hover:bg-[#D0C9B0]",
                            )}
                            onClick={() => handleFarmerSamplingSummaryClick(summary)}
                          >
                            <div className="text-[#1A431A] font-medium">Farmer: {summary.farmerName}</div>
                            <div className="text-[#5B8C5A] text-sm">Samples: {summary.numberOfSamples}</div>
                            <div className="text-[#5B8C5A] text-sm">Collected By: {summary.collectedBy}</div>
                            <div className="text-[#5B8C5A] text-sm">Location: {summary.location}</div>
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {formData.entryType === "request" && (
                    <>
                      <div className="text-[#5B8C5A] text-sm italic border-b border-[#C0B89F] pb-2">
                        Select a sampling request to auto-fill the form.
                      </div>
                      {readyRequestSamplingSummaries.length === 0 ? (
                        <p className="text-[#8B8378] text-center py-4">No sampling requests found.</p>
                      ) : (
                        readyRequestSamplingSummaries.map((summary) => (
                          <div
                            key={summary.samplingDataId}
                            className={cn(
                              "p-3 border rounded-md cursor-pointer transition-colors",
                              "bg-[#E0D9C0] border-[#C0B89F] hover:bg-[#D0C9B0]",
                            )}
                            onClick={() => handleRequestSamplingSummaryClick(summary)}
                          >
                            <div className="text-[#1A431A] font-medium">Sampling Data ID: {summary.samplingDataId}</div>
                            <div className="text-[#5B8C5A] text-sm">Contact Person: {summary.contactPerson}</div>
                            <div className="text-[#5B8C5A] text-sm">Samples: {summary.numberOfSamples}</div>
                            <div className="text-[#5B8C5A] text-sm">Location: {summary.location}</div>
                          </div>
                        ))
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Form actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-[#DDD7B1]">
            <Button
              type="button"
              className="bg-[#5B8C5A] hover:bg-[#4A7049] text-white"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-[#5B8C5A] hover:bg-[#4A7049] text-white" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-[#2F3E2E] border-t-transparent rounded-full animate-spin"></span>
                  {initialData ? "Updating..." : "Saving..."}
                </span>
              ) : initialData ? (
                "Update Sample"
              ) : (
                "Save Sample"
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
          <AlertDialogHeader>
            <AlertDialogTitle>{initialData ? "Update Sample" : "Save Sample"}</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8B8378]">
              Are you sure you want to {initialData ? "update" : "save"} this sample?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#E0D9C0] text-[#2F3E2E] hover:bg-[#C0B89F] border-[#C0B89F]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#5B8C5A] hover:bg-[#4A7049] text-white"
              onClick={(e) => {
                e.preventDefault()
                handleSubmit()
              }}
            >
              {initialData ? "Update" : "Save"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
