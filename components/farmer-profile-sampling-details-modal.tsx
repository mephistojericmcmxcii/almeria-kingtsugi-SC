"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
  MapPinIcon,
  CloudRainIcon,
  DropletIcon,
  PaletteIcon,
  MountainIcon,
  WavesIcon,
  UserIcon,
  CalendarDaysIcon,
  Building2Icon,
  FileTextIcon,
  HashIcon,
} from "lucide-react"

// Comprehensive interface for a sampling record, including all form fields
interface SamplingRecord {
  id: string // Firestore document ID (which will be the sampleId)
  sampleId: string // The auto-generated SDF-YY-XXXX ID
  location: string // Placeholder for original column
  date: string // Maps to dateCollected
  analyst: string // Maps to collectedBy
  status: string // Placeholder for main record status if needed, otherwise remove
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
  rsbsaNo?: string
  numberOfFarmers: number
  farmerDetails: any[] // Simplified for this modal's purpose
}

interface FarmerProfileSamplingDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  samplingRecord: SamplingRecord | null
}

export default function FarmerProfileSamplingDetailsModal({
  isOpen,
  onClose,
  samplingRecord,
}: FarmerProfileSamplingDetailsModalProps) {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-[#F0EAD6] text-[#2F3E2E] border-[#DDD7B1] p-0">
        <DialogHeader className="p-6 pb-2 bg-[#4A7C74] rounded-t-lg">
          <DialogTitle className="text-xl font-semibold text-white">Sampling Record Details</DialogTitle>
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

          {/* Location Details - NEW SECTION */}
          <section>
            <h3 className="text-lg font-medium text-[#4A7C74] mb-3 flex items-center gap-2">
              <MapPinIcon className="h-5 w-5" />
              Location Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#E0D9C0] p-4 rounded-md">
              {/* Assuming latitude and longitude are directly on the samplingRecord for the overall sample location */}
              {renderDetail("Latitude", samplingRecord.farmerDetails[0]?.latitude, MapPinIcon)}
              {renderDetail("Longitude", samplingRecord.farmerDetails[0]?.longitude, MapPinIcon)}
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
              {renderDetail("RSBSA No.", samplingRecord.rsbsaNo, FileTextIcon)}
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-[#DDD7B1]">
          <Button className="bg-[#E0D9C0] hover:bg-[#C0B89F] text-[#2F3E2E]" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
