import type { ColumnMapping } from "./types"

// Common Swiss bank CSV header patterns
const DATE_PATTERNS = [
  "date", "datum", "buchungsdatum", "valuta", "valutadatum",
  "booking date", "transaction date", "value date",
  "abschlussdatum",
]

const AMOUNT_PATTERNS = [
  "amount", "betrag", "einzelbetrag",
  "debit", "credit", "chf", "transaction amount",
]

const DESCRIPTION_PATTERNS = [
  "description", "beschreibung", "buchungstext", "text",
  "zahlungsgrund", "mitteilung", "details", "narrative",
  "transaction", "bezeichnung", "beschreibung1",
]

const BALANCE_PATTERNS = [
  "balance", "saldo", "kontostand", "running balance",
]

function matchHeader(header: string, patterns: string[]): boolean {
  const lower = header.toLowerCase().trim()
  return patterns.some((p) => lower.includes(p))
}

/**
 * Auto-detect column meanings from CSV headers.
 * Returns a suggested mapping or null for undetected columns.
 */
export function detectColumns(
  headers: string[]
): { mapping: Partial<ColumnMapping>; confidence: number } {
  const mapping: Partial<ColumnMapping> = {}
  let matched = 0

  for (const header of headers) {
    if (!mapping.date && matchHeader(header, DATE_PATTERNS)) {
      mapping.date = header
      matched++
    } else if (!mapping.amount && matchHeader(header, AMOUNT_PATTERNS)) {
      mapping.amount = header
      matched++
    } else if (!mapping.description && matchHeader(header, DESCRIPTION_PATTERNS)) {
      mapping.description = header
      matched++
    } else if (!mapping.balance && matchHeader(header, BALANCE_PATTERNS)) {
      mapping.balance = header
      matched++
    }
  }

  const confidence = matched / 3 // 3 required fields

  return { mapping, confidence }
}
