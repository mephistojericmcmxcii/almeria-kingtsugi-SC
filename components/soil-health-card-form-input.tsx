"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface SoilHealthCardFormInputProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => void
  initialData?: any
}

export default function SoilHealthCardFormInput({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: SoilHealthCardFormInputProps) {
  const [formData, setFormData] = useState({
    // Header
    shcNo: "",
    laboratoryCode: "",

    // I. Personal Identifier
    name: "",
    contactNumber: "",
    address: "",
    yearsInFarming: "",
    age: "",
    gender: "",
    dateOfSampling: "",
    samplingSiteLocation: "",
    dateSubmitted: "",
    dateIssued: "",

    // II. Parcel Identifier
    landscape: "", // Changed to single string for radio group
    landscapeOthers: "",
    description: "",
    location: "",
    farmArea: "",
    region: "",
    province: "",
    municipality: "",
    barangay: "",
    parcelDemo: "",
    parcelNoYearCropping: "",
    coordinates: "", // Renamed from season to coordinates
    srmuNo: "",
    srmuCoordinates: "",
    shmsNo: "",
    shmsCoordinates: "",
    rsbsaNo: "",
    fca: "",

    // III. Farm Diagnosis
    croppingSeason1st: "", // Changed to date field
    croppingSeason2nd: "", // Changed to date field
    croppingSeason3rd: "", // Changed to date field
    dateOfAnalysis: "",

    // Soil Health Parameters - Pre-Planting (with soil moisture variation)
    soilMoisturePrePlanting1st: "",
    soilMoisturePrePlanting2nd: "",
    soilMoisturePrePlanting3rd: "",
    soilPhPrePlanting1st: "",
    soilPhPrePlanting2nd: "",
    soilPhPrePlanting3rd: "",
    nitrogenPrePlanting1st: "",
    nitrogenPrePlanting2nd: "",
    nitrogenPrePlanting3rd: "",
    phosphorousPrePlanting1st: "",
    phosphorousPrePlanting2nd: "",
    phosphorousPrePlanting3rd: "",
    potassiumPrePlanting1st: "",
    potassiumPrePlanting2nd: "",
    potassiumPrePlanting3rd: "",
    organicCarbonPrePlanting1st: "",
    organicCarbonPrePlanting2nd: "",
    organicCarbonPrePlanting3rd: "",
    soilTexturePrePlanting1st: "",
    soilTexturePrePlanting2nd: "",
    soilTexturePrePlanting3rd: "",
    soilTextureMethodPrePlanting1st: "",
    soilTextureMethodPrePlanting2nd: "",
    soilTextureMethodPrePlanting3rd: "",
    soilColorPrePlanting1st: "",
    soilColorPrePlanting2nd: "",
    soilColorPrePlanting3rd: "",
    soilMicrobialRespirationPrePlanting1st: "",
    soilMicrobialRespirationPrePlanting2nd: "",
    soilMicrobialRespirationPrePlanting3rd: "",
    earthwormPopulationPrePlanting1st: "",
    earthwormPopulationPrePlanting2nd: "",
    earthwormPopulationPrePlanting3rd: "",
    rootLengthWeightPrePlanting1st: "",
    rootLengthWeightPrePlanting2nd: "",
    rootLengthWeightPrePlanting3rd: "",
    biomassPrePlanting1st: "",
    biomassPrePlanting2nd: "",
    biomassPrePlanting3rd: "",

    // Soil Health Parameters - Postharvest (with dates)
    postharvest1stDate: "",
    postharvest2ndDate: "",
    postharvest3rdDate: "",
    soilMoisturePostharvest1st: "",
    soilMoisturePostharvest2nd: "",
    soilMoisturePostharvest3rd: "",
    soilPhPostharvest1st: "",
    soilPhPostharvest2nd: "",
    soilPhPostharvest3rd: "",
    nitrogenPostharvest1st: "",
    nitrogenPostharvest2nd: "",
    nitrogenPostharvest3rd: "",
    phosphorousPostharvest1st: "",
    phosphorousPostharvest2nd: "",
    phosphorousPostharvest3rd: "",
    potassiumPostharvest1st: "",
    potassiumPostharvest2nd: "",
    potassiumPostharvest3rd: "",
    organicCarbonPostharvest1st: "",
    organicCarbonPostharvest2nd: "",
    organicCarbonPostharvest3rd: "",
    soilTexturePostharvest1st: "",
    soilTexturePostharvest2nd: "",
    soilTexturePostharvest3rd: "",
    soilTextureMethodPostharvest1st: "",
    soilTextureMethodPostharvest2nd: "",
    soilTextureMethodPostharvest3rd: "",
    soilColorPostharvest1st: "",
    soilColorPostharvest2nd: "",
    soilColorPostharvest3rd: "",
    soilMicrobialRespirationPostharvest1st: "",
    soilMicrobialRespirationPostharvest2nd: "",
    soilMicrobialRespirationPostharvest3rd: "",
    earthwormPopulationPostharvest1st: "",
    earthwormPopulationPostharvest2nd: "",
    earthwormPopulationPostharvest3rd: "",
    rootLengthWeightPostharvest1st: "",
    rootLengthWeightPostharvest2nd: "",
    rootLengthWeightPostharvest3rd: "",
    biomassPostharvest1st: "",
    biomassPostharvest2nd: "",
    biomassPostharvest3rd: "",

    // Soil Fertility Rating
    soilPhInterpretation: "",
    nitrogenInterpretation: "",
    phosphorousInterpretation: "",
    potassiumInterpretation: "",

    // Certification
    agriculturist: "",
    chemist: "",
    chiefAgriculturist: "",
  })

  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    } else {
      // Reset form with all new fields
      setFormData({
        shcNo: "",
        laboratoryCode: "",
        name: "",
        contactNumber: "",
        address: "",
        yearsInFarming: "",
        age: "",
        gender: "",
        dateOfSampling: "",
        samplingSiteLocation: "",
        dateSubmitted: "",
        dateIssued: "",
        landscape: "",
        landscapeOthers: "",
        description: "",
        location: "",
        farmArea: "",
        region: "",
        province: "",
        municipality: "",
        barangay: "",
        parcelDemo: "",
        parcelNoYearCropping: "",
        coordinates: "",
        srmuNo: "",
        srmuCoordinates: "",
        shmsNo: "",
        shmsCoordinates: "",
        rsbsaNo: "",
        fca: "",
        croppingSeason1st: "",
        croppingSeason2nd: "",
        croppingSeason3rd: "",
        dateOfAnalysis: "",
        soilMoisturePrePlanting1st: "",
        soilMoisturePrePlanting2nd: "",
        soilMoisturePrePlanting3rd: "",
        soilPhPrePlanting1st: "",
        soilPhPrePlanting2nd: "",
        soilPhPrePlanting3rd: "",
        nitrogenPrePlanting1st: "",
        nitrogenPrePlanting2nd: "",
        nitrogenPrePlanting3rd: "",
        phosphorousPrePlanting1st: "",
        phosphorousPrePlanting2nd: "",
        phosphorousPrePlanting3rd: "",
        potassiumPrePlanting1st: "",
        potassiumPrePlanting2nd: "",
        potassiumPrePlanting3rd: "",
        organicCarbonPrePlanting1st: "",
        organicCarbonPrePlanting2nd: "",
        organicCarbonPrePlanting3rd: "",
        soilTexturePrePlanting1st: "",
        soilTexturePrePlanting2nd: "",
        soilTexturePrePlanting3rd: "",
        soilTextureMethodPrePlanting1st: "",
        soilTextureMethodPrePlanting2nd: "",
        soilTextureMethodPrePlanting3rd: "",
        soilColorPrePlanting1st: "",
        soilColorPrePlanting2nd: "",
        soilColorPrePlanting3rd: "",
        soilMicrobialRespirationPrePlanting1st: "",
        soilMicrobialRespirationPrePlanting2nd: "",
        soilMicrobialRespirationPrePlanting3rd: "",
        earthwormPopulationPrePlanting1st: "",
        earthwormPopulationPrePlanting2nd: "",
        earthwormPopulationPrePlanting3rd: "",
        rootLengthWeightPrePlanting1st: "",
        rootLengthWeightPrePlanting2nd: "",
        rootLengthWeightPrePlanting3rd: "",
        biomassPrePlanting1st: "",
        biomassPrePlanting2nd: "",
        biomassPrePlanting3rd: "",
        postharvest1stDate: "",
        postharvest2ndDate: "",
        postharvest3rdDate: "",
        soilMoisturePostharvest1st: "",
        soilMoisturePostharvest2nd: "",
        soilMoisturePostharvest3rd: "",
        soilPhPostharvest1st: "",
        soilPhPostharvest2nd: "",
        soilPhPostharvest3rd: "",
        nitrogenPostharvest1st: "",
        nitrogenPostharvest2nd: "",
        nitrogenPostharvest3rd: "",
        phosphorousPostharvest1st: "",
        phosphorousPostharvest2nd: "",
        phosphorousPostharvest3rd: "",
        potassiumPostharvest1st: "",
        potassiumPostharvest2nd: "",
        potassiumPostharvest3rd: "",
        organicCarbonPostharvest1st: "",
        organicCarbonPostharvest2nd: "",
        organicCarbonPostharvest3rd: "",
        soilTexturePostharvest1st: "",
        soilTexturePostharvest2nd: "",
        soilTexturePostharvest3rd: "",
        soilTextureMethodPostharvest1st: "",
        soilTextureMethodPostharvest2nd: "",
        soilTextureMethodPostharvest3rd: "",
        soilColorPostharvest1st: "",
        soilColorPostharvest2nd: "",
        soilColorPostharvest3rd: "",
        soilMicrobialRespirationPostharvest1st: "",
        soilMicrobialRespirationPostharvest2nd: "",
        soilMicrobialRespirationPostharvest3rd: "",
        earthwormPopulationPostharvest1st: "",
        earthwormPopulationPostharvest2nd: "",
        earthwormPopulationPostharvest3rd: "",
        rootLengthWeightPostharvest1st: "",
        rootLengthWeightPostharvest2nd: "",
        rootLengthWeightPostharvest3rd: "",
        biomassPostharvest1st: "",
        biomassPostharvest2nd: "",
        biomassPostharvest3rd: "",
        soilPhInterpretation: "",
        nitrogenInterpretation: "",
        phosphorousInterpretation: "",
        potassiumInterpretation: "",
        agriculturist: "",
        chemist: "",
        chiefAgriculturist: "",
      })
    }
  }, [initialData, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] bg-[#FAF8F2] border-[#DDD7B1]">
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#5B8C5A]">
            {initialData ? "Edit Soil Health Card" : "Add New Soil Health Card"}
          </DialogTitle>
          <DialogDescription className="text-[#2F3E2E]">
            Fill in the soil health card information. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-180px)] pr-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="header" className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-[#E0D9C0]">
                <TabsTrigger value="header" className="data-[state=active]:bg-[#5B8C5A] data-[state=active]:text-white">
                  Header
                </TabsTrigger>
                <TabsTrigger
                  value="personal"
                  className="data-[state=active]:bg-[#5B8C5A] data-[state=active]:text-white"
                >
                  Personal
                </TabsTrigger>
                <TabsTrigger value="parcel" className="data-[state=active]:bg-[#5B8C5A] data-[state=active]:text-white">
                  Parcel
                </TabsTrigger>
                <TabsTrigger
                  value="diagnosis"
                  className="data-[state=active]:bg-[#5B8C5A] data-[state=active]:text-white"
                >
                  Diagnosis
                </TabsTrigger>
                <TabsTrigger
                  value="certification"
                  className="data-[state=active]:bg-[#5B8C5A] data-[state=active]:text-white"
                >
                  Certification
                </TabsTrigger>
              </TabsList>

              {/* Header Tab */}
              <TabsContent value="header" className="space-y-4 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shcNo" className="text-[#2F3E2E] font-medium">
                      SHC No. *
                    </Label>
                    <Input
                      id="shcNo"
                      value={formData.shcNo}
                      onChange={(e) => setFormData({ ...formData, shcNo: e.target.value })}
                      required
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="laboratoryCode" className="text-[#2F3E2E] font-medium">
                      Laboratory Code *
                    </Label>
                    <Input
                      id="laboratoryCode"
                      value={formData.laboratoryCode}
                      onChange={(e) => setFormData({ ...formData, laboratoryCode: e.target.value })}
                      required
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Personal Identifier Tab */}
              <TabsContent value="personal" className="space-y-4 mt-6">
                <h3 className="font-semibold text-lg text-[#5B8C5A] border-b border-[#DDD7B1] pb-2">
                  I. PERSONAL IDENTIFIER
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[#2F3E2E] font-medium">
                      Name *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age" className="text-[#2F3E2E] font-medium">
                      Age
                    </Label>
                    <Input
                      id="age"
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactNumber" className="text-[#2F3E2E] font-medium">
                      Contact Number *
                    </Label>
                    <Input
                      id="contactNumber"
                      value={formData.contactNumber}
                      onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                      required
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#2F3E2E] font-medium">Gender</Label>
                    <RadioGroup
                      value={formData.gender}
                      onValueChange={(value) => setFormData({ ...formData, gender: value })}
                      className="flex items-center space-x-4 pt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="male" id="male" className="border-[#5B8C5A] text-[#5B8C5A]" />
                        <Label htmlFor="male" className="text-[#2F3E2E] font-normal cursor-pointer">
                          Male
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="female" id="female" className="border-[#5B8C5A] text-[#5B8C5A]" />
                        <Label htmlFor="female" className="text-[#2F3E2E] font-normal cursor-pointer">
                          Female
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="address" className="text-[#2F3E2E] font-medium">
                      Address
                    </Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={2}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yearsInFarming" className="text-[#2F3E2E] font-medium">
                      No. of years in farming
                    </Label>
                    <Input
                      id="yearsInFarming"
                      type="number"
                      value={formData.yearsInFarming}
                      onChange={(e) => setFormData({ ...formData, yearsInFarming: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfSampling" className="text-[#2F3E2E] font-medium">
                      Date of Sampling *
                    </Label>
                    <Input
                      id="dateOfSampling"
                      type="date"
                      value={formData.dateOfSampling}
                      onChange={(e) => setFormData({ ...formData, dateOfSampling: e.target.value })}
                      required
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="samplingSiteLocation" className="text-[#2F3E2E] font-medium">
                      Sampling Site/Location
                    </Label>
                    <Input
                      id="samplingSiteLocation"
                      value={formData.samplingSiteLocation}
                      onChange={(e) => setFormData({ ...formData, samplingSiteLocation: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateSubmitted" className="text-[#2F3E2E] font-medium">
                      Date Submitted
                    </Label>
                    <Input
                      id="dateSubmitted"
                      type="date"
                      value={formData.dateSubmitted}
                      onChange={(e) => setFormData({ ...formData, dateSubmitted: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateIssued" className="text-[#2F3E2E] font-medium">
                      Date Issued
                    </Label>
                    <Input
                      id="dateIssued"
                      type="date"
                      value={formData.dateIssued}
                      onChange={(e) => setFormData({ ...formData, dateIssued: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Parcel Identifier Tab */}
              <TabsContent value="parcel" className="space-y-4 mt-6">
                <h3 className="font-semibold text-lg text-[#5B8C5A] border-b border-[#DDD7B1] pb-2">
                  II. PARCEL IDENTIFIER
                </h3>

                <div className="space-y-3">
                  <Label className="text-[#2F3E2E] font-medium">Landscape</Label>
                  <RadioGroup
                    value={formData.landscape}
                    onValueChange={(value) => setFormData({ ...formData, landscape: value })}
                    className="p-4 bg-white rounded-md border border-[#C0B89F]"
                  >
                    <div className="grid grid-cols-3 gap-4">
                      {["Lowland", "Upland", "Hillyland", "Highland", "Peatland", "Others"].map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <RadioGroupItem value={type} id={type} className="border-[#5B8C5A] text-[#5B8C5A]" />
                          <Label htmlFor={type} className="text-[#2F3E2E] font-normal cursor-pointer">
                            {type}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                  {formData.landscape === "Others" && (
                    <div className="space-y-2">
                      <Label htmlFor="landscapeOthers" className="text-[#2F3E2E] font-medium">
                        Other (specify)
                      </Label>
                      <Input
                        id="landscapeOthers"
                        value={formData.landscapeOthers}
                        onChange={(e) => setFormData({ ...formData, landscapeOthers: e.target.value })}
                        className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                        placeholder="Please specify"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-[#2F3E2E] font-medium">
                      Description
                    </Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-[#2F3E2E] font-medium">
                      Location
                    </Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="farmArea" className="text-[#2F3E2E] font-medium">
                      Farm Area (ha)
                    </Label>
                    <Input
                      id="farmArea"
                      type="number"
                      step="0.01"
                      value={formData.farmArea}
                      onChange={(e) => setFormData({ ...formData, farmArea: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="region" className="text-[#2F3E2E] font-medium">
                      Region *
                    </Label>
                    <Input
                      id="region"
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      required
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="province" className="text-[#2F3E2E] font-medium">
                      Province *
                    </Label>
                    <Input
                      id="province"
                      value={formData.province}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                      required
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="municipality" className="text-[#2F3E2E] font-medium">
                      Municipality/City *
                    </Label>
                    <Input
                      id="municipality"
                      value={formData.municipality}
                      onChange={(e) => setFormData({ ...formData, municipality: e.target.value })}
                      required
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barangay" className="text-[#2F3E2E] font-medium">
                      Barangay
                    </Label>
                    <Input
                      id="barangay"
                      value={formData.barangay}
                      onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                </div>

                <Separator className="bg-[#DDD7B1]" />

                <div className="space-y-3">
                  <Label className="text-[#2F3E2E] font-medium">Parcel Demo Type</Label>
                  <RadioGroup
                    value={formData.parcelDemo}
                    onValueChange={(value) => setFormData({ ...formData, parcelDemo: value })}
                    className="p-4 bg-white rounded-md border border-[#C0B89F]"
                  >
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="NIA-Techno Demo" id="nia" className="border-[#5B8C5A] text-[#5B8C5A]" />
                        <Label htmlFor="nia" className="text-[#2F3E2E] font-normal cursor-pointer">
                          NIA-Techno Demo
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="SWISA-Techno Demo"
                          id="swisa"
                          className="border-[#5B8C5A] text-[#5B8C5A]"
                        />
                        <Label htmlFor="swisa" className="text-[#2F3E2E] font-normal cursor-pointer">
                          SWISA-Techno Demo
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="Non-Techno Demo"
                          id="non-techno"
                          className="border-[#5B8C5A] text-[#5B8C5A]"
                        />
                        <Label htmlFor="non-techno" className="text-[#2F3E2E] font-normal cursor-pointer">
                          Non-Techno Demo
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="parcelNoYearCropping" className="text-[#2F3E2E] font-medium">
                      Parcel No./Year/Cropping season/
                    </Label>
                    <Input
                      id="parcelNoYearCropping"
                      value={formData.parcelNoYearCropping}
                      onChange={(e) => setFormData({ ...formData, parcelNoYearCropping: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coordinates" className="text-[#2F3E2E] font-medium">
                      Coordinates
                    </Label>
                    <Input
                      id="coordinates"
                      value={formData.coordinates}
                      onChange={(e) => setFormData({ ...formData, coordinates: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="srmuNo" className="text-[#2F3E2E] font-medium">
                      Soil Reference Mapping Unit (SRMU) No.
                    </Label>
                    <Input
                      id="srmuNo"
                      value={formData.srmuNo}
                      onChange={(e) => setFormData({ ...formData, srmuNo: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="srmuCoordinates" className="text-[#2F3E2E] font-medium">
                      SRMU Coordinates
                    </Label>
                    <Input
                      id="srmuCoordinates"
                      value={formData.srmuCoordinates}
                      onChange={(e) => setFormData({ ...formData, srmuCoordinates: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shmsNo" className="text-[#2F3E2E] font-medium">
                      Soil Health Monitoring Site (SHMS) No.
                    </Label>
                    <Input
                      id="shmsNo"
                      value={formData.shmsNo}
                      onChange={(e) => setFormData({ ...formData, shmsNo: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shmsCoordinates" className="text-[#2F3E2E] font-medium">
                      SHMS Coordinates
                    </Label>
                    <Input
                      id="shmsCoordinates"
                      value={formData.shmsCoordinates}
                      onChange={(e) => setFormData({ ...formData, shmsCoordinates: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rsbsaNo" className="text-[#2F3E2E] font-medium">
                      RSBSA No.
                    </Label>
                    <Input
                      id="rsbsaNo"
                      value={formData.rsbsaNo}
                      onChange={(e) => setFormData({ ...formData, rsbsaNo: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fca" className="text-[#2F3E2E] font-medium">
                      FCA
                    </Label>
                    <Input
                      id="fca"
                      value={formData.fca}
                      onChange={(e) => setFormData({ ...formData, fca: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Farm Diagnosis Tab */}
              <TabsContent value="diagnosis" className="space-y-4 mt-6">
                <h3 className="font-semibold text-lg text-[#5B8C5A] border-b border-[#DDD7B1] pb-2">
                  III. FARM DIAGNOSIS
                </h3>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="croppingSeason1st" className="text-[#2F3E2E] font-medium">
                      1st Cropping Season (Date)
                    </Label>
                    <Input
                      id="croppingSeason1st"
                      type="date"
                      value={formData.croppingSeason1st}
                      onChange={(e) => setFormData({ ...formData, croppingSeason1st: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="croppingSeason2nd" className="text-[#2F3E2E] font-medium">
                      2nd Cropping Season (Date)
                    </Label>
                    <Input
                      id="croppingSeason2nd"
                      type="date"
                      value={formData.croppingSeason2nd}
                      onChange={(e) => setFormData({ ...formData, croppingSeason2nd: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="croppingSeason3rd" className="text-[#2F3E2E] font-medium">
                      3rd Cropping Season (Date)
                    </Label>
                    <Input
                      id="croppingSeason3rd"
                      type="date"
                      value={formData.croppingSeason3rd}
                      onChange={(e) => setFormData({ ...formData, croppingSeason3rd: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2 col-span-3">
                    <Label htmlFor="dateOfAnalysis" className="text-[#2F3E2E] font-medium">
                      Date of Analysis
                    </Label>
                    <Input
                      id="dateOfAnalysis"
                      type="date"
                      value={formData.dateOfAnalysis}
                      onChange={(e) => setFormData({ ...formData, dateOfAnalysis: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                </div>

                <Separator className="bg-[#DDD7B1]" />

                <h4 className="font-semibold text-[#5B8C5A] text-center">
                  TEST REPORT - SOIL HEALTH PARAMETERS at 0-30 cm
                </h4>

                {/* Pre-Planting Section */}
                <div className="space-y-4">
                  <div className="bg-[#FFA500] text-white p-2 text-center font-semibold rounded-t-md">Pre-Planting</div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-[#C0B89F]">
                      <thead>
                        <tr className="bg-[#FFA500] text-white">
                          <th className="border border-[#C0B89F] p-2 text-left">Parameter</th>
                          <th className="border border-[#C0B89F] p-2 text-center">1st Cropping Season</th>
                          <th className="border border-[#C0B89F] p-2 text-center">2nd Cropping Season</th>
                          <th className="border border-[#C0B89F] p-2 text-center">3rd Cropping Season</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {/* Soil Moisture Variation */}
                        <tr>
                          <td className="border border-[#C0B89F] p-2 font-medium text-[#2F3E2E]">
                            Soil Moisture Variation on specific site in the Farm
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <RadioGroup
                              value={formData.soilMoisturePrePlanting1st}
                              onValueChange={(value) => setFormData({ ...formData, soilMoisturePrePlanting1st: value })}
                              className="flex gap-2"
                            >
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="RF" id="rf-pre-1" />
                                <Label htmlFor="rf-pre-1" className="text-xs">
                                  RF
                                </Label>
                              </div>
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="M" id="m-pre-1" />
                                <Label htmlFor="m-pre-1" className="text-xs">
                                  M
                                </Label>
                              </div>
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="NF/DP" id="nf-pre-1" />
                                <Label htmlFor="nf-pre-1" className="text-xs">
                                  NF/DP
                                </Label>
                              </div>
                            </RadioGroup>
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <RadioGroup
                              value={formData.soilMoisturePrePlanting2nd}
                              onValueChange={(value) => setFormData({ ...formData, soilMoisturePrePlanting2nd: value })}
                              className="flex gap-2"
                            >
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="RF" id="rf-pre-2" />
                                <Label htmlFor="rf-pre-2" className="text-xs">
                                  RF
                                </Label>
                              </div>
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="M" id="m-pre-2" />
                                <Label htmlFor="m-pre-2" className="text-xs">
                                  M
                                </Label>
                              </div>
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="NF/DP" id="nf-pre-2" />
                                <Label htmlFor="nf-pre-2" className="text-xs">
                                  NF/DP
                                </Label>
                              </div>
                            </RadioGroup>
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <RadioGroup
                              value={formData.soilMoisturePrePlanting3rd}
                              onValueChange={(value) => setFormData({ ...formData, soilMoisturePrePlanting3rd: value })}
                              className="flex gap-2"
                            >
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="RF" id="rf-pre-3" />
                                <Label htmlFor="rf-pre-3" className="text-xs">
                                  RF
                                </Label>
                              </div>
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="M" id="m-pre-3" />
                                <Label htmlFor="m-pre-3" className="text-xs">
                                  M
                                </Label>
                              </div>
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="NF/DP" id="nf-pre-3" />
                                <Label htmlFor="nf-pre-3" className="text-xs">
                                  NF/DP
                                </Label>
                              </div>
                            </RadioGroup>
                          </td>
                        </tr>

                        {/* Soil pH */}
                        <tr>
                          <td className="border border-[#C0B89F] p-2 font-medium text-[#2F3E2E]">Soil pH (STK)</td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.1"
                              value={formData.soilPhPrePlanting1st}
                              onChange={(e) => setFormData({ ...formData, soilPhPrePlanting1st: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.1"
                              value={formData.soilPhPrePlanting2nd}
                              onChange={(e) => setFormData({ ...formData, soilPhPrePlanting2nd: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.1"
                              value={formData.soilPhPrePlanting3rd}
                              onChange={(e) => setFormData({ ...formData, soilPhPrePlanting3rd: e.target.value })}
                              className="h-8"
                            />
                          </td>
                        </tr>

                        {/* Nitrogen */}
                        <tr>
                          <td className="border border-[#C0B89F] p-2 font-medium text-[#2F3E2E]">
                            Nitrogen (N), % (STK)
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.nitrogenPrePlanting1st}
                              onChange={(e) => setFormData({ ...formData, nitrogenPrePlanting1st: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.nitrogenPrePlanting2nd}
                              onChange={(e) => setFormData({ ...formData, nitrogenPrePlanting2nd: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.nitrogenPrePlanting3rd}
                              onChange={(e) => setFormData({ ...formData, nitrogenPrePlanting3rd: e.target.value })}
                              className="h-8"
                            />
                          </td>
                        </tr>

                        {/* Phosphorous */}
                        <tr>
                          <td className="border border-[#C0B89F] p-2 font-medium text-[#2F3E2E]">
                            Phosphorous (P), mg/kg (STK)
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.phosphorousPrePlanting1st}
                              onChange={(e) => setFormData({ ...formData, phosphorousPrePlanting1st: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.phosphorousPrePlanting2nd}
                              onChange={(e) => setFormData({ ...formData, phosphorousPrePlanting2nd: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.phosphorousPrePlanting3rd}
                              onChange={(e) => setFormData({ ...formData, phosphorousPrePlanting3rd: e.target.value })}
                              className="h-8"
                            />
                          </td>
                        </tr>

                        {/* Potassium */}
                        <tr>
                          <td className="border border-[#C0B89F] p-2 font-medium text-[#2F3E2E]">
                            Potassium (K), cmol/kg (STK)
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.potassiumPrePlanting1st}
                              onChange={(e) => setFormData({ ...formData, potassiumPrePlanting1st: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.potassiumPrePlanting2nd}
                              onChange={(e) => setFormData({ ...formData, potassiumPrePlanting2nd: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.potassiumPrePlanting3rd}
                              onChange={(e) => setFormData({ ...formData, potassiumPrePlanting3rd: e.target.value })}
                              className="h-8"
                            />
                          </td>
                        </tr>

                        {/* Organic Carbon */}
                        <tr>
                          <td className="border border-[#C0B89F] p-2 font-medium text-[#2F3E2E]">
                            Organic Carbon (OC %)
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.organicCarbonPrePlanting1st}
                              onChange={(e) =>
                                setFormData({ ...formData, organicCarbonPrePlanting1st: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.organicCarbonPrePlanting2nd}
                              onChange={(e) =>
                                setFormData({ ...formData, organicCarbonPrePlanting2nd: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.organicCarbonPrePlanting3rd}
                              onChange={(e) =>
                                setFormData({ ...formData, organicCarbonPrePlanting3rd: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                        </tr>

                        {/* Soil Texture */}
                        <tr>
                          <td className="border border-[#C0B89F] p-2 font-medium text-[#2F3E2E]">Soil Texture</td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              value={formData.soilTexturePrePlanting1st}
                              onChange={(e) => setFormData({ ...formData, soilTexturePrePlanting1st: e.target.value })}
                              className="h-8"
                            />
                            <div className="flex gap-2 mt-1">
                              <label className="flex items-center text-xs">
                                <Checkbox
                                  checked={formData.soilTextureMethodPrePlanting1st === "Feel Method"}
                                  onCheckedChange={(checked) =>
                                    setFormData({
                                      ...formData,
                                      soilTextureMethodPrePlanting1st: checked ? "Feel Method" : "",
                                    })
                                  }
                                  className="mr-1"
                                />
                                Feel Method
                              </label>
                              <label className="flex items-center text-xs">
                                <Checkbox
                                  checked={formData.soilTextureMethodPrePlanting1st === "Lab. Analysis"}
                                  onCheckedChange={(checked) =>
                                    setFormData({
                                      ...formData,
                                      soilTextureMethodPrePlanting1st: checked ? "Lab. Analysis" : "",
                                    })
                                  }
                                  className="mr-1"
                                />
                                Lab. Analysis
                              </label>
                            </div>
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              value={formData.soilTexturePrePlanting2nd}
                              onChange={(e) => setFormData({ ...formData, soilTexturePrePlanting2nd: e.target.value })}
                              className="h-8"
                            />
                            <div className="flex gap-2 mt-1">
                              <label className="flex items-center text-xs">
                                <Checkbox
                                  checked={formData.soilTextureMethodPrePlanting2nd === "Feel Method"}
                                  onCheckedChange={(checked) =>
                                    setFormData({
                                      ...formData,
                                      soilTextureMethodPrePlanting2nd: checked ? "Feel Method" : "",
                                    })
                                  }
                                  className="mr-1"
                                />
                                Feel Method
                              </label>
                              <label className="flex items-center text-xs">
                                <Checkbox
                                  checked={formData.soilTextureMethodPrePlanting2nd === "Lab. Analysis"}
                                  onCheckedChange={(checked) =>
                                    setFormData({
                                      ...formData,
                                      soilTextureMethodPrePlanting2nd: checked ? "Lab. Analysis" : "",
                                    })
                                  }
                                  className="mr-1"
                                />
                                Lab. Analysis
                              </label>
                            </div>
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              value={formData.soilTexturePrePlanting3rd}
                              onChange={(e) => setFormData({ ...formData, soilTexturePrePlanting3rd: e.target.value })}
                              className="h-8"
                            />
                            <div className="flex gap-2 mt-1">
                              <label className="flex items-center text-xs">
                                <Checkbox
                                  checked={formData.soilTextureMethodPrePlanting3rd === "Feel Method"}
                                  onCheckedChange={(checked) =>
                                    setFormData({
                                      ...formData,
                                      soilTextureMethodPrePlanting3rd: checked ? "Feel Method" : "",
                                    })
                                  }
                                  className="mr-1"
                                />
                                Feel Method
                              </label>
                              <label className="flex items-center text-xs">
                                <Checkbox
                                  checked={formData.soilTextureMethodPrePlanting3rd === "Lab. Analysis"}
                                  onCheckedChange={(checked) =>
                                    setFormData({
                                      ...formData,
                                      soilTextureMethodPrePlanting3rd: checked ? "Lab. Analysis" : "",
                                    })
                                  }
                                  className="mr-1"
                                />
                                Lab. Analysis
                              </label>
                            </div>
                          </td>
                        </tr>

                        {/* Soil Color */}
                        <tr>
                          <td className="border border-[#C0B89F] p-2 font-medium text-[#2F3E2E]">Soil Color</td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              value={formData.soilColorPrePlanting1st}
                              onChange={(e) => setFormData({ ...formData, soilColorPrePlanting1st: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              value={formData.soilColorPrePlanting2nd}
                              onChange={(e) => setFormData({ ...formData, soilColorPrePlanting2nd: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              value={formData.soilColorPrePlanting3rd}
                              onChange={(e) => setFormData({ ...formData, soilColorPrePlanting3rd: e.target.value })}
                              className="h-8"
                            />
                          </td>
                        </tr>

                        {/* Soil Microbial Respiration */}
                        <tr>
                          <td className="border border-[#C0B89F] p-2 font-medium text-[#2F3E2E]">
                            Soil Microbial Respiration Rate (CO2-C/kg/ha/day)
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.soilMicrobialRespirationPrePlanting1st}
                              onChange={(e) =>
                                setFormData({ ...formData, soilMicrobialRespirationPrePlanting1st: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.soilMicrobialRespirationPrePlanting2nd}
                              onChange={(e) =>
                                setFormData({ ...formData, soilMicrobialRespirationPrePlanting2nd: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.soilMicrobialRespirationPrePlanting3rd}
                              onChange={(e) =>
                                setFormData({ ...formData, soilMicrobialRespirationPrePlanting3rd: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                        </tr>

                        {/* Earthworm population */}
                        <tr>
                          <td className="border border-[#C0B89F] p-2 font-medium text-[#2F3E2E]">
                            Earthworm population density (average no./m2)
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              value={formData.earthwormPopulationPrePlanting1st}
                              onChange={(e) =>
                                setFormData({ ...formData, earthwormPopulationPrePlanting1st: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              value={formData.earthwormPopulationPrePlanting2nd}
                              onChange={(e) =>
                                setFormData({ ...formData, earthwormPopulationPrePlanting2nd: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              value={formData.earthwormPopulationPrePlanting3rd}
                              onChange={(e) =>
                                setFormData({ ...formData, earthwormPopulationPrePlanting3rd: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                        </tr>

                        {/* Root length and weight */}
                        <tr>
                          <td className="border border-[#C0B89F] p-2 font-medium text-[#2F3E2E]">
                            Root length and weight
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              value={formData.rootLengthWeightPrePlanting1st}
                              onChange={(e) =>
                                setFormData({ ...formData, rootLengthWeightPrePlanting1st: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              value={formData.rootLengthWeightPrePlanting2nd}
                              onChange={(e) =>
                                setFormData({ ...formData, rootLengthWeightPrePlanting2nd: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              value={formData.rootLengthWeightPrePlanting3rd}
                              onChange={(e) =>
                                setFormData({ ...formData, rootLengthWeightPrePlanting3rd: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                        </tr>

                        {/* Biomass */}
                        <tr>
                          <td className="border border-[#C0B89F] p-2 font-medium text-[#2F3E2E]">
                            Biomass (average total weight/m²)
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.biomassPrePlanting1st}
                              onChange={(e) => setFormData({ ...formData, biomassPrePlanting1st: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.biomassPrePlanting2nd}
                              onChange={(e) => setFormData({ ...formData, biomassPrePlanting2nd: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.biomassPrePlanting3rd}
                              onChange={(e) => setFormData({ ...formData, biomassPrePlanting3rd: e.target.value })}
                              className="h-8"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <Separator className="bg-[#DDD7B1] my-6" />

                {/* Postharvest Section */}
                <div className="space-y-4">
                  <div className="bg-[#FFA500] text-white p-2 text-center font-semibold rounded-t-md">
                    Postharvest (mm/dd/yyyy)
                  </div>

                  {/* Date inputs for postharvest */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label className="text-[#2F3E2E] font-medium text-sm">1st Cropping Season Date</Label>
                      <Input
                        type="date"
                        value={formData.postharvest1stDate}
                        onChange={(e) => setFormData({ ...formData, postharvest1stDate: e.target.value })}
                        className="bg-white border-[#C0B89F]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#2F3E2E] font-medium text-sm">2nd Cropping Season Date</Label>
                      <Input
                        type="date"
                        value={formData.postharvest2ndDate}
                        onChange={(e) => setFormData({ ...formData, postharvest2ndDate: e.target.value })}
                        className="bg-white border-[#C0B89F]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#2F3E2E] font-medium text-sm">3rd Cropping Season Date</Label>
                      <Input
                        type="date"
                        value={formData.postharvest3rdDate}
                        onChange={(e) => setFormData({ ...formData, postharvest3rdDate: e.target.value })}
                        className="bg-white border-[#C0B89F]"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-[#C0B89F]">
                      <thead>
                        <tr className="bg-[#FFA500] text-white">
                          <th className="border border-[#C0B89F] p-2 text-left">Parameter</th>
                          <th className="border border-[#C0B89F] p-2 text-center">1st Cropping Season</th>
                          <th className="border border-[#C0B89F] p-2 text-center">2nd Cropping Season</th>
                          <th className="border border-[#C0B89F] p-2 text-center">3rd Cropping Season</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {/* Soil Moisture Variation */}
                        <tr>
                          <td className="border border-[#C0B89F] p-2 font-medium text-[#2F3E2E]">
                            Soil Moisture Variation on specific site in the Farm
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <RadioGroup
                              value={formData.soilMoisturePostharvest1st}
                              onValueChange={(value) => setFormData({ ...formData, soilMoisturePostharvest1st: value })}
                              className="flex gap-2"
                            >
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="RF" id="rf-post-1" />
                                <Label htmlFor="rf-post-1" className="text-xs">
                                  RF
                                </Label>
                              </div>
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="M" id="m-post-1" />
                                <Label htmlFor="m-post-1" className="text-xs">
                                  M
                                </Label>
                              </div>
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="NF/DP" id="nf-post-1" />
                                <Label htmlFor="nf-post-1" className="text-xs">
                                  NF/DP
                                </Label>
                              </div>
                            </RadioGroup>
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <RadioGroup
                              value={formData.soilMoisturePostharvest2nd}
                              onValueChange={(value) => setFormData({ ...formData, soilMoisturePostharvest2nd: value })}
                              className="flex gap-2"
                            >
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="RF" id="rf-post-2" />
                                <Label htmlFor="rf-post-2" className="text-xs">
                                  RF
                                </Label>
                              </div>
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="M" id="m-post-2" />
                                <Label htmlFor="m-post-2" className="text-xs">
                                  M
                                </Label>
                              </div>
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="NF/DP" id="nf-post-2" />
                                <Label htmlFor="nf-post-2" className="text-xs">
                                  NF/DP
                                </Label>
                              </div>
                            </RadioGroup>
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <RadioGroup
                              value={formData.soilMoisturePostharvest3rd}
                              onValueChange={(value) => setFormData({ ...formData, soilMoisturePostharvest3rd: value })}
                              className="flex gap-2"
                            >
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="RF" id="rf-post-3" />
                                <Label htmlFor="rf-post-3" className="text-xs">
                                  RF
                                </Label>
                              </div>
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="M" id="m-post-3" />
                                <Label htmlFor="m-post-3" className="text-xs">
                                  M
                                </Label>
                              </div>
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="NF/DP" id="nf-post-3" />
                                <Label htmlFor="nf-post-3" className="text-xs">
                                  NF/DP
                                </Label>
                              </div>
                            </RadioGroup>
                          </td>
                        </tr>

                        {/* Soil pH */}
                        <tr>
                          <td className="border border-[#C0B89F] p-2 font-medium text-[#2F3E2E]">Soil pH (STK)</td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.1"
                              value={formData.soilPhPostharvest1st}
                              onChange={(e) => setFormData({ ...formData, soilPhPostharvest1st: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.1"
                              value={formData.soilPhPostharvest2nd}
                              onChange={(e) => setFormData({ ...formData, soilPhPostharvest2nd: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.1"
                              value={formData.soilPhPostharvest3rd}
                              onChange={(e) => setFormData({ ...formData, soilPhPostharvest3rd: e.target.value })}
                              className="h-8"
                            />
                          </td>
                        </tr>

                        {/* Nitrogen */}
                        <tr>
                          <td className="border border-[#C0B89F] p-2 font-medium text-[#2F3E2E]">
                            Nitrogen (N), % (STK)
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.nitrogenPostharvest1st}
                              onChange={(e) => setFormData({ ...formData, nitrogenPostharvest1st: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.nitrogenPostharvest2nd}
                              onChange={(e) => setFormData({ ...formData, nitrogenPostharvest2nd: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.nitrogenPostharvest3rd}
                              onChange={(e) => setFormData({ ...formData, nitrogenPostharvest3rd: e.target.value })}
                              className="h-8"
                            />
                          </td>
                        </tr>

                        {/* Phosphorous */}
                        <tr>
                          <td className="border border-[#C0B89F] p-2 font-medium text-[#2F3E2E]">
                            Phosphorous (P), mg/kg (STK)
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.phosphorousPostharvest1st}
                              onChange={(e) => setFormData({ ...formData, phosphorousPostharvest1st: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.phosphorousPostharvest2nd}
                              onChange={(e) => setFormData({ ...formData, phosphorousPostharvest2nd: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.phosphorousPostharvest3rd}
                              onChange={(e) => setFormData({ ...formData, phosphorousPostharvest3rd: e.target.value })}
                              className="h-8"
                            />
                          </td>
                        </tr>

                        {/* Potassium */}
                        <tr>
                          <td className="border border-[#C0B89F] p-2 font-medium text-[#2F3E2E]">
                            Potassium (K), cmol/kg (STK)
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.potassiumPostharvest1st}
                              onChange={(e) => setFormData({ ...formData, potassiumPostharvest1st: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.potassiumPostharvest2nd}
                              onChange={(e) => setFormData({ ...formData, potassiumPostharvest2nd: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.potassiumPostharvest3rd}
                              onChange={(e) => setFormData({ ...formData, potassiumPostharvest3rd: e.target.value })}
                              className="h-8"
                            />
                          </td>
                        </tr>

                        {/* Organic Carbon */}
                        <tr>
                          <td className="border border-[#C0B89F] p-2 font-medium text-[#2F3E2E]">
                            Organic Carbon (OC %)
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.organicCarbonPostharvest1st}
                              onChange={(e) =>
                                setFormData({ ...formData, organicCarbonPostharvest1st: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.organicCarbonPostharvest2nd}
                              onChange={(e) =>
                                setFormData({ ...formData, organicCarbonPostharvest2nd: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.organicCarbonPostharvest3rd}
                              onChange={(e) =>
                                setFormData({ ...formData, organicCarbonPostharvest3rd: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                        </tr>

                        {/* Soil Texture */}
                        <tr>
                          <td className="border border-[#C0B89F] p-2 font-medium text-[#2F3E2E]">Soil Texture</td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              value={formData.soilTexturePostharvest1st}
                              onChange={(e) => setFormData({ ...formData, soilTexturePostharvest1st: e.target.value })}
                              className="h-8"
                            />
                            <div className="flex gap-2 mt-1">
                              <label className="flex items-center text-xs">
                                <Checkbox
                                  checked={formData.soilTextureMethodPostharvest1st === "Feel Method"}
                                  onCheckedChange={(checked) =>
                                    setFormData({
                                      ...formData,
                                      soilTextureMethodPostharvest1st: checked ? "Feel Method" : "",
                                    })
                                  }
                                  className="mr-1"
                                />
                                Feel Method
                              </label>
                              <label className="flex items-center text-xs">
                                <Checkbox
                                  checked={formData.soilTextureMethodPostharvest1st === "Lab. Analysis"}
                                  onCheckedChange={(checked) =>
                                    setFormData({
                                      ...formData,
                                      soilTextureMethodPostharvest1st: checked ? "Lab. Analysis" : "",
                                    })
                                  }
                                  className="mr-1"
                                />
                                Lab. Analysis
                              </label>
                            </div>
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              value={formData.soilTexturePostharvest2nd}
                              onChange={(e) => setFormData({ ...formData, soilTexturePostharvest2nd: e.target.value })}
                              className="h-8"
                            />
                            <div className="flex gap-2 mt-1">
                              <label className="flex items-center text-xs">
                                <Checkbox
                                  checked={formData.soilTextureMethodPostharvest2nd === "Feel Method"}
                                  onCheckedChange={(checked) =>
                                    setFormData({
                                      ...formData,
                                      soilTextureMethodPostharvest2nd: checked ? "Feel Method" : "",
                                    })
                                  }
                                  className="mr-1"
                                />
                                Feel Method
                              </label>
                              <label className="flex items-center text-xs">
                                <Checkbox
                                  checked={formData.soilTextureMethodPostharvest2nd === "Lab. Analysis"}
                                  onCheckedChange={(checked) =>
                                    setFormData({
                                      ...formData,
                                      soilTextureMethodPostharvest2nd: checked ? "Lab. Analysis" : "",
                                    })
                                  }
                                  className="mr-1"
                                />
                                Lab. Analysis
                              </label>
                            </div>
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              value={formData.soilTexturePostharvest3rd}
                              onChange={(e) => setFormData({ ...formData, soilTexturePostharvest3rd: e.target.value })}
                              className="h-8"
                            />
                            <div className="flex gap-2 mt-1">
                              <label className="flex items-center text-xs">
                                <Checkbox
                                  checked={formData.soilTextureMethodPostharvest3rd === "Feel Method"}
                                  onCheckedChange={(checked) =>
                                    setFormData({
                                      ...formData,
                                      soilTextureMethodPostharvest3rd: checked ? "Feel Method" : "",
                                    })
                                  }
                                  className="mr-1"
                                />
                                Feel Method
                              </label>
                              <label className="flex items-center text-xs">
                                <Checkbox
                                  checked={formData.soilTextureMethodPostharvest3rd === "Lab. Analysis"}
                                  onCheckedChange={(checked) =>
                                    setFormData({
                                      ...formData,
                                      soilTextureMethodPostharvest3rd: checked ? "Lab. Analysis" : "",
                                    })
                                  }
                                  className="mr-1"
                                />
                                Lab. Analysis
                              </label>
                            </div>
                          </td>
                        </tr>

                        {/* Soil Color */}
                        <tr>
                          <td className="border border-[#C0B89F] p-2 font-medium text-[#2F3E2E]">Soil Color</td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              value={formData.soilColorPostharvest1st}
                              onChange={(e) => setFormData({ ...formData, soilColorPostharvest1st: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              value={formData.soilColorPostharvest2nd}
                              onChange={(e) => setFormData({ ...formData, soilColorPostharvest2nd: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              value={formData.soilColorPostharvest3rd}
                              onChange={(e) => setFormData({ ...formData, soilColorPostharvest3rd: e.target.value })}
                              className="h-8"
                            />
                          </td>
                        </tr>

                        {/* Soil Microbial Respiration */}
                        <tr>
                          <td className="border border-[#C0B89F] p-2 font-medium text-[#2F3E2E]">
                            Soil Microbial Respiration Rate (CO2-C/kg/ha/day)
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.soilMicrobialRespirationPostharvest1st}
                              onChange={(e) =>
                                setFormData({ ...formData, soilMicrobialRespirationPostharvest1st: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.soilMicrobialRespirationPostharvest2nd}
                              onChange={(e) =>
                                setFormData({ ...formData, soilMicrobialRespirationPostharvest2nd: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.soilMicrobialRespirationPostharvest3rd}
                              onChange={(e) =>
                                setFormData({ ...formData, soilMicrobialRespirationPostharvest3rd: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                        </tr>

                        {/* Earthworm population */}
                        <tr>
                          <td className="border border-[#C0B89F] p-2 font-medium text-[#2F3E2E]">
                            Earthworm population density (average no./m2)
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              value={formData.earthwormPopulationPostharvest1st}
                              onChange={(e) =>
                                setFormData({ ...formData, earthwormPopulationPostharvest1st: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              value={formData.earthwormPopulationPostharvest2nd}
                              onChange={(e) =>
                                setFormData({ ...formData, earthwormPopulationPostharvest2nd: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              value={formData.earthwormPopulationPostharvest3rd}
                              onChange={(e) =>
                                setFormData({ ...formData, earthwormPopulationPostharvest3rd: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                        </tr>

                        {/* Root length and weight */}
                        <tr>
                          <td className="border border-[#C0B89F] p-2 font-medium text-[#2F3E2E]">
                            Root length and weight
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              value={formData.rootLengthWeightPostharvest1st}
                              onChange={(e) =>
                                setFormData({ ...formData, rootLengthWeightPostharvest1st: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              value={formData.rootLengthWeightPostharvest2nd}
                              onChange={(e) =>
                                setFormData({ ...formData, rootLengthWeightPostharvest2nd: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              value={formData.rootLengthWeightPostharvest3rd}
                              onChange={(e) =>
                                setFormData({ ...formData, rootLengthWeightPostharvest3rd: e.target.value })
                              }
                              className="h-8"
                            />
                          </td>
                        </tr>

                        {/* Biomass */}
                        <tr>
                          <td className="border border-[#C0B89F] p-2 font-medium text-[#2F3E2E]">
                            Biomass (average total weight/m²)
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.biomassPostharvest1st}
                              onChange={(e) => setFormData({ ...formData, biomassPostharvest1st: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.biomassPostharvest2nd}
                              onChange={(e) => setFormData({ ...formData, biomassPostharvest2nd: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="border border-[#C0B89F] p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.biomassPostharvest3rd}
                              onChange={(e) => setFormData({ ...formData, biomassPostharvest3rd: e.target.value })}
                              className="h-8"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <Separator className="bg-[#DDD7B1] my-6" />

                <h4 className="font-semibold text-[#5B8C5A]">Soil Fertility Rating</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="soilPhInterpretation" className="text-[#2F3E2E] font-medium">
                      Soil pH Interpretation
                    </Label>
                    <Input
                      id="soilPhInterpretation"
                      value={formData.soilPhInterpretation}
                      onChange={(e) => setFormData({ ...formData, soilPhInterpretation: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nitrogenInterpretation" className="text-[#2F3E2E] font-medium">
                      Nitrogen (%) Interpretation
                    </Label>
                    <Input
                      id="nitrogenInterpretation"
                      value={formData.nitrogenInterpretation}
                      onChange={(e) => setFormData({ ...formData, nitrogenInterpretation: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phosphorousInterpretation" className="text-[#2F3E2E] font-medium">
                      Phosphorous (P) Interpretation
                    </Label>
                    <Input
                      id="phosphorousInterpretation"
                      value={formData.phosphorousInterpretation}
                      onChange={(e) => setFormData({ ...formData, phosphorousInterpretation: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="potassiumInterpretation" className="text-[#2F3E2E] font-medium">
                      Potassium (K) Interpretation
                    </Label>
                    <Input
                      id="potassiumInterpretation"
                      value={formData.potassiumInterpretation}
                      onChange={(e) => setFormData({ ...formData, potassiumInterpretation: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Certification Tab */}
              <TabsContent value="certification" className="space-y-4 mt-6">
                <h3 className="font-semibold text-lg text-[#5B8C5A] border-b border-[#DDD7B1] pb-2">Certified by:</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="agriculturist" className="text-[#2F3E2E] font-medium">
                      Agriculturist
                    </Label>
                    <Input
                      id="agriculturist"
                      value={formData.agriculturist}
                      onChange={(e) => setFormData({ ...formData, agriculturist: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chemist" className="text-[#2F3E2E] font-medium">
                      Chemist
                    </Label>
                    <Input
                      id="chemist"
                      value={formData.chemist}
                      onChange={(e) => setFormData({ ...formData, chemist: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chiefAgriculturist" className="text-[#2F3E2E] font-medium">
                      Chief Agriculturist
                    </Label>
                    <Input
                      id="chiefAgriculturist"
                      value={formData.chiefAgriculturist}
                      onChange={(e) => setFormData({ ...formData, chiefAgriculturist: e.target.value })}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] focus:border-[#5B8C5A] focus:ring-[#5B8C5A]"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-4 pt-4 border-t border-[#DDD7B1]">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-[#C0B89F] text-[#2F3E2E] hover:bg-[#E0D9C0]"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-[#5B8C5A] hover:bg-[#4A7349] text-white">
                {initialData ? "Update" : "Add"} Soil Health Card
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
