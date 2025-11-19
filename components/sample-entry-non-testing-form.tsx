"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Calendar, Save, CreditCard } from "lucide-react"
import { collection, doc, updateDoc, serverTimestamp, getDocs, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { format, addDays } from "date-fns"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import AddressPicker from "@/components/address-picker"
import { saveCustomer } from "@/lib/customer-service"
import { Badge } from "@/components/ui/badge"
import CustomerAutosuggestion from "@/components/customer-autosuggestion"
import type { Customer } from "@/lib/customer-service"

interface ExtendedCustomer extends Customer {
  customerCity?: string
  customerCountry?: string
  customerManualBarangay?: string
  customerPostalCode?: string
  customerProvince?: string
  customerRegion?: string
}

interface SampleEntryNonTestingFormProps {
  onClose: () => void
  initialData?: any
}

interface ClientDiscount {
  id: string
  clientType: string
  discountValue: number
  description: string
}

interface EnrolledSample {
  laboratorySampleCode: string
  sampleID: string
  samplingSite: string
}

export default function SampleEntryNonTestingForm({ onClose, initialData }: SampleEntryNonTestingFormProps) {
  // Form state
  const [formData, setFormData] = useState({
    lsrfNo: initialData?.lsrfNo || "",
    dateReceived: initialData?.dateReceived
      ? format(new Date(initialData.dateReceived), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd"),
    dueDate: initialData?.dueDate
      ? format(new Date(initialData.dueDate), "yyyy-MM-dd")
      : format(addDays(new Date(), 7), "yyyy-MM-dd"),
    customerName: initialData?.customerName || "",
    customerPhone: initialData?.customerPhone || "",
    customerEmail: initialData?.customerEmail || "",
    customerBirthday: initialData?.customerBirthday || "",
    customerOrganization: initialData?.customerOrganization || "",
    isRSBSA: initialData?.isRSBSA === true ? "Yes" : initialData?.isRSBSA === false ? "No" : "No",
    rsbsaIdNo: initialData?.rsbsaIdNo || "",
    clientType: initialData?.clientType || "regular",
    customerRegion: initialData?.customerRegion || null,
    customerProvince: initialData?.customerProvince || null,
    customerCity: initialData?.customerCity || null,
    customerManualBarangay: initialData?.customerManualBarangay || null,
    customerPostalCode: initialData?.customerPostalCode || null,
    customerCountry: initialData?.customerCountry || "Philippines",
    serviceType: initialData?.serviceType || "non-testing",
    productType: initialData?.productType || "",
    productionBatchNo: initialData?.productionBatchNo || "",
    mushroomVariety: initialData?.mushroomVariety || "",
    harvestDate: initialData?.harvestDate ? format(new Date(initialData.harvestDate), "yyyy-MM-dd") : "",
    quantity: initialData?.quantity || "",
    quantityUnit: initialData?.quantityUnit || "",
    purposeOfSample: initialData?.purposeOfSample || "",
    storageConditions: initialData?.storageConditions || "",
    notes: initialData?.notes || "",
    // Service-specific fields
    soilSampleLocation: initialData?.soilSampleLocation || "",
    soilDepth: initialData?.soilDepth || "",
    cropType: initialData?.cropType || "",
    inoculantType: initialData?.inoculantType || "",
    targetCrop: initialData?.targetCrop || "",
    applicationMethod: initialData?.applicationMethod || "",
    inoculantQuantity: initialData?.inoculantQuantity || "",
    inoculantUnit: initialData?.inoculantUnit || "",
    spawnType: initialData?.spawnType || "",
    substrateType: initialData?.substrateType || "",
    spawnQuantity: initialData?.spawnQuantity || "",
    spawnUnit: initialData?.spawnUnit || "",
    farmLocation: initialData?.farmLocation || "",
    farmSize: initialData?.farmSize || "",
    gpsCoordinates: initialData?.gpsCoordinates || "",
    mappingPurpose: initialData?.mappingPurpose || "",
    targetCropFertilizer: initialData?.targetCropFertilizer || "",
    growthStage: initialData?.growthStage || "",
    soilTestResults: initialData?.soilTestResults || "",
    farmingSystem: initialData?.farmingSystem || "",
    specificConcerns: initialData?.specificConcerns || "",
  })

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [clientDiscounts, setClientDiscounts] = useState<ClientDiscount[]>([])

  // Payment state
  const [subtotal, setSubtotal] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [total, setTotal] = useState(0)
  const [amountPaid, setAmountPaid] = useState(initialData?.amountPaid || "")
  const [paymentStatus, setPaymentStatus] = useState(initialData?.paymentStatus || "Unpaid")

  const [numberOfSamples, setNumberOfSamples] = useState(initialData?.samples?.length || 0)
  const [enrolledSamples, setEnrolledSamples] = useState<EnrolledSample[]>(initialData?.samples || [])
  const [lastLabCodeSequence, setLastLabCodeSequence] = useState(0)
  const [manualLabCodeOverride, setManualLabCodeOverride] = useState(false)

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
      } catch (error) {
        console.error("Error fetching client discounts:", error)
        toast.error("Failed to load client discounts")
      }
    }
    fetchClientDiscounts()
  }, [])

  useEffect(() => {
    const fetchLastLabCode = async () => {
      try {
        if (!db) return
        // Query all samples without filtering by serviceType
        const querySnapshot = await getDocs(collection(db, "samples"))

        let maxSequence = 0
        querySnapshot.forEach((doc) => {
          const samples = doc.data().samples || []
          samples.forEach((sample: any) => {
            const code = sample.laboratorySampleCode || ""
            // Match any lab code format: S-YY-XXXX, F-YY-XXXX, P-YY-XXXX, O-YY-XXXX
            const match = code.match(/[SFPO]-\d+-(\d+)/)
            if (match) {
              const seq = Number.parseInt(match[1], 10)
              if (seq > maxSequence) maxSequence = seq
            }
          })
        })
        setLastLabCodeSequence(maxSequence)
        console.log("[v0] Last lab code sequence:", maxSequence)
      } catch (error) {
        console.error("Error fetching last lab code:", error)
      }
    }
    fetchLastLabCode()
  }, [])

  const generateLabCode = (index: number): string => {
    const currentYear = format(new Date(), "yy")
    const sequence = lastLabCodeSequence + index + 1
    return `S-${currentYear}-${String(sequence).padStart(4, "0")}`
  }

  const handleSampleChange = (index: number, field: string, value: string) => {
    const updated = [...enrolledSamples]
    updated[index] = { ...updated[index], [field]: value }
    setEnrolledSamples(updated)
  }

  const handleNumberOfSamplesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = Number.parseInt(e.target.value, 10) || 0
    setNumberOfSamples(num)

    // Auto-generate samples array
    const newSamples: EnrolledSample[] = []
    for (let i = 0; i < num; i++) {
      newSamples.push({
        laboratorySampleCode: manualLabCodeOverride
          ? enrolledSamples[i]?.laboratorySampleCode || ""
          : generateLabCode(i),
        sampleID: enrolledSamples[i]?.sampleID || "",
        samplingSite: enrolledSamples[i]?.samplingSite || "",
      })
    }
    setEnrolledSamples(newSamples)
  }

  useEffect(() => {
    const basePricePerUnit = 100
    const quantity = Number.parseFloat(formData.quantity) || 0
    const samplesMultiplier = formData.serviceType === "stk" ? numberOfSamples || 1 : 1
    const calculatedSubtotal = quantity * basePricePerUnit * samplesMultiplier
    const clientDiscount = clientDiscounts.find((d) => d.clientType === formData.clientType)
    let calculatedDiscount = 0
    if (clientDiscount) {
      calculatedDiscount = (calculatedSubtotal * clientDiscount.discountValue) / 100
    }
    const calculatedTotal = calculatedSubtotal - calculatedDiscount

    let status = "Unpaid"
    const paidAmount = Number.parseFloat(amountPaid as string) || 0
    if (paidAmount >= calculatedTotal) {
      status = "Paid"
    } else if (paidAmount > 0) {
      status = "Partially Paid"
    }

    setSubtotal(calculatedSubtotal)
    setDiscount(calculatedDiscount)
    setTotal(calculatedTotal)
    setPaymentStatus(status)
  }, [formData.quantity, formData.clientType, clientDiscounts, amountPaid, numberOfSamples, formData.serviceType])

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (name === "amountPaid") {
      setAmountPaid(value)
    }
  }

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Handle address changes
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

  const handleCustomerSelect = useCallback((customer: ExtendedCustomer) => {
    setFormData((prev) => ({
      ...prev,
      customerName: customer.fullName,
      customerPhone: customer.phone || "",
      customerEmail: customer.email || "",
      customerBirthday: customer.birthday || "",
      customerOrganization: customer.organization || "",
      isRSBSA: customer.isRSBSA ? "Yes" : "No",
      rsbsaIdNo: customer.rsbsaIdNo || "",
      clientType: customer.clientType || prev.clientType,
      customerRegion: customer.customerRegion || null,
      customerProvince: customer.customerProvince || null,
      customerCity: customer.customerCity || null,
      customerManualBarangay: customer.customerManualBarangay || null,
      customerPostalCode: customer.customerPostalCode || null,
      customerCountry: customer.customerCountry || "Philippines",
    }))
    toast.success(`Customer details for ${customer.fullName} loaded.`, { duration: 3000 })
  }, [])

  // Validate form
  const validateForm = () => {
    const missingFields: string[] = []

    if (!formData.lsrfNo) missingFields.push("LSRF Reference No.")
    if (!formData.dateReceived) missingFields.push("Date Received")
    if (!formData.dueDate) missingFields.push("Due Date")
    if (!formData.customerName) missingFields.push("Customer Name")
    if (!formData.clientType) missingFields.push("Client Type")
    if (!formData.serviceType) missingFields.push("Service Type")

    // Service-specific validation
    if (formData.serviceType === "non-testing") {
      if (!formData.productType) missingFields.push("Product Type")
      if (!formData.productionBatchNo) missingFields.push("Production Batch No.")
      if (!formData.harvestDate) missingFields.push("Harvest/Production Date")
      if (!formData.quantity) missingFields.push("Quantity")
      if (!formData.quantityUnit) missingFields.push("Quantity Unit")
    } else if (formData.serviceType === "stk") {
      if (!formData.soilSampleLocation) missingFields.push("Soil Sample Location")
    } else if (formData.serviceType === "soil_inoculant") {
      if (!formData.inoculantType) missingFields.push("Inoculant Type")
      if (!formData.targetCrop) missingFields.push("Target Crop")
    } else if (formData.serviceType === "mushroom_spawn") {
      if (!formData.mushroomVariety) missingFields.push("Mushroom Variety")
      if (!formData.spawnType) missingFields.push("Spawn Type")
      if (!formData.spawnQuantity) missingFields.push("Spawn Quantity")
    } else if (formData.serviceType === "geotagging") {
      if (!formData.farmLocation) missingFields.push("Farm Location")
      if (!formData.mappingPurpose) missingFields.push("Mapping Purpose")
    } else if (formData.serviceType === "fertilizer_recommendation") {
      if (!formData.targetCropFertilizer) missingFields.push("Target Crop")
      if (!formData.growthStage) missingFields.push("Growth Stage")
    }

    return missingFields
  }

  // Handle form submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const missingFields = validateForm()
    if (missingFields.length > 0) {
      const errorMessage = `Please fill in all required fields: ${missingFields.join(", ")}`
      setError(errorMessage)
      toast.error(errorMessage)
      return
    }

    setShowConfirmDialog(true)
  }

  // Handle save confirmation
  const handleSaveConfirm = async () => {
    setIsSubmitting(true)
    setError("")

    try {
      if (!db) {
        throw new Error("Database connection not available")
      }

      const fullAddress = [
        formData.customerManualBarangay,
        formData.customerCity,
        formData.customerProvince,
        formData.customerPostalCode,
        formData.customerCountry,
      ]
        .filter(Boolean)
        .join(", ")

      // Base data
      const baseData = {
        lsrfNo: formData.lsrfNo,
        dateReceived: new Date(formData.dateReceived),
        dueDate: new Date(formData.dueDate),
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail,
        customerBirthday: formData.customerBirthday,
        customerOrganization: formData.customerOrganization,
        isRSBSA: formData.isRSBSA === "Yes",
        rsbsaIdNo: formData.rsbsaIdNo,
        clientType: formData.clientType,
        customerRegion: formData.customerRegion,
        customerProvince: formData.customerProvince,
        customerCity: formData.customerCity,
        customerManualBarangay: formData.customerManualBarangay,
        customerPostalCode: formData.customerPostalCode,
        customerCountry: formData.customerCountry,
        customerAddress: fullAddress,
        serviceType: formData.serviceType,
        notes: formData.notes,
        sampleType: "non-testing",
        status: "completed",
        amountDue: total,
        amountPaid: Number.parseFloat(amountPaid as string) || 0,
        discountApplied: discount,
        paymentStatus: paymentStatus,
        parameters: formData.serviceType === "stk" ? ["pH", "Avail. N", "Avail. P", "K"] : undefined,
        samples: formData.serviceType === "stk" ? enrolledSamples : undefined,
        createdAt: initialData?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      // Service-specific data
      let serviceSpecificData = {}
      switch (formData.serviceType) {
        case "non-testing":
          serviceSpecificData = {
            productType: formData.productType,
            productionBatchNo: formData.productionBatchNo,
            mushroomVariety: formData.mushroomVariety,
            harvestDate: formData.harvestDate ? new Date(formData.harvestDate) : null,
            quantity: Number.parseFloat(formData.quantity) || 0,
            quantityUnit: formData.quantityUnit,
            purposeOfSample: formData.purposeOfSample,
            storageConditions: formData.storageConditions,
          }
          break
        case "stk":
          serviceSpecificData = {
            soilSampleLocation: formData.soilSampleLocation,
            soilDepth: Number.parseFloat(formData.soilDepth) || null,
            cropType: formData.cropType,
          }
          break
        case "soil_inoculant":
          serviceSpecificData = {
            inoculantType: formData.inoculantType,
            targetCrop: formData.targetCrop,
            applicationMethod: formData.applicationMethod,
            inoculantQuantity: Number.parseFloat(formData.inoculantQuantity) || null,
            inoculantUnit: formData.inoculantUnit,
          }
          break
        case "mushroom_spawn":
          serviceSpecificData = {
            mushroomVariety: formData.mushroomVariety,
            spawnType: formData.spawnType,
            substrateType: formData.substrateType,
            spawnQuantity: Number.parseFloat(formData.spawnQuantity) || null,
            spawnUnit: formData.spawnUnit,
          }
          break
        case "geotagging":
          serviceSpecificData = {
            farmLocation: formData.farmLocation,
            farmSize: Number.parseFloat(formData.farmSize) || null,
            gpsCoordinates: formData.gpsCoordinates,
            mappingPurpose: formData.mappingPurpose,
          }
          break
        case "fertilizer_recommendation":
          serviceSpecificData = {
            targetCropFertilizer: formData.targetCropFertilizer,
            growthStage: formData.growthStage,
            soilTestResults: formData.soilTestResults,
            farmingSystem: formData.farmingSystem,
            specificConcerns: formData.specificConcerns,
          }
          break
      }

      const dataToSave = { ...baseData, ...serviceSpecificData }

      // Save customer data
      try {
        await saveCustomer({
          fullName: formData.customerName,
          email: formData.customerEmail,
          phone: formData.customerPhone,
          address: fullAddress,
          organization: formData.customerOrganization,
          clientType: formData.clientType,
          birthday: formData.customerBirthday,
          sampleIds: [formData.lsrfNo],
        })
      } catch (customerError) {
        console.error("Error saving customer:", customerError)
      }

      // Save sample data
      if (initialData?.id) {
        const docRef = doc(db, "samples", initialData.id)
        await updateDoc(docRef, dataToSave)
        toast.success("Non-testing sample updated successfully!")
      } else {
        dataToSave.status = "pending"
        const docRef = doc(db, "samples", formData.lsrfNo)
        await setDoc(docRef, dataToSave)
        toast.success("Non-testing sample added successfully!")
      }

      onClose()
    } catch (error: any) {
      console.error("Error saving sample:", error)
      const errorMessage = `Failed to save sample: ${error.message}`
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
      setShowConfirmDialog(false)
    }
  }

  const handleManualLabCodeToggle = (checked: boolean | "indeterminate") => {
    setManualLabCodeOverride(checked === true)
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-green-600 text-white"
      case "Partially Paid":
        return "bg-yellow-600 text-white"
      default:
        return "bg-red-600 text-white"
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#F0EAD6] border border-[#DDD7B1] rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#DDD7B1] sticky top-0 z-10 bg-[#F0EAD6]">
          <h2 className="text-xl font-bold text-[#2F3E2E]">
            {initialData ? "Edit Non-Testing Sample" : "New Non-Testing Sample Entry"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
          {error && <div className="bg-red-500/20 border border-red-500 text-red-700 p-3 rounded-md">{error}</div>}

          {/* Document Reference Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2">
              Document Reference Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lsrfNo" className="text-[#2F3E2E]">
                  LSRF Reference No. *
                </Label>
                <Input
                  id="lsrfNo"
                  name="lsrfNo"
                  value={formData.lsrfNo}
                  onChange={handleInputChange}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateReceived" className="text-[#2F3E2E]">
                  Date Received *
                </Label>
                <Input
                  id="dateReceived"
                  name="dateReceived"
                  type="date"
                  value={formData.dateReceived}
                  onChange={handleInputChange}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
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
                  onChange={handleInputChange}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  onChange={handleInputChange}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
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
                  onChange={handleInputChange}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
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
                  onChange={handleInputChange}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerOrganization" className="text-[#2F3E2E]">
                  Organization
                </Label>
                <Input
                  id="customerOrganization"
                  name="customerOrganization"
                  value={formData.customerOrganization}
                  onChange={handleInputChange}
                  className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                />
              </div>
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
                    {clientDiscounts.map((discount) => (
                      <SelectItem key={discount.id} value={discount.clientType}>
                        {discount.clientType} ({discount.discountValue}% discount)
                      </SelectItem>
                    ))}
                    <SelectItem value="regular">Regular (No discount)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                      onChange={handleInputChange}
                      className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                      placeholder="Enter RSBSA ID Number"
                    />
                  </div>
                )}
              </div>
              <div className="col-span-full space-y-2">
                <Label className="text-[#2F3E2E]">Customer Address</Label>
                <AddressPicker
                  key={formData.customerName}
                  onAddressChange={handleAddressChange}
                  initialRegion={formData.customerRegion || undefined}
                  initialProvince={formData.customerProvince || undefined}
                  initialCity={formData.customerCity || undefined}
                  initialManualBarangay={formData.customerManualBarangay || undefined}
                  initialPostalCode={formData.customerPostalCode || undefined}
                  initialCountry={formData.customerCountry || undefined}
                />
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2">Payment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#2F3E2E]">Subtotal</Label>
                <div className="relative">
                  <Input
                    value={subtotal.toFixed(2)}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] pl-8"
                    readOnly
                  />
                  <span className="absolute left-3 top-2.5 text-[#8B8378] font-medium">₱</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#2F3E2E]">
                  Discount ({clientDiscounts.find((d) => d.clientType === formData.clientType)?.discountValue || 0}%)
                </Label>
                <div className="relative">
                  <Input
                    value={discount.toFixed(2)}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] pl-8"
                    readOnly
                  />
                  <span className="absolute left-3 top-2.5 text-[#8B8378] font-medium">₱</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#2F3E2E] font-medium">Total Amount Due</Label>
                <div className="relative">
                  <Input
                    value={total.toFixed(2)}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] pl-8 font-medium"
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
                    onChange={handleInputChange}
                    className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] pl-8"
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
                      (Balance: ₱{(total - (Number.parseFloat(amountPaid as string) || 0)).toFixed(2)})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Service Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#2F3E2E] border-b border-[#DDD7B1] pb-2">Service Details</h3>
            <div className="space-y-2">
              <Label className="text-[#2F3E2E]">Service Type *</Label>
              <Select
                value={formData.serviceType}
                onValueChange={(value) => handleSelectChange("serviceType", value)}
                required
              >
                <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
                  <SelectItem value="non-testing">General Non-Testing</SelectItem>
                  <SelectItem value="stk">STK (Soil Rapid Test)</SelectItem>
                  <SelectItem value="soil_inoculant">Soil Inoculant</SelectItem>
                  <SelectItem value="mushroom_spawn">Mushroom Spawn</SelectItem>
                  <SelectItem value="geotagging">Geotagging</SelectItem>
                  <SelectItem value="fertilizer_recommendation">Fertilizer Recommendation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.serviceType === "stk" && (
              <div className="space-y-4 p-4 bg-[#E0D9C0] rounded-lg border border-[#C0B89F]">
                <h4 className="text-md font-medium text-[#2F3E2E]">STK (Soil Rapid Test) Details</h4>

                {/* Sample Enrollment Section */}
                <div className="space-y-4 p-4 bg-[#F0EAD6] rounded-lg border border-[#C0B89F]">
                  <h5 className="text-sm font-semibold text-[#2F3E2E]">Sample Enrollment</h5>

                  <div className="flex items-center gap-4">
                    <div className="space-y-2 flex-1">
                      <Label htmlFor="numberOfSamples" className="text-[#2F3E2E]">
                        Number of Samples *
                      </Label>
                      <Input
                        id="numberOfSamples"
                        type="number"
                        min="0"
                        max="500"
                        value={numberOfSamples}
                        onChange={handleNumberOfSamplesChange}
                        className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] w-24 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none placeholder:text-[#8B8378]"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#2F3E2E]">Options</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <Checkbox
                          id="manualLabCodeOverride"
                          checked={manualLabCodeOverride}
                          onCheckedChange={handleManualLabCodeToggle}
                          className="border-[#C0B89F] cursor-pointer"
                        />
                        <Label htmlFor="manualLabCodeOverride" className="text-[#2F3E2E] text-sm cursor-pointer">
                          Manual Lab Code Input
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Individual Sample Details */}
                  <div className="space-y-4">
                    <Label className="text-[#2F3E2E]">Individual Sample Details</Label>
                    {enrolledSamples.map((sample, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 border border-[#C0B89F] rounded-md"
                      >
                        {/* Laboratory Code */}
                        <div className="space-y-2">
                          <Label htmlFor={`laboratorySampleCode-${index}`} className="text-[#2F3E2E]">
                            Laboratory Code #{index + 1}
                          </Label>
                          <Input
                            id={`laboratorySampleCode-${index}`}
                            value={sample.laboratorySampleCode}
                            onChange={(e) => handleSampleChange(index, "laboratorySampleCode", e.target.value)}
                            className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                            readOnly={!manualLabCodeOverride}
                          />
                        </div>
                        {/* Sample ID */}
                        <div className="space-y-2">
                          <Label htmlFor={`sampleID-${index}`} className="text-[#2F3E2E]">
                            Sample ID #{index + 1}
                          </Label>
                          <Input
                            id={`sampleID-${index}`}
                            value={sample.sampleID}
                            onChange={(e) => handleSampleChange(index, "sampleID", e.target.value)}
                            className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                            placeholder="e.g., S001"
                          />
                        </div>
                        {/* Sampling Site */}
                        <div className="space-y-2">
                          <Label htmlFor={`samplingSite-${index}`} className="text-[#2F3E2E]">
                            Sampling Site #{index + 1}
                          </Label>
                          <Input
                            id={`samplingSite-${index}`}
                            value={sample.samplingSite}
                            onChange={(e) => handleSampleChange(index, "samplingSite", e.target.value)}
                            className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                            placeholder="e.g., Field A"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {formData.serviceType === "soil_inoculant" && (
              <div className="space-y-4 p-4 bg-[#E0D9C0] rounded-lg border border-[#C0B89F]">
                <h4 className="text-md font-medium text-[#2F3E2E]">Soil Inoculant Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inoculantType" className="text-[#2F3E2E]">
                      Inoculant Type *
                    </Label>
                    <Select
                      value={formData.inoculantType}
                      onValueChange={(value) => handleSelectChange("inoculantType", value)}
                      required
                    >
                      <SelectTrigger className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E]">
                        <SelectValue placeholder="Select inoculant type" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
                        <SelectItem value="rhizobium">Rhizobium</SelectItem>
                        <SelectItem value="mycorrhizal">Mycorrhizal</SelectItem>
                        <SelectItem value="pgpr">PGPR (Plant Growth Promoting Rhizobacteria)</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetCrop" className="text-[#2F3E2E]">
                      Target Crop *
                    </Label>
                    <Input
                      id="targetCrop"
                      name="targetCrop"
                      value={formData.targetCrop}
                      onChange={handleInputChange}
                      className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E]"
                      placeholder="e.g., Legumes, Cereals"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="applicationMethod" className="text-[#2F3E2E]">
                      Application Method
                    </Label>
                    <Select
                      value={formData.applicationMethod}
                      onValueChange={(value) => handleSelectChange("applicationMethod", value)}
                    >
                      <SelectTrigger className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E]">
                        <SelectValue placeholder="Select application method" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
                        <SelectItem value="seed_coating">Seed Coating</SelectItem>
                        <SelectItem value="soil_application">Soil Application</SelectItem>
                        <SelectItem value="foliar_spray">Foliar Spray</SelectItem>
                        <SelectItem value="root_dipping">Root Dipping</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inoculantQuantity" className="text-[#2F3E2E]">
                      Quantity Required
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="inoculantQuantity"
                        name="inoculantQuantity"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.inoculantQuantity}
                        onChange={handleInputChange}
                        className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E] flex-grow"
                        placeholder="e.g., 5"
                      />
                      <Select
                        value={formData.inoculantUnit}
                        onValueChange={(value) => handleSelectChange("inoculantUnit", value)}
                      >
                        <SelectTrigger className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E] w-[120px]">
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="L">L</SelectItem>
                          <SelectItem value="packets">Packets</SelectItem>
                          <SelectItem value="bottles">Bottles</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {formData.serviceType === "mushroom_spawn" && (
              <div className="space-y-4 p-4 bg-[#E0D9C0] rounded-lg border border-[#C0B89F]">
                <h4 className="text-md font-medium text-[#2F3E2E]">Mushroom Spawn Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mushroomVarietySpawn" className="text-[#2F3E2E]">
                      Mushroom Variety *
                    </Label>
                    <Select
                      value={formData.mushroomVariety}
                      onValueChange={(value) => handleSelectChange("mushroomVariety", value)}
                      required
                    >
                      <SelectTrigger className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E]">
                        <SelectValue placeholder="Select mushroom variety" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
                        <SelectItem value="oyster">Oyster Mushroom</SelectItem>
                        <SelectItem value="shiitake">Shiitake</SelectItem>
                        <SelectItem value="reishi">Reishi</SelectItem>
                        <SelectItem value="button">Button Mushroom</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="spawnType" className="text-[#2F3E2E]">
                      Spawn Type *
                    </Label>
                    <Select
                      value={formData.spawnType}
                      onValueChange={(value) => handleSelectChange("spawnType", value)}
                      required
                    >
                      <SelectTrigger className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E]">
                        <SelectValue placeholder="Select spawn type" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
                        <SelectItem value="grain_spawn">Grain Spawn</SelectItem>
                        <SelectItem value="sawdust_spawn">Sawdust Spawn</SelectItem>
                        <SelectItem value="liquid_spawn">Liquid Spawn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="substrateType" className="text-[#2F3E2E]">
                      Substrate Type
                    </Label>
                    <Input
                      id="substrateType"
                      name="substrateType"
                      value={formData.substrateType}
                      onChange={handleInputChange}
                      className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E]"
                      placeholder="e.g., Rice straw, Sawdust"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="spawnQuantity" className="text-[#2F3E2E]">
                      Quantity Required *
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="spawnQuantity"
                        name="spawnQuantity"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.spawnQuantity}
                        onChange={handleInputChange}
                        className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E] flex-grow"
                        placeholder="e.g., 10"
                        required
                      />
                      <Select
                        value={formData.spawnUnit}
                        onValueChange={(value) => handleSelectChange("spawnUnit", value)}
                      >
                        <SelectTrigger className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E] w-[120px]">
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="bags">Bags</SelectItem>
                          <SelectItem value="bottles">Bottles</SelectItem>
                          <SelectItem value="pieces">Pieces</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {formData.serviceType === "geotagging" && (
              <div className="space-y-4 p-4 bg-[#E0D9C0] rounded-lg border border-[#C0B89F]">
                <h4 className="text-md font-medium text-[#2F3E2E]">Geotagging Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="farmLocation" className="text-[#2F3E2E]">
                      Farm/Field Location *
                    </Label>
                    <Input
                      id="farmLocation"
                      name="farmLocation"
                      value={formData.farmLocation}
                      onChange={handleInputChange}
                      className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E]"
                      placeholder="e.g., Barangay, Municipality"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="farmSize" className="text-[#2F3E2E]">
                      Farm Size (hectares)
                    </Label>
                    <Input
                      id="farmSize"
                      name="farmSize"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.farmSize}
                      onChange={handleInputChange}
                      className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E]"
                      placeholder="e.g., 2.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gpsCoordinates" className="text-[#2F3E2E]">
                      GPS Coordinates
                    </Label>
                    <Input
                      id="gpsCoordinates"
                      name="gpsCoordinates"
                      value={formData.gpsCoordinates}
                      onChange={handleInputChange}
                      className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E]"
                      placeholder="e.g., 14.5995° N, 120.9842° E"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mappingPurpose" className="text-[#2F3E2E]">
                      Mapping Purpose *
                    </Label>
                    <Select
                      value={formData.mappingPurpose}
                      onValueChange={(value) => handleSelectChange("mappingPurpose", value)}
                      required
                    >
                      <SelectTrigger className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E]">
                        <SelectValue placeholder="Select mapping purpose" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
                        <SelectItem value="soil_sampling">Soil Sampling</SelectItem>
                        <SelectItem value="crop_monitoring">Crop Monitoring</SelectItem>
                        <SelectItem value="land_survey">Land Survey</SelectItem>
                        <SelectItem value="precision_agriculture">Precision Agriculture</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {formData.serviceType === "fertilizer_recommendation" && (
              <div className="space-y-4 p-4 bg-[#E0D9C0] rounded-lg border border-[#C0B89F]">
                <h4 className="text-md font-medium text-[#2F3E2E]">Fertilizer Recommendation Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="targetCropFertilizer" className="text-[#2F3E2E]">
                      Target Crop *
                    </Label>
                    <Input
                      id="targetCropFertilizer"
                      name="targetCropFertilizer"
                      value={formData.targetCropFertilizer}
                      onChange={handleInputChange}
                      className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E]"
                      placeholder="e.g., Rice, Corn, Tomato"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="growthStage" className="text-[#2F3E2E]">
                      Growth Stage *
                    </Label>
                    <Select
                      value={formData.growthStage}
                      onValueChange={(value) => handleSelectChange("growthStage", value)}
                      required
                    >
                      <SelectTrigger className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E]">
                        <SelectValue placeholder="Select growth stage" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
                        <SelectItem value="seedling">Seedling</SelectItem>
                        <SelectItem value="vegetative">Vegetative</SelectItem>
                        <SelectItem value="flowering">Flowering</SelectItem>
                        <SelectItem value="fruiting">Fruiting</SelectItem>
                        <SelectItem value="maturity">Maturity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="soilTestResults" className="text-[#2F3E2E]">
                      Soil Test Results Available?
                    </Label>
                    <Select
                      value={formData.soilTestResults}
                      onValueChange={(value) => handleSelectChange("soilTestResults", value)}
                    >
                      <SelectTrigger className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E]">
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="farmingSystem" className="text-[#2F3E2E]">
                      Farming System
                    </Label>
                    <Select
                      value={formData.farmingSystem}
                      onValueChange={(value) => handleSelectChange("farmingSystem", value)}
                    >
                      <SelectTrigger className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E]">
                        <SelectValue placeholder="Select farming system" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
                        <SelectItem value="organic">Organic</SelectItem>
                        <SelectItem value="conventional">Conventional</SelectItem>
                        <SelectItem value="integrated">Integrated</SelectItem>
                        <SelectItem value="sustainable">Sustainable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="specificConcerns" className="text-[#2F3E2E]">
                      Specific Concerns/Issues
                    </Label>
                    <Textarea
                      id="specificConcerns"
                      name="specificConcerns"
                      value={formData.specificConcerns}
                      onChange={handleInputChange}
                      className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E] min-h-[80px]"
                      placeholder="e.g., Nutrient deficiency symptoms, soil pH issues, etc."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Additional Notes */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-2">Additional Notes</h3>
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-[#2F3E2E]">
                Notes
              </Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] min-h-[100px]"
                placeholder="Any other relevant information about the sample."
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-[#DDD7B1]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="bg-[#8B8378] hover:bg-[#7A7060] text-white border-[#8B8378]"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[#5B8C5A] hover:bg-[#4A7049] text-white">
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? "Saving..." : "Save Sample"}
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
              Are you sure you want to {initialData ? "update" : "save"} this non-testing sample?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-[#E0D9C0] text-[#2F3E2E] hover:bg-[#C0B89F] border-[#C0B89F]"
              disabled={isSubmitting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#5B8C5A] hover:bg-[#4A7049] text-white"
              onClick={handleSaveConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : initialData ? "Update" : "Save"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
