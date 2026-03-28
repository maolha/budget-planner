import { parseCSV } from "./csv-parser"
import { parseXLSX } from "./xlsx-parser"
import { parsePDF } from "./pdf-parser"

export type { ParsedTransaction, ColumnMapping } from "./types"

/** Supported file extensions. */
const SUPPORTED_EXTENSIONS = [".csv", ".xlsx", ".xls", ".pdf"]

/**
 * Detect file type from name and route to the appropriate parser.
 * Returns the same { headers, rows } shape regardless of input format.
 */
export async function parseFile(
  file: File
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const name = file.name.toLowerCase()

  if (name.endsWith(".csv") || name.endsWith(".tsv")) {
    return parseCSV(file)
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    return parseXLSX(file)
  }

  if (name.endsWith(".pdf")) {
    return parsePDF(file)
  }

  throw new Error(
    `Unsupported file type. Please upload a CSV, XLSX, or PDF file.`
  )
}

/** File accept string for the <input> element. */
export const ACCEPTED_FILE_TYPES = SUPPORTED_EXTENSIONS.join(",")

/** Check if a file has a supported extension (for drag-and-drop validation). */
export function isSupportedFile(fileName: string): boolean {
  const lower = fileName.toLowerCase()
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext))
}
