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
    // Read file as text first to handle Swiss bank preambles (UBS, ZKB, etc.)
    const reader = new FileReader()
    reader.onload = () => {
      let text = reader.result as string
      // Remove BOM
      text = text.replace(/^\uFEFF/, "")

      // Detect and skip preamble lines (UBS format has metadata before the header row)
      // Look for the actual CSV header by finding the line with the most delimiters
      const lines = text.split(/\r?\n/)
      let headerLineIndex = 0
      const delim = text.includes(";") ? ";" : ","
      let maxCols = 0
      for (let i = 0; i < Math.min(lines.length, 15); i++) {
        const cols = lines[i].split(delim).length
        if (cols > maxCols) {
          maxCols = cols
          headerLineIndex = i
        }
      }

      // Rejoin from the header line onward
      const csvContent = lines.slice(headerLineIndex).join("\n")

      Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        delimiter: "",
        complete: (results) => {
          let headers = results.meta.fields ?? []
          let rows = results.data as Record<string, string>[]

          // UBS format: merge Belastung (debit) and Gutschrift (credit) into a single Amount column
          const debitCol = headers.find((h) => h.toLowerCase().includes("belastung"))
          const creditCol = headers.find((h) => h.toLowerCase().includes("gutschrift"))
          if (debitCol && creditCol && !headers.some((h) => h.toLowerCase() === "amount")) {
            headers = [...headers, "Amount"]
            rows = rows.map((row) => {
              const debit = row[debitCol] ?? ""
              const credit = row[creditCol] ?? ""
              // Belastung is negative (expense), Gutschrift is positive (income)
              const amount = debit || (credit ? credit : "0")
              return { ...row, Amount: amount }
            })
          }

          resolve({ headers, rows })
        },
        error: (error: Error) => reject(error),
      })
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file, "UTF-8")
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
    .map((row) => {
      const csvCategory = mapping.category ? (row[mapping.category] ?? "").trim() : ""
      return {
        date: parseSwissDate(row[mapping.date] ?? ""),
        amount: parseSwissAmount(row[mapping.amount] ?? ""),
        description: (row[mapping.description] ?? "").trim(),
        balance: mapping.balance ? parseSwissAmount(row[mapping.balance] ?? "") : undefined,
        rawRow: row,
        suggestedCategory: csvCategory ? csvCategory.toLowerCase().replace(/[^a-z0-9]+/g, "_") : undefined,
        categoryConfidence: csvCategory ? 0.9 : 0,
      }
    })
    .filter((t) => t.date && t.amount !== 0)
}
