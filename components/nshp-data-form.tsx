"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebase"
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore"

interface NSHPDataFormProps {
  onClose: (dataSaved?: boolean) => void
  selectedYear: string
  initialData?: NSHPRecord
  mode: "add" | "edit"
}

export interface NSHPRecord {
  id?: string
  year: string
  date: string
  programType: string
  objectOfExpenditures?: string
  "sub-objectOfExpenditures"?: string
  expenditureDetails?: string
  allocationAmount: number
  createdAt?: any
  updatedAt?: any
  recordedBy?: string
}

const PROGRAM_TYPES = {
  RSL: "Strengthening of Soils Laboratory (RSL)",
  MSL: "Operation of Mobile Soil Laboratory (MSL)",
}

const NSHP_DATA_STRUCTURE = {
  MOOE: {
    "TRAVELING EXPENSES": {
      color: "#C65911",
      objects: {
        "Traveling Expenses - Local": { code: "50201010-00" },
        "Traveling Expenses - Foreign": { code: "50201020-00" },
      },
    },
    "TRAINING AND SCHOLARSHIP EXPENSES": {
      color: "#C65911",
      objects: {
        "Training Expenses": { code: "50202010-00" },
        "Scholarship Grants/Expenses": { code: "50202020-00" },
      },
    },
    "SUPPLIES AND MATERIALS": {
      color: "#C65911",
      objects: {
        "Office Supplies Expenses": { code: "50203010-00" },
        "Accountable Forms Expenses": { code: "50203020-00" },
        "Non-Accountable Forms Expenses": { code: "50203030-00" },
        "Animal/Zoological Supplies Expenses": { code: "50203040-00" },
        "Food Supplies Expenses": { code: "50203050-00" },
        "Drugs and Medicines Expenses": { code: "50203070-00" },
        "Medical, Dental and Laboratory Supplies Expenses": { code: "50203080-00" },
        "Fuel, Oil and Lubricants Expenses": { code: "50203090-00" },
        "Agricultural and Marine Supplies Expenses": { code: "50203100-00" },
        "Textbooks and Instructional Materials Expenses": { code: "50203110-00" },
        "Chemical and Filtering Supplies Expenses": { code: "50203130-00" },
        "Semi-Expendable Machinery and Equipment Expenses": { code: "550203210-00" },
        "Semi-Expendable Furniture, Fixtures and Books Expenses": { code: "50203220-00" },
        "Agricultural Produce Expenses": { code: "50203130-00" },
        "Aquaculture Produce Expenses": { code: "50203240-00" },
        "Other Supplies and Materials Expenses": { code: "50203990-00" },
      },
    },
    "UTILITY EXPENSES": {
      color: "#C65911",
      objects: {
        "Electricity Expenses": { code: "50204020-00" },
        "Water Expenses": { code: "50204010-00" },
        "Gas/Heating Expenses": { code: "50204030-00" },
        "Other Utility Expenses": { code: "50204990-00" },
      },
    },
    "COMMUNICATION EXPENSES": {
      color: "#C65911",
      objects: {
        "Postage and Courier Services": { code: "50205010-00" },
        "Telephone Expenses": { code: "50205020-00" },
        "Internet Subscription Expenses": { code: "50205030-00" },
        "Cable, Satellite, Telegraph and Radio Expenses": { code: "50205040-00" },
      },
    },
    "AWARDS/REWARDS AND PRIZES": {
      color: "#C65911",
      objects: {
        "Awards/ Rewards Expenses": { code: "550205010-00" },
        Prizes: { code: "50206020-00" },
        Indemnities: { code: "50206030-00" },
      },
    },
    "SURVEY, RESEARCH, EXPLORATION & DEV'T EXPENSES": {
      color: "#C65911",
      objects: {
        "Survey Expenses": { code: "50207010-00" },
        "Research, Exploration and Development Expenses": { code: "50207020-00" },
      },
    },
    "DEMOLITION/RELOCATION/DESILTING/DREDGING EXPENSES": {
      color: "#C65911",
      objects: {
        "Demolition and Relocation Expenses": { code: "50208010-00" },
        "Desilting and Dredging Expenses": { code: "50208020-00" },
      },
    },
    "GENERATION, TRANSMISSION AND DISTRIBUTION EXPENSES": {
      color: "#C65911",
      objects: {
        "ICT Generation, Transmission and Distribution Expenses": { code: "50209010-01" },
        "Generation, Transmission and Distribution Expenses": { code: "50209010-02" },
      },
    },
    "CONFIDENTIAL, INTELLIGENCE AND EXTRAORDINARY EXPENSES": {
      color: "#C65911",
      objects: {
        "Confidential Expenses": { code: "50210010-00" },
        "Intelligence Expenses": { code: "50210020-00" },
        "Extraordinary and Miscellaneous Expenses": { code: "50210030-00" },
      },
    },
    "PROFESSIONAL SERVICES": {
      color: "#C65911",
      objects: {
        "Legal Services": { code: "50211010-00" },
        "Auditing Services": { code: "50211020-00" },
        "Consultancy Services": { code: "50211030-00" },
        "Other Professional Services": { code: "50211990-00 " },
      },
    },
    "GENERAL SERVICES": {
      color: "#C65911",
      objects: {
        "Environment/Sanitary Services": { code: "50212010-00" },
        "Janitorial Services": { code: "50212020-00" },
        "Security Services": { code: "50212030-00" },
        "Other General Services": { code: "50212990-00" },
      },
    },
    "REPAIRS AND MAINTENANCE": {
      color: "#C65911",
      objects: {
        "Investment Property": { code: "50213010-00" },
        "Land Improvements": { code: "50213020-00" },
        "Infrastructure Assets": { code: "50213020-00" },
        "Buildings and Other Structures": { code: "50213040-00" },
        "Machinery and Equipment": { code: "50213050-00" },
        "Transportation Equipment": { code: "50213060-00" },
        "Furniture and Fixtures": { code: "50213070-00" },
        "Leased Assets": { code: "50213080-00" },
        "Leased Assets Improvement": { code: "50213090-00" },
        "Semi-Expendable Machineries and Equipment Expenses": { code: "50213210-00" },
        "Semi-Expendable Furniture, Fixtures and Book Expenses": { code: "50213220-00" },
        Others: { code: "50213980-00" },
        "Other Property, Plant and Equipment": { code: "50213990-00" },
      },
    },
    "FINANCIAL ASSISTANCE/SUBSIDY": {
      color: "#C65911",
      objects: {
        "Subsidy to NGAs": { code: "50214010-00" },
        "Financial Assistance to NGAs": { code: "50214020-00" },
        "Financial Assistance to LGUs": { code: "50214030-00" },
        "Budgetary Support to GOCCs": { code: "50214040-00" },
        "Financial Assistance to NGOs/Pos": { code: "50214050-00" },
        "Subsidies to Regional Offices/Staff Bureaus": { code: "50214070-00" },
        "Subsidies to Operating Units ": { code: "50214080-00" },
        "Subsidies to Other Funds": { code: "50214070-00" },
        "Subsidies - Others": { code: "50214990-00" },
      },
    },
    "TAXES, INSURANCE PREMIUMS AND OTHER FEES": {
      color: "#C65911",
      objects: {
        "Taxes, Duties and Licenses": { code: "50215010-00" },
        "Fidelity Bond Premiums": { code: "50215020-00" },
        "Insurance Expenses": { code: "50215030-00" },
      },
    },
    "LABOR AND WAGES": {
      color: "#C65911",
      objects: {
        "Labor and Wages": { code: "50216010-00" },
      },
    },
    "OTHER MAINTENANCE AND OTHER OPERATING EXPENSES": {
      color: "#C65911",
      objects: {
        "Advertising, Promotional and Marketing Expenses": { code: "50299010-00" },
        "Printing and Publication Expenses": { code: "50299020-00" },
        "Representation Expenses": { code: "50299030-00" },
        "Transportation and Delivery Expenses": { code: "50299040-00" },
        "Rent/Lease Expenses": { code: "50299050-00" },
        "Membership Dues and Contributions to Organizations": { code: "50299060-00" },
        "Subscription Expenses": { code: "50299070-00" },
        Donations: { code: "50299080-00" },
        "Litigation/ Acquired Assets Expenses": { code: "50299090-00" },
        "Loss on Guaranty": { code: "50299100-00" },
        "Legal Defense Expense": { code: "50299210-00" },
        "Bank Transaction Fee": { code: "50299220-00" },
        "Other Maintenance and Operating Expenses": { code: "50299990-00" },
      },
    },
  },
  CO: {
    "INVESTMENT OUTLAY": {
      color: "#92D050",
      objects: {
        "Investment in Government Owned and/or Controlled Corporations": { code: "50601010-00" },
        "Investment in Associates": { code: "50601020-00" },
      },
    },
    "LOAN OUTLAY": {
      color: "#92D050",
      objects: {
        "Loan Outlay - Government Owned and/or Controlled Corporations": { code: "50602010-00" },
        "Loan Outlay - Local Government Units": { code: "50602020-00" },
        "Loan Outlay - Others": { code: "50602999-00" },
      },
    },
    "INVESTMENT PROPERTY OUTLAY": {
      color: "#92D050",
      objects: {
        "Investment Property - Land": { code: "50603010-01" },
        "Investment Property - Building": { code: "50603010-02" },
      },
    },
    "PROPERTY, PLANT AND EQUIPMENT OUTLAY": {
      color: "#92D050",
      objects: {
        "Land Outlay": { code: "50301010-00" },
        "Land Improvement Outlays": { code: "50604020-00" },
        "Infrastructure Outlays": { code: "50604030-00" },
        "Building and Other Structures Outlay": { code: "50604040-00" },
        "Machinery and Equipment": { code: "50604050-00" },
        "Transportation Equipment Outlay": { code: "50604060-00" },
        "Furniture, Fixtures and Books Outlay": { code: "50604070-00" },
        "Other Property, Plant and Equipments": { code: "50604090-99" },
      },
    },
    "BIOLOGICAL ASSETS OUTLAY": {
      color: "#92D050",
      objects: {
        "Bearer Biological Assets Outlay": { code: "50605010-00" },
        "Consumable Biological Assets Outlay": { code: "50605020-00" },
      },
    },
    "INTANGIBLE OUTLAY": {
      color: "#92D050",
      objects: {
        "Patents/Copyright": { code: "50606010-01" },
        "Computer Software": { code: "50606010-02" },
        "Other Intangible Assets Outlay": { code: "50606010-99" },
      },
    },
  },
}

