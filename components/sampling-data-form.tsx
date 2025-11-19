"use client"

import type React from "react"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { MapPinIcon, CloudRainIcon, DropletIcon, PaletteIcon, MountainIcon, WavesIcon, UserIcon, CalendarDaysIcon, Building2Icon, FileTextIcon, UsersIcon, HashIcon } from 'lucide-react'
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Memoized Input component to prevent re-renders
const MemoizedInput = ({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  readOnly = false,
  className,
  icon: Icon,
  optional = false,
}: {
  id: string
  label: string
  type?: string
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  placeholder?: string
  readOnly?: boolean
  className?: string
  icon?: React.ElementType
  optional?: boolean
}) => {
  const InputComponent = type === "textarea" ? Textarea : Input
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-[#2F3E2E] flex items-center gap-1">
        {Icon && <Icon className="h-4 w-4 text-[#8B8378]" />}
        {label} {optional && <span className="text-xs text-[#8B8378]">(Optional)</span>}
      </Label>
      <InputComponent
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        className={cn("bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]", className)}
      />
    </div>
  )
}

// Memoized Select component
const MemoizedSelect = ({
  id,
  label,
  value,
  onValueChange,
  options,
  placeholder,
  icon: Icon,
}: {
  id: string
  label: string
  value: string
  onValueChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  icon?: React.ElementType
}) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-[#2F3E2E] flex items-center gap-1">
      {Icon && <Icon className="h-4 w-4 text-[#8B8378]" />}
      {label}
    </Label>
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-[#FAF8F2] border-[#DDD7B1] text-[#2F3E2E]">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)

// 1. Update the FarmerDetail interface to include samplingDepth
interface FarmerDetail {
  name: string
  latitude: string
  longitude: string
  crops: string
  area: string // in hectares
  soilSampleType: string
  vegetativeCovers: string
  numberOfSamplesText: string // text only
  samplingDepth: string // Add this new field
}

interface SamplingRecordData {
  typeOfSample: string
  weatherCondition: string
  moistureStatus: string
  texture: string
  colorMunsell: string
  slopeOfSite: string
  drainageConditions: string
  collectedBy: string
  dateCollected: string
  associationLGU?: string
  address?: string
  contactPerson: string
  phoneNo: string // Changed from contactInformation
  emailAddress?: string // New optional field
  rsbsaNo?: string // This RSBSA No. is for the overall sampling record, not individual farmers.
  numberOfFarmers: number
  farmerDetails: FarmerDetail[]
}

interface SamplingDataFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: SamplingRecordData) => void
  initialSamplingId: string
  initialData?: SamplingRecordData | null // For editing existing data
}

