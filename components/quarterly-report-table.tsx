"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart } from "lucide-react"
import { useState, useEffect } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase" // Assuming db is exported from your firebase config

// Define the structure for a service's quarterly data
interface ServiceQuarterData {
  serviceName: string
  q1: { target: string; accomplishment: string }
  q2: { target: string; accomplishment: string }
  q3: { target: string; accomplishment: string }
  q4: { target: string; accomplishment: string }
}

export default function QuarterlyReportTable() {
  const [quarterlyData, setQuarterlyData] = useState<ServiceQuarterData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchYearTargetData = async () => {
      if (!db) {
        setError("Firestore is not initialized.")
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)
      try {
        const currentYear = new Date().getFullYear().toString()
        const yearDocRef = doc(db, "yearTargets", currentYear)
        const docSnap = await getDoc(yearDocRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          // Ensure data.services is an array and matches ServiceQuarterData structure
          const fetchedServices: ServiceQuarterData[] = data.services.map((service: any) => ({
            serviceName: service.serviceName || "N/A",
            q1: { target: service.q1?.target || "0", accomplishment: service.q1?.accomplishment || "0" },
            q2: { target: service.q2?.target || "0", accomplishment: service.q2?.accomplishment || "0" },
            q3: { target: service.q3?.target || "0", accomplishment: service.q3?.accomplishment || "0" },
            q4: { target: service.q4?.target || "0", accomplishment: service.q4?.accomplishment || "0" },
          }))
          setQuarterlyData(fetchedServices)
        } else {
          setQuarterlyData([]) // No data for the current year
        }
      } catch (err) {
        console.error("Error fetching year target data:", err)
        setError("Failed to load quarterly report data.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchYearTargetData()
  }, []) // Empty dependency array means this runs once on mount

  return (
    <Card style={{ backgroundColor: "#FAF8F2", borderColor: "#DDD7B1" }} className="border text-[#2F3E2E]">
      <CardHeader>
        <CardTitle className="text-lg font-medium flex items-center gap-2 text-[#5B8C5A]">
          <BarChart className="h-5 w-5 text-[#5B8C5A]" />
          Quarterly Service Report ({new Date().getFullYear()})
        </CardTitle>
        <CardDescription className="text-[#2F3E2E]">Overview of service targets and accomplishments</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <svg
              className="animate-spin h-8 w-8 text-[#5B8C5A]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="ml-3 text-[#2F3E2E]">Loading quarterly report...</span>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-8">
            <p>{error}</p>
            <p>Please ensure Firebase is correctly configured and data exists for the current year.</p>
          </div>
        ) : quarterlyData.length === 0 ? (
          <div className="text-center text-[#4A5C49] py-8">
            <p>No quarterly targets found for {new Date().getFullYear()}.</p>
            <p>Please set targets in the "Year Target" section of My Account.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead rowSpan={2} className="min-w-[150px] text-center hover:bg-transparent text-[#2F3E2E]">
                    Service
                  </TableHead>
                  <TableHead colSpan={2} className="text-center border-b hover:bg-transparent text-[#2F3E2E]">
                    1st Quarter
                  </TableHead>
                  <TableHead colSpan={2} className="text-center border-b hover:bg-transparent text-[#2F3E2E]">
                    2nd Quarter
                  </TableHead>
                  <TableHead colSpan={2} className="text-center border-b hover:bg-transparent text-[#2F3E2E]">
                    3rd Quarter
                  </TableHead>
                  <TableHead colSpan={2} className="text-center border-b hover:bg-transparent text-[#2F3E2E]">
                    4th Quarter
                  </TableHead>
                </TableRow>
                <TableRow>
                  <TableHead className="text-center hover:bg-transparent text-[#2F3E2E]">Target</TableHead>
                  <TableHead className="text-center hover:bg-transparent text-[#2F3E2E]">Accomplishment</TableHead>
                  <TableHead className="text-center hover:bg-transparent text-[#2F3E2E]">Target</TableHead>
                  <TableHead className="text-center hover:bg-transparent text-[#2F3E2E]">Accomplishment</TableHead>
                  <TableHead className="text-center hover:bg-transparent text-[#2F3E2E]">Target</TableHead>
                  <TableHead className="text-center hover:bg-transparent text-[#2F3E2E]">Accomplishment</TableHead>
                  <TableHead className="text-center hover:bg-transparent text-[#2F3E2E]">Target</TableHead>
                  <TableHead className="text-center hover:bg-transparent text-[#2F3E2E]">Accomplishment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quarterlyData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{row.serviceName}</TableCell>
                    <TableCell className="text-center">{row.q1.target || "-"}</TableCell>
                    <TableCell className="text-center">{row.q1.accomplishment || "-"}</TableCell>
                    <TableCell className="text-center">{row.q2.target || "-"}</TableCell>
                    <TableCell className="text-center">{row.q2.accomplishment || "-"}</TableCell>
                    <TableCell className="text-center">{row.q3.target || "-"}</TableCell>
                    <TableCell className="text-center">{row.q3.accomplishment || "-"}</TableCell>
                    <TableCell className="text-center">{row.q4.target || "-"}</TableCell>
                    <TableCell className="text-center">{row.q4.accomplishment || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