const ALL_TIERS = { ...NSHP_DATA_STRUCTURE.MOOE, ...NSHP_DATA_STRUCTURE.CO }

export default function NSHPDataForm({ onClose, selectedYear, initialData, mode }: NSHPDataFormProps) {
  const { employeeName } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expenseType, setExpenseType] = useState<"ALL" | "MOOE" | "CO">("ALL")

  const [formData, setFormData] = useState<NSHPRecord>({
    year: selectedYear,
    date: new Date().toISOString().split("T")[0],
    programType: "",
    objectOfExpenditures: "",
    "sub-objectOfExpenditures": "",
    expenditureDetails: "",
    allocationAmount: 0,
  })

  const allocationAmount = formData.allocationAmount

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  useEffect(() => {
    if (mode === "edit" && initialData) {
      if (Object.keys(NSHP_DATA_STRUCTURE.MOOE).includes(initialData.objectOfExpenditures)) {
        setExpenseType("MOOE")
      } else if (Object.keys(NSHP_DATA_STRUCTURE.CO).includes(initialData.objectOfExpenditures)) {
        setExpenseType("CO")
      } else {
        setExpenseType("ALL")
      }
      setFormData({
        ...initialData,
        date:
          typeof initialData.date === "string"
            ? initialData.date
            : (initialData.date?.toDate?.() ?? new Date().toISOString().split("T")[0]),
      } as NSHPRecord)
    }
  }, [initialData, mode])

  const handleExpenseTypeChange = (value: "ALL" | "MOOE" | "CO") => {
    setExpenseType(value)
    setFormData((prev) => ({
      ...prev,
      objectOfExpenditures: "",
      "sub-objectOfExpenditures": "",
      expenditureDetails: "",
    }))
  }

  const handleSelectChange = (name: keyof NSHPRecord, value: string) => {
    setFormData((prev) => {
      const newState = { ...prev, [name]: value } as NSHPRecord

      if (name === "objectOfExpenditures") {
        newState["sub-objectOfExpenditures"] = ""
        newState.expenditureDetails = ""
      }

      return newState
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === "allocationAmount") {
      setFormData((prev) => ({ ...prev, [name]: Number.parseFloat(value) || 0 }) as NSHPRecord)
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }) as NSHPRecord)
    }
  }

  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur()
  }

  const buildAccountCodeAndDocId = (expenditures: string, subObject: string) => {
    const tierData = ALL_TIERS[expenditures as keyof typeof ALL_TIERS]
    if (!tierData) return { accountCode: null, documentId: null }
    const objectData = tierData.objects[subObject as keyof typeof tierData.objects]
    if (!objectData || !objectData.code) return { accountCode: null, documentId: null }
    const accountCode = String(objectData.code).replace(/\s+/g, "").replace(/-/g, "")
    const isMOOE = Object.keys(NSHP_DATA_STRUCTURE.MOOE).includes(expenditures)
    const expenseTypePrefix = isMOOE ? "MOOE" : "CO"
    const documentId = `${expenseTypePrefix}_${accountCode}`
    return { accountCode, documentId, expenseTypePrefix }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.date || !formData.programType || allocationAmount === undefined) {
      toast.error("Error", { description: "Please fill in all required fields." })
      return
    }

    try {
      setIsSubmitting(true)

      const selectedDate = new Date(formData.date)
      const year = selectedDate.getFullYear().toString()

      let accountCode = null
      let computedDocId = null
      let expenseTypePrefix = null

      if (formData.objectOfExpenditures && formData["sub-objectOfExpenditures"]) {
        const result = buildAccountCodeAndDocId(formData.objectOfExpenditures, formData["sub-objectOfExpenditures"])
        accountCode = result.accountCode
        computedDocId = result.documentId
        expenseTypePrefix = result.expenseTypePrefix
      }

      const fullProgramType = PROGRAM_TYPES[formData.programType as keyof typeof PROGRAM_TYPES] || formData.programType

      const dataToSave = {
        year,
        date: formData.date,
        programType: fullProgramType,
        objectOfExpenditures: formData.objectOfExpenditures || null,
        "sub-objectOfExpenditures": formData["sub-objectOfExpenditures"] || null,
        expenditureDetails: formData.expenditureDetails || null,
        ...(accountCode && { accountCode }),
        ...(expenseTypePrefix && { expenseType: expenseTypePrefix }),
        allocationAmount: formData.allocationAmount,
        recordedBy: employeeName || "Unknown",
        updatedAt: serverTimestamp(),
      }

      const yearDocRef = doc(db, "financial", year)
      await setDoc(yearDocRef, { updatedAt: serverTimestamp() }, { merge: true })

      if (mode === "add") {
        const targetDocId = `NSHP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const targetDocRef = doc(db, "financial", year, "nshp", targetDocId)
        await setDoc(targetDocRef, { ...dataToSave, createdAt: serverTimestamp() })
      } else {
        const originalId = initialData?.id
        const originalYear = initialData?.year

        if (originalId && originalYear === year) {
          const targetDocRef = doc(db, "financial", year, "nshp", originalId)
          await updateDoc(targetDocRef, dataToSave)
        } else if (originalId && originalYear && originalYear !== year) {
          const targetDocId = `NSHP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          const newDocRef = doc(db, "financial", year, "nshp", targetDocId)
          await setDoc(newDocRef, { ...dataToSave, createdAt: serverTimestamp() })
          try {
            const oldDocRef = doc(db, "financial", originalYear, "nshp", originalId)
            await deleteDoc(oldDocRef)
          } catch (delErr) {
            console.warn("Could not delete old doc after moving:", delErr)
          }
        } else {
          const targetDocId = `NSHP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          const fallbackRef = doc(db, "financial", year, "nshp", targetDocId)
          await setDoc(fallbackRef, { ...dataToSave, createdAt: serverTimestamp() }, { merge: true })
        }
      }

      toast.success("Success", {
        description: mode === "add" ? "NSHP record added successfully." : "NSHP record updated successfully.",
      })
      setIsSubmitting(false)
      onClose(true)
    } catch (error) {
      console.error("Error saving NSHP record:", error)
      toast.error("Error", { description: "Failed to save NSHP record. Please try again." })
      setIsSubmitting(false)
    }
  }

  const tierOptions = useMemo(() => {
    if (expenseType === "MOOE") return Object.keys(NSHP_DATA_STRUCTURE.MOOE)
    if (expenseType === "CO") return Object.keys(NSHP_DATA_STRUCTURE.CO)
    return Object.keys(ALL_TIERS)
  }, [expenseType])

  const getSubObjectOptions = useMemo(() => {
    if (!formData.objectOfExpenditures) return []
    const tierData = ALL_TIERS[formData.objectOfExpenditures as keyof typeof ALL_TIERS]
    return tierData ? Object.keys(tierData.objects) : []
  }, [formData.objectOfExpenditures])

  const getTierColor = (tier: string) => ALL_TIERS[tier as keyof typeof ALL_TIERS]?.color || "#F0EAD6"

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div className="bg-[#F0EAD6] border border-[#DDD7B1] rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-[10000]">
        <div className="flex justify-between items-center p-4 border-b border-[#4A7C74]">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-[#2F3E2E]">
              {mode === "add" ? "Add NSHP Record" : "Edit NSHP Record"}
            </h2>
            <p className="text-sm text-[#8B8378] mt-1">
              National Soil Health Program - Regional Soils Laboratory for {selectedYear}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onClose(false)}
            className="text-[#8B8378] hover:text-[#2F3E2E]"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="date" className="text-[#2F3E2E]">
                Target Date *
              </Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="programType" className="text-[#2F3E2E]">
                Programs/Activity/Projects *
              </Label>
              <Select value={formData.programType} onValueChange={(value) => handleSelectChange("programType", value)}>
                <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                  <SelectValue placeholder="Select program type" />
                </SelectTrigger>
                <SelectContent className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] z-[99999]">
                  <SelectItem value="RSL">Strengthening of Soils Laboratory (RSL)</SelectItem>
                  <SelectItem value="MSL">Operation of Mobile Soil Laboratory (MSL)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenseType" className="text-[#2F3E2E]">
                Expense Type
              </Label>
              <Select
                value={expenseType}
                onValueChange={(value: "ALL" | "MOOE" | "CO") => handleExpenseTypeChange(value)}
              >
                <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                  <SelectValue placeholder="Select expense type" />
                </SelectTrigger>
                <SelectContent className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] z-[99999]">
                  <SelectItem value="ALL">ALL</SelectItem>
                  <SelectItem value="MOOE">MOOE (Maintenance and Other Operating Expenses)</SelectItem>
                  <SelectItem value="CO">CO (Capital Outlay)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="objectOfExpenditures" className="text-[#2F3E2E]">
                Object Expenditures
              </Label>
              <Select
                value={formData.objectOfExpenditures}
                onValueChange={(value) => handleSelectChange("objectOfExpenditures", value)}
                disabled={!expenseType}
              >
                <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                  <SelectValue placeholder="Select object expenditures" />
                </SelectTrigger>
                <SelectContent className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] z-[99999]">
                  {tierOptions.map((tier) => (
                    <SelectItem key={tier} value={tier}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded border border-[#8B8378]"
                          style={{ backgroundColor: getTierColor(tier) }}
                        />
                        {tier}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subObjectOfExpenditures" className="text-[#2F3E2E]">
                Sub Object Expenditures
              </Label>
              <Select
                value={formData["sub-objectOfExpenditures"] || ""}
                onValueChange={(value) => handleSelectChange("sub-objectOfExpenditures", value)}
                disabled={!formData.objectOfExpenditures}
              >
                <SelectTrigger className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
                  <SelectValue placeholder="Select sub object expenditures" />
                </SelectTrigger>
                <SelectContent className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] z-[99999]">
                  {getSubObjectOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenditureDetails" className="text-[#2F3E2E]">
                Expenditure Details
              </Label>
              <Input
                id="expenditureDetails"
                name="expenditureDetails"
                type="text"
                value={formData.expenditureDetails}
                onChange={handleChange}
                placeholder="Enter expenditure details (optional)"
                className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allocationAmount" className="text-[#2F3E2E]">
                Allocation (₱'000) *
              </Label>
              <Input
                id="allocationAmount"
                name="allocationAmount"
                type="number"
                step="0.01"
                value={formData.allocationAmount}
                onChange={handleChange}
                onWheel={handleWheel}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                    e.preventDefault()
                  }
                }}
                className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-[#4A7C74]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose(false)}
              className="bg-transparent border-[#C0B89F] text-[#2F3E2E] hover:bg-[#E0D9C0]"
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-[#5B8C5A] hover:bg-[#4A7049] text-white" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>Saving...
                </>
              ) : mode === "add" ? (
                "Add Record"
              ) : (
                "Update Record"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
