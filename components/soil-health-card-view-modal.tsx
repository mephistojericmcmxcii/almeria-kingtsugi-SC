"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Printer, X } from "lucide-react"
import { useRef } from "react"

interface SoilHealthCardData {
  id: string
  shcNo: string
  laboratoryCode: string
  name: string
  contactNumber: string
  address: string
  yearsInFarming: string
  age: string
  gender: string
  dateOfSampling: string
  samplingSiteLocation: string
  dateSubmitted: string
  dateIssued: string
  landscape: string
  landscapeOthers: string
  description: string
  location: string
  farmArea: string
  region: string
  province: string
  municipality: string
  barangay: string
  parcelDemo: string
  parcelNoYearCropping: string
  coordinates: string
  srmuNo: string
  srmuCoordinates: string
  shmsNo: string
  shmsCoordinates: string
  rsbsaNo: string
  fca: string
  croppingSeason1st: string
  croppingSeason2nd: string
  croppingSeason3rd: string
  dateOfAnalysis: string
  agriculturist: string
  chemist: string
  chiefAgriculturist: string
  soilMoisturePrePlanting1st: string
  soilMoisturePrePlanting2nd: string
  soilMoisturePrePlanting3rd: string
  soilMoisturePostharvest1st: string
  soilMoisturePostharvest2nd: string
  soilMoisturePostharvest3rd: string
  soilPhPrePlanting1st: string
  soilPhPrePlanting2nd: string
  soilPhPrePlanting3rd: string
  soilPhPostharvest1st: string
  soilPhPostharvest2nd: string
  soilPhPostharvest3rd: string
  nitrogenPrePlanting1st: string
  nitrogenPrePlanting2nd: string
  nitrogenPrePlanting3rd: string
  nitrogenPostharvest1st: string
  nitrogenPostharvest2nd: string
  nitrogenPostharvest3rd: string
  phosphorousPrePlanting1st: string
  phosphorousPrePlanting2nd: string
  phosphorousPrePlanting3rd: string
  phosphorousPostharvest1st: string
  phosphorousPostharvest2nd: string
  phosphorousPostharvest3rd: string
  potassiumPrePlanting1st: string
  potassiumPrePlanting2nd: string
  potassiumPrePlanting3rd: string
  potassiumPostharvest1st: string
  potassiumPostharvest2nd: string
  potassiumPostharvest3rd: string
  organicCarbonPrePlanting1st: string
  organicCarbonPrePlanting2nd: string
  organicCarbonPrePlanting3rd: string
  organicCarbonPostharvest1st: string
  organicCarbonPostharvest2nd: string
  organicCarbonPostharvest3rd: string
  soilTexturePrePlanting1st: string
  soilTexturePrePlanting2nd: string
  soilTexturePrePlanting3rd: string
  soilTexturePostharvest1st: string
  soilTexturePostharvest2nd: string
  soilTexturePostharvest3rd: string
  soilColorPrePlanting1st: string
  soilColorPrePlanting2nd: string
  soilColorPrePlanting3rd: string
  soilColorPostharvest1st: string
  soilColorPostharvest2nd: string
  soilColorPostharvest3rd: string
  soilMicrobialRespirationPrePlanting1st: string
  soilMicrobialRespirationPrePlanting2nd: string
  soilMicrobialRespirationPrePlanting3rd: string
  soilMicrobialRespirationPostharvest1st: string
  soilMicrobialRespirationPostharvest2nd: string
  soilMicrobialRespirationPostharvest3rd: string
  earthwormPopulationPrePlanting1st: string
  earthwormPopulationPrePlanting2nd: string
  earthwormPopulationPrePlanting3rd: string
  earthwormPopulationPostharvest1st: string
  earthwormPopulationPostharvest2nd: string
  earthwormPopulationPostharvest3rd: string
  rootLengthWeightPrePlanting1st: string
  rootLengthWeightPrePlanting2nd: string
  rootLengthWeightPrePlanting3rd: string
  rootLengthWeightPostharvest1st: string
  rootLengthWeightPostharvest2nd: string
  rootLengthWeightPostharvest3rd: string
  biomassPrePlanting1st: string
  biomassPrePlanting2nd: string
  biomassPrePlanting3rd: string
  biomassPostharvest1st: string
  biomassPostharvest2nd: string
  biomassPostharvest3rd: string
  soilPhInterpretation: string
  nitrogenInterpretation: string
  phosphorousInterpretation: string
  potassiumInterpretation: string
  postharvest1stDate: string
  postharvest2ndDate: string
  postharvest3rdDate: string
  [key: string]: any
}

