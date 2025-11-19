"use client"

import type React from "react"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { TableCell, TableHead, TableRow, TableHeader, TableBody, Table } from "@/components/ui/table"
import { X, Save } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Interface for individual sample row data in the form, defined here as it's specific to this modal
interface SampleRowData {
  sampleID: string
  depth: string
  longitude: string
  latitude: string
  collectionDate: string // YYYY-MM-DD format
  location: string
}

interface SamplePrepFormModalProps {
  isOpen: boolean
  onClose: () => void
  samplePrepFormData: {
    sampleType: string
    preparedBy: string
    prepMethod: string
    notes: string
    status: string
  }
  setSamplePrepFormData: React.Dispatch<
    React.SetStateAction<{
      sampleType: string
      preparedBy: string
      prepMethod: string
      notes: string
      status: string
    }>
  >
  numberOfSamples: number
  setNumberOfSamples: React.Dispatch<React.SetStateAction<number>>
  samplesData: SampleRowData[]
  setSamplesData: React.Dispatch<React.SetStateAction<SampleRowData[]>>
  handlePrepFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  handlePrepSelectChange: (name: string, value: string) => void
  handleNumberOfSamplesChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleSampleRowChange: (index: number, field: keyof SampleRowData, value: string) => void
  handleSamplePrepSubmit: (e: React.FormEvent) => Promise<void>
}

