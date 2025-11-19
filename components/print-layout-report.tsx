"use client"

import { RefreshCw } from "lucide-react"

interface ReportData {
  totalItems: number
  lowStockItems: number
  outOfStockItems: number
  categoryDistribution: Record<string, number>
  statusDistribution: Record<string, number>
  locationDistribution: Record<string, number>
  monthlyTrends: Record<string, number>
  inventoryValue: number
  calibrationStatusDistribution: Record<string, number>
  reagentCategoryDistribution?: Record<string, number>
  totalContainers?: number
  uniqueChemicals?: number
  containerStatusDistribution?: Record<string, number>
  expiredContainers?: number
  nearExpireContainers?: number
}

interface PrintLayoutReportProps {
  reportData: ReportData
  activeMainTab: string
  equipmentCategory: string
  supplyCategory: string
  chemicalCategory?: string
  getCategoryLabel: (mainTab: string, subCategory: string) => string
  isLoading: boolean
}

export default function PrintLayoutReport({
  reportData,
  activeMainTab,
  equipmentCategory,
  supplyCategory,
  chemicalCategory = "chemical",
  getCategoryLabel,
  isLoading,
}: PrintLayoutReportProps) {
  const currentSubCategory =
    activeMainTab === "equipment" ? equipmentCategory : activeMainTab === "supplies" ? supplyCategory : chemicalCategory

  return (
    <div className="print-only-content">
      {/* Summary Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-black mb-4">
          {getCategoryLabel(activeMainTab, currentSubCategory)} Inventory Status Report
        </h2>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="border border-gray-300 rounded p-3">
            <div className="text-sm text-gray-600 mb-1">
              {activeMainTab === "equipment"
                ? "Total Equipment"
                : activeMainTab === "supplies"
                  ? "Total Supplies"
                  : "Unique Chemicals"}
            </div>
            <div className="text-2xl font-bold text-black">{reportData.totalItems}</div>
          </div>

          {activeMainTab === "chemicals" && (
            <div className="border border-gray-300 rounded p-3">
              <div className="text-sm text-gray-600 mb-1">Total Containers</div>
              <div className="text-2xl font-bold text-black">{reportData.totalContainers || 0}</div>
            </div>
          )}

          <div className="border border-gray-300 rounded p-3">
            <div className="text-sm text-gray-600 mb-1">
              {activeMainTab === "equipment"
                ? "For Repair/Maintenance Due"
                : activeMainTab === "chemicals"
                  ? "Expired Containers"
                  : "Low Stock"}
            </div>
            <div className="text-2xl font-bold text-black">
              {activeMainTab === "chemicals" ? reportData.expiredContainers || 0 : reportData.lowStockItems}
            </div>
          </div>

          <div className="border border-gray-300 rounded p-3">
            <div className="text-sm text-gray-600 mb-1">
              {activeMainTab === "equipment"
                ? "For Decommission/Out of Service"
                : activeMainTab === "chemicals"
                  ? "Near Expire Containers"
                  : "Out of Stock"}
            </div>
            <div className="text-2xl font-bold text-black">
              {activeMainTab === "chemicals" ? reportData.nearExpireContainers || 0 : reportData.outOfStockItems}
            </div>
          </div>
        </div>
        <div className="border border-gray-300 rounded p-3">
          <div className="text-sm text-gray-600 mb-1">Total Estimated Value</div>
          <div className="text-xl font-bold text-black">₱{reportData.inventoryValue.toFixed(2)}</div>
        </div>
      </div>

      {/* Category Distribution */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-black mb-4">
          {activeMainTab === "chemicals" ? "Reagent Category Distribution" : "Category Distribution"}
        </h2>
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="h-8 w-8 animate-spin text-black" />
          </div>
        ) : (
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left text-black">
                  {activeMainTab === "chemicals" ? "Reagent Category" : "Category"}
                </th>
                <th className="border border-gray-300 p-2 text-right text-black">Count</th>
                <th className="border border-gray-300 p-2 text-right text-black">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(reportData.categoryDistribution).map(([cat, count], index) => (
                <tr key={index}>
                  <td className="border border-gray-300 p-2 text-black">{cat}</td>
                  <td className="border border-gray-300 p-2 text-right text-black">{count}</td>
                  <td className="border border-gray-300 p-2 text-right text-black">
                    {reportData.totalItems > 0 ? `${((count / reportData.totalItems) * 100).toFixed(1)}%` : "0%"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Status Distribution */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-black mb-4">Status Distribution</h2>
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="h-8 w-8 animate-spin text-black" />
          </div>
        ) : (
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left text-black">Status</th>
                <th className="border border-gray-300 p-2 text-right text-black">Count</th>
                <th className="border border-gray-300 p-2 text-right text-black">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(reportData.statusDistribution).map(([status, count], index) => (
                <tr key={index}>
                  <td className="border border-gray-300 p-2 text-black">{status}</td>
                  <td className="border border-gray-300 p-2 text-right text-black">{count}</td>
                  <td className="border border-gray-300 p-2 text-right text-black">
                    {reportData.totalItems > 0 ? `${((count / reportData.totalItems) * 100).toFixed(1)}%` : "0%"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Calibration Status Distribution (only for Lab Equipment) */}
      {activeMainTab === "equipment" &&
        equipmentCategory === "laboratory" &&
        Object.keys(reportData.calibrationStatusDistribution).length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-black mb-4">Calibration Status Distribution</h2>
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <RefreshCw className="h-8 w-8 animate-spin text-black" />
              </div>
            ) : (
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left text-black">Status</th>
                    <th className="border border-gray-300 p-2 text-right text-black">Count</th>
                    <th className="border border-gray-300 p-2 text-right text-black">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(reportData.calibrationStatusDistribution).map(([status, count], index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 p-2 text-black">{status}</td>
                      <td className="border border-gray-300 p-2 text-right text-black">{count}</td>
                      <td className="border border-gray-300 p-2 text-right text-black">
                        {reportData.totalItems > 0 ? `${((count / reportData.totalItems) * 100).toFixed(1)}%` : "0%"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      {/* Reagent Category Distribution (only for Chemicals) */}
      {activeMainTab === "chemicals" &&
        reportData.reagentCategoryDistribution &&
        Object.keys(reportData.reagentCategoryDistribution).length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-black mb-4">Reagent Category Distribution</h2>
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <RefreshCw className="h-8 w-8 animate-spin text-black" />
              </div>
            ) : (
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left text-black">Reagent Category</th>
                    <th className="border border-gray-300 p-2 text-right text-black">Count</th>
                    <th className="border border-gray-300 p-2 text-right text-black">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(reportData.reagentCategoryDistribution).map(([category, count], index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 p-2 text-black">{category}</td>
                      <td className="border border-gray-300 p-2 text-right text-black">{count}</td>
                      <td className="border border-gray-300 p-2 text-right text-black">
                        {reportData.totalItems > 0 ? `${((count / reportData.totalItems) * 100).toFixed(1)}%` : "0%"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      {/* Container Status Distribution (only for Chemicals) */}
      {activeMainTab === "chemicals" &&
        reportData.containerStatusDistribution &&
        Object.keys(reportData.containerStatusDistribution).length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-black mb-4">Container Status Distribution</h2>
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <RefreshCw className="h-8 w-8 animate-spin text-black" />
              </div>
            ) : (
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left text-black">Container Status</th>
                    <th className="border border-gray-300 p-2 text-right text-black">Count</th>
                    <th className="border border-gray-300 p-2 text-right text-black">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(reportData.containerStatusDistribution).map(([status, count], index) => {
                    const totalContainers = reportData.totalContainers || 1
                    return (
                      <tr key={index}>
                        <td className="border border-gray-300 p-2 text-black">{status}</td>
                        <td className="border border-gray-300 p-2 text-right text-black">{count}</td>
                        <td className="border border-gray-300 p-2 text-right text-black">
                          {totalContainers > 0 ? `${((count / totalContainers) * 100).toFixed(1)}%` : "0%"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

      {/* Location Distribution */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-black mb-4">Location Distribution</h2>
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="h-8 w-8 animate-spin text-black" />
          </div>
        ) : (
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left text-black">Location</th>
                <th className="border border-gray-300 p-2 text-right text-black">Count</th>
                <th className="border border-gray-300 p-2 text-right text-black">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(reportData.locationDistribution).map(([location, count], index) => (
                <tr key={index}>
                  <td className="border border-gray-300 p-2 text-black">{location}</td>
                  <td className="border border-gray-300 p-2 text-right text-black">{count}</td>
                  <td className="border border-gray-300 p-2 text-right text-black">
                    {reportData.totalItems > 0 ? `${((count / reportData.totalItems) * 100).toFixed(1)}%` : "0%"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Monthly Trends */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-black mb-4">Monthly Trends (Items Modified/Added)</h2>
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="h-8 w-8 animate-spin text-black" />
          </div>
        ) : (
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left text-black">Month</th>
                <th className="border border-gray-300 p-2 text-right text-black">Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(reportData.monthlyTrends).map(([month, count], index) => (
                <tr key={index}>
                  <td className="border border-gray-300 p-2 text-black">{month}</td>
                  <td className="border border-gray-300 p-2 text-right text-black">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
