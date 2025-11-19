import { format } from "date-fns"

interface Equipment {
  id: string
  equipmentId: string
  name: string
  category: string
  serialNumber: string
  location: string
  manufacturer?: string
  model?: string
  brand?: string
  purchaseDate?: string
  warrantyExpiration?: string
  cost?: number
  condition?: string
  assignedTo?: string
  lastMaintenance?: string
  nextMaintenance?: string
  lastCalibration?: string
  nextCalibration?: string
  status: string
  notes?: string
  imageUrl?: string
  maintenanceRecords?: MaintenanceRecord[] | null
  calibrationStatus?: string
  supplier?: string
}

interface MaintenanceRecord {
  id: string
  date: string
  type?: string
  notes?: string
  joNo?: string
  referenceNo?: string
  servicer?: string
  documentUrl?: string | null
  originalFileName?: string | null
  certificateStatus?: "w/ certificate" | "no certificate" | "to be follow" | null
}

interface PrintTemplate {
  id: string
  name: string
  headerHtml: string
  footerText: string
  showPageNumbers: boolean
  paperSize: string
  orientation: string
  fields: Record<string, boolean>
  createdAt: any
}

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A"
  try {
    return format(new Date(dateString), "PPP")
  } catch {
    return "Invalid date"
  }
}

const getLatestMaintCalibDate = (records?: MaintenanceRecord[] | null) => {
  if (!records || records.length === 0) return null
  return records.reduce((latest, current) => (new Date(current.date) > new Date(latest.date) ? current : latest)).date
}

// Define the desired order of fields
const fieldOrder = [
  "equipmentId",
  "name",
  "brand",
  "model",
  "serialNumber",
  "location",
  "status",
  "condition",
  "category",
  "purchaseDate",
  "warrantyExpiration",
  "cost",
  "assignedTo",
  "notes",
  "supplier",
  "calibrationStatus", // Added calibration status to field order
  "latestMaintCalibDate",
  "qrCode",
]

export function generateEquipmentReportHtml({
  equipment,
  template,
}: {
  equipment: Equipment[]
  template: PrintTemplate
}): string {
  const currentDate = format(new Date(), "MMMM dd, yyyy HH:mm")

  // Filter selected fields and maintain the defined order
  const selectedFields = fieldOrder
    .filter((field) => template.fields[field]) // Only include fields that are selected (true in template.fields)
    .map((field) => {
      // Convert camelCase to space-separated words and capitalize each word
      const label = field
        .replace(/([A-Z])/g, " $1")
        .trim()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
      return {
        key: field,
        label,
      }
    })

  let reportHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Equipment Report Table</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          color: #333;
        }
        h1, p {
          text-align: center;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 12px;
        }
        th, td {
          border: 1px solid #ccc;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f5f5f5;
        }
        tr:nth-child(even) {
          background-color: #fafafa;
        }
        .footer {
          margin-top: 30px;
          font-size: 10px;
          color: #666;
          display: flex;
          justify-content: space-between;
          border-top: 1px solid #eee;
          padding-top: 10px;
        }
        @media print {
          table, th, td {
            border: 1px solid black;
          }
        }
      </style>
    </head>
    <body>
      <div>
        ${template.headerHtml}
        <h1>Equipment Inventory Report</h1>
        <p>Generated on: ${currentDate}</p>
        <table>
          <thead>
            <tr>
              ${selectedFields.map((field) => `<th>${field.label}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
  `

  if (equipment.length === 0) {
    reportHtml += `
      <tr>
        <td colspan="${selectedFields.length}" style="text-align: center;">No equipment data available.</td>
      </tr>`
  } else {
    for (const item of equipment) {
      reportHtml += `<tr>`
      for (const field of selectedFields) {
        let value = "N/A"
        switch (field.key) {
          case "equipmentId":
            value = item.equipmentId || "N/A"
            break
          case "name":
            value = item.name || "N/A"
            break
          case "serialNumber":
            value = item.serialNumber || "N/A"
            break
          case "model":
            value = item.model || "N/A"
            break
          case "condition":
            value = item.condition || "N/A"
            break
          case "status":
            value = item.status || "N/A"
            break
          case "category":
            value = item.category || "N/A"
            break
          case "location":
            value = item.location || "N/A"
            break
          case "purchaseDate":
            value = item.purchaseDate ? formatDate(item.purchaseDate) : "N/A"
            break
          case "warrantyExpiration":
            value = item.warrantyExpiration ? formatDate(item.warrantyExpiration) : "N/A"
            break
          case "cost":
            value = item.cost ? `₱${item.cost.toFixed(2)}` : "N/A"
            break
          case "assignedTo":
            value = item.assignedTo || "N/A"
            break
          case "notes":
            value = item.notes || "N/A"
            break
          case "brand":
            value = item.brand || item.manufacturer || "N/A"
            break
          case "supplier":
            value = item.supplier || "N/A"
            break
          case "calibrationStatus": // Added case for calibration status to display the actual value
            value = item.calibrationStatus || "N/A"
            break
          case "qrCode":
            value = item.equipmentId ? `QR-${item.equipmentId}` : "N/A"
            break
          case "latestMaintCalibDate":
            const latestDate = getLatestMaintCalibDate(item.maintenanceRecords)
            value = latestDate ? formatDate(latestDate) : "N/A"
            break
          default:
            value = "N/A"
        }
        reportHtml += `<td>${value}</td>`
      }
      reportHtml += `</tr>`
    }
  }

  reportHtml += `
          </tbody>
        </table>
        <div class="footer">
          <span>${template.footerText}</span>
          ${template.showPageNumbers ? "<span>Page 1/1</span>" : ""}
        </div>
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() {
          }, 500);
        };
      </script>
    </body>
    </html>
  `

  return reportHtml
}
