"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TableHead } from "@/components/ui/table"
import type { NSHPRecord } from "@/components/nshp-data-form"
import { formatCurrency } from "@/lib/format-currency"
import { db } from "@/lib/firebase"
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore"
import PPMPEntryModal from "@/components/ppmp-entry-modal"
import { toast } from "sonner"

interface NSHPViewUpdateModalProps {
  record: NSHPRecord
  onClose: () => void
}

interface PPMPEntry {
  id: string
  ppmpCode: string
  particular: string
  unitPrice: number
  unitOfMeasure: string
  quantity: number
  month: string
  year: string
  total: number
  createdAt: string
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export default function NSHPViewUpdateModal({ record, onClose }: NSHPViewUpdateModalProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString())
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [allocation, setAllocation] = useState<number>(record.allocationAmount)
  const [ppmpEntries, setPpmpEntries] = useState<PPMPEntry[]>([])
  const [showPPMPModal, setShowPPMPModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [realignment, setRealignment] = useState<number>(record.realignment || 0)

  const grandTotal = ppmpEntries.reduce((sum, entry) => sum + entry.total, 0)

  useEffect(() => {
    fetchPPMPEntries()
  }, [selectedMonth, selectedYear])

  useEffect(() => {
    setRealignment(record.realignment || 0)
  }, [record])

  const fetchPPMPEntries = async () => {
    try {
      setIsLoading(true)
      const ppmpRef = collection(db, `financial/${record.year}/nshp/${record.id}/ppmp`)
      const snapshot = await getDocs(ppmpRef)
      const entries: PPMPEntry[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        if (data.month === MONTHS[Number.parseInt(selectedMonth)] && data.year === selectedYear) {
          entries.push({
            id: doc.id,
            ...data,
          } as PPMPEntry)
        }
      })

      setPpmpEntries(entries)
    } catch (error) {
      console.error("Error fetching PPMP entries:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateFinancials = async () => {
    try {
      const docRef = doc(db, `financial/${record.year}/nshp`, record.id)
      await updateDoc(docRef, {
        allocationAmount: allocation,
        realignment: realignment,
        updatedAt: new Date().toISOString(),
      })
      toast.success("Success", { description: "Financial data updated successfully!" })
      record.allocationAmount = allocation
      record.realignment = realignment
    } catch (error) {
      console.error("Error updating financials:", error)
      toast.error("Error", { description: "Failed to update financial data" })
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) {
      return
    }

    try {
      await deleteDoc(doc(db, `financial/${record.year}/nshp/${record.id}/ppmp`, entryId))
      toast.success("Success", { description: "Entry deleted successfully" })
      fetchPPMPEntries()
    } catch (error) {
      console.error("Error deleting entry:", error)
      toast.error("Error", { description: "Failed to delete entry" })
    }
  }

  const handleClose = () => {
    document.body.style.overflow = ""
    onClose()
  }

  const preventScroll = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur()
  }

  const preventArrowKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault()
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
        style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <div className="bg-[#F0EAD6] border border-[#DDD7B1] rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto relative z-[10000]">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-[#4A7C74] sticky top-0 bg-[#F0EAD6] z-10">
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-[#2F3E2E]">View/Update NSHP Record</h2>
              <p className="text-sm text-[#8B8378] mt-1">National Soil Health Program - Regional Soils Laboratory</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose} className="text-[#8B8378] hover:text-[#2F3E2E]">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-6 space-y-6">
            {/* Record Information */}
            <Card className="bg-[#E0D9C0] border-[#C0B89F]">
              <CardHeader>
                <CardTitle className="text-lg text-[#2F3E2E]">Record Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#2F3E2E]">Date</Label>
                    <Input
                      type="date"
                      value={record.date}
                      readOnly
                      className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[#2F3E2E]">Year</Label>
                    <Input value={record.year} readOnly className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E]" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-[#2F3E2E]">Programs/Activity/Projects</Label>
                    <Input
                      value={record.programType}
                      readOnly
                      className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[#2F3E2E]">Expense Type</Label>
                    <Input
                      value={record.expenseType || "-"}
                      readOnly
                      className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[#2F3E2E]">Object Expenditures</Label>
                    <Input
                      value={record.objectOfExpenditures || "-"}
                      readOnly
                      className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[#2F3E2E]">Sub Object Expenditures</Label>
                    <Input
                      value={record["sub-objectOfExpenditures"] || "-"}
                      readOnly
                      className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E]"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-[#2F3E2E]">Expenditure Details</Label>
                    <Input
                      value={record.expenditureDetails || "-"}
                      readOnly
                      className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[#2F3E2E]">No. PPMP</Label>
                    <Input
                      value={record.ppmpCount || 0}
                      readOnly
                      className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E] font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[#2F3E2E]">Allocation (₱'000)</Label>
                    <Input
                      type="number"
                      value={allocation}
                      onChange={(e) => setAllocation(Number.parseFloat(e.target.value) || 0)}
                      onWheel={preventScroll}
                      onKeyDown={preventArrowKeys}
                      className="bg-white border-[#C0B89F] text-[#2F3E2E] font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[#2F3E2E]">Grand Total (₱'000)</Label>
                    <Input
                      value={formatCurrency(grandTotal)}
                      readOnly
                      className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E] font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={handleUpdateFinancials} className="bg-[#5B8C5A] hover:bg-[#4A7049] text-white">
                    Update Financials
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Breakdown Table */}
            <Card className="bg-[#E0D9C0] border-[#C0B89F]">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <CardTitle className="text-lg text-[#2F3E2E]">Monthly Breakdown (PPMP Entries)</CardTitle>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="w-full sm:w-[150px] bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E]">
                        <SelectValue placeholder="Select Month" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E] z-[99999]">
                        {MONTHS.map((month, index) => (
                          <SelectItem key={month} value={index.toString()}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="w-full sm:w-[120px] bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E]">
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E] z-[99999]">
                        {getAvailableYears().map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      onClick={() => setShowPPMPModal(true)}
                      className="bg-[#5B8C5A] hover:bg-[#4A7049] text-white flex items-center gap-2"
                    >
                      <Plus size={18} />
                      Add Entry
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-[#C0B89F] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[1000px]">
                      <thead className="bg-[#C0B89F]">
                        <tr className="border-[#C0B89F]">
                          <TableHead className="text-[#2F3E2E] w-[120px]">PPMP Code</TableHead>
                          <TableHead className="text-[#2F3E2E] w-[250px]">Particular</TableHead>
                          <TableHead className="text-[#2F3E2E] w-[120px] text-right">Unit Price</TableHead>
                          <TableHead className="text-[#2F3E2E] w-[120px]">Unit of Measure</TableHead>
                          <TableHead className="text-[#2F3E2E] w-[100px] text-right">Quantity</TableHead>
                          <TableHead className="text-[#2F3E2E] w-[120px] text-right">Total</TableHead>
                          <TableHead className="text-[#2F3E2E] w-[100px] text-center">Actions</TableHead>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-[#8B8378]">
                              Loading entries...
                            </td>
                          </tr>
                        ) : ppmpEntries.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-[#8B8378]">
                              No entries found for {MONTHS[Number.parseInt(selectedMonth)]} {selectedYear}
                            </td>
                          </tr>
                        ) : (
                          ppmpEntries.map((entry) => (
                            <tr key={entry.id} className="border-b border-[#C0B89F] hover:bg-[#F0EAD6]">
                              <td className="p-3 text-[#2F3E2E]">{entry.ppmpCode}</td>
                              <td className="p-3 text-[#2F3E2E]">{entry.particular}</td>
                              <td className="p-3 text-[#2F3E2E] text-right">{formatCurrency(entry.unitPrice)}</td>
                              <td className="p-3 text-[#2F3E2E]">{entry.unitOfMeasure}</td>
                              <td className="p-3 text-[#2F3E2E] text-right">{entry.quantity}</td>
                              <td className="p-3 text-[#2F3E2E] text-right font-medium">
                                {formatCurrency(entry.total)}
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex justify-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteEntry(entry.id)}
                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {showPPMPModal && (
        <PPMPEntryModal
          nshpRecord={record}
          selectedMonth={MONTHS[Number.parseInt(selectedMonth)]}
          selectedYear={selectedYear}
          onClose={() => {
            setShowPPMPModal(false)
            fetchPPMPEntries()
          }}
        />
      )}
    </>
  )
}

const getAvailableYears = () => {
  const currentYear = new Date().getFullYear()
  const years: string[] = []
  for (let year = 2025; year <= currentYear + 5; year++) {
    years.push(year.toString())
  }
  return years
}
