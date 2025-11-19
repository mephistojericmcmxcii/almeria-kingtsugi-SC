"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from "recharts"
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { doc, getDoc } from "firebase/firestore"
import { BarChartIcon } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { db } from "@/lib/firebase"

interface ServiceData {
  serviceName: string
  q1?: { target?: string; accomplishment?: string }
  q2?: { target?: string; accomplishment?: string }
  q3?: { target?: string; accomplishment?: string }
  q4?: { target?: string; accomplishment?: string }
}

interface ChartDatum {
  service: string
  Q1_Target: number
  Q1_Accomplishment: number
  Q2_Target: number
  Q2_Accomplishment: number
  Q3_Target: number
  Q3_Accomplishment: number
  Q4_Target: number
  Q4_Accomplishment: number
  Total_Target: number
  Total_Accomplishment: number
  Percentage: number // Capped at 100 for bar height
  TruePercentage: number // Actual percentage for label
  Exceeds: boolean
  Accomplished: number // For tooltip
  Target: number // For tooltip
}

async function getYearTargets(year: number): Promise<ServiceData[] | null> {
  try {
    const docRef = doc(db, "yearTargets", String(year))
    const snap = await getDoc(docRef)
    if (snap.exists()) {
      return (snap.data() as { services?: ServiceData[] }).services ?? null
    }
    return null
  } catch (err) {
    console.error("Error fetching year targets:", err)
    return null
  }
}

