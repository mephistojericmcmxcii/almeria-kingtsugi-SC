"use client"

import type React from "react"
import type { Sample } from "@/types"

interface PrintLayoutAnalysisResultProps {
  sample: Sample
}

// Robust date formatter – accepts Date, Firestore Timestamp, ISO string, or epoch
export const formatDate = (rawDate: unknown): string => {
  if (!rawDate) return "N/A"

  let date: Date

  // Firestore Timestamp
  if (
    typeof rawDate === "object" &&
    rawDate !== null &&
    "toDate" in rawDate &&
    typeof (rawDate as any).toDate === "function"
  ) {
    date = (rawDate as any).toDate()
  }
  // Already a Date instance
  else if (rawDate instanceof Date) {
    date = rawDate
  }
  // ISO string or epoch number
  else {
    date = new Date(rawDate as string | number)
  }

  // Fallback if conversion failed
  if (isNaN(date.getTime())) return "N/A"

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "pending":
      return "bg-amber-100 text-amber-800 border-amber-300"
    case "processing":
      return "bg-blue-100 text-blue-800 border-blue-300"
    case "completed":
      return "bg-green-100 text-green-800 border-green-300"
    case "released":
      return "bg-teal-100 text-teal-800 border-teal-300"
    default:
      return "bg-gray-100 text-gray-800 border-gray-300"
  }
}

// Get status badge styling
export const getStatusStyling = (status: string) => {
  switch (status?.toLowerCase()) {
    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "processing":
      return "bg-blue-50 text-blue-700 border-blue-200"
    case "completed":
      return "bg-green-50 text-green-700 border-green-200"
    case "released":
      return "bg-teal-50 text-teal-700 border-teal-200"
    default:
      return "bg-gray-50 text-gray-700 border-gray-200"
  }
}

