// This file handles client-side document conversion

import mammoth from "mammoth"
import * as XLSX from "xlsx"

// Convert Word document to HTML
export async function convertWordToHtml(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer })
    return result.value
  } catch (error) {
    console.error("Error converting Word document:", error)
    throw new Error("Failed to convert Word document")
  }
}

// Convert Excel file to HTML
export async function convertExcelToHtml(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const workbook = XLSX.read(arrayBuffer, { type: "array" })

    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    // Convert to HTML with styling
    const html = XLSX.utils.sheet_to_html(worksheet, {
      id: "excel-table",
      editable: false,
    })

    // Add some basic styling
    return `
      <style>
        #excel-table {
          border-collapse: collapse;
          width: 100%;
          font-family: Arial, sans-serif;
        }
        #excel-table th, #excel-table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        #excel-table tr:nth-child(even) {
          background-color: rgba(0, 128, 0, 0.1);
        }
        #excel-table th {
          padding-top: 12px;
          padding-bottom: 12px;
          background-color: #1e7e5a;
          color: white;
        }
      </style>
      ${html}
    `
  } catch (error) {
    console.error("Error converting Excel file:", error)
    throw new Error("Failed to convert Excel file")
  }
}
