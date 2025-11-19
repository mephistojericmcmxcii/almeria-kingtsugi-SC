"use client"

import type React from "react"
import { useState } from "react" // Import useState
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MapPinIcon, CloudRainIcon, DropletIcon, PaletteIcon, MountainIcon, WavesIcon, UserIcon, CalendarDaysIcon, Building2Icon, FileTextIcon, UsersIcon, HashIcon, PhoneIcon, MailIcon } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import FarmerSampleDetailsModal from "./farmer-sample-details-modal" // Import the new modal

// Define the interface for a single farmer's details
interface FarmerDetail {
  name: string
  latitude: string
  longitude: string
  crops: string
  area: string // in hectares
  soilSampleType: string
  vegetativeCovers: string
  numberOfSamplesText: string // text only
}

// Comprehensive interface for a sampling record, including all form fields
interface SamplingRecord {
  id: string // Firestore document ID (which will be the sampleId)
  sampleId: string // The auto-generated SDF-YY-XXXX ID
  location: string // Placeholder for original column
  date: string // Maps to dateCollected
  analyst: string // Maps to collectedBy
  status: string // Placeholder for original column
  typeOfSample: string
  weatherCondition: string
  moistureStatus: string
  texture: string
  colorMunsell: string
  slopeOfSite: string
  drainageConditions: string
  collectedBy: string
  dateCollected: string // Actual date field from the form
  associationLGU?: string
  address?: string
  contactPerson?: string
  phoneNo?: string // Added phoneNo
  emailAddress?: string // Added emailAddress
  rsbsaNo?: string
  numberOfFarmers: number
  farmerDetails: FarmerDetail[]
}

interface SamplingDataViewModalProps {
  isOpen: boolean
  onClose: () => void
  samplingRecord: SamplingRecord | null
}

