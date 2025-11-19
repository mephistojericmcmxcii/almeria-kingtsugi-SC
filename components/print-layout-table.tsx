// components/print-layout-table.tsx

/**
 * Defines the structure for a table header, including the data key and display label.
 */
interface TableHeader {
  key: string
  label: string
}

/**
 * Generates an HTML table string based on provided headers and data.
 * This function is designed to be used for printing purposes where direct HTML injection is needed.
 *
 * @param {Object} props - The properties for generating the table.
 * @param {TableHeader[]} props.headers - An array of header objects, each with a `key` (data property name) and `label` (display text).
 * @param {Record<string, any>[]} props.data - An array of data objects, where each object represents a row.
 * @returns {string} The HTML string representing the table.
 */
export function generatePrintTableHtml({
  headers,
  data,
}: { headers: TableHeader[]; data: Record<string, any>[] }): string {
  let tableHtml = `
    <table style="width: 100%; border-collapse: collapse; direction: ltr;">
      <thead>
        <tr style="background-color: #f2f2f2;">
  `

  // Add table headers
  headers.forEach((header) => {
    tableHtml += `<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; direction: ltr;">${header.label}</th>`
  })

  tableHtml += `
        </tr>
      </thead>
      <tbody>
  `

  // Add data rows
  data.forEach((row, rowIndex) => {
    tableHtml += `<tr style="${rowIndex % 2 === 0 ? "background-color: #f9f9f9;" : ""} direction: ltr;">` // Add alternating row background
    headers.forEach((header) => {
      // Ensure value is a string and handle undefined/null
      const value = row[header.key] !== undefined && row[header.key] !== null ? String(row[header.key]) : "N/A"
      tableHtml += `<td style="border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; direction: ltr;">${value}</td>`
    })
    tableHtml += `</tr>`
  })

  tableHtml += `
      </tbody>
    </table>
  `

  return tableHtml
}
