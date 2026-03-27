import Papa from "papaparse"
import type { ParsedTransaction, ColumnMapping } from "./types"

/**
 * Parse a CSV file into structured transaction data.
 * Handles Swiss CSV quirks: semicolon delimiters, German number formats.
 */
export function parseCSV(
  file: File
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      // Try semicolon first (common in Swiss bank exports), fall back to comma
      delimiter: "",
      complete: (results) => {
        const headers = results.meta.fields ?? []
        const rows = results.data as Record<string, string>[]
        resolve({ headers, rows })
      },
      error: (error: Error) => reject(error),
    })
  })
}

/**
 * Parse amount strings in Swiss/German format.
 * Handles: "1'234.56", "1.234,56", "-1234.56", "CHF 1'234.56"
 */
function parseSwissAmount(raw: string): number {
  if (!raw) return 0
  let cleaned = raw
    .replace(/CHF\s*/i, "")
    .replace(/'/g, "")
    .trim()

  // If comma is used as decimal separator (German format: 1.234,56)
  if (cleaned.includes(",") && cleaned.indexOf(",") > cleaned.lastIndexOf(".")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".")
  }

  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

/**
 * Parse date strings in common Swiss bank formats.
 */
function parseSwissDate(raw: string): string {
  if (!raw) return ""
  const trimmed = raw.trim()

  // DD.MM.YYYY (most common Swiss format)
  const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (dotMatch) {
    return `${dotMatch[3]}-${dotMatch[2].padStart(2, "0")}-${dotMatch[1].padStart(2, "0")}`
  }

  // DD/MM/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2].padStart(2, "0")}-${slashMatch[1].padStart(2, "0")}`
  }

  // YYYY-MM-DD (already ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  return trimmed
}

/**
 * Convert parsed CSV rows into structured transactions using column mapping.
 */
export function mapToTransactions(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): ParsedTransaction[] {
  return rows
    .map((row) => ({
      date: parseSwissDate(row[mapping.date] ?? ""),
      amount: parseSwissAmount(row[mapping.amount] ?? ""),
      description: (row[mapping.description] ?? "").trim(),
      balance: mapping.balance ? parseSwissAmount(row[mapping.balance] ?? "") : undefined,
      rawRow: row,
      categoryConfidence: 0,
    }))
    .filter((t) => t.date && t.amount !== 0)
}
