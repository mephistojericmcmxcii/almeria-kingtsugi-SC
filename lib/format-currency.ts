/**
 * Formats a number as currency with commas and 2 decimal places
 * @param amount - The number to format
 * @returns Formatted string (e.g., "1,200,000.00")
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Parses a formatted currency string back to a number
 * @param value - The formatted string (e.g., "1,200,000.00")
 * @returns The numeric value
 */
export function parseCurrency(value: string): number {
  return Number.parseFloat(value.replace(/,/g, "")) || 0
}