export function SamplePrepFormModal({
  isOpen,
  onClose,
  samplePrepFormData,
  setSamplePrepFormData,
  numberOfSamples,
  setNumberOfSamples,
  samplesData,
  setSamplesData,
  handlePrepFormChange,
  handlePrepSelectChange,
  handleNumberOfSamplesChange,
  handleSampleRowChange,
  handleSamplePrepSubmit,
}: SamplePrepFormModalProps) {
  // Effect to update samplesData when numberOfSamples changes
  useEffect(() => {
    const newSamplesData = Array.from({ length: numberOfSamples }, (_, i) => {
      // Preserve existing data if number of samples decreases or increases
      return (
        samplesData[i] || {
          sampleID: "",
          depth: "",
          longitude: "",
          latitude: "",
          collectionDate: new Date().toISOString().split("T")[0],
          location: "",
        }
      )
    })
    setSamplesData(newSamplesData)
  }, [numberOfSamples, setSamplesData])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-auto">
      <div className="bg-[#F0EAD6] border-[#DDD7B1] rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#DDD7B1]">
          <h2 className="text-xl font-bold text-[#2F3E2E]">Add Soil Sample for Preparation</h2>
          <Button
            variant="ghost"
            size="icon"
            className="text-[#8B8378] hover:text-[#2F3E2E] hover:bg-[#C0B89F]"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <form onSubmit={handleSamplePrepSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sampleType" className="text-[#2F3E2E]">
                Sample Type *
              </Label>
              <Select
                value={samplePrepFormData.sampleType}
                onValueChange={(value) => handlePrepSelectChange("sampleType", value)}
              >
                <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                  <SelectValue placeholder="Select sample type" />
                </SelectTrigger>
                <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
                  <SelectItem value="soil">Soil</SelectItem>
                  <SelectItem value="plant">Plant</SelectItem>
                  <SelectItem value="fertilizer">Fertilizer</SelectItem>
                  <SelectItem value="water">Water</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preparedBy" className="text-[#2F3E2E]">
                Prepared By *
              </Label>
              <Input
                id="preparedBy"
                name="preparedBy"
                value={samplePrepFormData.preparedBy}
                onChange={handlePrepFormChange}
                className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
                placeholder="Name of technician"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prepMethod" className="text-[#2F3E2E]">
                Preparation Method *
              </Label>
              <Select
                value={samplePrepFormData.prepMethod}
                onValueChange={(value) => handlePrepSelectChange("prepMethod", value)}
              >
                <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                  <SelectValue placeholder="Select preparation method" />
                </SelectTrigger>
                <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
                  <SelectItem value="drying">Air Drying</SelectItem>
                  <SelectItem value="grinding">Grinding</SelectItem>
                  <SelectItem value="sieving">Sieving</SelectItem>
                  <SelectItem value="extraction">Extraction</SelectItem>
                  <SelectItem value="digestion">Digestion</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-[#2F3E2E]">
                Status *
              </Label>
              <Select
                value={samplePrepFormData.status}
                onValueChange={(value) => handlePrepSelectChange("status", value)}
              >
                <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">In Preparation</SelectItem>
                  <SelectItem value="ready">Ready for Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes" className="text-[#2F3E2E]">
                Notes
              </Label>
              <Textarea
                id="notes"
                name="notes"
                value={samplePrepFormData.notes}
                onChange={handlePrepFormChange}
                className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] min-h-[100px] placeholder:text-[#8B8378]"
                placeholder="Additional notes about the sample preparation"
              />
            </div>
          </div>

          {/* Number of Samples Input */}
          <div className="space-y-2 pt-4 border-t border-[#DDD7B1]">
            <Label htmlFor="numberOfSamples" className="text-[#2F3E2E]">
              Number of Samples *
            </Label>
            <Input
              id="numberOfSamples"
              name="numberOfSamples"
              type="number"
              min="1"
              value={numberOfSamples}
              onChange={handleNumberOfSamplesChange}
              className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
              required
            />
          </div>

          {/* Dynamic Table for Sample Details */}
          {numberOfSamples > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-[#2F3E2E]">Sample Details</h3>
              <div className="rounded-md border border-[#DDD7B1] overflow-hidden">
                <div className="overflow-x-auto max-h-[300px]">
                  <Table className="w-full min-w-[1100px]">
                    <TableHeader className="bg-[#C0B89F] sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="text-[#2F3E2E] w-[150px]">Sample ID</TableHead>
                        <TableHead className="text-[#2F3E2E] w-[250px]">Sampling Site</TableHead>
                        <TableHead className="text-[#2F3E2E] w-[120px]">Sample Depth</TableHead>
                        <TableHead className="text-[#2F3E2E] w-[280px]">Sampling Coordinate (Long, Lat)</TableHead>
                        <TableHead className="text-[#2F3E2E] w-[150px]">Collection Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {samplesData.map((sample, index) => (
                        <TableRow key={index} className="hover:bg-[#E0D9C0] border-[#DDD7B1]">
                          <TableCell>
                            <Input
                              type="text"
                              value={sample.sampleID}
                              onChange={(e) => handleSampleRowChange(index, "sampleID", e.target.value)}
                              className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378] w-full"
                              placeholder="e.g., SOIL-001"
                              required
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              value={sample.location}
                              onChange={(e) => handleSampleRowChange(index, "location", e.target.value)}
                              className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378] w-full"
                              placeholder="e.g., North Field"
                              required
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              value={sample.depth}
                              onChange={(e) => handleSampleRowChange(index, "depth", e.target.value)}
                              className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378] w-full"
                              placeholder="e.g., 15cm"
                            />
                          </TableCell>
                          <TableCell className="flex gap-2">
                            <Input
                              type="text"
                              value={sample.longitude}
                              onChange={(e) => handleSampleRowChange(index, "longitude", e.target.value)}
                              className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378] w-1/2"
                              placeholder="Longitude"
                            />
                            <Input
                              type="text"
                              value={sample.latitude}
                              onChange={(e) => handleSampleRowChange(index, "latitude", e.target.value)}
                              className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378] w-1/2"
                              placeholder="Latitude"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={sample.collectionDate}
                              onChange={(e) => handleSampleRowChange(index, "collectionDate", e.target.value)}
                              className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] w-full"
                              required
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-4 pt-4 border-t border-[#DDD7B1]">
            <Button type="button" className="bg-[#5B8C5A] hover:bg-[#4A7049] text-white" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#5B8C5A] hover:bg-[#4A7049] text-white">
              <Save className="h-4 w-4 mr-2" />
              Save Samples
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