export default function QuarterlyPerformanceChart() {
  const [data, setData] = useState<ChartDatum[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quarter, setQuarter] = useState<"Q1" | "Q2" | "Q3" | "Q4" | "WholeYear">("Q1")

  // Helper function to parse numeric values robustly
  const parseNumericValue = (value: string | undefined): number => {
    const parsed = Number.parseFloat(value ?? "0")
    return isNaN(parsed) ? 0 : parsed
  }

  const formatLabelWithBreak = (label: string) => label.replace(/\s\(/, "\n(")

  useEffect(() => {
    const year = new Date().getFullYear()
    setLoading(true)
    getYearTargets(year)
      .then((services) => {
        if (!services) {
          setError("No data found for the selected year.")
          return
        }
        const transformed: ChartDatum[] = services.map((srv) => {
          const q1Target = parseNumericValue(srv.q1?.target)
          const q1Accomplishment = parseNumericValue(srv.q1?.accomplishment)
          const q2Target = parseNumericValue(srv.q2?.target)
          const q2Accomplishment = parseNumericValue(srv.q2?.accomplishment)
          const q3Target = parseNumericValue(srv.q3?.target)
          const q3Accomplishment = parseNumericValue(srv.q3?.accomplishment)
          const q4Target = parseNumericValue(srv.q4?.target)
          const q4Accomplishment = parseNumericValue(srv.q4?.accomplishment)

          let currentTarget: number
          let currentAccomplishment: number

          if (quarter === "WholeYear") {
            currentTarget = q1Target + q2Target + q3Target + q4Target
            currentAccomplishment = q1Accomplishment + q2Accomplishment + q3Accomplishment + q4Accomplishment
          } else {
            const quarterData = srv[quarter.toLowerCase() as keyof ServiceData]
            currentTarget = parseNumericValue(quarterData?.target)
            currentAccomplishment = parseNumericValue(quarterData?.accomplishment)
          }

          const percentage =
            currentTarget === 0 ? (currentAccomplishment > 0 ? 100 : 0) : (currentAccomplishment / currentTarget) * 100

          const result = {
            service: srv.serviceName,
            Q1_Target: q1Target,
            Q1_Accomplishment: q1Accomplishment,
            Q2_Target: q2Target,
            Q2_Accomplishment: q2Accomplishment,
            Q3_Target: q3Target,
            Q3_Accomplishment: q3Accomplishment,
            Q4_Target: q4Target,
            Q4_Accomplishment: q4Accomplishment,
            Total_Target: q1Target + q2Target + q3Target + q4Target,
            Total_Accomplishment: q1Accomplishment + q2Accomplishment + q3Accomplishment + q4Accomplishment,
            Percentage: Math.min(100, isNaN(percentage) ? 0 : Math.round(percentage)),
            TruePercentage: isNaN(percentage) ? 0 : Math.round(percentage),
            Exceeds: currentAccomplishment > currentTarget,
            Accomplished: currentAccomplishment,
            Target: currentTarget,
          }
          return result
        })
        setData(transformed)
      })
      .catch((err) => {
        console.error("Data fetch error:", err)
        setError("Failed to load data.")
      })
      .finally(() => setLoading(false))
  }, [quarter])

  const barSize = Math.min(140, Math.max(56, (data?.length ? 300 / data.length : 1) * 2.5))

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
        <div className="flex justify-between items-center mb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2 text-[#5B8C5A]">
            <BarChartIcon className="h-5 w-5 text-[#5B8C5A]" />
            Quarterly Service Performance Chart ({new Date().getFullYear()})
          </CardTitle>
          <Select value={quarter} onValueChange={setQuarter}>
            <SelectTrigger className="w-[180px] bg-white text-[#2F3E2E] border-[#DDD7B1] focus:ring-[#5B8C5A]">
              <SelectValue placeholder="Select Quarter" />
            </SelectTrigger>
            <SelectContent className="bg-white text-[#2F3E2E] border-[#DDD7B1]">
              <SelectItem value="Q1">Quarter 1</SelectItem>
              <SelectItem value="Q2">Quarter 2</SelectItem>
              <SelectItem value="Q3">Quarter 3</SelectItem>
              <SelectItem value="Q4">Quarter 4</SelectItem>
              <SelectItem value="WholeYear">Whole Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <CardDescription className="text-[#2F3E2E]">
          Visual representation of service targets and accomplishments for{" "}
          {quarter === "WholeYear" ? "the Whole Year" : quarter.replace("Q", "Quarter ")}
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[400px] sm:h-[500px] p-4" style={{ position: "relative", overflow: "visible" }}>
        {loading && (
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
        )}
        {error && (
          <div className="text-red-500 text-center py-8 h-full flex flex-col justify-center items-center">
            <p>{error}</p>
            <p>Please ensure Firebase is correctly configured and data exists for the current year.</p>
          </div>
        )}
        {!loading && !error && data && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap={4} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#10b981" />
              <XAxis
                dataKey="service"
                angle={-30}
                textAnchor="end"
                interval={0}
                height={120}
                tick={{ fontSize: 10, fill: "#065f46" }}
                tickFormatter={formatLabelWithBreak}
              />
              <YAxis domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} stroke="#065f46" />
              <Tooltip
                cursor={{ fill: "transparent" }}
                formatter={(value, name, props) => {
                  const dataPoint = props.payload // This is the individual data item for the hovered bar
                  if (dataPoint && dataPoint.Accomplished !== undefined && dataPoint.Target !== undefined) {
                    return [`Accomplished: ${dataPoint.Accomplished}`, `Target: ${dataPoint.Target}`]
                  }
                  return value // Fallback if data is not as expected
                }}
                labelFormatter={(label) => label} // Keep the service name as the label
                contentStyle={{
                  backgroundColor: "#2F3E2E",
                  borderColor: "#5B8C5A",
                  borderRadius: "0.5rem",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  color: "white",
                  fontSize: "0.875rem", // text-sm
                  padding: "1rem", // p-4
                }}
                itemStyle={{ color: "white" }} // Ensure item text is white
              />
              <Bar dataKey="Percentage" barSize={barSize} radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.Exceeds ? "#dc2626" : "#10b981"} />
                ))}
                <LabelList
                  dataKey="TruePercentage"
                  position="insideTop"
                  formatter={(value: number) => (value === 0 ? "" : `${value}%`)}
                  fill="#1f2937"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
