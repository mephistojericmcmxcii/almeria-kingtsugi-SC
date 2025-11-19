"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts"
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { db } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"
import { DollarSign } from "lucide-react"
import { formatCurrency } from "@/lib/format-currency"

interface ChartData {
  name: string
  allocation: number
  grandTotal: number
}

export default function FinancialDashboardChart() {
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedFinancialType, setSelectedFinancialType] = useState<string>("nshp")
  const [selectedProgram, setSelectedProgram] = useState<string>("RSL")
  const [availableYears, setAvailableYears] = useState<string[]>([])

  useEffect(() => {
    const fetchYears = async () => {
      try {
        const financialCollectionRef = collection(db, "financial")
        const querySnapshot = await getDocs(financialCollectionRef)

        const years: string[] = []
        querySnapshot.forEach((doc) => {
          const year = doc.id
          if (/^\d{4}$/.test(year)) {
            years.push(year)
          }
        })

        years.sort((a, b) => Number.parseInt(b) - Number.parseInt(a))
        setAvailableYears(years)

        if (years.length > 0 && !years.includes(selectedYear)) {
          setSelectedYear(years[0])
        }
      } catch (error) {
        console.error("[v0] Error fetching available years:", error)
      }
    }

    fetchYears()
  }, [])

  useEffect(() => {
    const fetchFinancialData = async () => {
      setLoading(true)
      try {
        const collectionPath = `financial/${selectedYear}/${selectedFinancialType}`
        const nshpCollectionRef = collection(db, collectionPath)
        const querySnapshot = await getDocs(nshpCollectionRef)

        const dataMap = new Map<string, { allocation: number; grandTotal: number }>()

        for (const docSnapshot of querySnapshot.docs) {
          const recordData = docSnapshot.data()

          const programTypeMatch = recordData.programType?.match(/$$(RSL|MSL)$$/)
          const extractedProgram = programTypeMatch ? programTypeMatch[1] : recordData.programType

          if (extractedProgram !== selectedProgram) {
            continue
          }

          const ppmpRef = collection(db, `${collectionPath}/${docSnapshot.id}/ppmp`)
          const ppmpSnapshot = await getDocs(ppmpRef)

          let grandTotal = 0
          ppmpSnapshot.forEach((ppmpDoc) => {
            const ppmpData = ppmpDoc.data()
            grandTotal += ppmpData.total || 0
          })

          const key = recordData.objectOfExpenditures || "Unspecified"
          const existing = dataMap.get(key) || { allocation: 0, grandTotal: 0 }
          dataMap.set(key, {
            allocation: existing.allocation + (recordData.allocationAmount || 0),
            grandTotal: existing.grandTotal + grandTotal,
          })
        }

        const data = Array.from(dataMap.entries())
          .map(([name, values]) => ({
            name,
            ...values,
          }))
          .sort((a, b) => b.grandTotal - a.grandTotal)

        setChartData(data)
      } catch (error) {
        console.error("[v0] Error fetching financial data:", error)
        setChartData([])
      } finally {
        setLoading(false)
      }
    }

    if (selectedYear) {
      fetchFinancialData()
    }
  }, [selectedYear, selectedProgram, selectedFinancialType])

  const totalAllocation = chartData.reduce((sum, item) => sum + item.allocation, 0)
  const totalGrandTotal = chartData.reduce((sum, item) => sum + item.grandTotal, 0)

  // Color palette for bars
  const colors = ["#5B8C5A", "#4A7049", "#7BA86F", "#3D5A3D", "#6B9B6A"]

  return (
    <Card
      style={{
        backgroundColor: "#FCF9ED",
        borderColor: "#C9C1A7",
        borderRadius: "1rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}
      className="border text-[#2F3E2E]"
    >
      <CardHeader>
        <div className="flex flex-col gap-4 mb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2 text-[#5B8C5A]">
            <DollarSign className="h-5 w-5 text-[#5B8C5A]" />
            Financial Overview by Expenditure Type
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Select value={selectedFinancialType} onValueChange={setSelectedFinancialType}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white text-[#2F3E2E] border-[#DDD7B1] focus:ring-[#5B8C5A]">
                <SelectValue placeholder="Select Financial Type" />
              </SelectTrigger>
              <SelectContent className="bg-white text-[#2F3E2E] border-[#DDD7B1]">
                <SelectItem value="nshp">NSHP</SelectItem>
                <SelectItem value="sto-rsl">STO-RSL</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white text-[#2F3E2E] border-[#DDD7B1] focus:ring-[#5B8C5A]">
                <SelectValue placeholder="Select Project Type" />
              </SelectTrigger>
              <SelectContent className="bg-white text-[#2F3E2E] border-[#DDD7B1]">
                <SelectItem value="RSL">RSL</SelectItem>
                <SelectItem value="MSL">MSL</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-full sm:w-[150px] bg-white text-[#2F3E2E] border-[#DDD7B1] focus:ring-[#5B8C5A]">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent className="bg-white text-[#2F3E2E] border-[#DDD7B1]">
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <CardDescription className="text-[#2F3E2E]">
          Allocation and grand total breakdown for {selectedProgram} program in {selectedYear}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#F0EAD6] border border-[#DDD7B1] rounded-lg p-4">
            <p className="text-sm text-[#5B8C5A] font-medium">Total Allocation</p>
            <p className="text-2xl font-bold text-[#4C6529] mt-1">{formatCurrency(totalAllocation)}</p>
          </div>
          <div className="bg-[#F0EAD6] border border-[#DDD7B1] rounded-lg p-4">
            <p className="text-sm text-[#5B8C5A] font-medium">Grand Total</p>
            <p className="text-2xl font-bold text-[#4C6529] mt-1">{formatCurrency(totalGrandTotal)}</p>
          </div>
        </div>

        <div className="h-[400px] sm:h-[500px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <svg
                className="animate-spin h-8 w-8 text-[#5B8C5A]"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="ml-3 text-[#2F3E2E]">Loading chart data...</span>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[#8B8378]">
              <p>
                No financial data available for {selectedProgram} in {selectedYear}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DDD7B1" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={120}
                  tick={{ fontSize: 12, fill: "#2F3E2E" }}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 12, fill: "#2F3E2E" }}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "#2F3E2E",
                    borderColor: "#5B8C5A",
                    borderRadius: "0.5rem",
                    color: "white",
                    fontSize: "0.875rem",
                    padding: "0.75rem",
                  }}
                  itemStyle={{ color: "white" }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: "20px" }}
                  iconType="square"
                  formatter={() => ["Allocation", "Grand Total"]}
                />
                <Bar yAxisId="left" dataKey="allocation" fill="#5B8C5A" name="Allocation" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`allocation-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
                <Bar yAxisId="left" dataKey="grandTotal" fill="#7BA86F" name="Grand Total" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
