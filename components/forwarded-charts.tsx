"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Loader2 } from "lucide-react"
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart as RechartsLineChart,
  Line,
} from "recharts"

// Colors for charts
const COLORS = ["#16a34a", "#22c55e", "#4ade80", "#86efac", "#bbf7d0", "#dcfce7"]

interface ChartData {
  id: string
  name: string
  type: string
  data: { label: string; value: number }[] // Adjust this based on your actual data structure
  forwardedAt: any // Adjust this type as needed
  comment?: string // Optional field
  options?: {
    // Add options property
    aspectRatio?: number
    marginTop?: number
    marginRight?: number
    marginBottom?: number
    marginLeft?: number
    showTooltip?: boolean
    showLegend?: boolean
    showGrid?: boolean
  }
}

export default function ForwardedCharts() {
  const [charts, setCharts] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchForwardedCharts = async () => {
      try {
        setLoading(true)
        setError(null)

        const chartsRef = collection(db!, "forwardedCharts")
        const q = query(chartsRef, orderBy("forwardedAt", "desc"))

        // Set up real-time listener
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const chartsData: ChartData[] = []
          querySnapshot.forEach((doc) => {
            chartsData.push({
              id: doc.id,
              ...doc.data(),
            } as ChartData)
          })
          setCharts(chartsData)
          setLoading(false)
        })

        return () => unsubscribe()
      } catch (err) {
        console.error("Error fetching forwarded charts:", err)
        setError("Failed to load forwarded charts. Please try again later.")
        setLoading(false)
      }
    }

    fetchForwardedCharts()
  }, [])

  const renderChart = (chart: ChartData) => {
    // Handle case where chart data is undefined or empty
    if (!chart.data || chart.data.length === 0) {
      return <div className="text-white">No data available</div>
    }

    const chartOptions = chart.options || {}
    const aspectRatio = chartOptions.aspectRatio || 1.5
    const marginTop = chartOptions.marginTop || 10
    const marginRight = chartOptions.marginRight || 30
    const marginBottom = chartOptions.marginBottom || 30
    const marginLeft = chartOptions.marginLeft || 40

    // Always use the chart's original type for forwarded charts
    const chartType = chart.type

    switch (chartType) {
      case "pie":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={chart.data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="35%" // Position higher to make room for legend
                outerRadius="50%" // Use percentage instead of fixed pixels
                fill="#8884d8"
                label
              >
                {chart.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              {chartOptions.showTooltip !== false && (
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e3a29", border: "1px solid #16a34a", borderRadius: "4px" }}
                  labelStyle={{ color: "white" }}
                  itemStyle={{ color: "white" }}
                />
              )}
              {chartOptions.showLegend !== false && (
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{
                    fontSize: "10px",
                    bottom: 0,
                    width: "100%",
                  }}
                />
              )}
            </RechartsPieChart>
          </ResponsiveContainer>
        )
      case "donut":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={chart.data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="35%" // Position higher to make room for legend
                innerRadius={60}
                outerRadius="50%"
                fill="#8884d8"
                label
              >
                {chart.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              {chartOptions.showTooltip !== false && (
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e3a29", border: "1px solid #16a34a", borderRadius: "4px" }}
                  labelStyle={{ color: "white" }}
                  itemStyle={{ color: "white" }}
                />
              )}
              {chartOptions.showLegend !== false && (
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{
                    fontSize: "10px",
                    bottom: 0,
                    width: "100%",
                  }}
                />
              )}
            </RechartsPieChart>
          </ResponsiveContainer>
        )
      case "bar":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart
              margin={{ top: 10, right: 10, bottom: 25, left: 10 }} // Adjust margins to fit
              data={chart.data}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={chartOptions.showGrid !== false ? "#555" : "none"} />
              <XAxis dataKey="label" stroke="#ddd" />
              <YAxis stroke="#ddd" />
              {chartOptions.showTooltip !== false && (
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e3a29", border: "1px solid #16a34a", borderRadius: "4px" }}
                  labelStyle={{ color: "white" }}
                  itemStyle={{ color: "white" }}
                />
              )}
              {chartOptions.showLegend !== false && (
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{
                    fontSize: "10px",
                    bottom: 0,
                    width: "100%",
                  }}
                />
              )}
              <Bar dataKey="value" fill="#82ca9d" />
            </RechartsBarChart>
          </ResponsiveContainer>
        )
      case "line":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart
              margin={{ top: 10, right: 10, bottom: 25, left: 10 }} // Adjust margins to fit
              data={chart.data}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={chartOptions.showGrid !== false ? "#555" : "none"} />
              <XAxis dataKey="label" stroke="#ddd" />
              <YAxis stroke="#ddd" />
              {chartOptions.showTooltip !== false && (
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e3a29", border: "1px solid #16a34a", borderRadius: "4px" }}
                  labelStyle={{ color: "white" }}
                  itemStyle={{ color: "white" }}
                />
              )}
              {chartOptions.showLegend !== false && (
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{
                    fontSize: "10px",
                    bottom: 0,
                    width: "100%",
                  }}
                />
              )}
              <Line type="monotone" dataKey="value" stroke="#8884d8" activeDot={{ r: 8 }} />
            </RechartsLineChart>
          </ResponsiveContainer>
        )
      case "gauge":
        // Implement a simple gauge chart
        const value = chart.data.reduce((sum, item) => sum + item.value, 0) / chart.data.length
        const maxValue = Math.max(...chart.data.map((item) => item.value))
        const percentage = (value / maxValue) * 100

        return (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="relative w-48 h-24 overflow-hidden">
              <div className="absolute bottom-0 w-full h-full bg-emerald-900 rounded-t-full"></div>
              <div
                className="absolute bottom-0 w-full bg-emerald-400 rounded-t-full transition-all duration-500"
                style={{ height: `${percentage}%` }}
              ></div>
            </div>
            <div className="mt-4 text-center">
              <div className="text-2xl font-bold">{value.toFixed(2)}</div>
              <div className="text-sm text-gray-300">Average Value</div>
            </div>
          </div>
        )
      case "stock":
        // Implement a simple stock chart (column chart with high/low indicators)
        return (
          <ResponsiveContainer width="100%" height="100%" aspect={aspectRatio}>
            <RechartsBarChart
              margin={{ top: marginTop, right: marginRight, bottom: marginBottom + 10, left: marginLeft }}
              data={chart.data}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={chartOptions.showGrid !== false ? "#555" : "none"} />
              <XAxis dataKey="label" stroke="#ddd" />
              <YAxis stroke="#ddd" />
              {chartOptions.showTooltip !== false && (
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e3a29", border: "1px solid #16a34a", borderRadius: "4px" }}
                  labelStyle={{ color: "white" }}
                  itemStyle={{ color: "white" }}
                />
              )}
              {chartOptions.showLegend !== false && (
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{
                    paddingTop: 10,
                    fontSize: "10px",
                    width: "100%",
                    position: "relative",
                    bottom: 0,
                  }}
                />
              )}
              <Bar dataKey="value" fill="#82ca9d">
                {chart.data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.value > (chart.data[index - 1]?.value || 0) ? "#4ade80" : "#ef4444"}
                  />
                ))}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        )
      case "horizontalStacked":
        // Implement a horizontal stacked bar chart
        return (
          <ResponsiveContainer width="100%" height="100%" aspect={aspectRatio}>
            <RechartsBarChart
              layout="vertical"
              margin={{ top: marginTop, right: marginRight, bottom: marginBottom + 10, left: marginLeft }}
              data={[{ name: "Data", ...Object.fromEntries(chart.data.map((item) => [item.label, item.value])) }]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={chartOptions.showGrid !== false ? "#555" : "none"} />
              <XAxis type="number" stroke="#ddd" />
              <YAxis dataKey="name" type="category" stroke="#ddd" />
              {chartOptions.showTooltip !== false && (
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e3a29", border: "1px solid #16a34a", borderRadius: "4px" }}
                  labelStyle={{ color: "white" }}
                  itemStyle={{ color: "white" }}
                />
              )}
              {chartOptions.showLegend !== false && (
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{
                    paddingTop: 10,
                    fontSize: "10px",
                    width: "100%",
                    position: "relative",
                    bottom: 0,
                  }}
                />
              )}
              {chart.data.map((item, index) => (
                <Bar key={item.label} dataKey={item.label} stackId="a" fill={COLORS[index % COLORS.length]} />
              ))}
            </RechartsBarChart>
          </ResponsiveContainer>
        )
      default:
        // If chart type is not supported, show an error message
        return <div className="text-white">Chart Type Not Supported</div>
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
      </div>
    )
  }

  if (error) {
    return <div className="bg-red-500/20 border border-red-500 text-white p-4 rounded-md">{error}</div>
  }

  if (charts.length === 0) {
    // Return null to hide the component when there are no charts
    return null
  }

  return (
    <div className="space-y-6 mt-6">
      <h2 className="text-2xl font-bold text-white">Forwarded Charts</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {charts.map((chart) => (
          <Card key={chart.id} className="bg-emerald-800 border-emerald-700 text-white">
            <CardHeader>
              <CardTitle className="text-lg font-medium">{chart.name}</CardTitle>
              <CardDescription className="text-gray-300">
                {chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} Chart
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full flex items-center justify-center bg-emerald-700/50 rounded-md p-4 mb-4">
                <div className="w-full h-full" style={{ position: "relative", maxHeight: "100%" }}>
                  {renderChart(chart)}
                </div>
              </div>
              {chart.comment && (
                <div className="mt-4 bg-emerald-700/30 p-4 rounded-md">
                  <h4 className="text-sm font-medium text-emerald-300 mb-2">Chart Information:</h4>
                  <p className="text-sm text-gray-200">{chart.comment}</p>
                </div>
              )}
              <div className="mt-2 text-xs text-gray-400">
                Forwarded on {new Date(chart.forwardedAt?.toDate()).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