const PrintLayoutAnalysisResult: React.FC<PrintLayoutAnalysisResultProps> = ({ sample }) => {
  if (!sample) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No sample data available for printing.</p>
      </div>
    )
  }

  const isTestingSample = sample.serviceType === "testing" || !sample.serviceType
  const isNonTestingGeneral = sample.serviceType === "non-testing"
  const isSTK = sample.serviceType === "stk"
  const isSoilInoculant = sample.serviceType === "soil_inoculant"
  const isMushroomSpawn = sample.serviceType === "mushroom_spawn"
  const isGeotagging = sample.serviceType === "geotagging"
  const isFertilizerRecommendation = sample.serviceType === "fertilizer_recommendation"

  const hasResults =
    isTestingSample &&
    (sample.status?.toLowerCase() === "completed" || sample.status?.toLowerCase() === "released") &&
    sample.samples &&
    sample.samples.length > 0

  return (
    <div className="print-container bg-white text-black font-serif max-w-none">
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.1; z-index: 0; width: 400pt; height: 400pt; pointer-events: none;">
        <img
          src="/watermark/da-logo-notxt.png"
          alt="DA Logo Watermark"
          style="width: 100%; height: 100%; object-fit: contain;"
        />
      </div>
      <div style="position: relative; z-index: 1;">
        <style jsx>{`
          @media print {
            .print-container {
              font-size: 9pt;
              line-height: 1.2;
              color: #000;
              max-width: none;
              margin: 0;
              padding: 0;
            }
            .page-break {
              page-break-before: always;
            }
            .avoid-break {
              page-break-inside: avoid;
            }
            .print-header {
              margin-bottom: 12pt;
            }
            .print-section {
              margin-bottom: 8pt;
            }
            .signature-section {
              margin-top: 72pt;
              page-break-inside: avoid;
            }
            .table-header {
              background-color: #166534 !important;
              color: white !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .table-row:nth-child(even) {
              background-color: #e2e8f0 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .logo-section {
              height: 50pt;
            }
            .header-text {
              font-size: 10pt;
              font-weight: bold;
              color: #166534; /* Green for print */
            }
            .sub-header {
              font-size: 9pt;
              font-weight: 600;
              color: #15803d; /* Green for print */
            }
            .main-title {
              font-size: 14pt;
              font-weight: bold;
              color: #166534; /* Green for print */
            }
            .section-title {
              font-size: 11pt;
              font-weight: bold;
              color: #166534; /* Green for print */
            }
            .field-label {
              font-size: 9pt;
              color: #374151; /* Gray for print */
            }
            .field-value {
              font-size: 9pt;
              color: #000; /* Black for print */
            }
            .table-text {
              font-size: 8pt;
            }
            .signature-text {
              font-size: 9pt;
            }
            .footer-text {
              font-size: 8pt;
            }
            .watermark-container {
              position: fixed !important;
              top: 50% !important;
              left: 50% !important;
              transform: translate(-50%, -50%) !important;
              opacity: 0.2 !important;
              z-index: -1 !important;
              width: 500pt !important;
              height: 500pt !important;
              pointer-events: none !important;
            }
          }
          @page {
            margin: 0.4in;
            size: legal;
          }
          @media screen {
            .print-container {
              max-width: 8.5in;
              margin: 0 auto;
              padding: 0.4in;
              box-shadow: 0 0 15px rgba(0,0,0,0.1);
            }
            .print-header {
              margin-bottom: 1rem;
            }
            .print-section {
              margin-bottom: 0.5rem;
            }
            .signature-section {
              margin-top: 4.5rem;
            }
            .header-text {
              font-size: 11pt;
              font-weight: bold;
              color: #166534; /* Green for screen */
            }
            .sub-header {
              font-size: 10pt;
              font-weight: 600;
              color: #15803d; /* Green for screen */
            }
            .main-title {
              font-size: 14pt;
              font-weight: bold;
              color: #166534; /* Green for screen */
            }
            .section-title {
              font-size: 11pt;
              font-weight: bold;
              color: #166534; /* Green for screen */
            }
            .field-label {
              font-size: 9pt;
              color: #374151; /* Gray for screen */
            }
            .field-value {
              font-size: 9pt;
              color: #000; /* Black for screen */
            }
            .table-text {
              font-size: 8pt;
            }
            .signature-text {
              font-size: 9pt;
            }
            .footer-text {
              font-size: 8pt;
            }
            .watermark-container {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              opacity: 0.2;
              z-index: 0;
              width: 500px;
              height: 500px;
              pointer-events: none;
            }
          }
        `}</style>

        <header className="print-header avoid-break">
          <div className="text-center mb-3">
            <div className="flex items-center justify-center gap-4 mb-2">
              <div className="logo-section w-16 h-16 flex items-center justify-center">
                <img
                  src="/logos/da-logo.png"
                  alt="Department of Agriculture Logo"
                  className="w-14 h-14 object-contain"
                />
              </div>
              <div className="text-center">
                <h1 className="header-text">REPUBLIC OF THE PHILIPPINES</h1>
                <h2 className="header-text">DEPARTMENT OF AGRICULTURE</h2>
                <h3 className="sub-header">Regional Field Office VIII</h3>
                <h4 className="sub-header">Regional Soils Laboratory</h4>
                <p className="text-xs text-gray-600">1 & 4 Libertad St. Magsaysay, Tacloban City</p>
              </div>
              <div className="logo-section w-16 h-16 flex items-center justify-center">
                <img
                  src="/logos/rsl-logo.png"
                  alt="Regional Soils Laboratory Logo"
                  className="w-14 h-14 object-contain"
                />
              </div>
            </div>

            <div className="border-t border-green-600 pt-2 mt-2">
              <h1 className="main-title text-center">LABORATORY ANALYSIS REPORT</h1>
              <div className="text-center text-xs text-gray-600 uppercase tracking-wide">Certificate of Analysis</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-xs border-b border-gray-300 pb-2 mb-3 mt-8">
            <div>
              <div className="field-label font-bold">LSRF Reference No.</div>
              <div className="field-value text-sm font-bold border-b border-gray-400 pb-0.5">
                {sample.lsrfNo || "N/A"}
              </div>
            </div>
            <div>
              <div className="field-label font-bold">Date Received</div>
              <div className="field-value border-b border-gray-400 pb-0.5">{formatDate(sample.dateReceived)}</div>
            </div>
            <div>
              <div className="field-label font-bold">Due Date</div>
              <div className="field-value border-b border-gray-400 pb-0.5">{formatDate(sample.dueDate) || "N/A"}</div>
            </div>
            <div>
              <div className="field-label font-bold">Status</div>
              <div
                className={`border border-gray-400 px-1 py-0.5 text-center rounded text-xs font-semibold uppercase ${getStatusColor(sample.status)}`}
              >
                {sample.status}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-xs mb-3">
            <div>
              <div className="field-label font-bold">Sample Code</div>
              <div className="field-value border-b border-gray-400 pb-0.5">{sample.sampleCode || "N/A"}</div>
            </div>
            <div>
              <div className="field-label font-bold">Laboratory Code</div>
              <div className="field-value border-b border-gray-400 pb-0.5">{sample.laboratorySampleCode || "N/A"}</div>
            </div>
            <div>
              <div className="field-label font-bold">Priority</div>
              <div className="field-value border-b border-gray-400 pb-0.5 capitalize">
                {sample.priority || "Normal"}
              </div>
            </div>
            <div>
              <div className="field-label font-bold">Collection Date</div>
              <div className="field-value border-b border-gray-400 pb-0.5">{formatDate(sample.collectionDate)}</div>
            </div>
          </div>
        </header>

        <section className="print-section avoid-break">
          <h2 className="section-title border-b-2 border-green-800 pb-0.5 mb-2">CLIENT INFORMATION</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
            <div className="flex">
              <span className="field-label font-semibold w-20 flex-shrink-0">Name:</span>
              <span className="field-value font-medium border-b border-gray-300 flex-1 pb-0.5">
                {sample.customerName}
              </span>
            </div>
            <div className="flex">
              <span className="field-label font-semibold w-20 flex-shrink-0">Email:</span>
              <span className="field-value border-b border-gray-300 flex-1 pb-0.5">
                {sample.customerEmail || "N/A"}
              </span>
            </div>
            <div className="flex">
              <span className="field-label font-semibold w-20 flex-shrink-0">Address:</span>
              <span className="field-value border-b border-gray-300 flex-1 pb-0.5">
                {sample.customerAddress || "N/A"}
              </span>
            </div>
            <div className="flex">
              <span className="field-label font-semibold w-20 flex-shrink-0">Phone:</span>
              <span className="field-value border-b border-gray-300 flex-1 pb-0.5">
                {sample.customerPhone || "N/A"}
              </span>
            </div>
            <div className="flex">
              <span className="field-label font-semibold w-20 flex-shrink-0">Organization:</span>
              <span className="field-value border-b border-gray-300 flex-1 pb-0.5">
                {sample.customerOrganization || "N/A"}
              </span>
            </div>
            <div className="flex">
              <span className="field-label font-semibold w-20 flex-shrink-0">Client Type:</span>
              <span className="field-value border-b border-gray-300 flex-1 pb-0.5 capitalize">{sample.clientType}</span>
            </div>
            <div className="flex">
              <span className="field-label font-semibold w-20 flex-shrink-0">RSBSA Member:</span>
              <span className="field-value border-b border-gray-300 flex-1 pb-0.5">
                {sample.isRSBSA === "Yes" ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex">
              <span className="field-label font-semibold w-20 flex-shrink-0">RSBSA No.:</span>
              <span className="field-value border-b border-gray-300 flex-1 pb-0.5">{sample.rsbsaIdNo || "N/A"}</span>
            </div>
          </div>
        </section>

        <section className="print-section avoid-break">
          <h2 className="section-title border-b-2 border-green-800 pb-0.5 mb-2">SERVICE DETAILS</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
            <div className="flex">
              <span className="field-label font-semibold w-20 flex-shrink-0">Service Type:</span>
              <span className="field-value capitalize border-b border-gray-300 flex-1 pb-0.5">
                {sample.serviceType?.replace("_", " ") || "Testing"}
              </span>
            </div>
            <div className="flex">
              <span className="field-label font-semibold w-20 flex-shrink-0">Number of samples:</span>
              <span className="field-value border-b border-gray-300 flex-1 pb-0.5">
                {sample.samples?.length || "N/A"}
              </span>
            </div>
            <div className="flex">
              <span className="field-label font-semibold w-20 flex-shrink-0">Requested parameters:</span>
              <span className="field-value border-b border-gray-300 flex-1 pb-0.5">
                {sample.parameters?.join(", ") || "N/A"}
              </span>
            </div>
            <div className="flex">
              <span className="field-label font-semibold w-20 flex-shrink-0">Parameters:</span>
              <span className="field-value border-b border-gray-300 flex-1 pb-0.5">
                {sample.parameters?.length || "0"} parameter(s)
              </span>
            </div>
            <div className="flex col-span-2">
              <span className="field-label font-semibold w-20 flex-shrink-0">Method Used:</span>
              <span className="field-value border-b border-gray-300 flex-1 pb-0.5">
                {sample.parameters
                  ?.map((param: string, index: number) => {
                    // Get method from first sample's results for this parameter
                    const firstSampleCode =
                      sample.samples?.[0]?.laboratorySampleCode || sample.samples?.[0]?.sampleCode || "001"
                    const method = sample.results?.[firstSampleCode]?.[param]?.method || "N/A"
                    return (
                      <span key={param}>
                        <sup className="text-xs">{index + 1}</sup>
                        {method}
                        {index < (sample.parameters?.length || 0) - 1 ? ", " : ""}
                      </span>
                    )
                  })
                  .join("") || "N/A"}
              </span>
            </div>
            <div className="flex col-span-2">
              <span className="field-label font-semibold w-20 flex-shrink-0">Adequate Values:</span>
              <span className="field-value border-b border-gray-300 flex-1 pb-0.5">
                {sample.parameters
                  ?.map((param: string, index: number) => {
                    // Get adequate value from first sample's results for this parameter
                    const firstSampleCode =
                      sample.samples?.[0]?.laboratorySampleCode || sample.samples?.[0]?.sampleCode || "001"
                    const adequateValue = sample.results?.[firstSampleCode]?.[param]?.adequateValue || "N/A"
                    return (
                      <span key={param}>
                        <sup className="text-xs">{index + 1}</sup>
                        {adequateValue}
                        {index < (sample.parameters?.length || 0) - 1 ? ", " : ""}
                      </span>
                    )
                  })
                  .join("") || "N/A"}
              </span>
            </div>
            {sample.releasedAt && (
              <div className="flex">
                <span className="field-label font-semibold w-20 flex-shrink-0">Date Released:</span>
                <span className="field-value border-b border-gray-300 flex-1 pb-0.5">
                  {formatDate(sample.releasedAt)}
                </span>
              </div>
            )}
            {sample.analysisCompleted && (
              <div className="flex">
                <span className="field-label font-semibold w-20 flex-shrink-0">Analysis Completed:</span>
                <span className="field-value border-b border-gray-300 flex-1 pb-0.5">
                  {formatDate(sample.analysisCompleted)}
                </span>
              </div>
            )}
            {sample.sampleLocation && (
              <div className="flex">
                <span className="field-label font-semibold w-20 flex-shrink-0">Sample Location:</span>
                <span className="field-value border-b border-gray-300 flex-1 pb-0.5">{sample.sampleLocation}</span>
              </div>
            )}
            <div className="flex">
              <span className="field-label font-semibold w-20 flex-shrink-0">Sample Type:</span>
              <span className="field-value border-b border-gray-300 flex-1 pb-0.5 capitalize">
                {sample.sampleType || sample.serviceType?.replace("_", " ") || "N/A"}
              </span>
            </div>
          </div>
        </section>

        {isNonTestingGeneral && (
          <section className="print-section avoid-break">
            <h2 className="section-title border-b-2 border-green-800 pb-1 mb-4">PRODUCT INFORMATION</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex">
                <span className="field-label font-semibold w-28 flex-shrink-0">Product Type:</span>
                <span className="field-value border-b border-gray-300 flex-1 pb-1">{sample.productType || "N/A"}</span>
              </div>
              <div className="flex">
                <span className="field-label font-semibold w-28 flex-shrink-0">Batch No.:</span>
                <span className="field-value border-b border-gray-300 flex-1 pb-1">
                  {sample.productionBatchNo || "N/A"}
                </span>
              </div>
              <div className="flex">
                <span className="field-label font-semibold w-28 flex-shrink-0">Harvest Date:</span>
                <span className="field-value border-b border-gray-300 flex-1 pb-1">
                  {formatDate(sample.harvestDate)}
                </span>
              </div>
              <div className="flex">
                <span className="field-label font-semibold w-28 flex-shrink-0">Quantity:</span>
                <span className="field-value border-b border-gray-300 flex-1 pb-1">
                  {sample.quantity || "N/A"} {sample.quantityUnit || ""}
                </span>
              </div>
              <div className="flex col-span-2">
                <span className="field-label font-semibold w-28 flex-shrink-0">Purpose:</span>
                <span className="field-value border-b border-gray-300 flex-1 pb-1">
                  {sample.purposeOfSample || "N/A"}
                </span>
              </div>
            </div>
          </section>
        )}

        {isSTK && (
          <section className="print-section avoid-break">
            <h2 className="section-title border-b-2 border-green-800 pb-1 mb-4">SOIL TEST KIT (STK) INFORMATION</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex">
                <span className="field-label font-semibold w-28 flex-shrink-0">Location:</span>
                <span className="field-value border-b border-gray-300 flex-1 pb-1">
                  {sample.soilSampleLocation || "N/A"}
                </span>
              </div>
              <div className="flex">
                <span className="field-label font-semibold w-28 flex-shrink-0">Soil Depth:</span>
                <span className="field-value border-b border-gray-300 flex-1 pb-1">{sample.soilDepth || "N/A"} cm</span>
              </div>
              <div className="flex col-span-2">
                <span className="field-label font-semibold w-28 flex-shrink-0">Crop Type:</span>
                <span className="field-value border-b border-gray-300 flex-1 pb-1">{sample.cropType || "N/A"}</span>
              </div>
            </div>
          </section>
        )}

        {isTestingSample && (
          <section className="print-section">
            <h2 className="section-title border-b-2 border-green-800 pb-0.5 mb-2">ANALYSIS RESULTS</h2>

            {hasResults ? (
              <div className="border border-gray-400">
                <table className="w-full table-text border-collapse">
                  <thead>
                    <tr className="table-header" style={{ height: "120%" }}>
                      <th className="border border-gray-400 px-1 py-2 text-left font-bold text-white text-base">
                        Lab Code
                      </th>
                      <th className="border border-gray-400 px-1 py-2 text-left font-bold text-white text-base">
                        Sample ID
                      </th>
                      {sample.parameters?.map((param: string, index: number) => (
                        <th
                          key={param}
                          className="border border-gray-400 px-1 py-2 text-center font-bold text-white text-base"
                        >
                          <sup className="text-xs mr-1">{index + 1}</sup>
                          {param}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sample.samples?.map((sampleItem: any, index: number) => {
                      const sampleCode =
                        sampleItem.laboratorySampleCode ||
                        sampleItem.sampleCode ||
                        `${String(index + 1).padStart(3, "0")}`

                      return (
                        <tr key={index} className={index % 2 === 0 ? "bg-white" : "table-row"}>
                          <td className="border border-gray-400 px-1 py-1 font-semibold text-xs">{sampleCode}</td>
                          <td className="border border-gray-400 px-1 py-1 text-xs">{sampleItem.sampleID || "N/A"}</td>
                          {sample.parameters?.map((param: string) => (
                            <td key={param} className="border border-gray-400 px-1 py-1 text-center">
                              <div className="font-semibold text-xs">
                                {sample.results?.[sampleCode]?.[param]?.value || "N/A"}
                              </div>
                              {sample.results?.[sampleCode]?.[param]?.unit && (
                                <div className="text-xs text-gray-600">({sample.results[sampleCode][param].unit})</div>
                              )}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border-2 border-amber-400 bg-amber-50 p-3 text-center">
                <div className="text-amber-800 font-semibold text-sm mb-1">Analysis Results Pending</div>
                <div className="text-amber-700 text-xs">
                  Results will be available once the sample analysis is completed.
                </div>
                <div className="text-amber-600 text-xs mt-1">Current status: {sample.status}</div>
              </div>
            )}
          </section>
        )}

        {sample.notes && (
          <section className="print-section avoid-break">
            <h2 className="section-title border-b-2 border-green-800 pb-0.5 mb-2">REMARKS / ADDITIONAL NOTES</h2>
            <div className="border border-gray-400 p-2 text-xs bg-gray-50">
              <p className="whitespace-pre-wrap leading-relaxed">{sample.notes}</p>
            </div>
          </section>
        )}

        <div className="signature-section mt-8 pt-3 border-t-2 border-gray-400">
          <div className="grid grid-cols-2 gap-8 signature-text">
            <div className="text-center">
              <div className="mb-8 text-gray-700 font-semibold text-xs italic">Reviewed by:</div>
              <div className="border-b-2 border-gray-600 mb-1 mx-4"></div>
              <div className="text-xs text-gray-800 font-bold mt-2">JAYVEE A. DELA TORRE, RCh</div>
              <div className="text-xs text-gray-600 mt-0.5 font-medium">Chemist I</div>
              <div className="text-xs text-gray-500 mt-0.5">License No. 0015116</div>
            </div>

            <div className="text-center">
              <div className="mb-8 text-gray-700 font-semibold text-xs italic">Certified by:</div>
              <div className="border-b-2 border-gray-600 mb-1 mx-4"></div>
              <div className="text-xs text-gray-800 font-bold mt-2">MA KRIS V. TOLENTINO, RCh</div>
              <div className="text-xs text-gray-600 mt-0.5 font-medium">Chief, RSL</div>
              <div className="text-xs text-gray-500 mt-0.5">License No. 0011393</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrintLayoutAnalysisResult

export const generateSampleReportBodyHtml = (sample: Sample, stkLabReportData?: any): string => {
  if (!sample) {
    return '<div style="padding: 20px; text-align: center; color: #666;">No sample data available for printing.</div>'
  }

  const isTestingSample = sample.serviceType === "testing" || !sample.serviceType
  const isSTK = sample.serviceType === "stk"
  const hasResults =
    isTestingSample &&
    (sample.status?.toLowerCase() === "completed" || sample.status?.toLowerCase() === "released") &&
    sample.samples &&
    sample.samples.length > 0
  const hasStkResults =
    isSTK &&
    (sample.status?.toLowerCase() === "completed" || sample.status?.toLowerCase() === "released") &&
    sample.samples &&
    sample.samples.length > 0

  const getStatusColorInline = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "background-color: #fef3c7; color: #92400e; border-color: #fcd34d;"
      case "processing":
        return "background-color: #dbeafe; color: #1e40af; border-color: #93c5fd;"
      case "completed":
        return "background-color: #dcfce7; color: #166534; border-color: #86efac;"
      case "released":
        return "background-color: #f0fdfa; color: #0f766e; border-color: #5eead4;"
      default:
        return "background-color: #f3f4f6; color: #374151; border-color: #d1d5db;"
    }
  }

  return `
    <div style="font-family: serif; color: black; background: white; max-width: none; font-size: 9pt; line-height: 1.2; position: relative;">
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.2; z-index: 0; width: 500pt; height: 500pt; pointer-events: none;">
        <img src="/watermark/da-logo-notxt.png" alt="DA Logo Watermark" style="width: 100%; height: 100%; object-fit: contain;" />
      </div>
      <div style="position: relative; z-index: 1;">
        <style>
          @page { margin: 0.4in; size: legal; }
          @media print {
            .watermark-container {
              position: fixed !important;
              top: 50% !important;
              left: 50% !important;
              transform: translate(-50%, -50%) !important;
              opacity: 0.2 !important;
              z-index: -1 !important;
              width: 500pt !important;
              height: 500pt !important;
              pointer-events: none !important;
            }
          }
          .print-table { width: 100%; border-collapse: collapse; font-size: 8pt; }
          .print-table th, .print-table td { border: 1px solid #666; padding: 4px; }
          .print-table th { background-color: #166534; color: white; font-weight: bold; text-align: left; font-size: 11pt; height: 120%; }
          .print-table tr:nth-child(even) { background-color: #e2e8f0; }
          .signature-section { margin-top: 72pt; padding-top: 12pt; border-top: 2px solid #666; }
        </style>

        <header style="margin-bottom: 12pt;">
          <div style="text-align: center; margin-bottom: 12pt;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 16pt; margin-bottom: 8pt;">
              <div style="width: 50pt; height: 50pt; display: flex; align-items: center; justify-content: center;">
                <img src="/logos/da-logo.png" alt="Department of Agriculture Logo" style="width: 42pt; height: 42pt; object-fit: contain;" />
              </div>
              <div style="text-align: center;">
                <h1 style="font-size: 9pt; font-weight: bold; color: #15803d; margin: 0;">REPUBLIC OF THE PHILIPPINES</h1>
                <h2 style="font-size: 12pt; font-weight: bold; color: #166534; margin: 0;">DEPARTMENT OF AGRICULTURE</h2>
                <h3 style="font-size: 9pt; font-weight: 600; color: #15803d; margin: 0;">Regional Field Office VIII</h3>
                <h4 style="font-size: 9pt; font-weight: 600; color: #15803d; margin: 0;">Regional Soils Laboratory</h4>
                <p style="font-size: 8pt; color: #666; margin: 0;">1 & 4 Libertad St. Kanhuraw Hill Magsaysay, Tacloban City</p>
              </div>
              <div style="width: 50pt; height: 50pt; display: flex; align-items: center; justify-content: center;">
                <img src="/logos/rsl-logo.png" alt="Regional Soils Laboratory Logo" style="width: 42pt; height: 42pt; object-fit: contain;" />
              </div>
            </div>

            <div style="border-top: 2px solid #166534; padding-top: 8pt; margin-top: 8pt;">
              <h1 style="font-size: 14pt; font-weight: bold; color: #166534; margin: 0; text-align: center;">LABORATORY SERVICE REPORT</h1>
              <div style="text-align: center; font-size: 8pt; color: #666; text-transform: uppercase; letter-spacing: 1px;">Certificate of Analysis</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8pt; font-size: 8pt; border-bottom: 1px solid #ccc; padding-bottom: 8pt; margin-bottom: 12pt; margin-top: 28pt;">
            <div>
              <div style="font-weight: bold; color: #374151;">LSRF Reference No.</div>
              <div style="font-weight: bold; border-bottom: 1px solid #666; padding-bottom: 2pt;">${sample.lsrfNo || "N/A"}</div>
            </div>
            <div>
              <div style="font-weight: bold; color: #374151;">Date Received</div>
              <div style="border-bottom: 1px solid #666; padding-bottom: 2pt;">${formatDate(sample.dateReceived)}</div>
            </div>
            <div>
              <div style="font-weight: bold; color: #374151;">Due Date</div>
              <div style="border-bottom: 1px solid #666; padding-bottom: 2pt;">${formatDate(sample.dueDate) || "N/A"}</div>
            </div>
            <div>
              <div style="font-weight: bold; color: #374151;">Status</div>
              <div style="border: 1px solid #666; padding: 2pt 4pt; text-align: center; font-size: 7pt; font-weight: bold; text-transform: uppercase; ${getStatusColorInline(sample.status)}">${sample.status}</div>
            </div>
          </div>
        </header>

        <section style="margin-bottom: 8pt;">
          <h2 style="font-size: 11pt; font-weight: bold; color: #166534; border-bottom: 2px solid #166534; padding-bottom: 2pt; margin-bottom: 8pt;">CLIENT INFORMATION</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8pt; font-size: 8pt;">
            <div><span style="font-weight: bold; color: #374151;">Name:</span> <span style="border-bottom: 1px solid #ccc; padding-bottom: 1pt;">${sample.customerName}</span></div>
            <div><span style="font-weight: bold; color: #374151;">Email:</span> <span style="border-bottom: 1px solid #ccc; padding-bottom: 1pt;">${sample.customerEmail || "N/A"}</span></div>
            <div><span style="font-weight: bold; color: #374151;">Address:</span> <span style="border-bottom: 1px solid #ccc; padding-bottom: 1pt;">${sample.customerAddress || "N/A"}</span></div>
            <div><span style="font-weight: bold; color: #374151;">Phone:</span> <span style="border-bottom: 1px solid #ccc; padding-bottom: 1pt;">${sample.customerPhone || "N/A"}</span></div>
            <div><span style="font-weight: bold; color: #374151;">Organization:</span> <span style="border-bottom: 1px solid #ccc; padding-bottom: 1pt;">${sample.customerOrganization || "N/A"}</span></div>
            <div><span style="font-weight: bold; color: #374151;">Client Type:</span> <span style="border-bottom: 1px solid #ccc; padding-bottom: 1pt; text-transform: capitalize;">${sample.clientType}</span></div>
            <div><span style="font-weight: bold; color: #374151;">RSBSA Member:</span> <span style="border-bottom: 1px solid #ccc; padding-bottom: 1pt;">${sample.isRSBSA === "Yes" ? "Yes" : "No"}</span></div>
            <div><span style="font-weight: bold; color: #374151;">RSBSA No.:</span> <span style="border-bottom: 1px solid #ccc; padding-bottom: 1pt;">${sample.rsbsaIdNo || "N/A"}</span></div>
          </div>
        </section>

        <section style="margin-bottom: 8pt;">
          <h2 style="font-size: 11pt; font-weight: bold; color: #166534; border-bottom: 2px solid #166534; padding-bottom: 2pt; margin-bottom: 8pt;">SERVICE DETAILS</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8pt; font-size: 8pt;">
            <div><span style="font-weight: bold; color: #374151;">Service Type:</span> <span style="border-bottom: 1px solid #ccc; padding-bottom: 1pt; text-transform: capitalize;">${sample.serviceType?.replace("_", " ") || "Testing"}</span></div>
            <div><span style="font-weight: bold; color: #374151;">Number of samples:</span> <span style="border-bottom: 1px solid #ccc; padding-bottom: 1pt;">${sample.samples?.length || "N/A"}</span></div>
            <div><span style="font-weight: bold; color: #374151;">Requested parameters:</span> <span style="border-bottom: 1px solid #ccc; padding-bottom: 1pt;">${sample.parameters?.join(", ") || "N/A"}</span></div>
            <div><span style="font-weight: bold; color: #374151;">Parameters:</span> <span style="border-bottom: 1px solid #ccc; padding-bottom: 1pt;">${sample.parameters?.length || "0"} parameter(s)</span></div>
            <div style="grid-column: span 2;"><span style="font-weight: bold; color: #374151;">Method Used:</span> <span style="border-bottom: 1px solid #ccc; padding-bottom: 1pt;">${
              sample.parameters
                ?.map((param: string, index: number) => {
                  const firstSampleCode =
                    sample.samples?.[0]?.laboratorySampleCode || sample.samples?.[0]?.sampleCode || "001"
                  const resultsSource = isSTK ? stkLabReportData : sample.results
                  const method = resultsSource?.[firstSampleCode]?.[param]?.method || "N/A"
                  return `<sup style="font-size: 6pt;">${index + 1}</sup>${method}`
                })
                .join(", ") || "N/A"
            }</span></div>
            <div style="grid-column: span 2;"><span style="font-weight: bold; color: #374151;">Adequate Values:</span> <span style="border-bottom: 1px solid #ccc; padding-bottom: 1pt;">${
              sample.parameters
                ?.map((param: string, index: number) => {
                  const firstSampleCode =
                    sample.samples?.[0]?.laboratorySampleCode || sample.samples?.[0]?.sampleCode || "001"
                  const resultsSource = isSTK ? stkLabReportData : sample.results
                  const adequateValue = resultsSource?.[firstSampleCode]?.[param]?.adequateValue || "N/A"
                  return `<sup style="font-size: 6pt;">${index + 1}</sup>${adequateValue}`
                })
                .join(", ") || "N/A"
            }</span></div>
            <div><span style="font-weight: bold; color: #374151;">Sample Type:</span> <span style="border-bottom: 1px solid #ccc; padding-bottom: 1pt; text-transform: capitalize;">${sample.sampleType || sample.serviceType?.replace("_", " ") || "N/A"}</span></div>
          </div>
        </section>

        ${
          isTestingSample
            ? `
          <section style="margin-bottom: 8pt;">
            <h2 style="font-size: 11pt; font-weight: bold; color: #166534; border-bottom: 2px solid #166534; padding-bottom: 2pt; margin-bottom: 8pt;">ANALYSIS RESULTS</h2>
            ${
              hasResults
                ? `
              <table class="print-table">
                <thead>
                  <tr>
                    <th style="background-color: #166534; color: white; font-size: 11pt; height: 120%;">Lab Code</th>
                    <th style="background-color: #166534; color: white; font-size: 11pt; height: 120%;">Sample ID</th>
                    ${sample.parameters?.map((param: string, index: number) => `<th style="text-align: center; background-color: #166534; color: white; font-size: 11pt; height: 120%;"><sup style="font-size: 8pt; margin-right: 2pt;">${index + 1}</sup>${param}</th>`).join("") || ""}
                  </tr>
                </thead>
                <tbody>
                  ${
                    sample.samples
                      ?.map((sampleItem: any, index: number) => {
                        const sampleCode =
                          sampleItem.laboratorySampleCode ||
                          sampleItem.sampleCode ||
                          `${String(index + 1).padStart(3, "0")}`
                        return `
                      <tr>
                        <td style="font-weight: bold;">${sampleCode}</td>
                        <td>${sampleItem.sampleID || "N/A"}</td>
                        ${
                          sample.parameters
                            ?.map(
                              (param: string) => `
                          <td style="text-align: center;">
                            <div style="font-weight: bold;">${sample.results?.[sampleCode]?.[param]?.value || "N/A"}</div>
                            ${sample.results?.[sampleCode]?.[param]?.unit ? `<div style="font-size: 7pt; color: #666;">(${sample.results[sampleCode][param].unit})</div>` : ""}
                          </td>
                        `,
                            )
                            .join("") || ""
                        }
                      </tr>
                    `
                      })
                      .join("") || ""
                  }
                </tbody>
              </table>
            `
                : `
              <div style="border: 2px solid #f59e0b; background-color: #fef3c7; padding: 12pt; text-align: center;">
                <div style="color: #92400e; font-weight: bold; font-size: 9pt; margin-bottom: 4pt;">Analysis Results Pending</div>
                <div style="color: #a16207; font-size: 8pt;">Results will be available once the sample analysis is completed.</div>
                <div style="color: #a16207; font-size: 8pt; margin-top: 4pt;">Current status: ${sample.status}</div>
              </div>
            `
            }
          </section>
        `
            : ""
        }

        ${
          isSTK
            ? `
          <section style="margin-bottom: 8pt;">
            <h2 style="font-size: 11pt; font-weight: bold; color: #166534; border-bottom: 2px solid #166534; padding-bottom: 2pt; margin-bottom: 8pt;">SOIL TEST KIT (STK) ANALYSIS RESULTS</h2>
            ${
              hasStkResults
                ? `
              <table class="print-table">
                <thead>
                  <tr>
                    <th style="background-color: #166534; color: white; font-size: 11pt; height: 120%;">Lab Code</th>
                    <th style="background-color: #166534; color: white; font-size: 11pt; height: 120%;">pH</th>
                    <th style="background-color: #166534; color: white; font-size: 11pt; height: 120%;">Avail. N</th>
                    <th style="background-color: #166534; color: white; font-size: 11pt; height: 120%;">Avail. P</th>
                    <th style="background-color: #166534; color: white; font-size: 11pt; height: 120%;">K</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    sample.samples
                      ?.map((sampleItem: any, index: number) => {
                        const sampleCode =
                          sampleItem.laboratorySampleCode ||
                          sampleItem.sampleCode ||
                          `${String(index + 1).padStart(3, "0")}`
                        const resultsSource = stkLabReportData || sample.results
                        return `
                      <tr>
                        <td style="font-weight: bold;">${sampleCode}</td>
                        <td style="text-align: center;">
                          <div style="font-weight: bold;">${resultsSource?.[sampleCode]?.["pH"]?.value || "N/A"}</div>
                          ${resultsSource?.[sampleCode]?.["pH"]?.unit ? `<div style="font-size: 7pt; color: #666;">(${resultsSource[sampleCode]["pH"].unit})</div>` : ""}
                        </td>
                        <td style="text-align: center;">
                          <div style="font-weight: bold;">${resultsSource?.[sampleCode]?.["Avail. N"]?.value || "N/A"}</div>
                          ${resultsSource?.[sampleCode]?.["Avail. N"]?.unit ? `<div style="font-size: 7pt; color: #666;">(${resultsSource[sampleCode]["Avail. N"].unit})</div>` : ""}
                        </td>
                        <td style="text-align: center;">
                          <div style="font-weight: bold;">${resultsSource?.[sampleCode]?.["Avail. P"]?.value || "N/A"}</div>
                          ${resultsSource?.[sampleCode]?.["Avail. P"]?.unit ? `<div style="font-size: 7pt; color: #666;">(${resultsSource[sampleCode]["Avail. P"].unit})</div>` : ""}
                        </td>
                        <td style="text-align: center;">
                          <div style="font-weight: bold;">${resultsSource?.[sampleCode]?.["K"]?.value || "N/A"}</div>
                          ${resultsSource?.[sampleCode]?.["K"]?.unit ? `<div style="font-size: 7pt; color: #666;">(${resultsSource[sampleCode]["K"].unit})</div>` : ""}
                        </td>
                      </tr>
                    `
                      })
                      .join("") || ""
                  }
                </tbody>
              </table>
            `
                : `
              <div style="border: 2px solid #f59e0b; background-color: #fef3c7; padding: 12pt; text-align: center;">
                <div style="color: #92400e; font-weight: bold; font-size: 9pt; margin-bottom: 4pt;">Analysis Results Pending</div>
                <div style="color: #a16207; font-size: 8pt;">Results will be available once the sample analysis is completed.</div>
                <div style="color: #a16207; font-size: 8pt; margin-top: 4pt;">Current status: ${sample.status}</div>
              </div>
            `
            }
          </section>
        `
            : ""
        }

        ${
          sample.notes
            ? `
          <section style="margin-bottom: 8pt;">
            <h2 style="font-size: 11pt; font-weight: bold; color: #166534; border-bottom: 2px solid #166534; padding-bottom: 2pt; margin-bottom: 8pt;">REMARKS / ADDITIONAL NOTES</h2>
            <div style="border: 1px solid #666; padding: 8pt; font-size: 8pt; background-color: #f9fafb;">
              <p style="white-space: pre-wrap; line-height: 1.4; margin: 0;">${sample.notes}</p>
            </div>
          </section>
        `
            : ""
        }

        <div class="signature-section" style="margin-top: 72pt; padding-top: 12pt; border-top: 2px solid #666;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32pt; font-size: 9pt;">
            <div style="text-align: center;">
              <div style="margin-bottom: 32pt; color: #374151; font-weight: bold; font-size: 8pt; font-style: italic;">Reviewed by:</div>
              <div style="border-bottom: 2px solid #666; margin-bottom: 4pt; margin-left: 16pt; margin-right: 16pt;"></div>
              <div style="font-size: 8pt; color: #1f2937; font-weight: bold; margin-top: 8pt;">JAYVEE A. DELA TORRE, RCh</div>
              <div style="font-size: 8pt; color: #666; margin-top: 2pt; font-weight: 500;">Chemist I</div>
              <div style="font-size: 8pt; color: #999; margin-top: 2pt;">License No. 0015116</div>
            </div>
            <div style="text-align: center;">
              <div style="margin-bottom: 32pt; color: #374151; font-weight: bold; font-size: 8pt; font-style: italic;">Certified by:</div>
              <div style="border-bottom: 2px solid #666; margin-bottom: 4pt; margin-left: 16pt; margin-right: 16pt;"></div>
              <div style="font-size: 8pt; color: #1f2937; font-weight: bold; margin-top: 8pt;">MA KRIS V. TOLENTINO, RCh</div>
              <div style="font-size: 8pt; color: #666; margin-top: 2pt; font-weight: 500;">Chief, RSL</div>
              <div style="font-size: 8pt; color: #999; margin-top: 2pt;">License No. 0011393</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}
