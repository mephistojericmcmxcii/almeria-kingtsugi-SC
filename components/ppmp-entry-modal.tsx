"use client"

import type React from "react"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { NSHPRecord } from "@/components/nshp-data-form"
import { db } from "@/lib/firebase"
import { collection, addDoc } from "firebase/firestore"

interface PPMPEntryModalProps {
  nshpRecord: NSHPRecord
  selectedMonth: string
  selectedYear: string
  onClose: () => void
}

export default function PPMPEntryModal({ nshpRecord, selectedMonth, selectedYear, onClose }: PPMPEntryModalProps) {
  const [ppmpCode, setPpmpCode] = useState("")
  const [particular, setParticular] = useState("")
  const [unitPrice, setUnitPrice] = useState<number>(0)
  const [unitOfMeasure, setUnitOfMeasure] = useState("")
  const [quantity, setQuantity] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculate total
  const total = unitPrice * quantity

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!ppmpCode || !particular || !unitOfMeasure || unitPrice <= 0 || quantity <= 0) {
      alert("Please fill in all fields with valid values")
      return
    }

    try {
      setIsSubmitting(true)

      // Save to Firebase: financial/{year}/nshp/{nshpId}/ppmp/{ppmpCode}
      const ppmpRef = collection(db, `financial/${nshpRecord.year}/nshp/${nshpRecord.id}/ppmp`)

      await addDoc(ppmpRef, {
        ppmpCode,
        particular,
        unitPrice,
        unitOfMeasure,
        quantity,
        total,
        month: selectedMonth,
        year: selectedYear,
        createdAt: new Date().toISOString(),
      })

      alert("PPMP entry added successfully!")
      onClose()
    } catch (error) {
      console.error("Error adding PPMP entry:", error)
      alert("Failed to add PPMP entry")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    document.body.style.overflow = ""
    onClose()
  }

  // Prevent scroll on number inputs
  const preventScroll = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur()
  }

  const preventArrowKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[99999] flex items-center justify-center p-4"
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div className="bg-[#F0EAD6] border border-[#DDD7B1] rounded-lg shadow-lg w-full max-w-2xl relative z-[100000]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[#4A7C74] bg-[#F0EAD6]">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-[#2F3E2E]">Add PPMP Entry</h2>
            <p className="text-sm text-[#8B8378] mt-1">
              {selectedMonth} {selectedYear}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose} className="text-[#8B8378] hover:text-[#2F3E2E]">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <Card className="bg-[#E0D9C0] border-[#C0B89F]">
              <CardHeader>
                <CardTitle className="text-lg text-[#2F3E2E]">Entry Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ppmpCode" className="text-[#2F3E2E]">
                    PPMP Code <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="ppmpCode"
                    value={ppmpCode}
                    onChange={(e) => setPpmpCode(e.target.value)}
                    placeholder="Enter PPMP Code"
                    className="bg-white border-[#C0B89F] text-[#2F3E2E]"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="particular" className="text-[#2F3E2E]">
                    Particular <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="particular"
                    value={particular}
                    onChange={(e) => setParticular(e.target.value)}
                    placeholder="Enter particular/description"
                    className="bg-white border-[#C0B89F] text-[#2F3E2E]"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unitPrice" className="text-[#2F3E2E]">
                      Unit Price (₱) <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="unitPrice"
                      type="number"
                      step="0.01"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(Number.parseFloat(e.target.value) || 0)}
                      onWheel={preventScroll}
                      onKeyDown={preventArrowKeys}
                      placeholder="0.00"
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unitOfMeasure" className="text-[#2F3E2E]">
                      Unit of Measure <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="unitOfMeasure"
                      value={unitOfMeasure}
                      onChange={(e) => setUnitOfMeasure(e.target.value)}
                      placeholder="e.g., pcs, kg, liters"
                      className="bg-white border-[#C0B89F] text-[#2F3E2E]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity" className="text-[#2F3E2E]">
                      Quantity <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 0)}
                      onWheel={preventScroll}
                      onKeyDown={preventArrowKeys}
                      placeholder="0"
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[#2F3E2E]">Total Amount (₱)</Label>
                    <Input
                      value={total.toFixed(2)}
                      readOnly
                      className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E] font-bold"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 p-6 pt-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="bg-transparent border-[#C0B89F] text-[#2F3E2E] hover:bg-[#E0D9C0]"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-[#5B8C5A] hover:bg-[#4A7049] text-white" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Entry"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