export default function SamplingDataViewModal({ isOpen, onClose, samplingRecord }: SamplingDataViewModalProps) {
  const [showFarmerSampleDetailsModal, setShowFarmerSampleDetailsModal] = useState(false)
  const [selectedFarmerDetailForSamples, setSelectedFarmerDetailForSamples] = useState<FarmerDetail | null>(null)
  const [selectedFarmerIndex, setSelectedFarmerIndex] = useState<number>(-1)

  if (!isOpen || !samplingRecord) return null

  const renderDetail = (label: string, value: string | number | undefined, Icon: React.ElementType) => (
    <div>
      <p className="text-[#8B8378] text-sm flex items-center gap-1">
        {Icon && <Icon className="h-4 w-4 text-[#8B8378]" />}
        {label}
      </p>
      <p className="text-[#2F3E2E] font-medium">{value || "N/A"}</p>
    </div>
  )

  const handleOpenFarmerSampleDetails = (farmer: FarmerDetail, index: number) => {
    setSelectedFarmerDetailForSamples(farmer)
    setSelectedFarmerIndex(index)
    setShowFarmerSampleDetailsModal(true)
  }

  const handleCloseFarmerSampleDetails = () => {
    setShowFarmerSampleDetailsModal(false)
    setSelectedFarmerDetailForSamples(null)
    setSelectedFarmerIndex(-1)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto bg-[#F0EAD6] text-[#2F3E2E] border-[#DDD7B1] p-0">
        <DialogHeader className="p-6 pb-2 bg-[#4A7C74] rounded-t-lg">
          <DialogTitle className="text-xl font-semibold text-white">Sampling Data Details</DialogTitle>
          <p className="text-[#F0EFE9]">Comprehensive information for Sampling ID: {samplingRecord.sampleId}</p>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* General Information */}
          <section>
            <h3 className="text-lg font-medium text-[#4A7C74] mb-3 flex items-center gap-2">
              <FileTextIcon className="h-5 w-5" />
              General Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#E0D9C0] p-4 rounded-md">
              {renderDetail("Sampling ID", samplingRecord.sampleId, HashIcon)}
              {renderDetail("Type of Sample", samplingRecord.typeOfSample, FileTextIcon)}
              {renderDetail("Weather Condition", samplingRecord.weatherCondition, CloudRainIcon)}
              {renderDetail("Moisture Status", samplingRecord.moistureStatus, DropletIcon)}
              {renderDetail("Texture", samplingRecord.texture, PaletteIcon)}
              {renderDetail("Color (Munsell)", samplingRecord.colorMunsell, PaletteIcon)}
              {renderDetail("Slope of Site", samplingRecord.slopeOfSite, MountainIcon)}
              {renderDetail("Drainage Conditions", samplingRecord.drainageConditions, WavesIcon)}
              {renderDetail("Collected By", samplingRecord.collectedBy, UserIcon)}
              {renderDetail("Date Collected", samplingRecord.dateCollected, CalendarDaysIcon)}
            </div>
          </section>

          <Separator className="bg-[#DDD7B1]" />

          {/* Client/Organizational Details */}
          <section>
            <h3 className="text-lg font-medium text-[#4A7C74] mb-3 flex items-center gap-2">
              <Building2Icon className="h-5 w-5" />
              Client/Organizational Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#E0D9C0] p-4 rounded-md">
              {renderDetail("Association/LGU", samplingRecord.associationLGU, Building2Icon)}
              {renderDetail("Address", samplingRecord.address, MapPinIcon)}
              {renderDetail("Contact Person", samplingRecord.contactPerson, UserIcon)}
              {renderDetail("Phone No.", samplingRecord.phoneNo, PhoneIcon)} {/* Added Phone No. */}
              {renderDetail("Email Address", samplingRecord.emailAddress, MailIcon)} {/* Added Email Address */}
              {renderDetail("RSBSA No.", samplingRecord.rsbsaNo, FileTextIcon)}
            </div>
          </section>

          <Separator className="bg-[#DDD7B1]" />

          {/* Farmer Details */}
          <section>
            <h3 className="text-lg font-medium text-[#4A7C74] mb-3 flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Farmer Details ({samplingRecord.numberOfFarmers} Farmers)
            </h3>
            {samplingRecord.numberOfFarmers > 0 && samplingRecord.farmerDetails.length > 0 ? (
              <div className="rounded-md border border-[#DDD7B1] overflow-hidden">
                <Table className="w-full border-collapse">
                  <TableHeader className="bg-[#C0B89F]">
                    <TableRow className="hover:bg-[#E0D9C0] border-[#DDD7B1]">
                      <TableHead className="p-2 text-[#2F3E2E]">Name of Farmer(s)</TableHead>
                      <TableHead className="p-2 text-[#2F3E2E]">Coordinates (Lat)</TableHead>
                      <TableHead className="p-2 text-[#2F3E2E]">Coordinates (Long)</TableHead>
                      <TableHead className="p-2 text-[#2F3E2E]">Crops</TableHead>
                      <TableHead className="p-2 text-[#2F3E2E]">Area (ha)</TableHead>
                      <TableHead className="p-2 text-[#2F3E2E]">Soil/Sample Type</TableHead>
                      <TableHead className="p-2 text-[#2F3E2E]">Vegetative Covers</TableHead>
                      <TableHead className="p-2 text-[#2F3E2E]">No. of Samples</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {samplingRecord.farmerDetails.map((detail, index) => (
                      <TableRow
                        key={index}
                        className="hover:bg-[#E0D9C0] border-[#DDD7B1] cursor-pointer" // Make row clickable
                        onClick={() => handleOpenFarmerSampleDetails(detail, index)}
                      >
                        <TableCell className="p-2 text-[#2F3E2E]">{detail.name || "N/A"}</TableCell>
                        <TableCell className="p-2 text-[#2F3E2E]">{detail.latitude || "N/A"}</TableCell>
                        <TableCell className="p-2 text-[#2F3E2E]">{detail.longitude || "N/A"}</TableCell>
                        <TableCell className="p-2 text-[#2F3E2E]">{detail.crops || "N/A"}</TableCell>
                        <TableCell className="p-2 text-[#2F3E2E]">{detail.area || "N/A"}</TableCell>
                        <TableCell className="p-2 text-[#2F3E2E]">{detail.soilSampleType || "N/A"}</TableCell>
                        <TableCell className="p-2 text-[#2F3E2E]">{detail.vegetativeCovers || "N/A"}</TableCell>
                        <TableCell className="p-2 text-[#2F3E2E]">{detail.numberOfSamplesText || "N/A"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="bg-[#E0D9C0] p-4 rounded-md text-[#8B8378] text-center">
                No farmer details available for this record.
              </div>
            )}
          </section>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-[#DDD7B1]">
          <Button className="bg-[#E0D9C0] hover:bg-[#C0B89F] text-[#2F3E2E]" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>

      {/* Farmer Sample Details Modal */}
      <FarmerSampleDetailsModal
        isOpen={showFarmerSampleDetailsModal}
        onClose={handleCloseFarmerSampleDetails}
        farmerDetail={selectedFarmerDetailForSamples}
        samplingRecordId={samplingRecord.sampleId}
        farmerIndex={selectedFarmerIndex}
      />
    </Dialog>
  )
}