interface SoilHealthCardViewModalProps {
  isOpen: boolean
  onClose: () => void
  cardData: SoilHealthCardData | null
}

export default function SoilHealthCardViewModal({ isOpen, onClose, cardData }: SoilHealthCardViewModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  if (!isOpen || !cardData) return null

  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Soil Health Card - ${cardData.shcNo}</title>
          <style>
            @page {
              size: A4;
              margin: 0.5cm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 8px;
              line-height: 1.1;
              color: #000;
            }
            .print-container {
              width: 210mm;
              min-height: 297mm;
              padding: 8px;
              background: white;
            }
            .header-title {
              text-align: center;
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 4px;
              letter-spacing: 1px;
            }
            /* Updated header row to use thinner borders and proper value placement */
            .header-row {
              display: table;
              width: 100%;
              border: 1px solid #000;
              border-collapse: collapse;
              margin-bottom: 1px;
            }
            .header-cell {
              display: table-cell;
              border-right: 1px solid #000;
              padding: 2px 4px;
              vertical-align: middle;
              font-size: 7px;
              height: 22px;
            }
            .header-cell:last-child {
              border-right: none;
            }
            .header-label {
              font-weight: bold;
              display: inline;
            }
            .header-value {
              display: inline;
              margin-left: 8px;
              font-size: 8px;
            }
            /* Updated section header and all borders to be thinner */
            .section-header {
              background: #000080;
              color: white;
              padding: 2px 6px;
              font-weight: bold;
              font-size: 8px;
              margin-top: 1px;
              border: 1px solid #000;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #000;
            }
            td, th {
              border: 1px solid #000;
              padding: 2px 4px;
              font-size: 7px;
              vertical-align: top;
            }
            .label-cell {
              font-weight: bold;
              background: white;
              font-size: 7px;
            }
            .value-cell {
              background: white;
              font-size: 8px;
            }
            .checkbox-row {
              display: flex;
              gap: 8px;
              align-items: center;
              flex-wrap: wrap;
            }
            .checkbox-item {
              display: flex;
              align-items: center;
              gap: 2px;
              font-size: 7px;
            }
            .checkbox {
              width: 10px;
              height: 10px;
              border: 1px solid #000;
              display: inline-block;
              position: relative;
              background: white;
            }
            .checkbox.checked::before {
              content: '☑';
              position: absolute;
              top: -3px;
              left: -1px;
              font-size: 12px;
            }
            .farm-area-header {
              display: flex;
              border-bottom: 1px solid #000;
            }
            .farm-area-col {
              flex: 1;
              text-align: center;
              font-style: italic;
              padding: 2px;
              border-right: 1px solid #000;
              font-size: 7px;
            }
            .farm-area-col:last-child {
              border-right: none;
            }
            .farm-area-values {
              display: flex;
            }
            .farm-area-value {
              flex: 1;
              text-align: center;
              padding: 2px;
              border-right: 1px solid #000;
              font-size: 8px;
            }
            .farm-area-value:last-child {
              border-right: none;
            }
            /* Updated diagnosis header to use light green color matching the image */
            .diagnosis-header {
              background: #9ACD32;
              font-weight: bold;
              text-align: center;
              padding: 3px;
              font-size: 8px;
            }
            .test-report-title {
              text-align: center;
              font-weight: bold;
              padding: 4px;
              background: white;
              border: 1px solid #000;
              margin-top: 1px;
              font-size: 9px;
            }
            /* Updated params header to use orange/amber color matching the image */
            .params-header {
              background: #FFB347;
              font-weight: bold;
              text-align: center;
              padding: 3px;
              font-size: 9px;
              border: 1px solid #000;
            }
            .params-subheader {
              background: #FFB347;
              font-weight: bold;
              text-align: center;
              padding: 2px;
              font-size: 7px;
            }
            .params-table td, .params-table th {
              font-size: 6px;
              padding: 1px 2px;
              text-align: center;
            }
            .params-label {
              text-align: left;
              padding-left: 4px;
              font-size: 6px;
            }
            .moisture-checks {
              display: flex;
              gap: 2px;
              justify-content: center;
              font-size: 5px;
            }
            .fertility-header {
              background: #90EE90;
              font-weight: bold;
              text-align: center;
              padding: 3px;
              font-size: 8px;
            }
            .fertility-subheader {
              background: #FFB347;
              font-weight: bold;
              text-align: center;
              padding: 2px;
              font-size: 7px;
            }
            .cert-title {
              font-weight: bold;
              margin-top: 2px;
              margin-bottom: 1px;
              font-size: 8px;
            }
            .cert-table td {
              text-align: center;
              padding: 15px 5px 3px 5px;
              vertical-align: bottom;
            }
            .cert-label {
              font-weight: bold;
              font-size: 7px;
              margin-top: 2px;
            }
            .footnote {
              font-size: 6px;
              margin-top: 2px;
              font-style: italic;
            }
            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `)

    printWindow.document.close()
    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const renderCheckbox = (value: string, option: string) => {
    return (
      <div className="checkbox-item">
        <span className={`checkbox ${value === option ? "checked" : ""}`}></span>
        <span>{option}</span>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[95vw] max-h-[95vh] overflow-y-auto bg-[#F0EAD6] text-[#2F3E2E] border-[#DDD7B1] p-0">
        <DialogHeader className="p-6 pb-4 bg-[#4A7C74] rounded-t-lg sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold text-white">Soil Health Card Details</DialogTitle>
              <p className="text-[#F0EFE9] text-sm">SHC No: {cardData.shcNo}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handlePrint} className="bg-white text-[#4A7C74] hover:bg-gray-100">
                <Printer className="h-4 w-4 mr-2" />
                Print Preview
              </Button>
              <Button onClick={onClose} variant="ghost" className="text-white hover:bg-[#3A6C64]">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div ref={printRef} className="print-container">
          <div className="header-title">SOIL HEALTH CARD</div>

          <div className="header-row">
            <div className="header-cell" style={{ width: "13%" }}>
              <span className="header-label">SHC No.:</span>
            </div>
            <div className="header-cell" style={{ width: "20%" }}>
              <span className="header-value">{cardData.shcNo}</span>
            </div>
            <div className="header-cell" style={{ width: "30%" }}></div>
            <div className="header-cell" style={{ width: "17%" }}>
              <span className="header-label">Laboratory Code:</span>
            </div>
            <div className="header-cell" style={{ width: "20%" }}>
              <span className="header-value">{cardData.laboratoryCode}</span>
            </div>
          </div>

          {/* I. PERSONAL IDENTIFIER */}
          <div className="section-header">I. PERSONAL IDENTIFIER</div>
          <table>
            <tbody>
              <tr>
                <td className="label-cell" style={{ width: "13%" }}>
                  Name:
                </td>
                <td className="value-cell" style={{ width: "27%" }}>
                  {cardData.name}
                </td>
                <td className="label-cell" style={{ width: "8%" }}>
                  Age:
                </td>
                <td className="value-cell" style={{ width: "12%" }}>
                  {cardData.age}
                </td>
                <td className="label-cell" style={{ width: "18%" }}>
                  Date of Sampling:
                </td>
                <td className="value-cell" style={{ width: "22%" }}>
                  {cardData.dateOfSampling}
                </td>
              </tr>
              <tr>
                <td className="label-cell">Contact Number:</td>
                <td className="value-cell">{cardData.contactNumber}</td>
                <td className="label-cell">Gender:</td>
                <td className="value-cell">{cardData.gender}</td>
                <td className="label-cell">Sampling Site/Location:</td>
                <td className="value-cell">{cardData.samplingSiteLocation}</td>
              </tr>
              <tr>
                <td className="label-cell">Address:</td>
                <td className="value-cell" colSpan={3}>
                  {cardData.address}
                </td>
                <td className="label-cell">Date Submitted:</td>
                <td className="value-cell">{cardData.dateSubmitted}</td>
              </tr>
              <tr>
                <td className="label-cell">No. of years in farming:</td>
                <td className="value-cell" colSpan={3}>
                  {cardData.yearsInFarming}
                </td>
                <td className="label-cell">Date Issued:</td>
                <td className="value-cell">{cardData.dateIssued}</td>
              </tr>
            </tbody>
          </table>

          {/* II. PARCEL IDENTIFIER */}
          <div className="section-header">II. PARCEL IDENTIFIER</div>
          <table>
            <tbody>
              <tr>
                <td className="label-cell" style={{ width: "15%" }}>
                  Landscape:
                </td>
                <td className="value-cell" colSpan={5}>
                  <div className="checkbox-row">
                    {renderCheckbox(cardData.landscape, "Lowland")}
                    {renderCheckbox(cardData.landscape, "Upland")}
                    {renderCheckbox(cardData.landscape, "Hillyland")}
                    {renderCheckbox(cardData.landscape, "Highland")}
                    {renderCheckbox(cardData.landscape, "Peatland")}
                    {renderCheckbox(cardData.landscape, "Others")}
                    {cardData.landscape === "Others" && cardData.landscapeOthers && (
                      <span style={{ marginLeft: "3px", fontSize: "7px" }}>({cardData.landscapeOthers})</span>
                    )}
                  </div>
                </td>
              </tr>
              <tr>
                <td className="label-cell">Description:</td>
                <td className="value-cell" colSpan={5}>
                  {cardData.description}
                </td>
              </tr>
              <tr>
                <td className="label-cell">Location:</td>
                <td className="value-cell" colSpan={5}>
                  {cardData.location}
                </td>
              </tr>
              <tr>
                <td className="label-cell">Farm Area (ha):</td>
                <td className="value-cell" colSpan={5} style={{ padding: 0 }}>
                  <div>
                    <div className="farm-area-header">
                      <div className="farm-area-col">{cardData.farmArea}</div>
                      <div className="farm-area-col">Region</div>
                      <div className="farm-area-col">Province</div>
                      <div className="farm-area-col">Municipality/City</div>
                      <div className="farm-area-col">Barangay</div>
                    </div>
                    <div className="farm-area-values">
                      <div className="farm-area-value"></div>
                      <div className="farm-area-value">{cardData.region}</div>
                      <div className="farm-area-value">{cardData.province}</div>
                      <div className="farm-area-value">{cardData.municipality}</div>
                      <div className="farm-area-value">{cardData.barangay}</div>
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="label-cell">Parcel No./Year/Cropping season/:</td>
                <td className="value-cell" colSpan={5}>
                  <div className="checkbox-row">
                    {renderCheckbox(cardData.parcelDemo, "NIA-Techno Demo")}
                    {renderCheckbox(cardData.parcelDemo, "SWISA-Techno Demo")}
                    {renderCheckbox(cardData.parcelDemo, "Non-Techno Demo")}
                  </div>
                  <div style={{ marginTop: "2px", fontSize: "8px" }}>{cardData.parcelNoYearCropping}</div>
                </td>
              </tr>
              <tr>
                <td className="label-cell">Coordinates:</td>
                <td className="value-cell" colSpan={5}>
                  {cardData.coordinates}
                </td>
              </tr>
              <tr>
                <td className="label-cell">Soil Reference Mapping Unit (SRMU) No.:</td>
                <td className="value-cell" style={{ width: "18%" }}>
                  {cardData.srmuNo}
                </td>
                <td className="label-cell" style={{ width: "18%" }}>
                  SRMU Coordinates:
                </td>
                <td className="value-cell" colSpan={3}>
                  {cardData.srmuCoordinates}
                </td>
              </tr>
              <tr>
                <td className="label-cell">Soil Health Monitoring Site (SHMS) No.:</td>
                <td className="value-cell">{cardData.shmsNo}</td>
                <td className="label-cell">SHMS Coordinates:</td>
                <td className="value-cell" colSpan={3}>
                  {cardData.shmsCoordinates}
                </td>
              </tr>
              <tr>
                <td className="label-cell">RSBSA No.:</td>
                <td className="value-cell">{cardData.rsbsaNo}</td>
                <td className="label-cell">FCA:</td>
                <td className="value-cell" colSpan={3}>
                  {cardData.fca}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="footnote">
            Footnote: RSBSA—Registry System for Basic Sectors in Agriculture; FCA—Farmers Cooperative and Association
          </div>

          {/* III. FARM DIAGNOSIS */}
          <div className="section-header">III. FARM DIAGNOSIS</div>
          <table>
            <thead>
              <tr>
                <th className="diagnosis-header" style={{ width: "20%" }}>
                  Date of Sampling
                </th>
                <th className="diagnosis-header" colSpan={3}>
                  Pre-Planting (mm/dd/yyyy)
                </th>
                <th className="diagnosis-header" colSpan={3}>
                  Postharvest (mm/dd/yyyy)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="label-cell">1st Cropping Season</td>
                <td className="value-cell" colSpan={3}>
                  {cardData.croppingSeason1st}
                </td>
                <td className="value-cell" colSpan={3}>
                  {cardData.postharvest1stDate}
                </td>
              </tr>
              <tr>
                <td className="label-cell">2nd Cropping Season</td>
                <td className="value-cell" colSpan={3}>
                  {cardData.croppingSeason2nd}
                </td>
                <td className="value-cell" colSpan={3}>
                  {cardData.postharvest2ndDate}
                </td>
              </tr>
              <tr>
                <td className="label-cell">3rd Cropping Season</td>
                <td className="value-cell" colSpan={3}>
                  {cardData.croppingSeason3rd}
                </td>
                <td className="value-cell" colSpan={3}>
                  {cardData.postharvest3rdDate}
                </td>
              </tr>
            </tbody>
          </table>

          {/* TEST REPORT */}
          <div className="test-report-title">TEST REPORT</div>
          <table>
            <tbody>
              <tr>
                <td className="label-cell" style={{ width: "20%" }}>
                  Date of Analysis:
                </td>
                <td className="value-cell">{cardData.dateOfAnalysis}</td>
              </tr>
            </tbody>
          </table>

          {/* SOIL HEALTH PARAMETERS */}
          <div className="params-header">SOIL HEALTH PARAMETERS at 0-30 cm</div>
          <table className="params-table">
            <thead>
              <tr>
                <th rowSpan={2} style={{ width: "18%" }}></th>
                <th colSpan={3} className="params-subheader">
                  Pre-Planting
                </th>
                <th colSpan={3} className="params-subheader">
                  Postharvest (mm/dd/yyyy)
                </th>
              </tr>
              <tr>
                <th style={{ fontSize: "6px", padding: "2px" }}>1st Cropping Season</th>
                <th style={{ fontSize: "6px", padding: "2px" }}>2nd Cropping Season</th>
                <th style={{ fontSize: "6px", padding: "2px" }}>3rd Cropping Season</th>
                <th style={{ fontSize: "6px", padding: "2px" }}>1st Cropping Season</th>
                <th style={{ fontSize: "6px", padding: "2px" }}>2nd Cropping Season</th>
                <th style={{ fontSize: "6px", padding: "2px" }}>3rd Cropping Season</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="params-label">Soil Moisture Variation on specific site in the Farm</td>
                <td>
                  <div className="moisture-checks">
                    {renderCheckbox(cardData.soilMoisturePrePlanting1st, "RF")}
                    {renderCheckbox(cardData.soilMoisturePrePlanting1st, "M")}
                    {renderCheckbox(cardData.soilMoisturePrePlanting1st, "NF/DP")}
                  </div>
                </td>
                <td>
                  <div className="moisture-checks">
                    {renderCheckbox(cardData.soilMoisturePrePlanting2nd, "RF")}
                    {renderCheckbox(cardData.soilMoisturePrePlanting2nd, "M")}
                    {renderCheckbox(cardData.soilMoisturePrePlanting2nd, "NF/DP")}
                  </div>
                </td>
                <td>
                  <div className="moisture-checks">
                    {renderCheckbox(cardData.soilMoisturePrePlanting3rd, "RF")}
                    {renderCheckbox(cardData.soilMoisturePrePlanting3rd, "M")}
                    {renderCheckbox(cardData.soilMoisturePrePlanting3rd, "NF/DP")}
                  </div>
                </td>
                <td>
                  <div className="moisture-checks">
                    {renderCheckbox(cardData.soilMoisturePostharvest1st, "RF")}
                    {renderCheckbox(cardData.soilMoisturePostharvest1st, "M")}
                    {renderCheckbox(cardData.soilMoisturePostharvest1st, "NF/DP")}
                  </div>
                </td>
                <td>
                  <div className="moisture-checks">
                    {renderCheckbox(cardData.soilMoisturePostharvest2nd, "RF")}
                    {renderCheckbox(cardData.soilMoisturePostharvest2nd, "M")}
                    {renderCheckbox(cardData.soilMoisturePostharvest2nd, "NF/DP")}
                  </div>
                </td>
                <td>
                  <div className="moisture-checks">
                    {renderCheckbox(cardData.soilMoisturePostharvest3rd, "RF")}
                    {renderCheckbox(cardData.soilMoisturePostharvest3rd, "M")}
                    {renderCheckbox(cardData.soilMoisturePostharvest3rd, "NF/DP")}
                  </div>
                </td>
              </tr>
              <tr>
                <td className="params-label">Cropping Season</td>
                <td style={{ fontSize: "6px" }}>1st Cropping Season</td>
                <td style={{ fontSize: "6px" }}>2nd Cropping Season</td>
                <td style={{ fontSize: "6px" }}>3rd Cropping Season</td>
                <td style={{ fontSize: "6px" }}>1st Cropping Season</td>
                <td style={{ fontSize: "6px" }}>2nd Cropping Season</td>
                <td style={{ fontSize: "6px" }}>3rd Cropping Season</td>
              </tr>
              <tr>
                <td className="params-label">Soil pH (STK)</td>
                <td>{cardData.soilPhPrePlanting1st}</td>
                <td>{cardData.soilPhPrePlanting2nd}</td>
                <td>{cardData.soilPhPrePlanting3rd}</td>
                <td>{cardData.soilPhPostharvest1st}</td>
                <td>{cardData.soilPhPostharvest2nd}</td>
                <td>{cardData.soilPhPostharvest3rd}</td>
              </tr>
              <tr>
                <td className="params-label">Nitrogen (N), % (STK)</td>
                <td>{cardData.nitrogenPrePlanting1st}</td>
                <td>{cardData.nitrogenPrePlanting2nd}</td>
                <td>{cardData.nitrogenPrePlanting3rd}</td>
                <td>{cardData.nitrogenPostharvest1st}</td>
                <td>{cardData.nitrogenPostharvest2nd}</td>
                <td>{cardData.nitrogenPostharvest3rd}</td>
              </tr>
              <tr>
                <td className="params-label">Phosphorous (P), mg/kg (STK)</td>
                <td>{cardData.phosphorousPrePlanting1st}</td>
                <td>{cardData.phosphorousPrePlanting2nd}</td>
                <td>{cardData.phosphorousPrePlanting3rd}</td>
                <td>{cardData.phosphorousPostharvest1st}</td>
                <td>{cardData.phosphorousPostharvest2nd}</td>
                <td>{cardData.phosphorousPostharvest3rd}</td>
              </tr>
              <tr>
                <td className="params-label">Potassium (K), cmol/kg (STK)</td>
                <td>{cardData.potassiumPrePlanting1st}</td>
                <td>{cardData.potassiumPrePlanting2nd}</td>
                <td>{cardData.potassiumPrePlanting3rd}</td>
                <td>{cardData.potassiumPostharvest1st}</td>
                <td>{cardData.potassiumPostharvest2nd}</td>
                <td>{cardData.potassiumPostharvest3rd}</td>
              </tr>
              <tr>
                <td className="params-label">Organic Carbon (OC %)</td>
                <td>{cardData.organicCarbonPrePlanting1st}</td>
                <td>{cardData.organicCarbonPrePlanting2nd}</td>
                <td>{cardData.organicCarbonPrePlanting3rd}</td>
                <td>{cardData.organicCarbonPostharvest1st}</td>
                <td>{cardData.organicCarbonPostharvest2nd}</td>
                <td>{cardData.organicCarbonPostharvest3rd}</td>
              </tr>
              <tr>
                <td className="params-label">
                  Soil Texture
                  <br />
                  <span style={{ fontSize: "5px" }}>☐ Feel Method</span>
                  <br />
                  <span style={{ fontSize: "5px" }}>☐ Lab. Analysis</span>
                </td>
                <td>{cardData.soilTexturePrePlanting1st}</td>
                <td>{cardData.soilTexturePrePlanting2nd}</td>
                <td>{cardData.soilTexturePrePlanting3rd}</td>
                <td>{cardData.soilTexturePostharvest1st}</td>
                <td>{cardData.soilTexturePostharvest2nd}</td>
                <td>{cardData.soilTexturePostharvest3rd}</td>
              </tr>
              <tr>
                <td className="params-label">Soil Color</td>
                <td>{cardData.soilColorPrePlanting1st}</td>
                <td>{cardData.soilColorPrePlanting2nd}</td>
                <td>{cardData.soilColorPrePlanting3rd}</td>
                <td>{cardData.soilColorPostharvest1st}</td>
                <td>{cardData.soilColorPostharvest2nd}</td>
                <td>{cardData.soilColorPostharvest3rd}</td>
              </tr>
              <tr>
                <td className="params-label">Soil Microbial Respiration Rate (CO2-C/kg/ha/day)</td>
                <td>{cardData.soilMicrobialRespirationPrePlanting1st}</td>
                <td>{cardData.soilMicrobialRespirationPrePlanting2nd}</td>
                <td>{cardData.soilMicrobialRespirationPrePlanting3rd}</td>
                <td>{cardData.soilMicrobialRespirationPostharvest1st}</td>
                <td>{cardData.soilMicrobialRespirationPostharvest2nd}</td>
                <td>{cardData.soilMicrobialRespirationPostharvest3rd}</td>
              </tr>
              <tr>
                <td className="params-label">Earthworm population density (average no./m2)</td>
                <td>{cardData.earthwormPopulationPrePlanting1st}</td>
                <td>{cardData.earthwormPopulationPrePlanting2nd}</td>
                <td>{cardData.earthwormPopulationPrePlanting3rd}</td>
                <td>{cardData.earthwormPopulationPostharvest1st}</td>
                <td>{cardData.earthwormPopulationPostharvest2nd}</td>
                <td>{cardData.earthwormPopulationPostharvest3rd}</td>
              </tr>
              <tr>
                <td className="params-label">Root length and weight</td>
                <td>{cardData.rootLengthWeightPrePlanting1st}</td>
                <td>{cardData.rootLengthWeightPrePlanting2nd}</td>
                <td>{cardData.rootLengthWeightPrePlanting3rd}</td>
                <td>{cardData.rootLengthWeightPostharvest1st}</td>
                <td>{cardData.rootLengthWeightPostharvest2nd}</td>
                <td>{cardData.rootLengthWeightPostharvest3rd}</td>
              </tr>
              <tr>
                <td className="params-label">
                  Biomass (average total weight/m<sup>2</sup>)
                </td>
                <td>{cardData.biomassPrePlanting1st}</td>
                <td>{cardData.biomassPrePlanting2nd}</td>
                <td>{cardData.biomassPrePlanting3rd}</td>
                <td>{cardData.biomassPostharvest1st}</td>
                <td>{cardData.biomassPostharvest2nd}</td>
                <td>{cardData.biomassPostharvest3rd}</td>
              </tr>
            </tbody>
          </table>

          <div className="footnote">
            Footnote: RF – Regularly Flooded; M – Moist; NF/DP – Non-flooded/Drought-Prone, STK - Soil Test Kit
          </div>

          {/* SOIL FERTILITY RATING */}
          <table style={{ marginTop: "3px" }}>
            <thead>
              <tr>
                <th colSpan={2} className="fertility-header">
                  SOIL FERTILITY RATING
                </th>
              </tr>
              <tr>
                <th className="fertility-subheader">Parameters</th>
                <th className="fertility-subheader">Interpretation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="label-cell">Soil pH</td>
                <td className="value-cell">{cardData.soilPhInterpretation}</td>
              </tr>
              <tr>
                <td className="label-cell">Nitrogen (%)</td>
                <td className="value-cell">{cardData.nitrogenInterpretation}</td>
              </tr>
              <tr>
                <td className="label-cell">Phosphorous (P), mg/kg</td>
                <td className="value-cell">{cardData.phosphorousInterpretation}</td>
              </tr>
              <tr>
                <td className="label-cell">Potassium (K), cmol/kg</td>
                <td className="value-cell">{cardData.potassiumInterpretation}</td>
              </tr>
            </tbody>
          </table>

          {/* CERTIFICATION */}
          <div className="cert-title">Certified by:</div>
          <table className="cert-table">
            <tbody>
              <tr>
                <td>
                  <div style={{ minHeight: "35px", borderBottom: "1px solid #000", marginBottom: "2px" }}>
                    {cardData.agriculturist}
                  </div>
                  <div className="cert-label">Agriculturist</div>
                </td>
                <td>
                  <div style={{ minHeight: "35px", borderBottom: "1px solid #000", marginBottom: "2px" }}>
                    {cardData.chemist}
                  </div>
                  <div className="cert-label">Chemist</div>
                </td>
                <td>
                  <div style={{ minHeight: "35px", borderBottom: "1px solid #000", marginBottom: "2px" }}>
                    {cardData.chiefAgriculturist}
                  </div>
                  <div className="cert-label">Chief Agriculturist</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