export default function SamplingDataForm({
  isOpen,
  onClose,
  onSave,
  initialSamplingId,
  initialData = null,
}: SamplingDataFormProps) {
  const [samplingId, setSamplingId] = useState(initialSamplingId)
  const [typeOfSample, setTypeOfSample] = useState("")
  const [weatherCondition, setWeatherCondition] = useState("")
  const [moistureStatus, setMoistureStatus] = useState("")
  const [texture, setTexture] = useState("")
  const [colorMunsell, setColorMunsell] = useState("")
  const [slopeOfSite, setSlopeOfSite] = useState("")
  const [drainageConditions, setDrainageConditions] = useState("")
  const [collectedBy, setCollectedBy] = useState("")
  const [dateCollected, setDateCollected] = useState("")
  const [associationLGU, setAssociationLGU] = useState("")
  const [address, setAddress] = useState("")
  const [contactPerson, setContactPerson] = useState("")
  const [phoneNo, setPhoneNo] = useState("") // Changed from contactInformation
  const [emailAddress, setEmailAddress] = useState("") // New state
  const [rsbsaNo, setRsbsaNo] = useState("")
  const [numberOfFarmers, setNumberOfFarmers] = useState(0)
  const [farmerDetails, setFarmerDetails] = useState<FarmerDetail[]>([])

  useEffect(() => {
    if (initialData) {
      setSamplingId(initialSamplingId) // Keep the ID from the initialData
      setTypeOfSample(initialData.typeOfSample || "")
      setWeatherCondition(initialData.weatherCondition || "")
      setMoistureStatus(initialData.moistureStatus || "")
      setTexture(initialData.texture || "")
      setColorMunsell(initialData.colorMunsell || "")
      setSlopeOfSite(initialData.slopeOfSite || "")
      setDrainageConditions(initialData.drainageConditions || "")
      setCollectedBy(initialData.collectedBy || "")
      setDateCollected(initialData.dateCollected || "")
      setAssociationLGU(initialData.associationLGU || "")
      setAddress(initialData.address || "")
      setContactPerson(initialData.contactPerson || "")
      setPhoneNo(initialData.phoneNo || "") // Map to new field
      setEmailAddress(initialData.emailAddress || "") // Map to new field
      setRsbsaNo(initialData.rsbsaNo || "")
      setNumberOfFarmers(initialData.numberOfFarmers || 0)
      setFarmerDetails(initialData.farmerDetails || [])
    } else {
      // Reset form for new entry
      setSamplingId(initialSamplingId)
      setTypeOfSample("")
      setWeatherCondition("")
      setMoistureStatus("")
      setTexture("")
      setColorMunsell("")
      setSlopeOfSite("")
      setDrainageConditions("")
      setCollectedBy("")
      setDateCollected("")
      setAssociationLGU("")
      setAddress("")
      setContactPerson("")
      setPhoneNo("") // Reset new field
      setEmailAddress("") // Reset new field
      setRsbsaNo("")
      setNumberOfFarmers(0)
      setFarmerDetails([])
    }
  }, [isOpen, initialSamplingId, initialData]) // Re-run when form opens or initialData changes

  useEffect(() => {
    // Adjust farmerDetails array based on numberOfFarmers
    setFarmerDetails((prevDetails) => {
      const newDetails = [...prevDetails]
      if (numberOfFarmers > prevDetails.length) {
        for (let i = prevDetails.length; i < numberOfFarmers; i++) {
          newDetails.push({
            name: "",
            latitude: "",
            longitude: "",
            crops: "",
            area: "",
            soilSampleType: "",
            vegetativeCovers: "",
            numberOfSamplesText: "",
            samplingDepth: "",
          })
        }
      } else if (numberOfFarmers < prevDetails.length) {
        newDetails.splice(numberOfFarmers)
      }
      return newDetails
    })
  }, [numberOfFarmers])

  const handleFarmerDetailChange = useCallback((index: number, field: keyof FarmerDetail, value: string) => {
    setFarmerDetails((prevDetails) => {
      const updatedDetails = [...prevDetails]
      updatedDetails[index] = { ...updatedDetails[index], [field]: value }
      return updatedDetails
    })
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation for required fields: Collected by, Date Collected, Contact Person, Phone No.
    if (!collectedBy.trim()) {
      alert("Please fill in the 'Collected by' field.")
      return
    }
    if (!dateCollected.trim()) {
      alert("Please fill in the 'Date Collected' field.")
      return
    }

    if (!contactPerson.trim()) {
      alert("Please fill in the 'Contact Person' field.")
      return
    }

    if (!phoneNo.trim()) { // New validation for Phone No.
      alert("Please fill in the 'Phone No.' field.")
      return
    }

    // Basic validation for farmer details if numberOfFarmers > 0
    if (numberOfFarmers > 0) {
      const requiredFieldsFilled = farmerDetails.every((detail) => detail.name && detail.numberOfSamplesText)
      if (!requiredFieldsFilled) {
        alert("Please fill in the 'Name of Farmer(s)' and 'No. of Samples (text only)' for all farmers.")
        return
      }
    }

    onSave({
      typeOfSample,
      weatherCondition,
      moistureStatus,
      texture,
      colorMunsell,
      slopeOfSite,
      drainageConditions,
      collectedBy,
      dateCollected,
      associationLGU,
      address,
      contactPerson,
      phoneNo, // Pass new field
      emailAddress, // Pass new field
      rsbsaNo,
      numberOfFarmers,
      farmerDetails,
    })
    onClose()
    // Reset form fields are handled by the useEffect when isOpen becomes false
  }

  const typeOfSampleOptions = useMemo(
    () => [
      { value: "soil", label: "Soil" },
      { value: "water", label: "Water" },
      { value: "plant_tissue", label: "Plant Tissue" },
      { value: "fertilizer", label: "Fertilizer" },
      { value: "compost", label: "Compost" },
      { value: "others", label: "Others" },
    ],
    [],
  )

  const weatherConditionOptions = useMemo(
    () => [
      { value: "sunny", label: "Sunny" },
      { value: "cloudy", label: "Cloudy" },
      { value: "rainy", label: "Rainy" },
      { value: "overcast", label: "Overcast" },
    ],
    [],
  )

  const moistureStatusOptions = useMemo(
    () => [
      { value: "dry", label: "Dry" },
      { value: "moist", label: "Moist" },
      { value: "wet", label: "Wet" },
      { value: "waterlogged", label: "Waterlogged" },
    ],
    [],
  )

  const textureOptions = useMemo(
    () => [
      { value: "sandy", label: "Sandy" },
      { value: "loamy", label: "Loamy" },
      { value: "clayey", label: "Clayey" },
      { value: "silty", label: "Silty" },
    ],
    [],
  )

  const slopeOfSiteOptions = useMemo(
    () => [
      { value: "flat", label: "Flat" },
      { value: "gentle", label: "Gentle" },
      { value: "moderate", label: "Moderate" },
      { value: "steep", label: "Steep" },
    ],
    [],
  )

  const drainageConditionsOptions = useMemo(
    () => [
      { value: "well_drained", label: "Well-drained" },
      { value: "moderately_drained", label: "Moderately drained" },
      { value: "poorly_drained", label: "Poorly drained" },
      { value: "waterlogged", label: "Waterlogged" },
    ],
    [],
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1400px] max-h-[90vh] overflow-y-auto bg-[#FAF8F2] text-[#2F3E2E] border-[#DDD7B1]">
        <DialogHeader>
          <DialogTitle className="text-[#5B8C5A]">
            {initialData ? "Edit Sampling Data" : "Add New Sampling Data"}
          </DialogTitle>
          <DialogDescription className="text-[#2F3E2E]">
            Fill in the details for the soil sampling record.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          {/* Client/Organizational Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#5B8C5A] flex items-center gap-2">
              <Building2Icon className="h-5 w-5" />
              Client/Organizational Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="samplingId" className="text-[#2F3E2E] flex items-center gap-1">
                  <HashIcon className="h-4 w-4 text-[#8B8378]" />
                  Sampling ID
                </Label>
                <div className="flex h-10 w-full rounded-md border border-[#C0B89F] bg-[#E0D9C0] px-3 py-2 text-sm text-[#2F3E2E] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#8B8378] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  {samplingId}
                </div>
              </div>
              <MemoizedInput
                id="associationLGU"
                label="Association/LGU"
                value={associationLGU}
                onChange={(e) => setAssociationLGU(e.target.value)}
                placeholder="e.g., Farmers Cooperative"
                icon={Building2Icon}
                optional
              />
              <MemoizedInput
                id="address"
                label="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., 123 Main St, City"
                icon={MapPinIcon}
                optional
              />
              <MemoizedInput
                id="contactPerson"
                label="Contact Person"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g., Juan Dela Cruz"
                icon={UserIcon}
              />
              {/* Swapped positions here */}
              <MemoizedInput
                id="rsbsaNo"
                label="RSBSA No."
                value={rsbsaNo}
                onChange={(e) => setRsbsaNo(e.target.value)}
                placeholder="e.g., 1234-5678-90"
                icon={FileTextIcon}
                optional
              />
              <MemoizedInput
                id="phoneNo"
                label="Phone No."
                value={phoneNo}
                onChange={(e) => setPhoneNo(e.target.value)}
                placeholder="e.g., +639123456789"
                icon={FileTextIcon} // You can choose a more appropriate icon if available
              />
              <MemoizedInput
                id="emailAddress"
                label="Email Address"
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="e.g., example@email.com"
                icon={FileTextIcon} // You can choose a more appropriate icon if available
                optional
              />
            </div>
          </div>

          {/* General Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#5B8C5A] flex items-center gap-2">
              <FileTextIcon className="h-5 w-5" />
              General Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MemoizedSelect
                id="typeOfSample"
                label="Type of Sample"
                value={typeOfSample}
                onValueChange={setTypeOfSample}
                options={typeOfSampleOptions}
                placeholder="Select type of sample"
                icon={FileTextIcon}
              />
              <MemoizedSelect
                id="weatherCondition"
                label="Weather Condition"
                value={weatherCondition}
                onValueChange={setWeatherCondition}
                options={weatherConditionOptions}
                placeholder="Select weather condition"
                icon={CloudRainIcon}
              />
              <MemoizedSelect
                id="moistureStatus"
                label="Moisture Status"
                value={moistureStatus}
                onValueChange={setMoistureStatus}
                options={moistureStatusOptions}
                placeholder="Select moisture status"
                icon={DropletIcon}
              />
              <MemoizedSelect
                id="texture"
                label="Texture"
                value={texture}
                onValueChange={setTexture}
                options={textureOptions}
                placeholder="Select texture"
                icon={PaletteIcon}
              />
              <MemoizedInput
                id="colorMunsell"
                label="Color (Munsell Notation)"
                value={colorMunsell}
                onChange={(e) => setColorMunsell(e.target.value)}
                placeholder="e.g., 10YR 3/3"
                icon={PaletteIcon}
              />
              <MemoizedSelect
                id="slopeOfSite"
                label="Slope of Site"
                value={slopeOfSite}
                onValueChange={setSlopeOfSite}
                options={slopeOfSiteOptions}
                placeholder="Select slope"
                icon={MountainIcon}
              />
              <MemoizedSelect
                id="drainageConditions"
                label="Drainage Conditions"
                value={drainageConditions}
                onValueChange={setDrainageConditions}
                options={drainageConditionsOptions}
                placeholder="Select drainage"
                icon={WavesIcon}
              />
              <MemoizedInput
                id="collectedBy"
                label="Collected by"
                value={collectedBy}
                onChange={(e) => setCollectedBy(e.target.value)}
                placeholder="Name of collector"
                icon={UserIcon}
              />
              <MemoizedInput
                id="dateCollected"
                label="Date Collected"
                type="date"
                value={dateCollected}
                onChange={(e) => setDateCollected(e.target.value)}
                icon={CalendarDaysIcon}
              />
            </div>
          </div>

          {/* Number of Farmers */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#5B8C5A] flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Farmer Details
            </h3>
            <MemoizedInput
              id="numberOfFarmers"
              label="Number of Farmers"
              type="number"
              value={numberOfFarmers}
              onChange={(e) => setNumberOfFarmers(Number(e.target.value))}
              placeholder="Enter number of farmers"
              className="w-1/5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" // Reduced length and removed arrows
              icon={UsersIcon}
              readOnly={!!initialData} // Make read-only if initialData is present
            />

            {numberOfFarmers > 0 && (
              <div className="rounded-md border border-[#DDD7B1] overflow-hidden">
                <Table className="w-full border-collapse">
                  <TableHeader className="bg-[#DDD7B1]">
                    <TableRow className="hover:bg-[#E0D9C0] border-[#DDD7B1]">
                      <TableHead className="p-2 text-[#2F3E2E]">Name of Farmer(s)</TableHead>
                      <TableHead className="p-2 text-[#2F3E2E]">Coordinates (Lat)</TableHead>
                      <TableHead className="p-2 text-[#2F3E2E]">Coordinates (Long)</TableHead>
                      <TableHead className="p-2 text-[#2F3E2E]">Crops</TableHead>
                      <TableHead className="p-2 text-[#2F3E2E]">Area (ha)</TableHead>
                      <TableHead className="p-2 text-[#2F3E2E]">Soil/Sample Type</TableHead>
                      <TableHead className="p-2 text-[#2F3E2E]">Vegetative Covers</TableHead>
                      <TableHead className="p-2 text-[#2F3E2E]">Depth</TableHead>
                      <TableHead className="p-2 text-[#2F3E2E]">No. of Samples</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {farmerDetails.map((detail, index) => (
                      <TableRow key={index} className="hover:bg-[#E0D9C0] border-[#DDD7B1]">
                        <TableCell className="p-2">
                          <Input
                            type="text"
                            value={detail.name}
                            onChange={(e) => handleFarmerDetailChange(index, "name", e.target.value)}
                            className="bg-[#FAF8F2] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378] w-[200px]"
                            placeholder="Lastname, Firstname, Middlename"
                            readOnly={!!initialData} // Make read-only if initialData is present
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            type="text"
                            value={detail.latitude}
                            onChange={(e) => handleFarmerDetailChange(index, "latitude", e.target.value)}
                            className="bg-[#FAF8F2] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378] w-[100px]"
                            placeholder="Latitude"
                            readOnly={!!initialData} // Make read-only if initialData is present
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            type="text"
                            value={detail.longitude}
                            onChange={(e) => handleFarmerDetailChange(index, "longitude", e.target.value)}
                            className="bg-[#FAF8F2] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378] w-[100px]"
                            placeholder="Longitude"
                            readOnly={!!initialData} // Make read-only if initialData is present
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            type="text"
                            value={detail.crops}
                            onChange={(e) => handleFarmerDetailChange(index, "crops", e.target.value)}
                            className="bg-[#FAF8F2] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                            placeholder="Crops"
                            readOnly={!!initialData} // Make read-only if initialData is present
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            type="text"
                            value={detail.area}
                            onChange={(e) => handleFarmerDetailChange(index, "area", e.target.value)}
                            className="bg-[#FAF8F2] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                            placeholder="Area (ha)"
                            readOnly={!!initialData} // Make read-only if initialData is present
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            type="text"
                            value={detail.soilSampleType}
                            onChange={(e) => handleFarmerDetailChange(index, "soilSampleType", e.target.value)}
                            className="bg-[#FAF8F2] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                            placeholder="Soil/Sample Type"
                            readOnly={!!initialData} // Make read-only if initialData is present
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            type="text"
                            value={detail.vegetativeCovers}
                            onChange={(e) => handleFarmerDetailChange(index, "vegetativeCovers", e.target.value)}
                            className="bg-[#FAF8F2] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                            placeholder="Vegetative Covers"
                            readOnly={!!initialData} // Make read-only if initialData is present
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            type="text"
                            value={detail.samplingDepth}
                            onChange={(e) => handleFarmerDetailChange(index, "samplingDepth", e.target.value)}
                            className="bg-[#FAF8F2] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                            placeholder="Depth"
                            readOnly={!!initialData} // Make read-only if initialData is present
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            type="text"
                            value={detail.numberOfSamplesText}
                            onChange={(e) => handleFarmerDetailChange(index, "numberOfSamplesText", e.target.value)}
                            className="bg-[#FAF8F2] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                            placeholder="No. of Samples"
                            readOnly={!!initialData} // Make read-only if initialData is present
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-[#C0B89F] text-[#2F3E2E] hover:bg-[#E0D9C0] bg-transparent"
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-[#5B8C5A] hover:bg-[#4A7049] text-white">
              {initialData ? "Update Sampling Data" : "Save Sampling Data"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
